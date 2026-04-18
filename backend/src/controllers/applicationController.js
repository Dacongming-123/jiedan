const { query, queryOne, transaction } = require('../config/db')
const dayjs = require('dayjs')
const { v4: uuidv4 } = require('uuid')

// GET /api/requirements/:id/applications
exports.list = async (req, res) => {
  const { id } = req.params
  const r = await queryOne('SELECT employer_id FROM requirements WHERE id = ?', [id])
  if (!r) return res.status(404).json({ success: false, message: '需求不存在' })
  if (r.employer_id !== req.user.id) return res.status(403).json({ success: false, message: '无权限' })

  const list = await query(
    `SELECT a.*, u.nickname as creator_nickname, u.avatar as creator_avatar, u.verified as creator_verified,
            p.rating_avg as creator_rating, p.completed_orders as creator_orders, p.on_time_rate
     FROM applications a
     JOIN users u ON u.id = a.creator_id
     LEFT JOIN user_profiles p ON p.user_id = a.creator_id
     WHERE a.requirement_id = ? ORDER BY a.created_at DESC`,
    [id]
  )

  const formatted = list.map(a => ({
    ...a,
    creator: { id: a.creator_id, nickname: a.creator_nickname, avatar: a.creator_avatar,
               verified: a.creator_verified, rating_avg: a.creator_rating,
               completed_orders: a.creator_orders, on_time_rate: a.on_time_rate },
  }))

  res.json({ success: true, data: { list: formatted } })
}

// GET /api/applications/mine
exports.myApplications = async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query
  const offset = (page - 1) * limit
  let where = 'a.creator_id = ?'
  const params = [req.user.id]
  if (status) { where += ' AND a.status = ?'; params.push(status) }

  const list = await query(
    `SELECT a.*, r.title as req_title, r.budget_min, r.budget_max, r.category,
            u.nickname as employer_nickname, u.avatar as employer_avatar,
            o.id as order_id
     FROM applications a
     JOIN requirements r ON r.id = a.requirement_id
     JOIN users u ON u.id = r.employer_id
     LEFT JOIN orders o ON o.application_id = a.id
     WHERE ${where} ORDER BY a.created_at DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`,
    params
  )
  res.json({ success: true, data: { list } })
}

// POST /api/requirements/:id/apply
exports.apply = async (req, res) => {
  if (req.user.role !== 'creator') {
    return res.status(403).json({ success: false, message: '只有创作者可以申请需求' })
  }
  const { id } = req.params
  const { proposal, price, timeline_days } = req.body

  if (!price || !timeline_days) {
    return res.status(400).json({ success: false, message: '报价和时间不能为空' })
  }

  const r = await queryOne('SELECT * FROM requirements WHERE id = ?', [id])
  if (!r) return res.status(404).json({ success: false, message: '需求不存在' })
  if (r.status !== 'open') return res.status(400).json({ success: false, message: '该需求已关闭' })
  if (r.employer_id === req.user.id) return res.status(400).json({ success: false, message: '不能申请自己的需求' })

  const exists = await queryOne('SELECT id FROM applications WHERE requirement_id = ? AND creator_id = ?', [id, req.user.id])
  if (exists) return res.status(400).json({ success: false, message: '已申请过该需求' })

  const result = await query(
    'INSERT INTO applications (requirement_id, creator_id, proposal, price, timeline_days) VALUES (?, ?, ?, ?, ?)',
    [id, req.user.id, proposal || null, price, timeline_days]
  )
  await query('UPDATE requirements SET apply_count = apply_count + 1 WHERE id = ?', [id])

  res.status(201).json({ success: true, data: { id: result.insertId } })
}

// PUT /api/applications/:id/accept
exports.accept = async (req, res) => {
  const { id } = req.params
  const app = await queryOne(
    `SELECT a.*, r.employer_id, r.title, r.status as req_status
     FROM applications a JOIN requirements r ON r.id = a.requirement_id WHERE a.id = ?`,
    [id]
  )
  if (!app) return res.status(404).json({ success: false, message: '申请不存在' })
  if (app.employer_id !== req.user.id) return res.status(403).json({ success: false, message: '无权限' })
  if (app.req_status !== 'open') return res.status(400).json({ success: false, message: '需求已关闭' })

  // 创建订单（进入3天确认期）
  const orderNo = 'ZC' + dayjs().format('YYMMDDHHmmss') + Math.random().toString(36).slice(2, 6).toUpperCase()
  const confirmDeadline = dayjs().add(3, 'day').toDate()
  const platformFee = Math.round(app.price * 0.05 * 100) / 100
  const creatorIncome = app.price - platformFee

  const orderId = await transaction(async (conn) => {
    const [r] = await conn.execute(
      `INSERT INTO orders (order_no, requirement_id, application_id, employer_id, creator_id,
       title, final_price, platform_fee, creator_income, deadline_days, confirm_deadline, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_confirm')`,
      [orderNo, app.requirement_id, id, app.employer_id, app.creator_id,
       app.title || '订单', app.price, platformFee, creatorIncome,
       app.timeline_days, confirmDeadline]
    )
    await conn.execute("UPDATE applications SET status = 'accepted' WHERE id = ?", [id])
    await conn.execute("UPDATE requirements SET status = 'in_progress' WHERE id = ?", [app.requirement_id])

    // 发送通知
    await conn.execute(
      "INSERT INTO notifications (user_id, type, title, content, link) VALUES (?, 'order_confirm', ?, ?, ?)",
      [app.creator_id, '你的申请被接受了', `雇主已接受你的申请，请在3天内确认开始合作`, `/orders/${r.insertId}`]
    )
    return r.insertId
  })

  res.json({ success: true, data: { order_id: orderId, order_no: orderNo } })
}

// PUT /api/applications/:id/withdraw
exports.withdraw = async (req, res) => {
  const { id } = req.params
  const app = await queryOne('SELECT * FROM applications WHERE id = ? AND creator_id = ?', [id, req.user.id])
  if (!app) return res.status(404).json({ success: false, message: '申请不存在' })
  if (app.status !== 'pending') return res.status(400).json({ success: false, message: '只能撤回待回复的申请' })

  await query("UPDATE applications SET status = 'withdrawn' WHERE id = ?", [id])
  await query('UPDATE requirements SET apply_count = GREATEST(apply_count - 1, 0) WHERE id = ?', [app.requirement_id])
  res.json({ success: true })
}

// PUT /api/applications/:id/reject
exports.reject = async (req, res) => {
  const { id } = req.params
  const { note } = req.body
  const app = await queryOne(
    'SELECT a.*, r.employer_id FROM applications a JOIN requirements r ON r.id = a.requirement_id WHERE a.id = ?', [id]
  )
  if (!app) return res.status(404).json({ success: false, message: '申请不存在' })
  if (app.employer_id !== req.user.id) return res.status(403).json({ success: false, message: '无权限' })

  await query("UPDATE applications SET status = 'rejected', employer_note = ? WHERE id = ?", [note || null, id])
  res.json({ success: true })
}
