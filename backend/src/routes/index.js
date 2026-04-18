const express = require('express')
const router = express.Router()
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { auth, adminAuth } = require('../middleware/auth')
const { sms, auth: authLimiter } = require('../middleware/rateLimiter')

// 上传目录
const uploadsDir = path.join(__dirname, '../../uploads')
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })

// 头像上传（仅图片，5MB）
const avatarUpload = multer({
  dest: uploadsDir,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    cb(null, allowed.includes(file.mimetype))
  },
})

// 作品集上传（图片/视频/文档，最大 100MB）
const PORTFOLIO_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const PORTFOLIO_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm']
const PORTFOLIO_DOC_TYPES   = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]
const portfolioUpload = multer({
  dest: uploadsDir,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [...PORTFOLIO_IMAGE_TYPES, ...PORTFOLIO_VIDEO_TYPES, ...PORTFOLIO_DOC_TYPES]
    cb(null, allowed.includes(file.mimetype))
  },
})

// 素材上传（管理员，仅图片，10MB，保存到 assets 子目录保持原扩展名）
const assetsDir = path.join(uploadsDir, 'assets')
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true })
const assetStorage = multer.diskStorage({
  destination: assetsDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg'
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`)
  },
})
const assetUpload = multer({
  storage: assetStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    cb(null, allowed.includes(file.mimetype))
  },
})

const authCtrl = require('../controllers/authController')
const userCtrl = require('../controllers/userController')
const reqCtrl = require('../controllers/requirementController')
const appCtrl = require('../controllers/applicationController')
const orderCtrl = require('../controllers/orderController')
const payCtrl = require('../controllers/paymentController')
const walletCtrl = require('../controllers/walletController')
const msgCtrl = require('../controllers/messageController')
const favCtrl = require('../controllers/favoriteController')
const reviewCtrl = require('../controllers/reviewController')
const appealCtrl = require('../controllers/appealController')
const notifCtrl = require('../controllers/notificationController')
const adminCtrl = require('../controllers/adminController')
const analyticsCtrl = require('../controllers/analyticsController')
const platformCfgCtrl = require('../controllers/platformConfigController')

// ─── Page Tracking ──────────────────────────────────────
router.post('/track', (req, res, next) => {
  const header = req.headers.authorization
  if (header) return auth(req, res, next)
  next()
}, analyticsCtrl.track)

// ─── Auth ────────────────────────────────────────────────
router.post('/auth/send-code', sms, authCtrl.sendCode)
router.post('/auth/login/code', authLimiter, authCtrl.loginByCode)
router.post('/auth/login/password', authLimiter, authCtrl.loginByPassword)
router.post('/auth/register', authLimiter, authCtrl.register)
router.post('/auth/reset-password', authLimiter, authCtrl.resetPassword)
router.get('/auth/wechat/url', authCtrl.wechatOAuthUrl)
router.get('/auth/wechat/callback', authCtrl.wechatCallback)
router.get('/auth/douyin/url', authCtrl.douyinOAuthUrl)
router.get('/auth/douyin/callback', authCtrl.douyinCallback)

// ─── Users ───────────────────────────────────────────────
router.get('/users', userCtrl.listCreators)
router.get('/users/me', auth, (req, res) => {
  const { queryOne } = require('../config/db')
  queryOne('SELECT u.*, p.bio, p.location, p.skills, p.categories FROM users u LEFT JOIN user_profiles p ON p.user_id = u.id WHERE u.id = ?', [req.user.id])
    .then(user => {
      if (!user) return res.status(404).json({ success: false })
      const { password_hash, ...safe } = user
      res.json({ success: true, data: safe })
    })
})
router.get('/users/:id', userCtrl.getProfile)
router.put('/users/me', auth, userCtrl.updateProfile)
router.post('/users/me/avatar', auth, avatarUpload.single('avatar'), userCtrl.uploadAvatar)
router.post('/users/me/portfolio', auth, portfolioUpload.single('file'), userCtrl.uploadPortfolio)
router.delete('/users/me/portfolio/:index', auth, userCtrl.deletePortfolio)
router.put('/users/me/password', auth, authCtrl.changePassword)
router.get('/users/me/favorites', auth, favCtrl.list)

// ─── Requirements ────────────────────────────────────────
router.get('/requirements', (req, res, next) => {
  const header = req.headers.authorization
  if (header) return auth(req, res, next)
  next()
}, reqCtrl.list)
router.get('/requirements/mine', auth, reqCtrl.myList)
router.get('/requirements/:id', (req, res, next) => {
  // 可选认证
  const header = req.headers.authorization
  if (header) return auth(req, res, next)
  next()
}, reqCtrl.detail)
router.post('/requirements', auth, reqCtrl.create)
router.put('/requirements/:id', auth, reqCtrl.update)
router.delete('/requirements/:id', auth, reqCtrl.remove)

// ─── Applications ────────────────────────────────────────
router.get('/requirements/:id/applications', auth, appCtrl.list)
router.post('/requirements/:id/apply', auth, appCtrl.apply)
router.get('/applications/mine', auth, appCtrl.myApplications)
router.put('/applications/:id/accept', auth, appCtrl.accept)
router.put('/applications/:id/reject', auth, appCtrl.reject)
router.put('/applications/:id/withdraw', auth, appCtrl.withdraw)

// ─── Orders ──────────────────────────────────────────────
router.get('/orders', auth, orderCtrl.list)
router.get('/orders/:id', auth, orderCtrl.detail)
router.post('/orders/:id/confirm', auth, orderCtrl.confirm)
router.post('/orders/:id/cancel', auth, orderCtrl.cancel)
router.post('/orders/:id/change', auth, orderCtrl.requestChange)
router.put('/orders/changes/:changeId/approve', auth, orderCtrl.approveChange)
router.put('/orders/changes/:changeId/reject', auth, orderCtrl.rejectChange)
router.post('/orders/milestones/:milestoneId/submit', auth, orderCtrl.submitMilestone)
router.put('/orders/milestones/:milestoneId/approve', auth, orderCtrl.approveMilestone)
router.put('/orders/milestones/:milestoneId/revision', auth, orderCtrl.requestRevision)

// ─── Payments ────────────────────────────────────────────
router.post('/payments/mock', auth, payCtrl.mockPay)
router.post('/payments/alipay', auth, payCtrl.createAlipay)
router.post('/payments/wechat', auth, payCtrl.createWechat)
router.get('/payments/:paymentNo/status', auth, payCtrl.status)
router.post('/payments/notify/wechat', express.raw({ type: '*/*' }), payCtrl.wechatNotify)
router.post('/payments/notify/alipay', payCtrl.alipayNotify)

// ─── Wallet ──────────────────────────────────────────────
router.get('/wallet', auth, walletCtrl.get)
router.get('/wallet/transactions', auth, walletCtrl.transactions)
router.post('/wallet/withdraw', auth, walletCtrl.withdraw)

// ─── Favorites & Likes ───────────────────────────────────
router.post('/requirements/:id/favorite', auth, favCtrl.toggle)
router.post('/requirements/:id/like', auth, favCtrl.toggleLike)

// ─── Messages ────────────────────────────────────────────
router.get('/conversations', auth, msgCtrl.list)
router.post('/conversations', auth, msgCtrl.start)
router.get('/conversations/:id/messages', auth, msgCtrl.messages)

// ─── Reviews ─────────────────────────────────────────────
router.post('/orders/:id/review', auth, reviewCtrl.submit)
router.get('/orders/:id/reviews', reviewCtrl.getByOrder)
router.get('/users/:id/reviews', reviewCtrl.getByUser)

// ─── Appeals ─────────────────────────────────────────────
router.post('/orders/:id/appeal', auth, appealCtrl.submit)
router.get('/appeals/:id', auth, appealCtrl.detail)
router.post('/appeals/:id/reply', auth, appealCtrl.reply)

// ─── Notifications ───────────────────────────────────────
router.get('/notifications', auth, notifCtrl.list)
router.put('/notifications/read-all', auth, notifCtrl.markAllRead)
router.put('/notifications/:id/read', auth, notifCtrl.markRead)
router.get('/notifications/unread-count', auth, notifCtrl.unreadCount)

// ─── Public Page Configs ─────────────────────────────────
router.get('/configs/:key', async (req, res) => {
  const { queryOne } = require('../config/db')
  const row = await queryOne('SELECT config_json FROM page_configs WHERE page_key = ?', [req.params.key])
  if (!row) return res.status(404).json({ success: false })
  res.json({ success: true, data: typeof row.config_json === 'string' ? JSON.parse(row.config_json) : row.config_json })
})

// ─── Admin ───────────────────────────────────────────────
router.post('/admin/login', authLimiter, adminCtrl.login)
router.get('/admin/stats', adminAuth, adminCtrl.stats)
router.get('/admin/users', adminAuth, adminCtrl.users)
router.put('/admin/users/:id/ban', adminAuth, adminCtrl.banUser)
router.get('/admin/orders', adminAuth, adminCtrl.orders)
router.get('/admin/appeals', adminAuth, adminCtrl.appeals)
router.put('/admin/appeals/:id/resolve', adminAuth, adminCtrl.resolveAppeal)
router.get('/admin/configs', adminAuth, adminCtrl.configs)
router.put('/admin/configs/:key', adminAuth, adminCtrl.updateConfig)
router.get('/admin/assets', adminAuth, adminCtrl.listAssets)
router.post('/admin/assets', adminAuth, assetUpload.single('file'), adminCtrl.uploadAsset)
router.delete('/admin/assets/:filename', adminAuth, adminCtrl.deleteAsset)

// ─── Admin Platform Configs ──────────────────────────────
router.get('/admin/platform-configs', adminAuth, platformCfgCtrl.list)
router.put('/admin/platform-configs/:platform', adminAuth, platformCfgCtrl.update)
router.post('/admin/platform-configs/:platform/test', adminAuth, platformCfgCtrl.test)

// ─── Admin Analytics ─────────────────────────────────────
router.get('/admin/analytics', adminAuth, analyticsCtrl.overview)
router.get('/admin/analytics/ips', adminAuth, analyticsCtrl.ipList)

module.exports = router
