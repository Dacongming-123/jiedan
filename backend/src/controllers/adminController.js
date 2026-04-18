const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const fs = require('fs')
const path = require('path')
const { query, queryOne, transaction } = require('../config/db')

const ASSETS_DIR = path.join(__dirname, '../../uploads/assets')

// POST /api/admin/login
exports.login = async (req, res) => {
  const { username, password } = req.body
  const admin = await queryOne('SELECT * FROM admin_users WHERE username = ? AND status = ?', [username, 'active'])
  if (!admin) return res.status(401).json({ success: false, message: '用户名或密码错误' })
  const ok = await bcrypt.compare(password, admin.password_hash)
  if (!ok) return res.status(401).json({ success: false, message: '用户名或密码错误' })

  await query('UPDATE admin_users SET last_login = NOW() WHERE id = ?', [admin.id])
  const token = jwt.sign({ id: admin.id, isAdmin: true, role: admin.role }, process.env.JWT_SECRET || 'dev_secret', { expiresIn: '8h' })
  res.json({ success: true, data: { token, admin: { id: admin.id, username: admin.username, role: admin.role } } })
}

// GET /api/admin/stats
exports.stats = async (req, res) => {
  const [users, active_orders, today_amount, pending_appeals] = await Promise.all([
    queryOne("SELECT COUNT(*) as c FROM users WHERE status = 'active'"),
    queryOne("SELECT COUNT(*) as c FROM orders WHERE status IN ('in_progress','pending_review','revision')"),
    queryOne("SELECT COALESCE(SUM(amount),0) as c FROM payments WHERE DATE(paid_at) = CURDATE() AND status = 'success'"),
    queryOne("SELECT COUNT(*) as c FROM appeals WHERE resolution = 'pending'"),
  ])
  res.json({ success: true, data: { users: users.c, active_orders: active_orders.c, today_amount: today_amount.c, pending_appeals: pending_appeals.c } })
}

// GET /api/admin/users
exports.users = async (req, res) => {
  const { search, page = 1, limit = 20 } = req.query
  const offset = (page - 1) * limit
  let where = '1=1'
  const params = []
  if (search) { where += ' AND (nickname LIKE ? OR phone LIKE ?)'; params.push(`%${search}%`, `%${search}%`) }

  const [list, [{ total }]] = await Promise.all([
    query(`SELECT id, nickname, phone, role, status, avatar, created_at, last_login_at FROM users WHERE ${where} ORDER BY created_at DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`, params),
    query(`SELECT COUNT(*) as total FROM users WHERE ${where}`, params),
  ])
  res.json({ success: true, data: { list, total } })
}

// PUT /api/admin/users/:id/ban
exports.banUser = async (req, res) => {
  const { reason } = req.body
  await query("UPDATE users SET status = 'banned' WHERE id = ?", [req.params.id])
  res.json({ success: true })
}

// GET /api/admin/orders
exports.orders = async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query
  const offset = (page - 1) * limit
  let where = '1=1'
  const params = []
  if (status) { where += ' AND o.status = ?'; params.push(status) }

  const list = await query(
    `SELECT o.*, e.nickname as employer_nickname, c.nickname as creator_nickname
     FROM orders o JOIN users e ON e.id = o.employer_id JOIN users c ON c.id = o.creator_id
     WHERE ${where} ORDER BY o.created_at DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`,
    params
  )
  const formatted = list.map(o => ({
    ...o,
    employer: { id: o.employer_id, nickname: o.employer_nickname },
    creator: { id: o.creator_id, nickname: o.creator_nickname },
  }))
  res.json({ success: true, data: { list: formatted } })
}

// GET /api/admin/appeals
exports.appeals = async (req, res) => {
  const { page = 1, limit = 20 } = req.query
  const offset = (page - 1) * limit
  const list = await query(
    `SELECT a.*, u.nickname as appellant_name, o.employer_id, o.creator_id
     FROM appeals a JOIN users u ON u.id = a.appellant_id JOIN orders o ON o.id = a.order_id
     ORDER BY a.created_at DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`,
    []
  )
  res.json({ success: true, data: { list } })
}

// PUT /api/admin/appeals/:id/resolve
exports.resolveAppeal = async (req, res) => {
  const { id } = req.params
  const { resolution, admin_note, split_ratio } = req.body

  const appeal = await queryOne('SELECT a.*, o.final_price, o.creator_id, o.employer_id FROM appeals a JOIN orders o ON o.id = a.order_id WHERE a.id = ?', [id])
  if (!appeal) return res.status(404).json({ success: false, message: '申诉不存在' })

  await transaction(async (conn) => {
    await conn.execute(
      'UPDATE appeals SET resolution = ?, admin_note = ?, admin_id = ?, resolved_at = NOW() WHERE id = ?',
      [resolution, admin_note, req.admin.id, id]
    )
    await conn.execute("UPDATE orders SET status = 'completed' WHERE id = ?", [appeal.order_id])

    // 根据裁决结果分配资金
    const total = appeal.creator_income || appeal.final_price * 0.95
    if (resolution === 'resolved_for_appellant') {
      // 退款给雇主
      await conn.execute('UPDATE wallets SET available = available + ?, frozen = frozen - ? WHERE user_id = ?', [total, total, appeal.creator_id])
      await conn.execute('UPDATE wallets SET available = available + ? WHERE user_id = ?', [total, appeal.employer_id])
    } else if (resolution === 'resolved_for_respondent') {
      // 全付给创作者
      await conn.execute('UPDATE wallets SET available = available + ?, frozen = frozen - ? WHERE user_id = ?', [total, total, appeal.creator_id])
    } else if (resolution === 'resolved_split' && split_ratio) {
      const creatorPart = Math.round(total * split_ratio / 100 * 100) / 100
      const employerPart = total - creatorPart
      await conn.execute('UPDATE wallets SET available = available + ?, frozen = frozen - ? WHERE user_id = ?', [creatorPart, total, appeal.creator_id])
      await conn.execute('UPDATE wallets SET available = available + ? WHERE user_id = ?', [employerPart, appeal.employer_id])
    }
  })

  res.json({ success: true })
}

// GET /api/admin/configs
exports.configs = async (req, res) => {
  const list = await query('SELECT * FROM page_configs ORDER BY page_key')
  res.json({ success: true, data: { list } })
}

// PUT /api/admin/configs/:key
exports.updateConfig = async (req, res) => {
  const { key } = req.params
  const { config_json } = req.body
  await query('UPDATE page_configs SET config_json = ?, updated_by = ? WHERE page_key = ?', [JSON.stringify(config_json), req.admin.id, key])
  res.json({ success: true })
}

// GET /api/admin/assets
exports.listAssets = (req, res) => {
  if (!fs.existsSync(ASSETS_DIR)) return res.json({ success: true, data: { list: [] } })
  const files = fs.readdirSync(ASSETS_DIR)
    .filter(f => /\.(jpe?g|png|webp|gif)$/i.test(f))
    .map(filename => {
      const stat = fs.statSync(path.join(ASSETS_DIR, filename))
      return {
        filename,
        url: `/uploads/assets/${filename}`,
        size: stat.size,
        created_at: stat.birthtime,
      }
    })
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  res.json({ success: true, data: { list: files } })
}

// POST /api/admin/assets
exports.uploadAsset = (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: '请选择图片（JPG/PNG/WebP/GIF，最大10MB）' })
  res.json({
    success: true,
    data: {
      filename: req.file.filename,
      url: `/uploads/assets/${req.file.filename}`,
      size: req.file.size,
    },
  })
}

// DELETE /api/admin/assets/:filename
exports.deleteAsset = (req, res) => {
  const filename = path.basename(req.params.filename) // 防止路径穿越
  const filepath = path.join(ASSETS_DIR, filename)
  if (!fs.existsSync(filepath)) return res.status(404).json({ success: false, message: '文件不存在' })
  fs.unlinkSync(filepath)
  res.json({ success: true })
}
