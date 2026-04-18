const { query, queryOne } = require('../config/db')

// POST /api/orders/:id/review
exports.submit = async (req, res) => {
  const { id } = req.params
  const { rating, quality, communication, timeliness, comment } = req.body
  const userId = req.user.id

  if (!rating || rating < 1 || rating > 5) return res.status(400).json({ success: false, message: '评分无效' })

  const o = await queryOne('SELECT * FROM orders WHERE id = ?', [id])
  if (!o) return res.status(404).json({ success: false, message: '订单不存在' })
  if (o.status !== 'completed') return res.status(400).json({ success: false, message: '订单未完成，不能评价' })

  const isEmployer = o.employer_id === userId
  const isCreator = o.creator_id === userId
  if (!isEmployer && !isCreator) return res.status(403).json({ success: false, message: '无权限' })

  const reviewee_id = isEmployer ? o.creator_id : o.employer_id
  const role = isEmployer ? 'employer_to_creator' : 'creator_to_employer'

  const exists = await queryOne('SELECT id FROM reviews WHERE order_id = ? AND reviewer_id = ?', [id, userId])
  if (exists) return res.status(400).json({ success: false, message: '已评价过该订单' })

  await query(
    'INSERT INTO reviews (order_id, reviewer_id, reviewee_id, role, rating, quality, communication, timeliness, comment) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, userId, reviewee_id, role, rating, quality || null, communication || null, timeliness || null, comment || null]
  )

  // 更新被评价者的平均分
  const [avgResult] = await query(
    'SELECT AVG(rating) as avg_rating, COUNT(*) as count FROM reviews WHERE reviewee_id = ?',
    [reviewee_id]
  )
  await query(
    'UPDATE user_profiles SET rating_avg = ?, rating_count = ? WHERE user_id = ?',
    [avgResult.avg_rating, avgResult.count, reviewee_id]
  )

  res.json({ success: true })
}

// GET /api/orders/:id/reviews
exports.getByOrder = async (req, res) => {
  const { id } = req.params
  const reviews = await query(
    `SELECT r.*, u.nickname as reviewer_nickname, u.avatar as reviewer_avatar
     FROM reviews r JOIN users u ON u.id = r.reviewer_id
     WHERE r.order_id = ?`,
    [id]
  )
  const formatted = reviews.map(r => ({ ...r, reviewer: { id: r.reviewer_id, nickname: r.reviewer_nickname, avatar: r.reviewer_avatar } }))
  res.json({ success: true, data: { list: formatted } })
}

// GET /api/users/:id/reviews
exports.getByUser = async (req, res) => {
  const { id } = req.params
  const { page = 1, limit = 10 } = req.query
  const offset = (page - 1) * limit

  const list = await query(
    `SELECT r.*, u.nickname as reviewer_nickname, u.avatar as reviewer_avatar
     FROM reviews r JOIN users u ON u.id = r.reviewer_id
     WHERE r.reviewee_id = ? AND r.is_public = 1
     ORDER BY r.created_at DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`,
    [id]
  )
  const [{ total }] = await query('SELECT COUNT(*) as total FROM reviews WHERE reviewee_id = ? AND is_public = 1', [id])

  const formatted = list.map(r => ({ ...r, reviewer: { id: r.reviewer_id, nickname: r.reviewer_nickname, avatar: r.reviewer_avatar } }))
  res.json({ success: true, data: { list: formatted, total } })
}
