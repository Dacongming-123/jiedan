const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid')
const { query, queryOne, transaction } = require('../config/db')

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.socket?.remoteAddress || req.connection?.remoteAddress || '0.0.0.0'
}

// 内存中存储验证码（生产环境改为Redis）
const codeStore = new Map()

function generateToken(userId, extra = {}) {
  return jwt.sign({ id: userId, ...extra }, process.env.JWT_SECRET || 'dev_secret', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  })
}

async function ensureWallet(conn, userId) {
  await conn.execute(
    'INSERT IGNORE INTO wallets (user_id) VALUES (?)',
    [userId]
  )
  await conn.execute(
    'INSERT IGNORE INTO user_profiles (user_id) VALUES (?)',
    [userId]
  )
}

// POST /api/auth/send-code
exports.sendCode = async (req, res) => {
  const { phone, captcha_verify_param } = req.body
  if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
    return res.status(400).json({ success: false, message: '手机号格式错误' })
  }
  // 阿里云验证码（未启用时自动通过）
  if (captcha_verify_param) {
    const { verify } = require('../services/aliyunCaptcha')
    const ok = await verify(captcha_verify_param)
    if (!ok) return res.status(400).json({ success: false, message: '验证码验证失败，请重试' })
  }
  const code = process.env.NODE_ENV === 'development'
    ? '1234'
    : Math.floor(100000 + Math.random() * 900000).toString()
  codeStore.set(phone, { code, expires: Date.now() + 10 * 60 * 1000 })
  console.log(`[SMS Mock] ${phone} 验证码: ${code}`)
  res.json({ success: true, message: '验证码已发送', dev_code: process.env.NODE_ENV === 'development' ? code : undefined })
}

// POST /api/auth/login/code
exports.loginByCode = async (req, res) => {
  const { phone, code } = req.body
  if (!phone || !code) return res.status(400).json({ success: false, message: '参数不完整' })

  const stored = codeStore.get(phone)
  if (!stored || stored.code !== code || Date.now() > stored.expires) {
    return res.status(400).json({ success: false, message: '验证码错误或已过期' })
  }
  codeStore.delete(phone)

  let user = await queryOne('SELECT * FROM users WHERE phone = ?', [phone])
  if (!user) {
    return res.status(400).json({ success: false, message: '手机号未注册，请先注册' })
  }

  const ip = getClientIp(req)
  await query('UPDATE users SET last_login_at = NOW(), last_ip = ? WHERE id = ?', [ip, user.id])
  const token = generateToken(user.id)
  res.json({ success: true, data: { token, user: sanitizeUser(user) } })
}

// POST /api/auth/login/password
exports.loginByPassword = async (req, res) => {
  const { phone, password } = req.body
  if (!phone || !password) return res.status(400).json({ success: false, message: '参数不完整' })

  const user = await queryOne('SELECT * FROM users WHERE phone = ?', [phone])
  if (!user || !user.password_hash) {
    return res.status(400).json({ success: false, message: '手机号或密码错误' })
  }
  const ok = await bcrypt.compare(password, user.password_hash)
  if (!ok) return res.status(400).json({ success: false, message: '手机号或密码错误' })
  if (user.status === 'banned') return res.status(403).json({ success: false, message: '账号已被封禁' })

  const ip = getClientIp(req)
  await query('UPDATE users SET last_login_at = NOW(), last_ip = ? WHERE id = ?', [ip, user.id])
  const token = generateToken(user.id)
  res.json({ success: true, data: { token, user: sanitizeUser(user) } })
}

// POST /api/auth/register
exports.register = async (req, res) => {
  const { phone, code, nickname, password, role } = req.body
  if (!phone || !code) return res.status(400).json({ success: false, message: '参数不完整' })
  if (!['employer', 'creator'].includes(role)) {
    return res.status(400).json({ success: false, message: '请选择身份：雇主或创作者' })
  }

  const stored = codeStore.get(phone)
  if (!stored || stored.code !== code || Date.now() > stored.expires) {
    return res.status(400).json({ success: false, message: '验证码错误或已过期' })
  }
  const exists = await queryOne('SELECT id FROM users WHERE phone = ?', [phone])
  if (exists) return res.status(400).json({ success: false, message: '手机号已注册' })

  codeStore.delete(phone)
  const password_hash = password ? await bcrypt.hash(password, 10) : null

  const userId = await transaction(async (conn) => {
    const [r] = await conn.execute(
      'INSERT INTO users (phone, nickname, password_hash, role) VALUES (?, ?, ?, ?)',
      [phone, nickname || `用户${phone.slice(-4)}`, password_hash, role]
    )
    await ensureWallet(conn, r.insertId)
    return r.insertId
  })

  const user = await queryOne('SELECT * FROM users WHERE id = ?', [userId])
  const token = generateToken(userId)
  res.json({ success: true, data: { token, user: sanitizeUser(user) } })
}

// GET /api/auth/wechat/url — 获取微信授权跳转 URL
exports.wechatOAuthUrl = async (req, res) => {
  try {
    const { getOAuthUrl } = require('../services/wechatOauth')
    const state = Math.random().toString(36).slice(2)
    const url = await getOAuthUrl(state)
    res.json({ success: true, data: { url } })
  } catch (e) {
    res.status(400).json({ success: false, message: e.message })
  }
}

// GET /api/auth/wechat/callback — 微信回调（浏览器跳转）
exports.wechatCallback = async (req, res) => {
  const { code, state } = req.query
  if (!code) return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=wechat_failed`)
  try {
    const { getAccessToken, getUserInfo } = require('../services/wechatOauth')
    const tokenData = await getAccessToken(code)
    const userInfo = await getUserInfo(tokenData.access_token, tokenData.openid)

    let user = await queryOne('SELECT * FROM users WHERE wechat_openid = ?', [userInfo.openid])
    if (!user) {
      const userId = await transaction(async (conn) => {
        const [r] = await conn.execute(
          'INSERT INTO users (wechat_openid, nickname, avatar, role) VALUES (?, ?, ?, ?)',
          [userInfo.openid, userInfo.nickname || '微信用户', userInfo.headimgurl || null, 'employer']
        )
        await ensureWallet(conn, r.insertId)
        return r.insertId
      })
      user = await queryOne('SELECT * FROM users WHERE id = ?', [userId])
    }
    const ip = getClientIp(req)
    await query('UPDATE users SET last_login_at = NOW(), last_ip = ? WHERE id = ?', [ip, user.id])
    const token = generateToken(user.id)
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?token=${token}&method=wechat`)
  } catch (e) {
    console.error('[WechatCallback]', e)
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=wechat_failed`)
  }
}

// GET /api/auth/douyin/url — 获取抖音授权 URL
exports.douyinOAuthUrl = async (req, res) => {
  try {
    const { getOAuthUrl } = require('../services/douyinOauth')
    const state = Math.random().toString(36).slice(2)
    const url = await getOAuthUrl(state)
    res.json({ success: true, data: { url } })
  } catch (e) {
    res.status(400).json({ success: false, message: e.message })
  }
}

// GET /api/auth/douyin/callback — 抖音回调
exports.douyinCallback = async (req, res) => {
  const { code } = req.query
  if (!code) return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=douyin_failed`)
  try {
    const { getAccessToken, getUserInfo } = require('../services/douyinOauth')
    const tokenData = await getAccessToken(code)
    const userInfo = await getUserInfo(tokenData.access_token, tokenData.open_id)

    let user = await queryOne('SELECT * FROM users WHERE douyin_openid = ?', [userInfo.open_id])
    if (!user) {
      const userId = await transaction(async (conn) => {
        const [r] = await conn.execute(
          'INSERT INTO users (douyin_openid, nickname, avatar, role) VALUES (?, ?, ?, ?)',
          [userInfo.open_id, userInfo.nickname || '抖音用户', userInfo.avatar || null, 'employer']
        )
        await ensureWallet(conn, r.insertId)
        return r.insertId
      })
      user = await queryOne('SELECT * FROM users WHERE id = ?', [userId])
    }
    const ip = getClientIp(req)
    await query('UPDATE users SET last_login_at = NOW(), last_ip = ? WHERE id = ?', [ip, user.id])
    const token = generateToken(user.id)
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?token=${token}&method=douyin`)
  } catch (e) {
    console.error('[DouyinCallback]', e)
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=douyin_failed`)
  }
}

// POST /api/auth/reset-password （忘记密码，用短信验证码重置）
exports.resetPassword = async (req, res) => {
  const { phone, code, new_password } = req.body
  if (!phone || !code || !new_password) {
    return res.status(400).json({ success: false, message: '参数不完整' })
  }
  if (new_password.length < 6) {
    return res.status(400).json({ success: false, message: '新密码至少 6 位' })
  }
  const stored = codeStore.get(phone)
  if (!stored || stored.code !== code || Date.now() > stored.expires) {
    return res.status(400).json({ success: false, message: '验证码错误或已过期' })
  }
  const user = await queryOne('SELECT id FROM users WHERE phone = ?', [phone])
  if (!user) return res.status(400).json({ success: false, message: '该手机号未注册' })

  codeStore.delete(phone)
  const hash = await bcrypt.hash(new_password, 10)
  await query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, user.id])
  res.json({ success: true, data: { message: '密码重置成功' } })
}

// PUT /api/users/me/password
exports.changePassword = async (req, res) => {
  const { current_password, new_password } = req.body
  if (!new_password || new_password.length < 6) {
    return res.status(400).json({ success: false, message: '新密码至少6位' })
  }
  const user = await queryOne('SELECT * FROM users WHERE id = ?', [req.user.id])
  if (user.password_hash) {
    if (!current_password) return res.status(400).json({ success: false, message: '请输入当前密码' })
    const ok = await bcrypt.compare(current_password, user.password_hash)
    if (!ok) return res.status(400).json({ success: false, message: '当前密码错误' })
  }
  const hash = await bcrypt.hash(new_password, 10)
  await query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.user.id])
  res.json({ success: true, data: { message: '密码已更新' } })
}

function sanitizeUser(user) {
  const { password_hash, ...safe } = user
  return safe
}
