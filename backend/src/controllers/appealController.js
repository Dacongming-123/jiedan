const { query, queryOne } = require('../config/db')

// POST /api/orders/:id/appeal
exports.submit = async (req, res) => {
  const { id } = req.params
  const { reason, evidence_urls = [] } = req.body
  const userId = req.user.id

  if (!reason?.trim()) return res.status(400).json({ success: false, message: '申诉原因不能为空' })

  const o = await queryOne('SELECT * FROM orders WHERE id = ?', [id])
  if (!o) return res.status(404).json({ success: false, message: '订单不存在' })
  if (o.employer_id !== userId && o.creator_id !== userId) return res.status(403).json({ success: false, message: '无权限' })
  if (!['in_progress', 'pending_review', 'revision'].includes(o.status)) {
    return res.status(400).json({ success: false, message: '当前订单状态不支持申诉' })
  }

  const existingAppeal = await queryOne("SELECT id FROM appeals WHERE order_id = ? AND resolution = 'pending'", [id])
  if (existingAppeal) return res.status(400).json({ success: false, message: '已有进行中的申诉' })

  const r = await query(
    'INSERT INTO appeals (order_id, appellant_id, reason, evidence_urls) VALUES (?, ?, ?, ?)',
    [id, userId, reason, JSON.stringify(evidence_urls)]
  )
  await query("UPDATE orders SET status = 'appealing' WHERE id = ?", [id])

  // 通知另一方
  const notifyId = o.employer_id === userId ? o.creator_id : o.employer_id
  await query(
    "INSERT INTO notifications (user_id, type, title, content, link) VALUES (?, 'appeal', '收到申诉', '对方对该订单发起了申诉，请关注处理结果', ?)",
    [notifyId, `/orders/${id}`]
  )

  res.status(201).json({ success: true, data: { appeal_id: r.insertId } })
}

// GET /api/appeals/:id
exports.detail = async (req, res) => {
  const { id } = req.params
  const appeal = await queryOne(
    `SELECT a.*, u.nickname as appellant_name, o.employer_id, o.creator_id
     FROM appeals a JOIN users u ON u.id = a.appellant_id JOIN orders o ON o.id = a.order_id
     WHERE a.id = ?`,
    [id]
  )
  if (!appeal) return res.status(404).json({ success: false, message: '申诉不存在' })
  if (appeal.employer_id !== req.user.id && appeal.creator_id !== req.user.id) {
    return res.status(403).json({ success: false, message: '无权限' })
  }
  res.json({ success: true, data: appeal })
}

// POST /api/appeals/:id/reply
exports.reply = async (req, res) => {
  const { id } = req.params
  const { content } = req.body
  const appeal = await queryOne(
    'SELECT a.*, o.employer_id, o.creator_id FROM appeals a JOIN orders o ON o.id = a.order_id WHERE a.id = ?', [id]
  )
  if (!appeal) return res.status(404).json({ success: false, message: '申诉不存在' })
  if (appeal.employer_id !== req.user.id && appeal.creator_id !== req.user.id) return res.status(403).json({ success: false, message: '无权限' })
  if (appeal.appellant_id === req.user.id) return res.status(400).json({ success: false, message: '申诉发起方不能回复' })

  await query('UPDATE appeals SET respondent_reply = ? WHERE id = ?', [content, id])
  res.json({ success: true })
}
