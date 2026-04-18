const { query, queryOne, transaction } = require('../config/db')

function safeJSON(val, fallback = []) {
  if (val === null || val === undefined) return fallback
  if (typeof val !== 'string') return val
  try { return JSON.parse(val) } catch { return fallback }
}

// GET /api/requirements
exports.list = async (req, res) => {
  const { category, sort = 'latest', search, page = 1, limit = 12, status = 'open' } = req.query
  const offset = (page - 1) * limit
  let where = '1=1'
  const whereParams = []

  if (status) { where += ' AND r.status = ?'; whereParams.push(status) }
  if (category) { where += ' AND r.category = ?'; whereParams.push(category) }
  if (search) { where += ' AND (r.title LIKE ? OR r.description LIKE ?)'; whereParams.push(`%${search}%`, `%${search}%`) }

  const sortMap = {
    latest: 'r.created_at DESC',
    budget_high: 'r.budget_max DESC',
    apply_count: 'r.apply_count DESC',
  }

  // 登录的创作者：附带本人的申请状态
  const isCreator = req.user?.role === 'creator'
  const joinClause = isCreator
    ? 'LEFT JOIN applications a ON a.requirement_id = r.id AND a.creator_id = ?'
    : ''
  const selectExtra = isCreator ? ', a.status as my_application_status' : ''
  const joinParams = isCreator ? [req.user.id] : []

  const [list, [{ total }]] = await Promise.all([
    query(
      `SELECT r.*, u.nickname as employer_nickname, u.avatar as employer_avatar ${selectExtra}
       FROM requirements r
       JOIN users u ON u.id = r.employer_id
       ${joinClause}
       WHERE ${where} ORDER BY ${sortMap[sort] || sortMap.latest} LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`,
      [...joinParams, ...whereParams]
    ),
    query(`SELECT COUNT(*) as total FROM requirements r WHERE ${where}`, whereParams),
  ])

  const formattedList = list.map(r => ({
    ...r,
    tags: safeJSON(r.tags),
    employer: { id: r.employer_id, nickname: r.employer_nickname, avatar: r.employer_avatar },
  }))

  res.json({ success: true, data: { list: formattedList, total, page: parseInt(page) } })
}

// GET /api/requirements/mine
exports.myList = async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query
  const offset = (page - 1) * limit
  let where = 'employer_id = ?'
  const params = [req.user.id]
  if (status) { where += ' AND status = ?'; params.push(status) }

  const list = await query(
    `SELECT * FROM requirements WHERE ${where} ORDER BY created_at DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`,
    params
  )
  res.json({ success: true, data: { list } })
}

// GET /api/requirements/:id
exports.detail = async (req, res) => {
  const req_id = req.params.id
  const r = await queryOne(
    `SELECT r.*, u.nickname as employer_nickname, u.avatar as employer_avatar, u.id as employer_uid
     FROM requirements r JOIN users u ON u.id = r.employer_id
     WHERE r.id = ?`,
    [req_id]
  )
  if (!r) return res.status(404).json({ success: false, message: '需求不存在' })

  // 增加浏览量
  query('UPDATE requirements SET view_count = view_count + 1 WHERE id = ?', [req_id]).catch(() => {})

  // 点赞数/收藏数（公开）
  const [[{ like_count }], [{ favorite_count }]] = await Promise.all([
    query('SELECT COUNT(*) as like_count FROM likes WHERE requirement_id = ?', [req_id]),
    query('SELECT COUNT(*) as favorite_count FROM favorites WHERE requirement_id = ?', [req_id]),
  ])

  // 检查当前用户是否已申请/已收藏/已点赞
  let has_applied = false, has_favorited = false, has_liked = false
  if (req.user) {
    const [app, fav, lk] = await Promise.all([
      queryOne('SELECT id FROM applications WHERE requirement_id = ? AND creator_id = ?', [req_id, req.user.id]),
      queryOne('SELECT id FROM favorites WHERE user_id = ? AND requirement_id = ?', [req.user.id, req_id]),
      queryOne('SELECT id FROM likes WHERE user_id = ? AND requirement_id = ?', [req.user.id, req_id]),
    ])
    has_applied = !!app
    has_favorited = !!fav
    has_liked = !!lk
  }

  // 获取最近申请者
  const recent_applicants = await query(
    `SELECT u.id, u.nickname, u.avatar FROM applications a
     JOIN users u ON u.id = a.creator_id
     WHERE a.requirement_id = ? ORDER BY a.created_at DESC LIMIT 8`,
    [req_id]
  )

  res.json({
    success: true,
    data: {
      ...r,
      tags: safeJSON(r.tags),
      attachments: safeJSON(r.attachments),
      employer: { id: r.employer_uid, nickname: r.employer_nickname, avatar: r.employer_avatar },
      has_applied,
      has_favorited,
      has_liked,
      like_count,
      favorite_count,
      recent_applicants,
    }
  })
}

// POST /api/requirements
exports.create = async (req, res) => {
  if (req.user.role !== 'employer') {
    return res.status(403).json({ success: false, message: '只有雇主可以发布需求' })
  }
  const { title, description, category, budget_min, budget_max, deadline_days, tags, attachments, status = 'open' } = req.body
  if (!title || !description || !category) {
    return res.status(400).json({ success: false, message: '标题、描述、分类不能为空' })
  }

  const result = await query(
    `INSERT INTO requirements (employer_id, title, description, category, budget_min, budget_max, deadline_days, tags, attachments, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.user.id, title, description, category,
     budget_min || null, budget_max || null, deadline_days || null,
     tags ? JSON.stringify(tags) : null,
     attachments ? JSON.stringify(attachments) : null,
     status]
  )
  const newReq = await queryOne('SELECT * FROM requirements WHERE id = ?', [result.insertId])
  res.status(201).json({ success: true, data: newReq })
}

// DELETE /api/requirements/:id
exports.remove = async (req, res) => {
  const { id } = req.params
  const r = await queryOne('SELECT * FROM requirements WHERE id = ?', [id])
  if (!r) return res.status(404).json({ success: false, message: '需求不存在' })
  if (r.employer_id !== req.user.id) return res.status(403).json({ success: false, message: '无权限' })
  if (['in_progress', 'completed'].includes(r.status)) {
    return res.status(400).json({ success: false, message: '进行中或已完成的需求不能删除' })
  }
  await query('DELETE FROM requirements WHERE id = ?', [id])
  res.json({ success: true })
}

// PUT /api/requirements/:id
exports.update = async (req, res) => {
  const { id } = req.params
  const r = await queryOne('SELECT * FROM requirements WHERE id = ?', [id])
  if (!r) return res.status(404).json({ success: false, message: '需求不存在' })
  if (r.employer_id !== req.user.id) return res.status(403).json({ success: false, message: '无权限' })
  if (r.status === 'in_progress') return res.status(400).json({ success: false, message: '进行中的需求不能修改' })

  const { title, description, category, budget_min, budget_max, deadline_days, tags } = req.body
  await query(
    `UPDATE requirements SET title=COALESCE(?,title), description=COALESCE(?,description),
     category=COALESCE(?,category), budget_min=COALESCE(?,budget_min), budget_max=COALESCE(?,budget_max),
     deadline_days=COALESCE(?,deadline_days), tags=COALESCE(?,tags)
     WHERE id = ?`,
    [title, description, category, budget_min, budget_max, deadline_days,
     tags ? JSON.stringify(tags) : null, id]
  )
  const updated = await queryOne('SELECT * FROM requirements WHERE id = ?', [id])
  res.json({ success: true, data: updated })
}
