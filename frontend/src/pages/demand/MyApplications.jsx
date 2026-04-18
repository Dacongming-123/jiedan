import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import Avatar from '../../components/ui/Avatar'
import { applicationApi } from '../../services/api'
import { formatMoney, formatRelativeTime, CATEGORY_MAP } from '../../utils/format'

const STATUS_MAP = {
  pending:  { label: '待回复', color: 'bg-yellow-100 text-yellow-700' },
  accepted: { label: '已接受', color: 'bg-green-100 text-green-700' },
  rejected: { label: '未通过', color: 'bg-surface-container text-on-surface-variant' },
}

const TABS = [
  { key: 'all',      label: '全部' },
  { key: 'pending',  label: '待回复' },
  { key: 'accepted', label: '已接受' },
  { key: 'rejected', label: '未通过' },
]

export default function MyApplications() {
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('all')
  const [tick, setTick] = useState(0)

  const refresh = () => setTick(t => t + 1)

  useEffect(() => {
    setLoading(true)
    applicationApi.myApplications({ status: tab === 'all' ? undefined : tab })
      .then(res => setApps(res.data?.list || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [tab, tick])

  const pendingCount = apps.filter(a => a.status === 'pending').length
  const acceptedCount = apps.filter(a => a.status === 'accepted').length

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-on-surface">我的申请</h1>
          <Link to="/demand" className="btn-secondary text-sm py-2 px-4 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]">explore</span>
            去接单
          </Link>
        </div>

        {/* Stats */}
        {!loading && apps.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: '全部申请', value: apps.length, icon: 'assignment' },
              { label: '待回复', value: pendingCount, icon: 'hourglass_empty', highlight: pendingCount > 0 },
              { label: '已接受', value: acceptedCount, icon: 'check_circle', positive: acceptedCount > 0 },
            ].map(({ label, value, icon, highlight, positive }) => (
              <div key={label} className={`bg-white rounded-2xl p-4 text-center ${highlight ? 'ring-2 ring-yellow-300' : ''}`}>
                <span className={`material-symbols-outlined text-[22px] mb-1 block ${positive ? 'text-green-500' : highlight ? 'text-yellow-500' : 'text-on-surface-variant'}`}>{icon}</span>
                <p className="text-xl font-bold text-on-surface">{value}</p>
                <p className="text-xs text-on-surface-variant">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-surface-container rounded-full p-1 mb-5 overflow-x-auto scrollbar-thin">
          {TABS.map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                tab === key ? 'bg-white text-on-surface shadow-sm' : 'text-on-surface-variant'
              }`}>
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl p-5 animate-pulse">
                <div className="h-4 bg-surface-container-high rounded w-3/4 mb-3" />
                <div className="h-3 bg-surface-container-high rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : apps.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-on-surface-variant">
            <span className="material-symbols-outlined text-6xl mb-4 text-outline-variant">assignment</span>
            <p className="text-lg font-medium mb-1">还没有申请记录</p>
            <p className="text-sm mb-4">去需求广场找到合适的项目，发挥你的才能</p>
            <Link to="/demand" className="btn-primary text-sm">浏览需求广场</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {apps.map(app => <ApplicationCard key={app.id} app={app} onWithdraw={refresh} />)}
          </div>
        )}
      </div>
    </Layout>
  )
}

function ApplicationCard({ app, onWithdraw }) {
  const status = STATUS_MAP[app.status] || STATUS_MAP.pending
  const isAccepted = app.status === 'accepted'
  const [withdrawing, setWithdrawing] = useState(false)

  const handleWithdraw = async () => {
    if (!confirm('确认撤回该申请？')) return
    setWithdrawing(true)
    try {
      await applicationApi.withdraw(app.id)
      onWithdraw()
    } catch (e) {
      alert(e.message || '撤回失败')
      setWithdrawing(false)
    }
  }

  return (
    <div className={`bg-white rounded-2xl p-5 transition-all ${isAccepted ? 'ring-2 ring-green-200' : ''}`}>
      {/* Status + title */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mb-1.5 ${status.color}`}>
            {status.label}
          </span>
          <Link to={`/demand/${app.requirement_id}`}
            className="block font-semibold text-on-surface hover:text-primary transition-colors line-clamp-1">
            {app.req_title}
          </Link>
          <p className="text-xs text-on-surface-variant mt-0.5">
            {CATEGORY_MAP[app.category] || app.category} · {formatRelativeTime(app.created_at)}申请
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-bold text-primary">{formatMoney(app.price)}</p>
          <p className="text-xs text-on-surface-variant">{app.timeline_days}天</p>
        </div>
      </div>

      {/* Employer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Avatar src={app.employer_avatar} name={app.employer_nickname} size="xs" />
          <span className="text-sm text-on-surface-variant">{app.employer_nickname}</span>
        </div>

        {isAccepted && app.order_id ? (
          <Link to={`/orders/${app.order_id}`}
            className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">open_in_new</span>
            查看订单
          </Link>
        ) : isAccepted ? (
          <Link to="/orders"
            className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">receipt_long</span>
            前往订单中心
          </Link>
        ) : app.status === 'rejected' && app.employer_note ? (
          <p className="text-xs text-on-surface-variant max-w-[140px] text-right line-clamp-2">
            {app.employer_note}
          </p>
        ) : app.status === 'pending' ? (
          <button onClick={handleWithdraw} disabled={withdrawing}
            className="text-xs text-on-surface-variant hover:text-error transition-colors disabled:opacity-50 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">undo</span>
            {withdrawing ? '撤回中...' : '撤回申请'}
          </button>
        ) : null}
      </div>

      {/* Accepted — confirm reminder */}
      {isAccepted && (
        <div className="mt-3 pt-3 border-t border-outline-variant/20 flex items-center gap-2 text-green-700">
          <span className="material-symbols-outlined text-[16px] text-green-500">celebration</span>
          <p className="text-xs font-medium">恭喜！雇主接受了你的申请，请前往订单中心确认合作</p>
        </div>
      )}

      {/* Proposal preview */}
      {app.proposal && (
        <p className="mt-3 text-xs text-on-surface-variant line-clamp-2 pt-3 border-t border-outline-variant/20">
          方案：{app.proposal}
        </p>
      )}
    </div>
  )
}
