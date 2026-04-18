import { NavLink, useLocation } from 'react-router-dom'
import useChatStore from '../../store/chatStore'
import useAuthStore from '../../store/authStore'

const EMPLOYER_NAV = [
  { to: '/', icon: 'home', label: '首页' },
  { to: '/demand', icon: 'explore', label: '广场' },
  { to: '/post', icon: 'add_circle', label: '发布', isAction: true },
  { to: '/chat', icon: 'chat_bubble', label: '消息', hasBadge: true },
  { to: '/orders', icon: 'receipt_long', label: '订单' },
]

const CREATOR_NAV = [
  { to: '/', icon: 'home', label: '首页' },
  { to: '/demand', icon: 'explore', label: '广场' },
  { to: '/applications', icon: 'assignment', label: '我的申请', isAction: true },
  { to: '/chat', icon: 'chat_bubble', label: '消息', hasBadge: true },
  { to: '/orders', icon: 'receipt_long', label: '订单' },
]

export default function BottomNav() {
  const location = useLocation()
  const unreadTotal = useChatStore((s) => s.unreadTotal)
  const role = useAuthStore((s) => s.user?.role)
  const NAV_ITEMS = role === 'creator' ? CREATOR_NAV : EMPLOYER_NAV

  if (['/login', '/register'].includes(location.pathname)) return null

  return (
    <nav className="md:hidden bottom-nav fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl">
      <div className="flex items-center justify-around px-2 pb-safe pt-2" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
        {NAV_ITEMS.map(({ to, icon, label, isAction, hasBadge }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              isAction
                ? 'flex flex-col items-center justify-center -mt-4'
                : `flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all ${
                    isActive ? 'text-primary' : 'text-on-surface-variant'
                  }`
            }
          >
            {({ isActive }) =>
              isAction ? (
                <div className="w-14 h-14 bg-gradient-primary rounded-full flex items-center justify-center shadow-float">
                  <span className="material-symbols-outlined text-white text-[26px]">{icon}</span>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <span className={`material-symbols-outlined text-[24px] ${isActive ? 'icon-filled' : ''}`}>
                      {icon}
                    </span>
                    {hasBadge && unreadTotal > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 bg-error text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                        {unreadTotal > 99 ? '99+' : unreadTotal}
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] font-medium mt-0.5 ${isActive ? 'font-semibold' : ''}`}>
                    {label}
                  </span>
                  {isActive && <div className="w-1 h-1 rounded-full bg-primary mt-0.5" />}
                </>
              )
            }
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
