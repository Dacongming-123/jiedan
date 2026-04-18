const { query, queryOne } = require('../config/db')

// POST /api/requirements/:id/favorite  (toggle)
exports.toggle = async (req, res) => {
  const { id } = req.params
  const userId = req.user.id

  const r = await queryOne('SELECT id FROM requirements WHERE id = ?', [id])
  if (!r) return res.status(404).json({ success: false, message: '需求不存在' })

  const existing = await queryOne('SELECT id FROM favorites WHERE user_id = ? AND requirement_id = ?', [userId, id])
  if (existing) {
    await query('DELETE FROM favorites WHERE user_id = ? AND requirement_id = ?', [userId, id])
  } else {
    await query('INSERT INTO favorites (user_id, requirement_id) VALUES (?, ?)', [userId, id])
  }
  const [{ count }] = await query('SELECT COUNT(*) as count FROM favorites WHERE requirement_id = ?', [id])
  res.json({ success: true, data: { favorited: !existing, favorite_count: count } })
}

// POST /api/requirements/:id/like  (toggle)
exports.toggleLike = async (req, res) => {
  const { id } = req.params
  const userId = req.user.id

  const r = await queryOne('SELECT id FROM requirements WHERE id = ?', [id])
  if (!r) return res.status(404).json({ success: false, message: '需求不存在' })

  const existing = await queryOne('SELECT id FROM likes WHERE user_id = ? AND requirement_id = ?', [userId, id])
  if (existing) {
    await query('DELETE FROM likes WHERE user_id = ? AND requirement_id = ?', [userId, id])
  } else {
    await query('INSERT INTO likes (user_id, requirement_id) VALUES (?, ?)', [userId, id])
  }
  const [{ count }] = await query('SELECT COUNT(*) as count FROM likes WHERE requirement_id = ?', [id])
  res.json({ success: true, data: { liked: !existing, like_count: count } })
}

// GET /api/users/me/favorites
exports.list = async (req, res) => {
  const { page = 1, limit = 12 } = req.query
  const offset = (page - 1) * limit
  const list = await query(
    `SELECT r.*, u.nickname as employer_nickname, u.avatar as employer_avatar, f.created_at as favorited_at
     FROM favorites f
     JOIN requirements r ON r.id = f.requirement_id
     JOIN users u ON u.id = r.employer_id
     WHERE f.user_id = ?
     ORDER BY f.created_at DESC
     LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`,
    [req.user.id]
  )
  const [{ total }] = await query('SELECT COUNT(*) as total FROM favorites WHERE user_id = ?', [req.user.id])
  res.json({ success: true, data: { list, total } })
}
