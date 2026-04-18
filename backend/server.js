require('dotenv').config()
const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
const helmet = require('helmet')
const compression = require('compression')
const morgan = require('morgan')
const path = require('path')

const routes = require('./src/routes/index')
const setupSocket = require('./src/services/socketService')
const { general } = require('./src/middleware/rateLimiter')

const app = express()
const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})

// ─── Middleware ───────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }))
app.use(compression())
app.use(morgan('dev'))
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json({ limit: '10mb', verify: (req, res, buf) => { req.rawBody = buf } }))
app.use(express.urlencoded({ extended: true }))

// 地理位置记录（简化版，用IP）
app.use((req, res, next) => {
  if (req.path.includes('/auth/login') || req.path.includes('/auth/register')) {
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown'
    const { query } = require('./src/config/db')
    query(
      "INSERT INTO geolocation_logs (ip_address, action, user_agent) VALUES (?, ?, ?)",
      [ip, 'login', req.headers['user-agent']?.slice(0, 500) || '']
    ).catch(() => {})
  }
  next()
})

// ─── Static uploads ──────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// ─── Rate Limit ───────────────────────────────────────────
app.use('/api', general)

// ─── Routes ──────────────────────────────────────────────
app.use('/api', routes)

// ─── Health Check ─────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), env: process.env.NODE_ENV })
})

// ─── Static (生产环境) ─────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')))
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'))
  })
}

// ─── Error Handler ────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Error]', err)
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'development' ? err.message : '服务器内部错误',
  })
})

// ─── Socket.io ───────────────────────────────────────────
setupSocket(io)

// ─── Global error safety ─────────────────────────────────
process.on('unhandledRejection', (reason) => {
  console.error('[UnhandledRejection]', reason)
})
process.on('uncaughtException', (err) => {
  console.error('[UncaughtException]', err)
})

// ─── Start ───────────────────────────────────────────────
const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  console.log(`🚀 智创工坊后端运行在 http://localhost:${PORT}`)
  console.log(`📊 环境: ${process.env.NODE_ENV || 'development'}`)
  // 通知 PM2 进程已就绪（graceful reload 依赖此信号）
  if (process.send) process.send('ready')
})

// ─── Graceful Shutdown ───────────────────────────────────
// PM2 reload 会发 SIGINT；系统关机/kill 会发 SIGTERM
// 两者都走同一个退出流程：停止接受新连接 → 等待在途请求完成 → 关闭 DB 连接池
let isShuttingDown = false

function gracefulShutdown(signal) {
  if (isShuttingDown) return
  isShuttingDown = true
  console.log(`[${signal}] 开始优雅关闭，等待在途请求完成...`)

  // 拒绝新的 HTTP 连接
  server.close(async () => {
    console.log('[Shutdown] HTTP 服务器已关闭')
    try {
      const { pool } = require('./src/config/db')
      await pool.end()
      console.log('[Shutdown] 数据库连接池已释放')
    } catch (e) {
      console.error('[Shutdown] 关闭 DB 连接池失败', e.message)
    }
    console.log('[Shutdown] 进程退出')
    process.exit(0)
  })

  // 超过 kill_timeout 前强制退出（兜底，避免进程僵死）
  setTimeout(() => {
    console.error('[Shutdown] 超时强制退出')
    process.exit(1)
  }, 9000).unref()
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT',  () => gracefulShutdown('SIGINT'))

module.exports = { app, server, io }
