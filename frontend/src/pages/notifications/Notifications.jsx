import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import { notificationApi } from '../../services/api'
import { formatRelativeTime } from '../../utils/format'

const NOTIF_ICONS = {
  order_confirm: { icon: 'handshake', color: 'text-blue-600 bg-blue-50' },
  payment: { icon: 'payments', color: 'text-green-600 bg-green-50' },
  message: { icon: 'chat_bubble', color: 'text-primary bg-primary/10' },
  review: { icon: 'star', color: 'text-yellow-600 bg-yellow-50' },
  appeal: { icon: 'gavel', color: 'text-error bg-error-container' },
  milestone: { icon: 'task_alt', color: 'text-green-600 bg-green-50' },
  system: { icon: 'info', color: 'text-on-surface-variant bg-surface-container' },
}

export default function Notifications() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  const load = () => {
    notificationApi.list({ limit: 50 })
      .then(res => setNotifications(res.data?.list || []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleMarkRead = async (id) => {
    await notificationApi.markRead(id)
    setNotifications(n => n.map(notif => notif.id === id ? { ...notif, is_read: 1 } : notif))
  }

  const handleMarkAllRead = async () => {
    await notificationApi.markAllRead()
    setNotifications(n => n.map(notif => ({ ...notif, is_read: 1 })))
  }

  const unreadCount = notifications.filter(n => !n.is_read).length
  const filtered = filter === 'unread' ? notifications.filter(n => !n.is_read) : notifications

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-on-surface">通知</h1>
            {unreadCount > 0 && <p className="text-sm text-on-surface-variant mt-1">{unreadCount} 条未读</p>}
          </div>
          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead} className="btn-ghost text-sm py-1.5 px-3">
              全部已读
            </button>
          )}
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-4">
          {[['all', '全部'], ['unread', '未读']].map(([key, label]) => (
            <button key={key} onClick={() => setFilter(key)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                filter === key ? 'bg-gradient-primary text-white' : 'bg-white text-on-surface-variant border border-outline-variant/30'
              }`}>
              {label}
              {key === 'unread' && unreadCount > 0 && (
                <span className="ml-1.5 bg-white/20 text-xs px-1.5 py-0.5 rounded-full">{unreadCount}</span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl p-5 animate-pulse flex gap-3">
                <div className="w-10 h-10 bg-surface-container-high rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-surface-container-high rounded-full w-3/4" />
                  <div className="h-3 bg-surface-container-high rounded-full w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-on-surface-variant">
            <span className="material-symbols-outlined text-6xl mb-4 text-outline-variant">notifications_none</span>
            <p>{filter === 'unread' ? '没有未读通知' : '暂无通知'}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((notif) => {
              const iconConfig = NOTIF_ICONS[notif.type] || NOTIF_ICONS.system
              return (
                <div
                  key={notif.id}
                  className={`bg-white rounded-2xl p-4 flex gap-4 transition-all ${
                    !notif.is_read ? 'ring-1 ring-primary/20' : ''
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${iconConfig.color}`}>
                    <span className="material-symbols-outlined text-[18px]">{iconConfig.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-medium text-on-surface ${!notif.is_read ? 'font-semibold' : ''}`}>
                        {notif.title}
                      </p>
                      {!notif.is_read && (
                        <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                    {notif.content && (
                      <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">{notif.content}</p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-on-surface-variant">{formatRelativeTime(notif.created_at)}</span>
                      <div className="flex gap-2">
                        {notif.link && (
                          <Link to={notif.link} className="text-xs text-primary hover:underline">查看详情</Link>
                        )}
                        {!notif.is_read && (
                          <button onClick={() => handleMarkRead(notif.id)} className="text-xs text-on-surface-variant hover:text-on-surface">
                            标为已读
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}
