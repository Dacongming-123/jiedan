const rateLimit = require('express-rate-limit')

const general = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, message: '请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
})

const auth = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: '操作过于频繁，请15分钟后再试' },
})

const sms = rateLimit({
  windowMs: 60 * 1000,
  max: 1,
  message: { success: false, message: '请等待60秒后再发送' },
  keyGenerator: (req) => req.body?.phone || req.ip,
})

module.exports = { general, auth, sms }
