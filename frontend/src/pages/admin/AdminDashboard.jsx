import { useState, useEffect, useRef } from 'react'
import { Routes, Route, Link, NavLink, useNavigate } from 'react-router-dom'
import { adminApi } from '../../services/api'

function useAdminAuth() {
  const navigate = useNavigate()
  const token = localStorage.getItem('zc-admin-token')
  if (!token) { navigate('/admin/login', { replace: true }); return null }
  try { return JSON.parse(localStorage.getItem('zc-admin-user') || '{}') } catch { return {} }
}
import { formatMoney, formatDateTime, formatRelativeTime, ORDER_STATUS_MAP } from '../../utils/format'
import Avatar from '../../components/ui/Avatar'

export default function AdminDashboard() {
  return (
    <div className="flex min-h-screen bg-surface">
      {/* Admin Sidebar */}
      <aside className="w-60 bg-inverse-surface flex flex-col flex-shrink-0">
        <div className="px-5 py-5">
          <Link to="/" className="text-inverse-on-surface text-lg font-bold">智创工坊</Link>
          <p className="text-inverse-on-surface/60 text-xs mt-0.5">管理后台</p>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {[
            { to: '/admin', icon: 'dashboard', label: '概览' },
            { to: '/admin/users', icon: 'people', label: '用户管理' },
            { to: '/admin/orders', icon: 'receipt_long', label: '订单管理' },
            { to: '/admin/appeals', icon: 'gavel', label: '申诉处理' },
            { to: '/admin/analytics', icon: 'analytics', label: '数据分析' },
            { to: '/admin/assets', icon: 'photo_library', label: '素材管理' },
            { to: '/admin/platform', icon: 'integration_instructions', label: '三方接入' },
            { to: '/admin/configs', icon: 'tune', label: '页面配置' },
          ].map(({ to, icon, label }) => (
            <NavLink key={to} to={to} end={to === '/admin'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive ? 'bg-white/15 text-white' : 'text-inverse-on-surface/70 hover:bg-white/8 hover:text-inverse-on-surface'
                }`
              }>
              <span className="material-symbols-outlined text-[18px]">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 space-y-2">
          <Link to="/" className="flex items-center gap-2 text-sm text-inverse-on-surface/60 hover:text-inverse-on-surface transition-colors">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            返回前台
          </Link>
          <button onClick={() => { adminApi.logout(); window.location.href = '/admin/login' }}
            className="flex items-center gap-2 text-sm text-inverse-on-surface/60 hover:text-error transition-colors w-full">
            <span className="material-symbols-outlined text-[16px]">logout</span>
            退出登录
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route index element={<AdminOverview />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="appeals" element={<AdminAppeals />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="assets" element={<AdminAssets />} />
          <Route path="platform" element={<AdminPlatform />} />
          <Route path="configs" element={<AdminConfigs />} />
        </Routes>
      </main>
    </div>
  )
}

function AdminOverview() {
  const [stats, setStats] = useState(null)
  useEffect(() => { adminApi.stats().then(r => setStats(r.data)).catch(() => {}) }, [])

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-on-surface mb-6">数据概览</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: '总用户数', value: stats?.users || 0, icon: 'people', color: 'text-blue-600 bg-blue-50' },
          { label: '进行中订单', value: stats?.active_orders || 0, icon: 'receipt_long', color: 'text-green-600 bg-green-50' },
          { label: '今日交易额', value: formatMoney(stats?.today_amount || 0), icon: 'payments', color: 'text-orange-600 bg-orange-50' },
          { label: '待处理申诉', value: stats?.pending_appeals || 0, icon: 'gavel', color: 'text-error bg-error-container' },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="bg-white rounded-2xl p-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
              <span className="material-symbols-outlined text-[20px]">{icon}</span>
            </div>
            <p className="text-2xl font-bold text-on-surface">{value}</p>
            <p className="text-sm text-on-surface-variant mt-1">{label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    adminApi.users({ search, limit: 50 }).then(r => setUsers(r.data?.list || [])).finally(() => setLoading(false))
  }, [search])

  const handleBan = async (id) => {
    if (!window.confirm('确认封禁该用户？')) return
    await adminApi.banUser(id, '管理员操作')
    setUsers(u => u.map(x => x.id === id ? { ...x, status: 'banned' } : x))
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-on-surface">用户管理</h1>
        <div className="relative w-64">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant text-[18px]">search</span>
          <input type="search" placeholder="搜索用户..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10 py-2 text-sm" />
        </div>
      </div>
      <div className="bg-white rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-surface-container-low">
            <tr>
              {['用户', '手机号', '角色', '状态', '最后登录IP', '注册时间', '操作'].map(h => (
                <th key={h} className="text-left text-xs font-semibold text-on-surface-variant px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-8 text-on-surface-variant">加载中...</td></tr>
            ) : users.map(u => (
              <tr key={u.id} className="hover:bg-surface-container-low/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Avatar src={u.avatar} name={u.nickname} size="sm" />
                    <span className="text-sm font-medium text-on-surface">{u.nickname}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-on-surface-variant">{u.phone || '-'}</td>
                <td className="px-4 py-3 text-sm text-on-surface-variant">{u.role}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-error-container text-error'}`}>
                    {u.status === 'active' ? '正常' : '封禁'}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs font-mono text-on-surface-variant">
                  {u.last_ip ? (
                    <span title={u.last_ip} className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">location_on</span>
                      {u.last_ip.startsWith('::ffff:') ? u.last_ip.slice(7) : u.last_ip}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-4 py-3 text-xs text-on-surface-variant">{formatDateTime(u.created_at)}</td>
                <td className="px-4 py-3">
                  {u.status === 'active' && (
                    <button onClick={() => handleBan(u.id)} className="text-xs text-error hover:underline">封禁</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AdminOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { adminApi.orders({ limit: 50 }).then(r => setOrders(r.data?.list || [])).finally(() => setLoading(false)) }, [])
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-on-surface mb-6">订单管理</h1>
      <div className="bg-white rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-surface-container-low">
            <tr>{['订单号', '标题', '金额', '雇主', '创作者', '状态', '时间'].map(h => <th key={h} className="text-left text-xs font-semibold text-on-surface-variant px-4 py-3">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10">
            {loading ? <tr><td colSpan={7} className="text-center py-8 text-on-surface-variant">加载中...</td></tr>
              : orders.map(o => {
                const si = ORDER_STATUS_MAP[o.status] || {}
                return (
                  <tr key={o.id} className="hover:bg-surface-container-low/50">
                    <td className="px-4 py-3 text-xs text-on-surface-variant font-mono">{o.order_no?.slice(-8)}</td>
                    <td className="px-4 py-3 text-sm text-on-surface max-w-[160px] truncate">{o.title}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-primary">{formatMoney(o.final_price)}</td>
                    <td className="px-4 py-3 text-sm text-on-surface-variant">{o.employer?.nickname}</td>
                    <td className="px-4 py-3 text-sm text-on-surface-variant">{o.creator?.nickname}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${si.color}`}>{si.label}</span></td>
                    <td className="px-4 py-3 text-xs text-on-surface-variant">{formatDateTime(o.created_at)}</td>
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AdminAppeals() {
  const [appeals, setAppeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [resolution, setResolution] = useState({ resolution: 'resolved_for_appellant', admin_note: '', split_ratio: 50 })

  useEffect(() => { adminApi.appeals({ limit: 50 }).then(r => setAppeals(r.data?.list || [])).finally(() => setLoading(false)) }, [])

  const handleResolve = async () => {
    await adminApi.resolveAppeal(selected.id, resolution)
    setAppeals(a => a.map(x => x.id === selected.id ? { ...x, resolution: resolution.resolution } : x))
    setSelected(null)
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-on-surface mb-6">申诉处理</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl overflow-hidden">
          <div className="bg-surface-container-low px-4 py-3 text-xs font-semibold text-on-surface-variant">申诉列表</div>
          {loading ? <div className="text-center py-8 text-on-surface-variant text-sm">加载中...</div>
            : appeals.map(a => (
              <button key={a.id} onClick={() => setSelected(a)} className={`w-full flex items-start gap-3 px-4 py-3 text-left border-b border-outline-variant/10 hover:bg-surface-container-low/50 transition-colors ${selected?.id === a.id ? 'bg-primary/5' : ''}`}>
                <span className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${a.resolution === 'pending' ? 'bg-yellow-400' : 'bg-green-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-on-surface truncate">{a.reason?.slice(0, 30)}...</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">{formatRelativeTime(a.created_at)}</p>
                </div>
              </button>
            ))}
        </div>

        {selected && (
          <div className="bg-white rounded-2xl p-5 space-y-4">
            <h3 className="font-semibold">申诉详情</h3>
            <div className="text-sm text-on-surface-variant space-y-2">
              <p><strong>原因：</strong>{selected.reason}</p>
              {selected.respondent_reply && <p><strong>被申诉方回应：</strong>{selected.respondent_reply}</p>}
            </div>
            {selected.resolution === 'pending' && (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium block mb-1.5">裁决结果</label>
                  <select value={resolution.resolution} onChange={(e) => setResolution(r => ({ ...r, resolution: e.target.value }))} className="input-field text-sm">
                    <option value="resolved_for_appellant">支持申诉方</option>
                    <option value="resolved_for_respondent">支持被申诉方</option>
                    <option value="resolved_split">按比例分割</option>
                    <option value="closed">关闭申诉</option>
                  </select>
                </div>
                {resolution.resolution === 'resolved_split' && (
                  <div>
                    <label className="text-sm font-medium block mb-1.5">申诉方获得比例 {resolution.split_ratio}%</label>
                    <input type="range" min="0" max="100" value={resolution.split_ratio}
                      onChange={(e) => setResolution(r => ({ ...r, split_ratio: e.target.value }))}
                      className="w-full" />
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium block mb-1.5">裁决说明</label>
                  <textarea value={resolution.admin_note} onChange={(e) => setResolution(r => ({ ...r, admin_note: e.target.value }))}
                    rows={3} className="input-field resize-none text-sm" placeholder="说明裁决依据..." />
                </div>
                <button onClick={handleResolve} className="btn-primary w-full">确认裁决</button>
              </div>
            )}
            {selected.resolution !== 'pending' && (
              <div className="bg-green-50 rounded-xl p-3 text-sm text-green-700">已处理：{selected.resolution}</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const PAGE_LABELS = {
  '/': '首页', '/demand': '需求广场', '/creators': '创作者广场',
  '/orders': '订单中心', '/wallet': '钱包', '/notifications': '消息通知',
  '/settings': '个人设置', '/chat': '私信', '/applications': '我的申请',
  '/post': '发布需求', '/login': '登录页', '/register': '注册页',
}
function friendlyPath(path) {
  if (!path) return '—'
  if (PAGE_LABELS[path]) return PAGE_LABELS[path]
  if (path.startsWith('/demand/') && path.endsWith('/applicants')) return '申请者列表'
  if (path.startsWith('/demand/')) return '需求详情'
  if (path.startsWith('/orders/') && path.endsWith('/progress')) return '项目进度'
  if (path.startsWith('/orders/') && path.endsWith('/review')) return '评价订单'
  if (path.startsWith('/orders/') && path.endsWith('/appeal')) return '发起申诉'
  if (path.startsWith('/orders/')) return '订单详情'
  if (path.startsWith('/profile/')) return '创作者主页'
  if (path.startsWith('/chat/')) return '私信会话'
  return path
}
function ipTypeBadge(type) {
  const map = { '本地': 'bg-gray-100 text-gray-500', '内网': 'bg-blue-50 text-blue-600', '外网': 'bg-green-50 text-green-700' }
  return map[type] || 'bg-gray-100 text-gray-500'
}

function AdminAnalytics() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('hotspot')
  const [ips, setIps] = useState([])
  const [ipSearch, setIpSearch] = useState('')
  const [ipLoading, setIpLoading] = useState(false)

  useEffect(() => {
    adminApi.analytics().then(r => setData(r.data)).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (tab !== 'ips') return
    setIpLoading(true)
    adminApi.analyticsIps({ search: ipSearch, limit: 50 })
      .then(r => setIps(r.data?.list || []))
      .finally(() => setIpLoading(false))
  }, [tab, ipSearch])

  if (loading) return <div className="p-8 flex justify-center"><span className="material-symbols-outlined animate-spin text-primary text-4xl">refresh</span></div>

  const weekMax = Math.max(...(data?.week_trend || []).map(d => d.visits), 1)
  const hourMax = Math.max(...(data?.hourly_distribution || []).map(h => h.visits), 1)
  const pageMax = Math.max(...(data?.top_pages || []).map(p => p.visits), 1)

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-on-surface mb-6">数据分析</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: '今日访问量', value: data?.today_visits || 0, icon: 'visibility', color: 'text-blue-600 bg-blue-50' },
          { label: '今日独立IP', value: data?.today_unique_ips || 0, icon: 'wifi', color: 'text-purple-600 bg-purple-50' },
          { label: '近7日访问', value: data?.week_trend?.reduce((s, d) => s + (d.visits || 0), 0) || 0, icon: 'trending_up', color: 'text-green-600 bg-green-50' },
          { label: '热门页面数', value: data?.top_pages?.length || 0, icon: 'local_fire_department', color: 'text-orange-600 bg-orange-50' },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="bg-white rounded-2xl p-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
              <span className="material-symbols-outlined text-[20px]">{icon}</span>
            </div>
            <p className="text-2xl font-bold text-on-surface">{value}</p>
            <p className="text-sm text-on-surface-variant mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-full p-1 mb-5 shadow-sm w-fit">
        {[['hotspot', 'local_fire_department', '热点分析'], ['ips', 'manage_search', 'IP追踪']].map(([key, icon, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all ${tab === key ? 'bg-gradient-primary text-white shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}>
            <span className="material-symbols-outlined text-[16px]">{icon}</span>{label}
          </button>
        ))}
      </div>

      {tab === 'hotspot' && (
        <div className="space-y-5">
          {/* 7-day trend */}
          <div className="bg-white rounded-2xl p-6">
            <h3 className="font-semibold text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">bar_chart</span>近7天访问趋势
            </h3>
            <div className="flex items-end gap-2 h-32">
              {(data?.week_trend || []).map(d => {
                const pct = Math.max((d.visits / weekMax) * 100, 2)
                const date = d.date?.slice(5) || ''
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs text-on-surface-variant font-medium">{d.visits}</span>
                    <div className="w-full rounded-t-lg bg-gradient-to-t from-primary to-primary/60 transition-all"
                      style={{ height: `${pct}%`, minHeight: '4px' }} title={`${d.visits} 次访问`} />
                    <span className="text-[10px] text-on-surface-variant">{date}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Hourly heatmap */}
          <div className="bg-white rounded-2xl p-6">
            <h3 className="font-semibold text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">schedule</span>24小时活跃热力图
            </h3>
            <div className="grid grid-cols-12 gap-1.5">
              {(data?.hourly_distribution || []).map(h => {
                const intensity = h.visits / hourMax
                const opacity = Math.max(intensity, 0.06)
                return (
                  <div key={h.hour} className="flex flex-col items-center gap-1">
                    <div className="w-full aspect-square rounded-lg transition-all cursor-default"
                      style={{ backgroundColor: `rgba(103, 80, 164, ${opacity})` }}
                      title={`${h.hour}:00 — ${h.visits} 次访问`} />
                    <span className="text-[9px] text-on-surface-variant">{h.hour}</span>
                  </div>
                )
              })}
            </div>
            <div className="flex items-center gap-2 mt-3 justify-end">
              <span className="text-xs text-on-surface-variant">低</span>
              {[0.06, 0.2, 0.4, 0.65, 1].map(o => (
                <div key={o} className="w-4 h-4 rounded" style={{ backgroundColor: `rgba(103, 80, 164, ${o})` }} />
              ))}
              <span className="text-xs text-on-surface-variant">高</span>
            </div>
          </div>

          {/* Top pages */}
          <div className="bg-white rounded-2xl p-6">
            <h3 className="font-semibold text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">local_fire_department</span>热门页面 Top 10
            </h3>
            <div className="space-y-3">
              {(data?.top_pages || []).map((p, i) => {
                const pct = (p.visits / pageMax) * 100
                return (
                  <div key={p.path} className="flex items-center gap-3">
                    <span className={`w-5 text-center text-xs font-bold ${i < 3 ? 'text-primary' : 'text-on-surface-variant'}`}>{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-on-surface">{friendlyPath(p.path)}</span>
                        <div className="flex items-center gap-3 text-xs text-on-surface-variant">
                          <span>{p.visits} 次</span>
                          <span>{p.unique_ips} 独立IP</span>
                        </div>
                      </div>
                      <div className="h-2 bg-surface-container-low rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60 transition-all"
                          style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-[10px] text-on-surface-variant mt-0.5 font-mono">{p.path}</p>
                    </div>
                  </div>
                )
              })}
              {!data?.top_pages?.length && <p className="text-sm text-on-surface-variant text-center py-6">暂无数据，等待用户访问后自动统计</p>}
            </div>
          </div>

          {/* Recent visitors preview */}
          <div className="bg-white rounded-2xl p-6">
            <h3 className="font-semibold text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">people_outline</span>最近访客（前50条）
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-on-surface-variant border-b border-outline-variant/20">
                    {['IP地址', '类型', '访问页面', '用户', '时间'].map(h => <th key={h} className="text-left pb-2 pr-4 font-semibold">{h}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {(data?.recent_visitors || []).map((v, i) => (
                    <tr key={i} className="hover:bg-surface-container-low/50">
                      <td className="py-2 pr-4 font-mono text-xs text-on-surface">{v.display_ip}</td>
                      <td className="py-2 pr-4"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ipTypeBadge(v.ip_type)}`}>{v.ip_type}</span></td>
                      <td className="py-2 pr-4 text-xs text-on-surface-variant max-w-[140px] truncate" title={v.path}>{friendlyPath(v.path)}</td>
                      <td className="py-2 pr-4 text-xs text-on-surface-variant">{v.nickname || '游客'}</td>
                      <td className="py-2 text-xs text-on-surface-variant">{formatRelativeTime(v.created_at)}</td>
                    </tr>
                  ))}
                  {!data?.recent_visitors?.length && <tr><td colSpan={5} className="text-center py-6 text-on-surface-variant">暂无访问记录</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'ips' && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1 max-w-sm">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant text-[18px]">search</span>
              <input type="search" placeholder="搜索IP或用户名..." value={ipSearch} onChange={e => setIpSearch(e.target.value)}
                className="input-field pl-10 py-2 text-sm w-full" />
            </div>
          </div>
          <div className="bg-white rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-surface-container-low">
                <tr>{['IP地址', '类型', '访问页面', '用户', '角色', '访问时间'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-on-surface-variant px-4 py-3">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {ipLoading ? (
                  <tr><td colSpan={6} className="text-center py-8 text-on-surface-variant">加载中...</td></tr>
                ) : ips.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-on-surface-variant">暂无记录</td></tr>
                ) : ips.map((v, i) => (
                  <tr key={i} className="hover:bg-surface-container-low/50">
                    <td className="px-4 py-3 font-mono text-sm text-on-surface">{v.display_ip}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ipTypeBadge(v.ip_type)}`}>{v.ip_type}</span></td>
                    <td className="px-4 py-3 text-sm text-on-surface-variant max-w-[160px] truncate" title={v.path}>{friendlyPath(v.path)}</td>
                    <td className="px-4 py-3 text-sm text-on-surface-variant">{v.nickname || <span className="text-outline-variant">游客</span>}</td>
                    <td className="px-4 py-3 text-xs text-on-surface-variant">{v.role || '—'}</td>
                    <td className="px-4 py-3 text-xs text-on-surface-variant">{formatRelativeTime(v.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── AdminPlatform ────────────────────────────────────────

const PLATFORM_META = {
  wechat_pay: {
    label: '微信支付 V3', icon: '💚', color: 'bg-green-50 border-green-200',
    docs: 'https://pay.weixin.qq.com/wiki/doc/apiv3',
    fields: [
      { key: 'appid',       label: 'AppID',          type: 'text',     hint: '公众号/小程序 AppID' },
      { key: 'mch_id',      label: '商户号',          type: 'text',     hint: 'MCH_ID，登录商户平台查看' },
      { key: 'api_v3_key',  label: 'APIv3 密钥',     type: 'password', hint: '32位字符串，商户平台设置' },
      { key: 'serial_no',   label: '证书序列号',      type: 'text',     hint: '商户 API 证书序列号' },
      { key: 'private_key', label: '商户私钥（PEM）', type: 'textarea', hint: '-----BEGIN PRIVATE KEY----- ... 内容' },
      { key: 'notify_url',  label: '回调地址',        type: 'text',     hint: 'https://你的域名/api/payments/notify/wechat' },
    ],
  },
  alipay: {
    label: '支付宝支付', icon: '💙', color: 'bg-blue-50 border-blue-200',
    docs: 'https://opendocs.alipay.com/open/270/105898',
    fields: [
      { key: 'app_id',            label: 'App ID',           type: 'text',     hint: '开放平台应用 AppID' },
      { key: 'private_key',       label: '应用私钥（RSA2）', type: 'textarea', hint: '通过密钥工具生成，不含头尾标识' },
      { key: 'alipay_public_key', label: '支付宝公钥',       type: 'textarea', hint: '开放平台-密钥管理中获取' },
      { key: 'gateway',           label: '网关地址',         type: 'text',     hint: 'https://openapi.alipay.com/gateway.do（沙箱用 openapi.alipaydev.com）' },
      { key: 'notify_url',        label: '异步回调地址',     type: 'text',     hint: 'https://你的域名/api/payments/notify/alipay' },
      { key: 'return_url',        label: '同步跳转地址',     type: 'text',     hint: '支付完成后跳转的页面' },
    ],
  },
  wechat_oauth: {
    label: '微信网页登录', icon: '🟢', color: 'bg-green-50 border-green-200',
    docs: 'https://developers.weixin.qq.com/doc/offiaccount/OA_Web_Apps/Wechat_webpage_authorization.html',
    fields: [
      { key: 'appid',        label: 'AppID',   type: 'text',     hint: '公众号 AppID（需开通网页授权）' },
      { key: 'secret',       label: 'AppSecret', type: 'password', hint: '公众号 AppSecret' },
      { key: 'redirect_uri', label: '回调地址', type: 'text',     hint: 'https://你的域名/api/auth/wechat/callback（需在公众号后台白名单）' },
    ],
  },
  douyin_oauth: {
    label: '抖音登录', icon: '⚫', color: 'bg-gray-50 border-gray-200',
    docs: 'https://developer.open-douyin.com/docs/resource/zh-CN/dop/develop/openapi/account-permission/get-access-token',
    fields: [
      { key: 'client_key',    label: 'Client Key',    type: 'text',     hint: '抖音开放平台应用 Client Key' },
      { key: 'client_secret', label: 'Client Secret', type: 'password', hint: '抖音开放平台应用 Client Secret' },
      { key: 'redirect_uri',  label: '回调地址',      type: 'text',     hint: 'https://你的域名/api/auth/douyin/callback' },
    ],
  },
  aliyun_captcha: {
    label: '阿里云验证码 2.0', icon: '🟠', color: 'bg-orange-50 border-orange-200',
    docs: 'https://help.aliyun.com/document_detail/193143.html',
    fields: [
      { key: 'access_key_id',     label: 'AccessKey ID',     type: 'text',     hint: '阿里云控制台 AccessKey 管理' },
      { key: 'access_key_secret', label: 'AccessKey Secret', type: 'password', hint: '同上，仅显示一次，请妥善保存' },
      { key: 'scene_id',          label: '场景 ID',          type: 'text',     hint: '验证码控制台-场景管理中获取' },
      { key: 'prefix',            label: '前缀',             type: 'text',     hint: '场景对应的前缀（scene prefix）' },
    ],
  },
}

function PlatformCard({ platform, meta, data, onSaved }) {
  const [form, setForm] = useState({})
  const [enabled, setEnabled] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (data) {
      setForm(data.config || {})
      setEnabled(data.enabled)
    }
  }, [data])

  const handleSave = async () => {
    setSaving(true)
    setTestResult(null)
    try {
      await adminApi.updatePlatformConfig(platform, { enabled, config: form })
      onSaved(platform)
    } catch (e) {
      alert(e.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const r = await adminApi.testPlatformConfig(platform)
      setTestResult({ ok: true, msg: r.message || '测试通过', url: r.data?.url })
    } catch (e) {
      setTestResult({ ok: false, msg: e.message || '测试失败' })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className={`rounded-2xl border-2 ${meta.color} overflow-hidden`}>
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between cursor-pointer" onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{meta.icon}</span>
          <div>
            <p className="font-semibold text-on-surface">{meta.label}</p>
            <p className="text-xs text-on-surface-variant mt-0.5">{platform}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {enabled ? '已启用' : '未启用'}
          </span>
          <span className={`material-symbols-outlined text-on-surface-variant transition-transform ${open ? 'rotate-180' : ''}`}>expand_more</span>
        </div>
      </div>

      {/* Body */}
      {open && (
        <div className="bg-white px-5 py-5 space-y-4">
          {/* Enable toggle */}
          <div className="flex items-center justify-between pb-4 border-b border-outline-variant/15">
            <div>
              <p className="text-sm font-medium text-on-surface">启用此平台</p>
              <p className="text-xs text-on-surface-variant mt-0.5">关闭后对应功能将降级为本地 Mock</p>
            </div>
            <button onClick={() => setEnabled(e => !e)}
              className={`relative w-12 h-6 rounded-full transition-colors ${enabled ? 'bg-primary' : 'bg-surface-container-high'}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-6' : ''}`} />
            </button>
          </div>

          {/* Fields */}
          {meta.fields.map(f => (
            <div key={f.key}>
              <label className="text-sm font-medium text-on-surface-variant mb-1.5 flex items-center gap-1.5">
                {f.label}
                {f.hint && <span className="text-[10px] text-outline-variant normal-case font-normal">{f.hint}</span>}
              </label>
              {f.type === 'textarea' ? (
                <textarea
                  value={form[f.key] || ''}
                  onChange={e => setForm(x => ({ ...x, [f.key]: e.target.value }))}
                  rows={4}
                  className="input-field resize-none font-mono text-xs"
                  placeholder={form[f.key] === '***' ? '（已设置，输入新值覆盖）' : `请输入 ${f.label}`}
                />
              ) : (
                <input
                  type={f.type === 'password' ? 'text' : f.type}
                  value={form[f.key] || ''}
                  onChange={e => setForm(x => ({ ...x, [f.key]: e.target.value }))}
                  className="input-field"
                  placeholder={form[f.key] === '***' ? '（已设置，输入新值覆盖）' : `请输入 ${f.label}`}
                />
              )}
            </div>
          ))}

          {/* Test result */}
          {testResult && (
            <div className={`rounded-xl p-3 text-sm flex items-start gap-2 ${testResult.ok ? 'bg-green-50 text-green-700' : 'bg-error-container text-error'}`}>
              <span className="material-symbols-outlined text-[16px] mt-0.5">{testResult.ok ? 'check_circle' : 'error'}</span>
              <div>
                <p>{testResult.msg}</p>
                {testResult.url && (
                  <a href={testResult.url} target="_blank" rel="noopener noreferrer" className="text-xs underline mt-0.5 block break-all">{testResult.url}</a>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <a href={meta.docs} target="_blank" rel="noopener noreferrer"
              className="text-xs text-primary flex items-center gap-1 hover:underline">
              <span className="material-symbols-outlined text-[14px]">open_in_new</span>接入文档
            </a>
            <div className="flex gap-2">
              <button onClick={handleTest} disabled={testing}
                className="btn-secondary text-sm py-2 px-4 flex items-center gap-1.5">
                {testing ? <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span> : <span className="material-symbols-outlined text-[16px]">network_check</span>}
                测试连通
              </button>
              <button onClick={handleSave} disabled={saving}
                className="btn-primary text-sm py-2 px-4 flex items-center gap-1.5">
                {saving ? <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span> : <span className="material-symbols-outlined text-[16px]">save</span>}
                保存配置
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AdminPlatform() {
  const [configs, setConfigs] = useState({})
  const [loading, setLoading] = useState(true)

  const load = () => {
    adminApi.platformConfigs().then(r => {
      const map = {}
      for (const item of r.data?.list || []) map[item.platform] = item
      setConfigs(map)
    }).finally(() => setLoading(false))
  }
  useEffect(load, [])

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-on-surface">三方平台接入</h1>
        <p className="text-sm text-on-surface-variant mt-1">配置后立即生效，无需重启服务</p>
      </div>
      {loading ? (
        <div className="flex justify-center py-16"><span className="material-symbols-outlined animate-spin text-primary text-4xl">refresh</span></div>
      ) : (
        <div className="space-y-4 max-w-3xl">
          {Object.entries(PLATFORM_META).map(([platform, meta]) => (
            <PlatformCard key={platform} platform={platform} meta={meta} data={configs[platform]} onSaved={load} />
          ))}
        </div>
      )}
    </div>
  )
}

const ASSET_API = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001'

function AdminAssets() {
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [copied, setCopied] = useState('')
  const [preview, setPreview] = useState(null)
  const fileRef = useRef(null)

  const load = () => {
    setLoading(true)
    adminApi.listAssets().then(r => setAssets(r.data?.list || [])).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      await adminApi.uploadAsset(fd)
      load()
    } catch (err) {
      alert(err.message || '上传失败')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (filename) => {
    if (!window.confirm(`确认删除 ${filename}？`)) return
    await adminApi.deleteAsset(filename)
    setAssets(a => a.filter(f => f.filename !== filename))
  }

  const copyUrl = (url) => {
    navigator.clipboard.writeText(`${ASSET_API}${url}`).catch(() => {})
    setCopied(url)
    setTimeout(() => setCopied(''), 2000)
  }

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">素材管理</h1>
          <p className="text-sm text-on-surface-variant mt-1">上传图片素材，获取链接后在页面配置中使用</p>
        </div>
        <div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleUpload} />
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="btn-primary flex items-center gap-2 text-sm">
            {uploading
              ? <><span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>上传中...</>
              : <><span className="material-symbols-outlined text-[18px]">upload</span>上传图片</>}
          </button>
        </div>
      </div>

      <div className="bg-surface-container-low rounded-xl p-4 mb-5 text-sm text-on-surface-variant flex items-start gap-2">
        <span className="material-symbols-outlined text-[18px] text-primary mt-0.5">tips_and_updates</span>
        <div>
          <strong className="text-on-surface">使用说明：</strong>上传图片后点击"复制链接"，将链接粘贴到
          <strong className="text-on-surface"> 页面配置 → home → banners</strong> 数组的 <code className="bg-white px-1 rounded">url</code> 字段即可显示为首页轮播图。
          支持 JPG / PNG / WebP / GIF，最大 10MB。
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><span className="material-symbols-outlined animate-spin text-primary text-4xl">refresh</span></div>
      ) : assets.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-on-surface-variant">
          <span className="material-symbols-outlined text-6xl mb-3 text-outline-variant">photo_library</span>
          <p>还没有素材，点击右上角上传图片</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {assets.map(a => (
            <div key={a.filename} className="bg-white rounded-xl overflow-hidden shadow-sm group">
              {/* 预览图 */}
              <div className="aspect-video bg-surface-container-low relative cursor-pointer" onClick={() => setPreview(a)}>
                <img src={`${ASSET_API}${a.url}`} alt={a.filename}
                  className="w-full h-full object-cover group-hover:opacity-90 transition-opacity" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                  <span className="material-symbols-outlined text-white text-3xl">zoom_in</span>
                </div>
              </div>
              {/* 文件信息 */}
              <div className="p-2.5">
                <p className="text-xs text-on-surface truncate font-medium" title={a.filename}>{a.filename}</p>
                <p className="text-[10px] text-on-surface-variant mt-0.5">{formatSize(a.size)}</p>
                <div className="flex gap-1.5 mt-2">
                  <button onClick={() => copyUrl(a.url)}
                    className={`flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded-lg transition-colors ${copied === a.url ? 'bg-green-50 text-green-600' : 'bg-surface-container-low hover:bg-primary/8 text-on-surface-variant hover:text-primary'}`}>
                    <span className="material-symbols-outlined text-[14px]">{copied === a.url ? 'check' : 'content_copy'}</span>
                    {copied === a.url ? '已复制' : '复制链接'}
                  </button>
                  <button onClick={() => handleDelete(a.filename)}
                    className="p-1.5 rounded-lg bg-surface-container-low hover:bg-error/10 text-on-surface-variant hover:text-error transition-colors">
                    <span className="material-symbols-outlined text-[14px]">delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 预览弹窗 */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={() => setPreview(null)}>
          <div className="relative max-w-3xl w-full" onClick={e => e.stopPropagation()}>
            <img src={`${ASSET_API}${preview.url}`} alt={preview.filename} className="w-full rounded-xl shadow-xl" />
            <div className="mt-3 flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-medium">{preview.filename}</p>
                <p className="text-white/60 text-xs mt-0.5">{formatSize(preview.size)}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => copyUrl(preview.url)}
                  className="btn-secondary text-sm py-2 px-4 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">{copied === preview.url ? 'check' : 'content_copy'}</span>
                  {copied === preview.url ? '已复制' : '复制链接'}
                </button>
                <button onClick={() => setPreview(null)}
                  className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AdminConfigs() {
  const [configs, setConfigs] = useState([])
  const [editing, setEditing] = useState(null)
  const [editJson, setEditJson] = useState('')
  const [error, setError] = useState('')

  useEffect(() => { adminApi.pageConfigs().then(r => setConfigs(r.data?.list || [])) }, [])

  const handleSave = async () => {
    setError('')
    try {
      JSON.parse(editJson) // validate
      await adminApi.updateConfig(editing.page_key, JSON.parse(editJson))
      setConfigs(c => c.map(x => x.page_key === editing.page_key ? { ...x, config_json: JSON.parse(editJson) } : x))
      setEditing(null)
    } catch (e) {
      setError('JSON 格式错误: ' + e.message)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-on-surface mb-6">页面配置</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {configs.map(c => (
          <div key={c.page_key} className="bg-white rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-semibold text-on-surface">{c.page_key}</p>
                <p className="text-xs text-on-surface-variant">{c.description}</p>
              </div>
              <button onClick={() => { setEditing(c); setEditJson(JSON.stringify(c.config_json, null, 2)) }} className="btn-ghost text-sm py-1.5 px-3">编辑</button>
            </div>
            <pre className="text-xs text-on-surface-variant bg-surface-container-low rounded-lg p-3 overflow-auto max-h-32 scrollbar-thin">
              {JSON.stringify(c.config_json, null, 2)}
            </pre>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditing(null)} />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-xl z-10">
            <h3 className="font-semibold mb-3">编辑 {editing.page_key}</h3>
            <textarea value={editJson} onChange={(e) => setEditJson(e.target.value)} rows={12}
              className="input-field resize-none font-mono text-sm" />
            {error && <p className="text-xs text-error mt-1">{error}</p>}
            <div className="flex gap-3 justify-end mt-4">
              <button onClick={() => setEditing(null)} className="btn-secondary">取消</button>
              <button onClick={handleSave} className="btn-primary">保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
