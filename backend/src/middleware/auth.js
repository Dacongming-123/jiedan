const jwt = require('jsonwebtoken')
const { queryOne } = require('../config/db')

async function auth(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: '未授权，请先登录' })
  }
  const token = header.slice(7)
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret')
    const user = await queryOne('SELECT id, nickname, phone, email, role, status, avatar FROM users WHERE id = ?', [payload.id])
    if (!user || user.status === 'banned') {
      return res.status(401).json({ success: false, message: '账号异常' })
    }
    req.user = user
    next()
  } catch (e) {
    return res.status(401).json({ success: false, message: 'Token无效或已过期' })
  }
}

async function adminAuth(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: '未授权' })
  }
  const token = header.slice(7)
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret')
    if (!payload.isAdmin) {
      return res.status(403).json({ success: false, message: '无权限' })
    }
    req.admin = payload
    next()
  } catch (e) {
    return res.status(401).json({ success: false, message: 'Token无效' })
  }
}

module.exports = { auth, adminAuth }
