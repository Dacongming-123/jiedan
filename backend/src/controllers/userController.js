const path = require('path')
const { query, queryOne } = require('../config/db')

// GET /api/users/:id
exports.getProfile = async (req, res) => {
  const { id } = req.params
  const user = await queryOne(
    `SELECT u.id, u.nickname, u.avatar, u.role, u.verified, u.created_at,
            p.bio, p.skills, p.categories, p.location, p.rating_avg, p.rating_count,
            p.completed_orders, p.total_income, p.response_rate, p.on_time_rate,
            p.portfolio_urls, p.verification_status
     FROM users u
     LEFT JOIN user_profiles p ON p.user_id = u.id
     WHERE u.id = ? AND u.status = 'active'`,
    [id]
  )
  if (!user) return res.status(404).json({ success: false, message: '用户不存在' })
  res.json({ success: true, data: user })
}

// GET /api/users  (creator list)
exports.listCreators = async (req, res) => {
  const { category, sort = 'rating', search, page = 1, limit = 12 } = req.query
  const offset = (page - 1) * limit
  let where = "u.status = 'active' AND u.role = 'creator'"
  const params = []

  if (search) { where += ' AND u.nickname LIKE ?'; params.push(`%${search}%`) }
  if (category) { where += " AND JSON_CONTAINS(p.categories, ?)"; params.push(JSON.stringify(category)) }

  const sortMap = {
    rating: 'p.rating_avg DESC',
    completed_orders: 'p.completed_orders DESC',
    latest: 'u.created_at DESC',
  }
  const orderBy = sortMap[sort] || sortMap.rating

  const [list, [{ total }]] = await Promise.all([
    query(
      `SELECT u.id, u.nickname, u.avatar, u.verified,
              p.bio, p.skills, p.categories, p.rating_avg, p.rating_count,
              p.completed_orders, p.on_time_rate, p.response_rate, p.total_income
       FROM users u LEFT JOIN user_profiles p ON p.user_id = u.id
       WHERE ${where} ORDER BY ${orderBy} LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`,
      params
    ),
    query(`SELECT COUNT(*) as total FROM users u LEFT JOIN user_profiles p ON p.user_id = u.id WHERE ${where}`, params),
  ])

  res.json({ success: true, data: { list, total, page: parseInt(page), limit: parseInt(limit) } })
}

// PUT /api/users/me
exports.updateProfile = async (req, res) => {
  const { nickname, bio, location, skills, categories } = req.body
  const userId = req.user.id

  if (nickname) await query('UPDATE users SET nickname = ? WHERE id = ?', [nickname, userId])

  await query(
    `INSERT INTO user_profiles (user_id, bio, location, skills, categories)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE bio=VALUES(bio), location=VALUES(location), skills=VALUES(skills), categories=VALUES(categories)`,
    [userId, bio || null, location || null,
     skills ? JSON.stringify(skills) : null,
     categories ? JSON.stringify(categories) : null]
  )

  const updated = await queryOne(
    `SELECT u.*, p.bio, p.location, p.skills, p.categories FROM users u LEFT JOIN user_profiles p ON p.user_id = u.id WHERE u.id = ?`,
    [userId]
  )
  const { password_hash, ...safe } = updated
  res.json({ success: true, data: safe })
}

// POST /api/users/me/avatar
exports.uploadAvatar = async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: '请选择图片' })
  const avatarUrl = `/uploads/${req.file.filename}`
  await query('UPDATE users SET avatar = ? WHERE id = ?', [avatarUrl, req.user.id])
  res.json({ success: true, data: { avatar: avatarUrl } })
}

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm']

// POST /api/users/me/portfolio  — 上传作品（图片/视频/文档）
exports.uploadPortfolio = async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: '请选择文件' })
  const { title = '' } = req.body
  const userId = req.user.id

  // 视频限制1分钟内，大致以50MB为上限（客户端也会控制）
  if (VIDEO_TYPES.includes(req.file.mimetype) && req.file.size > 50 * 1024 * 1024) {
    return res.status(400).json({ success: false, message: '视频文件不能超过50MB（约1分钟）' })
  }

  const profile = await queryOne('SELECT portfolio_urls FROM user_profiles WHERE user_id = ?', [userId])
  let items = []
  if (profile?.portfolio_urls) {
    items = typeof profile.portfolio_urls === 'string' ? JSON.parse(profile.portfolio_urls) : profile.portfolio_urls
  }
  if (items.length >= 20) return res.status(400).json({ success: false, message: '作品最多上传20个' })

  let type = 'document'
  if (IMAGE_TYPES.includes(req.file.mimetype)) type = 'image'
  else if (VIDEO_TYPES.includes(req.file.mimetype)) type = 'video'

  const url = `/uploads/${req.file.filename}`
  const originalName = req.file.originalname || ''
  items.push({ url, type, title: title.slice(0, 50) || originalName.slice(0, 50), filename: originalName })

  await query(
    `INSERT INTO user_profiles (user_id, portfolio_urls) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE portfolio_urls = VALUES(portfolio_urls)`,
    [userId, JSON.stringify(items)]
  )
  res.json({ success: true, data: { items } })
}

// DELETE /api/users/me/portfolio/:index  — 删除指定作品
exports.deletePortfolio = async (req, res) => {
  const index = parseInt(req.params.index)
  const userId = req.user.id

  const profile = await queryOne('SELECT portfolio_urls FROM user_profiles WHERE user_id = ?', [userId])
  let items = []
  if (profile?.portfolio_urls) {
    items = typeof profile.portfolio_urls === 'string' ? JSON.parse(profile.portfolio_urls) : profile.portfolio_urls
  }
  if (index < 0 || index >= items.length) return res.status(400).json({ success: false, message: '索引无效' })

  items.splice(index, 1)
  await query('UPDATE user_profiles SET portfolio_urls = ? WHERE user_id = ?', [JSON.stringify(items), userId])
  res.json({ success: true, data: { items } })
}
