const { query, queryOne } = require('../config/db')

// GET /api/wallet
exports.get = async (req, res) => {
  let wallet = await queryOne('SELECT * FROM wallets WHERE user_id = ?', [req.user.id])
  if (!wallet) {
    await query('INSERT IGNORE INTO wallets (user_id) VALUES (?)', [req.user.id])
    wallet = await queryOne('SELECT * FROM wallets WHERE user_id = ?', [req.user.id])
  }
  res.json({ success: true, data: wallet })
}

// GET /api/wallet/transactions
exports.transactions = async (req, res) => {
  const { page = 1, limit = 20 } = req.query
  const offset = (page - 1) * limit
  const userId = req.user.id

  const list = await query(
    `SELECT wt.*,
       o.id as order_id, o.order_no, o.title as order_title,
       o.start_date, o.expected_end, o.deadline_days, o.created_at as order_created_at,
       CASE WHEN o.employer_id = ? THEN c.nickname ELSE e.nickname END as other_nickname,
       CASE WHEN o.employer_id = ? THEN c.avatar    ELSE e.avatar    END as other_avatar,
       CASE WHEN o.employer_id = ? THEN 'creator'   ELSE 'employer'  END as other_role
     FROM wallet_transactions wt
     LEFT JOIN orders o ON o.id = wt.ref_id AND wt.ref_type = 'order'
     LEFT JOIN users e ON e.id = o.employer_id
     LEFT JOIN users c ON c.id = o.creator_id
     WHERE wt.user_id = ?
     ORDER BY wt.created_at DESC
     LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`,
    [userId, userId, userId, userId]
  )
  const [{ total }] = await query('SELECT COUNT(*) as total FROM wallet_transactions WHERE user_id = ?', [userId])
  res.json({ success: true, data: { list, total } })
}

// POST /api/wallet/withdraw
exports.withdraw = async (req, res) => {
  const { amount, method } = req.body
  const userId = req.user.id
  if (!amount || amount <= 0) return res.status(400).json({ success: false, message: '提现金额无效' })

  const wallet = await queryOne('SELECT * FROM wallets WHERE user_id = ?', [userId])
  if (!wallet || wallet.available < amount) {
    return res.status(400).json({ success: false, message: '余额不足' })
  }

  await query('UPDATE wallets SET available = available - ? WHERE user_id = ?', [amount, userId])
  await query(
    "INSERT INTO wallet_transactions (wallet_id, user_id, type, amount, ref_type, description) SELECT id, ?, 'withdraw', ?, 'withdraw', ? FROM wallets WHERE user_id = ?",
    [userId, -amount, `提现到${method === 'alipay' ? '支付宝' : '微信'}`, userId]
  )

  res.json({ success: true, data: { message: '提现申请已提交，1-3工作日到账' } })
}
