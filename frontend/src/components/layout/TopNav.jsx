import { Link, NavLink } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import useChatStore from '../../store/chatStore'
import { useState, useRef, useEffect } from 'react'

export default function TopNav() {
  const { user, isLoggedIn, logout } = useAuthStore()
  const unreadTotal = useChatStore((s) => s.unreadTotal)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const isCreator = user?.role === 'creator'

  const navLinks = isCreator
    ? [
        { to: '/', label: '首页' },
        { to: '/demand', label: '需求广场' },
        { to: '/creators', label: '创作者' },
        { to: '/applications', label: '我的申请' },
        { to: '/orders', label: '订单中心' },
      ]
    : [
        { to: '/', label: '首页' },
        { to: '/demand', label: '需求广场' },
        { to: '/creators', label: '创作者' },
        { to: '/post', label: '发布需求' },
        { to: '/orders', label: '订单中心' },
      ]

  return (
    <nav className="glass-nav fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        {/* Logo */}
        <Link to="/" className="text-xl font-bold tracking-tight text-on-surface flex items-center gap-2">
          <span className="text-gradient">智创工坊</span>
        </Link>

        {/* Desktop Nav Links */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  isActive
                    ? 'text-primary bg-primary/8 font-semibold'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {isLoggedIn ? (
            <>
              {/* 通知 */}
              <Link to="/notifications" className="relative p-2 rounded-full hover:bg-surface-container-low transition-colors">
                <span className="material-symbols-outlined text-on-surface-variant text-[22px]">notifications</span>
              </Link>

              {/* 消息 */}
              <Link to="/chat" className="relative p-2 rounded-full hover:bg-surface-container-low transition-colors">
                <span className="material-symbols-outlined text-on-surface-variant text-[22px]">chat_bubble</span>
                {unreadTotal > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-error text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                    {unreadTotal > 99 ? '99+' : unreadTotal}
                  </span>
                )}
              </Link>

              {/* 用户头像 + 下拉 */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 p-1 rounded-full hover:bg-surface-container-low transition-colors"
                >
                  <img
                    src={user?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user?.nickname || 'U')}`}
                    alt={user?.nickname}
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-primary/10"
                  />
                  <span className="hidden sm:block text-sm font-medium text-on-surface max-w-[80px] truncate">
                    {user?.nickname}
                  </span>
                  <span className="material-symbols-outlined text-on-surface-variant text-[16px]">expand_more</span>
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 glass-card rounded-2xl shadow-glass-lg py-2 z-50">
                    {/* 身份标签 */}
                    <div className="px-4 py-2 mb-1">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        isCreator ? 'bg-primary/10 text-primary' : 'bg-surface-container text-on-surface-variant'
                      }`}>
                        <span className="material-symbols-outlined text-[13px]">{isCreator ? 'palette' : 'business_center'}</span>
                        {isCreator ? '创作者' : '雇主'}
                      </span>
                    </div>

                    <div className="h-px bg-outline-variant/30 mx-3 mb-1" />

                    <MenuItem icon="person" label="个人中心" to={`/profile/${user?.id}`} onClick={() => setMenuOpen(false)} />
                    <MenuItem icon="wallet" label="我的钱包" to="/wallet" onClick={() => setMenuOpen(false)} />
                    <MenuItem icon="shopping_bag" label="订单中心" to="/orders" onClick={() => setMenuOpen(false)} />
                    <MenuItem icon="settings" label="设置" to="/settings" onClick={() => setMenuOpen(false)} />

                    <div className="h-px bg-outline-variant/30 mx-3 my-1" />

                    <button
                      onClick={() => { logout(); setMenuOpen(false) }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-error hover:bg-error/5 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">logout</span>
                      退出登录
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="btn-ghost text-sm py-2 px-4">登录</Link>
              <Link to="/register" className="btn-primary text-sm py-2 px-4">注册</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}

function MenuItem({ icon, label, to, onClick }) {
  return (
    <Link to={to} onClick={onClick}
      className="flex items-center gap-3 px-4 py-2.5 text-sm text-on-surface hover:bg-surface-container-low transition-colors">
      <span className="material-symbols-outlined text-on-surface-variant text-[18px]">{icon}</span>
      {label}
    </Link>
  )
}
