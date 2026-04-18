import { io } from 'socket.io-client'
import useChatStore from '../store/chatStore'
import useAuthStore from '../store/authStore'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001'

let socket = null

export function connectSocket(token) {
  if (socket?.connected) return socket

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  })

  socket.on('connect', () => {
    console.log('[Socket] 已连接:', socket.id)
    useChatStore.getState().setSocket(socket)
  })

  socket.on('disconnect', (reason) => {
    console.log('[Socket] 断开:', reason)
  })

  socket.on('new_message', (message) => {
    const { activeConversationId } = useChatStore.getState()
    useChatStore.getState().addMessage(message.conversation_id, message)
    if (message.conversation_id !== activeConversationId) {
      const userId = useAuthStore.getState().user?.id
      useChatStore.setState((state) => ({
        conversations: state.conversations.map((c) => {
          if (c.id !== message.conversation_id) return c
          const field = userId === c.user_a ? 'unread_a' : 'unread_b'
          return { ...c, [field]: (c[field] || 0) + 1 }
        }),
        unreadTotal: state.unreadTotal + 1,
      }))
    }
  })

  socket.on('order_event', (event) => {
    // 订单状态变更通知
    window.dispatchEvent(new CustomEvent('orderEvent', { detail: event }))
  })

  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

export function joinConversation(convId) {
  socket?.emit('join_conversation', { conversation_id: convId })
}

export function leaveConversation(convId) {
  socket?.emit('leave_conversation', { conversation_id: convId })
}

export function sendMessage(convId, content, type = 'text') {
  socket?.emit('send_message', { conversation_id: convId, content, type })
}


export { socket }
