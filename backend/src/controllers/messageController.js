const { query, queryOne } = require('../config/db')

// GET /api/conversations
exports.list = async (req, res) => {
  const userId = req.user.id
  const list = await query(
    `SELECT c.*,
            ua.nickname as user_a_name, ua.avatar as user_a_avatar,
            ub.nickname as user_b_name, ub.avatar as user_b_avatar
     FROM conversations c
     JOIN users ua ON ua.id = c.user_a
     JOIN users ub ON ub.id = c.user_b
     WHERE c.user_a = ? OR c.user_b = ?
     ORDER BY c.last_msg_at DESC LIMIT 50`,
    [userId, userId]
  )
  res.json({ success: true, data: { list } })
}

// POST /api/conversations
exports.start = async (req, res) => {
  const { user_id } = req.body
  const myId = req.user.id
  if (!user_id || user_id == myId) return res.status(400).json({ success: false, message: '无效的用户' })

  const [a, b] = myId < user_id ? [myId, user_id] : [user_id, myId]
  let conv = await queryOne('SELECT * FROM conversations WHERE user_a = ? AND user_b = ?', [a, b])

  if (!conv) {
    const r = await query('INSERT INTO conversations (user_a, user_b) VALUES (?, ?)', [a, b])
    conv = await queryOne('SELECT * FROM conversations WHERE id = ?', [r.insertId])
  }

  res.json({ success: true, data: { conversation_id: conv.id } })
}

// GET /api/conversations/:id/messages
exports.messages = async (req, res) => {
  const { id } = req.params
  const { limit = 50, before_id } = req.query
  const userId = req.user.id

  const conv = await queryOne('SELECT * FROM conversations WHERE id = ?', [id])
  if (!conv) return res.status(404).json({ success: false, message: '会话不存在' })
  if (conv.user_a !== userId && conv.user_b !== userId) return res.status(403).json({ success: false, message: '无权限' })

  let where = 'conversation_id = ?'
  const params = [id]
  if (before_id) { where += ' AND id < ?'; params.push(before_id) }

  const list = await query(
    `SELECT m.*, u.nickname as sender_name, u.avatar as sender_avatar
     FROM messages m JOIN users u ON u.id = m.sender_id
     WHERE ${where} ORDER BY m.created_at DESC LIMIT ${parseInt(limit)}`,
    params
  )

  // 标记已读
  const unreadField = conv.user_a === userId ? 'unread_a' : 'unread_b'
  await query(`UPDATE conversations SET ${unreadField} = 0 WHERE id = ?`, [id])
  await query('UPDATE messages SET is_read = 1, read_at = NOW() WHERE conversation_id = ? AND sender_id != ?', [id, userId])

  res.json({ success: true, data: { list: list.reverse() } })
}
