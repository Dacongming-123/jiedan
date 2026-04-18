import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import Avatar from '../../components/ui/Avatar'
import { messageApi } from '../../services/api'
import { joinConversation, leaveConversation, sendMessage } from '../../services/socket'
import useChatStore from '../../store/chatStore'
import useAuthStore from '../../store/authStore'
import { formatRelativeTime, formatDateTime } from '../../utils/format'

export default function Chat() {
  const { convId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { conversations, messages, setConversations, setMessages, setActiveConversation, markRead } = useChatStore()
  const [loading, setLoading] = useState(true)
  const [msgLoading, setMsgLoading] = useState(false)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const activeConv = conversations.find(c => c.id == convId)
  const activeMessages = (convId ? messages[convId] : []) || []

  // Load conversations
  useEffect(() => {
    messageApi.conversations()
      .then(res => setConversations(res.data?.list || []))
      .finally(() => setLoading(false))
  }, [])

  // Load messages for active conversation
  useEffect(() => {
    if (!convId) return
    setActiveConversation(Number(convId))
    setMsgLoading(true)
    joinConversation(Number(convId))
    messageApi.messages(convId, { limit: 50 })
      .then(res => setMessages(convId, res.data?.list || []))
      .finally(() => setMsgLoading(false))
    markRead(Number(convId))
    return () => { leaveConversation(Number(convId)); setActiveConversation(null) }
  }, [convId])

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeMessages.length])

  const handleSend = async (e) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setSending(true)
    try {
      sendMessage(Number(convId), text, 'text')
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const otherUser = (conv) => {
    if (!conv || !user) return null
    return conv.user_a === user.id ? { id: conv.user_b, nickname: conv.user_b_name, avatar: conv.user_b_avatar }
      : { id: conv.user_a, nickname: conv.user_a_name, avatar: conv.user_a_avatar }
  }

  return (
    <div className="flex h-screen bg-surface">
      {/* Sidebar - Conversations */}
      <div className={`${convId ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 border-r border-outline-variant/20 bg-white flex-shrink-0`}>
        {/* Header */}
        <div className="glass-nav px-4 py-4 flex items-center justify-between flex-shrink-0 mt-16">
          <h2 className="font-semibold text-on-surface">消息</h2>
          <span className="text-sm text-on-surface-variant">{conversations.length} 个会话</span>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {loading ? (
            <div className="flex justify-center py-8">
              <span className="material-symbols-outlined animate-spin text-primary">refresh</span>
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-on-surface-variant px-4 text-center">
              <span className="material-symbols-outlined text-5xl mb-3 text-outline-variant">chat_bubble</span>
              <p className="text-sm">暂无消息</p>
            </div>
          ) : (
            conversations.map((conv) => {
              const other = otherUser(conv)
              const isActive = conv.id == convId
              const unread = user?.id === conv.user_a ? conv.unread_a : conv.unread_b
              return (
                <button key={conv.id} onClick={() => navigate(`/chat/${conv.id}`)}
                  className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left ${
                    isActive ? 'bg-primary/5' : 'hover:bg-surface-container-low'
                  }`}>
                  <div className="relative flex-shrink-0">
                    <Avatar src={other?.avatar} name={other?.nickname} size="md" />
                    {unread > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-error text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
                        {unread}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm font-medium truncate ${isActive ? 'text-primary' : 'text-on-surface'}`}>
                        {other?.nickname}
                      </p>
                      <p className="text-xs text-on-surface-variant flex-shrink-0">
                        {formatRelativeTime(conv.last_msg_at)}
                      </p>
                    </div>
                    <p className={`text-xs truncate mt-0.5 ${unread > 0 ? 'text-on-surface font-medium' : 'text-on-surface-variant'}`}>
                      {conv.last_msg || '开始聊天吧'}
                    </p>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      {convId ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat Header */}
          <div className="glass-nav px-4 py-3 flex items-center gap-3 flex-shrink-0 mt-16">
            <button onClick={() => navigate('/chat')} className="md:hidden p-1.5 rounded-full hover:bg-surface-container-low">
              <span className="material-symbols-outlined text-on-surface-variant">arrow_back</span>
            </button>
            {activeConv && (
              <>
                <Avatar src={otherUser(activeConv)?.avatar} name={otherUser(activeConv)?.nickname} size="sm" />
                <div>
                  <p className="font-medium text-on-surface text-sm">{otherUser(activeConv)?.nickname}</p>
                  {activeConv.order_id && (
                    <p className="text-xs text-on-surface-variant">关联订单</p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
            {msgLoading ? (
              <div className="flex justify-center py-8">
                <span className="material-symbols-outlined animate-spin text-primary">refresh</span>
              </div>
            ) : activeMessages.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-on-surface-variant">
                <span className="material-symbols-outlined text-5xl mb-3 text-outline-variant">waving_hand</span>
                <p className="text-sm">发消息打个招呼吧</p>
              </div>
            ) : (
              activeMessages.map((msg) => {
                const isMine = msg.sender_id === user?.id
                return (
                  <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} gap-2`}>
                    {!isMine && (
                      <Avatar src={otherUser(activeConv)?.avatar} name={otherUser(activeConv)?.nickname} size="xs" className="mt-auto flex-shrink-0" />
                    )}
                    <div className={`max-w-[70%] ${isMine ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                      {msg.type === 'system' ? (
                        <div className="text-xs text-center text-on-surface-variant bg-surface-container px-3 py-1 rounded-full">
                          {msg.content}
                        </div>
                      ) : (
                        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          isMine
                            ? 'bg-gradient-primary text-white rounded-br-sm'
                            : 'bg-white text-on-surface rounded-bl-sm shadow-sm'
                        }`}>
                          {msg.content}
                        </div>
                      )}
                      <span className="text-[10px] text-on-surface-variant px-1">
                        {formatDateTime(msg.created_at)}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-white border-t border-outline-variant/20 pb-safe" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
            <form onSubmit={handleSend} className="flex gap-3 items-end">
              <div className="flex-1 bg-surface-container rounded-2xl px-4 py-3 flex items-center gap-2 min-h-[48px]">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="输入消息..."
                  className="flex-1 bg-transparent text-sm text-on-surface placeholder-on-surface-variant/50 outline-none"
                />
              </div>
              <button type="submit" disabled={!input.trim() || sending}
                className="w-12 h-12 rounded-full bg-gradient-primary text-white flex items-center justify-center disabled:opacity-40 transition-all hover:shadow-float flex-shrink-0">
                <span className="material-symbols-outlined text-[20px]">send</span>
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-on-surface-variant mt-16">
          <div className="text-center">
            <span className="material-symbols-outlined text-6xl mb-4 text-outline-variant">chat</span>
            <p>选择一个会话开始聊天</p>
          </div>
        </div>
      )}
    </div>
  )
}
