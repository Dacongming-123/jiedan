const { query, queryOne } = require('../config/db')

// GET /api/notifications
exports.list = async (req, res) => {
  const { page = 1, limit = 20 } = req.query
  const offset = (page - 1) * limit

  const list = await query(
    `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`,
    [req.user.id]
  )
  const [{ total }] = await query('SELECT COUNT(*) as total FROM notifications WHERE user_id = ?', [req.user.id])
  res.json({ success: true, data: { list, total } })
}

// PUT /api/notifications/:id/read
exports.markRead = async (req, res) => {
  await query('UPDATE notifications SET is_read = 1, read_at = NOW() WHERE id = ? AND user_id = ?', [req.params.id, req.user.id])
  res.json({ success: true })
}

// PUT /api/notifications/read-all
exports.markAllRead = async (req, res) => {
  await query('UPDATE notifications SET is_read = 1, read_at = NOW() WHERE user_id = ? AND is_read = 0', [req.user.id])
  res.json({ success: true })
}

// GET /api/notifications/unread-count
exports.unreadCount = async (req, res) => {
  const [{ count }] = await query('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0', [req.user.id])
  res.json({ success: true, data: { count } })
}
