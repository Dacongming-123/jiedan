const { query, queryOne, transaction } = require('../config/db')
const dayjs = require('dayjs')
const { v4: uuidv4 } = require('uuid')

// GET /api/orders
exports.list = async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query
  const offset = (page - 1) * limit
  const userId = req.user.id
  const userRole = req.user.role

  // Use JWT-verified role; users can appear in orders both as employer and creator
  // Show all orders where they participate (either side)
  let where = '(o.employer_id = ? OR o.creator_id = ?)'
  const params = [userId, userId]
  if (status) { where += ' AND o.status = ?'; params.push(status) }

  const [list, [{ total }]] = await Promise.all([
    query(
      `SELECT o.*,
              e.nickname as employer_nickname, e.avatar as employer_avatar,
              c.nickname as creator_nickname, c.avatar as creator_avatar,
              (SELECT COUNT(*) FROM milestones WHERE order_id = o.id AND status = 'approved') as approved_milestones,
              (SELECT COUNT(*) FROM milestones WHERE order_id = o.id) as total_milestones
       FROM orders o
       LEFT JOIN users e ON e.id = o.employer_id
       LEFT JOIN users c ON c.id = o.creator_id
       WHERE ${where} ORDER BY o.updated_at DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`,
      params
    ),
    query(`SELECT COUNT(*) as total FROM orders o WHERE ${where}`, params),
  ])

  const formatted = list.map(o => {
    const progress = o.total_milestones > 0
      ? Math.round((o.approved_milestones / o.total_milestones) * 100) : 0
    return {
      ...o,
      progress,
      employer: { id: o.employer_id, nickname: o.employer_nickname, avatar: o.employer_avatar },
      creator: { id: o.creator_id, nickname: o.creator_nickname, avatar: o.creator_avatar },
    }
  })

  res.json({ success: true, data: { list: formatted, total } })
}

// GET /api/orders/:id
exports.detail = async (req, res) => {
  const { id } = req.params
  const userId = req.user.id

  const o = await queryOne(
    `SELECT o.*,
            e.nickname as employer_nickname, e.avatar as employer_avatar,
            c.nickname as creator_nickname, c.avatar as creator_avatar
     FROM orders o
     LEFT JOIN users e ON e.id = o.employer_id
     LEFT JOIN users c ON c.id = o.creator_id
     WHERE o.id = ?`,
    [id]
  )
  if (!o) return res.status(404).json({ success: false, message: '订单不存在' })
  if (o.employer_id !== userId && o.creator_id !== userId) {
    return res.status(403).json({ success: false, message: '无权限查看' })
  }

  const milestones = await query('SELECT * FROM milestones WHERE order_id = ? ORDER BY sort_order', [id])
  const changes = await query(
    'SELECT * FROM order_changes WHERE order_id = ? ORDER BY created_at DESC LIMIT 5', [id]
  )

  res.json({
    success: true,
    data: {
      ...o,
      employer: { id: o.employer_id, nickname: o.employer_nickname, avatar: o.employer_avatar },
      creator: { id: o.creator_id, nickname: o.creator_nickname, avatar: o.creator_avatar },
      milestones,
      recent_changes: changes,
    }
  })
}

// POST /api/orders/:id/confirm
exports.confirm = async (req, res) => {
  const { id } = req.params
  const userId = req.user.id

  const o = await queryOne('SELECT * FROM orders WHERE id = ?', [id])
  if (!o) return res.status(404).json({ success: false, message: '订单不存在' })
  if (o.status !== 'pending_confirm') return res.status(400).json({ success: false, message: '订单状态不允许确认' })

  const isEmployer = o.employer_id === userId
  const isCreator = o.creator_id === userId
  if (!isEmployer && !isCreator) return res.status(403).json({ success: false, message: '无权限' })

  // 检查确认截止时间
  if (dayjs().isAfter(dayjs(o.confirm_deadline))) {
    await query("UPDATE orders SET status = 'cancelled' WHERE id = ?", [id])
    return res.status(400).json({ success: false, message: '确认期已过，订单已取消' })
  }

  const field = isEmployer ? 'employer_confirmed' : 'creator_confirmed'
  await query(`UPDATE orders SET ${field} = 1 WHERE id = ?`, [id])

  // 检查双方是否都已确认
  const updated = await queryOne('SELECT * FROM orders WHERE id = ?', [id])
  if (updated.employer_confirmed && updated.creator_confirmed) {
    const expectedEnd = dayjs().add(o.deadline_days, 'day').toDate()
    await query(
      "UPDATE orders SET status = 'confirmed', start_date = NOW(), expected_end = ?, requirements_locked = 1 WHERE id = ?",
      [expectedEnd, id]
    )
    // 通知双方
    for (const uid of [o.employer_id, o.creator_id]) {
      await query(
        "INSERT INTO notifications (user_id, type, title, content, link) VALUES (?, 'order_confirm', '订单已双方确认', '请雇主完成付款以正式开始项目', ?)",
        [uid, `/orders/${id}`]
      )
    }
  }

  res.json({ success: true, data: { message: '确认成功' } })
}

// POST /api/orders/:id/change
exports.requestChange = async (req, res) => {
  const { id } = req.params
  const { description, price_delta = 0, days_delta = 0 } = req.body
  const userId = req.user.id

  const o = await queryOne('SELECT * FROM orders WHERE id = ?', [id])
  if (!o) return res.status(404).json({ success: false, message: '订单不存在' })
  if (o.employer_id !== userId && o.creator_id !== userId) return res.status(403).json({ success: false, message: '无权限' })
  if (!['in_progress', 'pending_review'].includes(o.status)) {
    return res.status(400).json({ success: false, message: '当前状态不允许变更' })
  }

  const agreementNo = 'AGR' + dayjs().format('YYMMDDHHmmss')
  const r = await query(
    `INSERT INTO order_changes (order_id, proposer_id, description, price_delta, days_delta, agreement_no, status)
     VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
    [id, userId, description, price_delta, days_delta, agreementNo]
  )

  // 通知另一方
  const notifyId = o.employer_id === userId ? o.creator_id : o.employer_id
  await query(
    "INSERT INTO notifications (user_id, type, title, content, link) VALUES (?, 'order_confirm', '收到变更申请', ?, ?)",
    [notifyId, `对方申请变更订单，请查看详情`, `/orders/${id}`]
  )

  res.status(201).json({ success: true, data: { change_id: r.insertId, agreement_no: agreementNo } })
}

// PUT /api/orders/changes/:changeId/approve
exports.approveChange = async (req, res) => {
  const { changeId } = req.params
  const userId = req.user.id

  const change = await queryOne(
    'SELECT oc.*, o.employer_id, o.creator_id, o.final_price, o.deadline_days FROM order_changes oc JOIN orders o ON o.id = oc.order_id WHERE oc.id = ?',
    [changeId]
  )
  if (!change) return res.status(404).json({ success: false, message: '变更申请不存在' })

  const isEmployer = change.employer_id === userId
  const isCreator = change.creator_id === userId
  if (!isEmployer && !isCreator) return res.status(403).json({ success: false, message: '无权限' })

  const field = isEmployer ? 'employer_approved' : 'creator_approved'
  await query(`UPDATE order_changes SET ${field} = 1 WHERE id = ?`, [changeId])

  const updated = await queryOne('SELECT * FROM order_changes WHERE id = ?', [changeId])
  if (updated.employer_approved && updated.creator_approved) {
    // 双方均批准，更新订单
    await transaction(async (conn) => {
      await conn.execute(
        `UPDATE orders SET
         final_price = final_price + ?,
         deadline_days = deadline_days + ?,
         expected_end = DATE_ADD(expected_end, INTERVAL ? DAY)
         WHERE id = ?`,
        [change.price_delta, change.days_delta, change.days_delta, change.order_id]
      )
      await conn.execute("UPDATE order_changes SET status = 'approved' WHERE id = ?", [changeId])
    })
  }

  res.json({ success: true })
}

// PUT /api/orders/changes/:changeId/reject
exports.rejectChange = async (req, res) => {
  const { changeId } = req.params
  const userId = req.user.id

  const change = await queryOne(
    'SELECT oc.*, o.employer_id, o.creator_id FROM order_changes oc JOIN orders o ON o.id = oc.order_id WHERE oc.id = ?',
    [changeId]
  )
  if (!change) return res.status(404).json({ success: false, message: '变更申请不存在' })
  if (change.employer_id !== userId && change.creator_id !== userId) return res.status(403).json({ success: false, message: '无权限' })
  if (change.proposer_id === userId) return res.status(400).json({ success: false, message: '不能拒绝自己发起的变更' })

  await query("UPDATE order_changes SET status = 'rejected' WHERE id = ?", [changeId])

  const notifyId = change.proposer_id
  await query(
    "INSERT INTO notifications (user_id, type, title, content, link) VALUES (?, 'order_confirm', '变更申请被拒绝', '对方拒绝了您的变更申请', ?)",
    [notifyId, `/orders/${change.order_id}`]
  )

  res.json({ success: true })
}

// POST /api/orders/milestones/:milestoneId/submit
exports.submitMilestone = async (req, res) => {
  const { milestoneId } = req.params
  const { description, deliverables = [] } = req.body
  const userId = req.user.id

  const m = await queryOne(
    'SELECT ms.*, o.creator_id FROM milestones ms JOIN orders o ON o.id = ms.order_id WHERE ms.id = ?',
    [milestoneId]
  )
  if (!m) return res.status(404).json({ success: false, message: '里程碑不存在' })
  if (m.creator_id !== userId) return res.status(403).json({ success: false, message: '无权限' })

  await query(
    "UPDATE milestones SET status = 'submitted', deliverables = ?, submitted_at = NOW() WHERE id = ?",
    [JSON.stringify(deliverables), milestoneId]
  )

  // 通知雇主
  const o = await queryOne('SELECT employer_id FROM orders WHERE id = ?', [m.order_id])
  await query(
    "INSERT INTO notifications (user_id, type, title, content, link) VALUES (?, 'milestone', '创作者提交了里程碑', ?, ?)",
    [o.employer_id, `里程碑「${m.title}」已提交，请验收`, `/orders/${m.order_id}/progress`]
  )

  // 更新订单状态
  await query("UPDATE orders SET status = 'pending_review' WHERE id = ? AND status = 'in_progress'", [m.order_id])

  res.json({ success: true })
}

// PUT /api/orders/milestones/:milestoneId/approve
exports.approveMilestone = async (req, res) => {
  const { milestoneId } = req.params
  const userId = req.user.id

  const m = await queryOne(
    'SELECT ms.*, o.employer_id, o.creator_id, o.final_price, o.creator_income, o.order_no FROM milestones ms JOIN orders o ON o.id = ms.order_id WHERE ms.id = ?',
    [milestoneId]
  )
  if (!m) return res.status(404).json({ success: false, message: '里程碑不存在' })
  if (m.employer_id !== userId) return res.status(403).json({ success: false, message: '无权限' })

  await transaction(async (conn) => {
    await conn.execute(
      "UPDATE milestones SET status = 'approved', approved_at = NOW() WHERE id = ?", [milestoneId]
    )

    // 按进度释放资金：从冻结转为收入（以 creator_income 为基准，避免与 final_price 不一致）
    const releaseAmount = Math.round(Number(m.creator_income) * (m.percentage / 100) * 100) / 100
    if (releaseAmount > 0) {
      await conn.execute(
        'UPDATE wallets SET frozen = frozen - ?, available = available + ? WHERE user_id = ?',
        [releaseAmount, releaseAmount, m.creator_id]
      )
      await conn.execute(
        'INSERT INTO wallet_transactions (wallet_id, user_id, type, amount, ref_type, ref_id, description) SELECT id, ?, "income", ?, "order", ?, ? FROM wallets WHERE user_id = ?',
        [m.creator_id, releaseAmount, m.order_id, `里程碑「${m.title}」结算 · ${m.order_no}`, m.creator_id]
      )
    }

    // 检查是否所有里程碑都完成
    const [[{ remaining }]] = await conn.execute(
      "SELECT COUNT(*) as remaining FROM milestones WHERE order_id = ? AND status != 'approved'",
      [m.order_id]
    )
    if (remaining == 0) {
      await conn.execute(
        "UPDATE orders SET status = 'completed', actual_end = NOW() WHERE id = ?", [m.order_id]
      )
      // 通知双方评价
      for (const uid of [m.employer_id, m.creator_id]) {
        await conn.execute(
          "INSERT INTO notifications (user_id, type, title, content, link) VALUES (?, 'review', '订单完成，请评价', '项目已完成，请互相评价', ?)",
          [uid, `/orders/${m.order_id}/review`]
        )
      }
    }
  })

  res.json({ success: true })
}

// POST /api/orders/:id/cancel
exports.cancel = async (req, res) => {
  const { id } = req.params
  const userId = req.user.id

  const o = await queryOne('SELECT * FROM orders WHERE id = ?', [id])
  if (!o) return res.status(404).json({ success: false, message: '订单不存在' })
  if (o.employer_id !== userId && o.creator_id !== userId) return res.status(403).json({ success: false, message: '无权限' })
  if (o.status !== 'pending_confirm') {
    return res.status(400).json({ success: false, message: '仅待确认的订单可以取消' })
  }

  await query("UPDATE orders SET status = 'cancelled' WHERE id = ?", [id])
  await query("UPDATE applications SET status = 'rejected' WHERE id = ?", [o.application_id])
  await query("UPDATE requirements SET status = 'open' WHERE id = ?", [o.requirement_id])

  const notifyId = o.employer_id === userId ? o.creator_id : o.employer_id
  await query(
    "INSERT INTO notifications (user_id, type, title, content, link) VALUES (?, 'order_confirm', '订单已取消', '对方取消了本次合作', ?)",
    [notifyId, `/orders/${id}`]
  )
  res.json({ success: true })
}

// PUT /api/orders/milestones/:milestoneId/revision
exports.requestRevision = async (req, res) => {
  const { milestoneId } = req.params
  const { feedback } = req.body

  const m = await queryOne(
    'SELECT ms.*, o.employer_id, o.creator_id FROM milestones ms JOIN orders o ON o.id = ms.order_id WHERE ms.id = ?',
    [milestoneId]
  )
  if (!m || m.employer_id !== req.user.id) return res.status(403).json({ success: false, message: '无权限' })

  await query(
    "UPDATE milestones SET status = 'revision', employer_feedback = ? WHERE id = ?",
    [feedback || null, milestoneId]
  )
  await query("UPDATE orders SET status = 'revision' WHERE id = ?", [m.order_id])

  await query(
    "INSERT INTO notifications (user_id, type, title, content, link) VALUES (?, 'milestone', '里程碑需要修改', ?, ?)",
    [m.creator_id, `雇主要求修改里程碑「${m.title}」`, `/orders/${m.order_id}/progress`]
  )

  res.json({ success: true })
}
