import { create } from 'zustand'
import useAuthStore from './authStore'

const useChatStore = create((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: {}, // { [convId]: Message[] }
  unreadTotal: 0,
  socket: null,

  setSocket: (socket) => set({ socket }),

  setConversations: (conversations) => {
    const userId = useAuthStore.getState().user?.id
    const unreadTotal = conversations.reduce((sum, c) => {
      const mine = userId === c.user_a ? (c.unread_a || 0) : (c.unread_b || 0)
      return sum + mine
    }, 0)
    set({ conversations, unreadTotal })
  },

  setActiveConversation: (id) => set({ activeConversationId: id }),

  setMessages: (convId, messages) => {
    set((state) => ({ messages: { ...state.messages, [convId]: messages } }))
  },

  addMessage: (convId, message) => {
    set((state) => {
      const existing = state.messages[convId] || []
      return { messages: { ...state.messages, [convId]: [...existing, message] } }
    })
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === convId
          ? { ...c, last_msg: message.content, last_msg_at: message.created_at }
          : c
      ),
    }))
  },

  markRead: (convId) => {
    const userId = useAuthStore.getState().user?.id
    set((state) => {
      const conv = state.conversations.find((c) => c.id === convId)
      const unreadField = userId === conv?.user_a ? 'unread_a' : 'unread_b'
      const prevUnread = conv?.[unreadField] || 0
      return {
        conversations: state.conversations.map((c) =>
          c.id === convId ? { ...c, unread_a: c.user_a === userId ? 0 : c.unread_a, unread_b: c.user_b === userId ? 0 : c.unread_b } : c
        ),
        unreadTotal: Math.max(0, state.unreadTotal - prevUnread),
      }
    })
  },
}))

export default useChatStore
