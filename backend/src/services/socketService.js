const jwt = require('jsonwebtoken')
const { query, queryOne } = require('../config/db')

function setupSocket(io) {
  // JWT认证中间件
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token
    if (!token) return next(new Error('未认证'))
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret')
      socket.userId = payload.id
      next()
    } catch (e) {
      next(new Error('Token无效'))
    }
  })

  io.on('connection', (socket) => {
    const userId = socket.userId
    console.log(`[Socket] 用户 ${userId} 连接`)

    // 加入用户专属房间（接收个人通知）
    socket.join(`user:${userId}`)

    // 加入会话
    socket.on('join_conversation', async ({ conversation_id }) => {
      const conv = await queryOne(
        'SELECT * FROM conversations WHERE id = ? AND (user_a = ? OR user_b = ?)',
        [conversation_id, userId, userId]
      )
      if (conv) socket.join(`conv:${conversation_id}`)
    })

    socket.on('leave_conversation', ({ conversation_id }) => {
      socket.leave(`conv:${conversation_id}`)
    })

    // 发送消息
    socket.on('send_message', async ({ conversation_id, content, type = 'text' }) => {
      if (!content?.trim()) return

      try {
        const conv = await queryOne(
          'SELECT * FROM conversations WHERE id = ? AND (user_a = ? OR user_b = ?)',
          [conversation_id, userId, userId]
        )
        if (!conv) return

        const result = await query(
          'INSERT INTO messages (conversation_id, sender_id, type, content) VALUES (?, ?, ?, ?)',
          [conversation_id, userId, type, content]
        )
        const message = await queryOne(
          'SELECT m.*, u.nickname as sender_name, u.avatar as sender_avatar FROM messages m JOIN users u ON u.id = m.sender_id WHERE m.id = ?',
          [result.insertId]
        )

        // 更新会话最后消息
        const otherUserId = conv.user_a === userId ? conv.user_b : conv.user_a
        const unreadField = conv.user_a === userId ? 'unread_b' : 'unread_a'
        await query(
          `UPDATE conversations SET last_msg = ?, last_msg_at = NOW(), ${unreadField} = ${unreadField} + 1 WHERE id = ?`,
          [content.slice(0, 200), conversation_id]
        )

        // 广播到会话中所有成员
        io.to(`conv:${conversation_id}`).emit('new_message', message)

        // 如果对方不在会话中，也推送到其个人房间
        io.to(`user:${otherUserId}`).emit('new_message', { ...message, conversation_id })

      } catch (err) {
        console.error('[Socket] 发送消息失败:', err)
        socket.emit('error', { message: '发送失败' })
      }
    })

    socket.on('typing', ({ conversation_id }) => {
      socket.to(`conv:${conversation_id}`).emit('typing', { user_id: userId, conversation_id })
    })

    socket.on('disconnect', () => {
      console.log(`[Socket] 用户 ${userId} 断开`)
    })
  })

  // 暴露广播方法供其他模块调用
  return {
    notifyUser: (userId, event, data) => {
      io.to(`user:${userId}`).emit(event, data)
    },
    broadcastOrderEvent: (orderId, employerId, creatorId, event) => {
      io.to(`user:${employerId}`).emit('order_event', { order_id: orderId, ...event })
      io.to(`user:${creatorId}`).emit('order_event', { order_id: orderId, ...event })
    }
  }
}

module.exports = setupSocket
