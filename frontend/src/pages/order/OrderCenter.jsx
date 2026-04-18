import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import { orderApi, applicationApi, requirementApi } from '../../services/api'
import useAuthStore from '../../store/authStore'
import { formatMoney, formatDate, formatRelativeTime, ORDER_STATUS_MAP } from '../../utils/format'

const TAB_FILTERS = {
  employer: [
    { key: 'pending_applications', label: '待处理申请' },
    { key: 'all', label: '全部订单' },
    { key: 'pending_confirm', label: '待确认' },
    { key: 'in_progress', label: '进行中' },
    { key: 'pending_review', label: '待验收' },
    { key: 'completed', label: '已完成' },
  ],
  creator: [
    { key: 'pending_applications', label: '申请中' },
    { key: 'all', label: '全部订单' },
    { key: 'pending_confirm', label: '待确认' },
    { key: 'in_progress', label: '进行中' },
    { key: 'pending_review', label: '已提交' },
    { key: 'completed', label: '已完成' },
  ],
}

export default function OrderCenter() {
  const { user } = useAuthStore()
  const role = user?.role || 'employer'
  const [orders, setOrders] = useState([])
  const [pendingItems, setPendingItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('pending_applications')
  const tabs = TAB_FILTERS[role] || TAB_FILTERS.employer

  useEffect(() => {
    setLoading(true)
    if (activeTab === 'pending_applications') {
      const fetch = role === 'creator'
        ? applicationApi.myApplications({ status: 'pending', limit: 50 })
        : requirementApi.myList({ status: 'open', limit: 50 })
      fetch
        .then((res) => {
          const list = res.data?.list || []
          if (role === 'employer') {
            setPendingItems(list.filter(r => r.apply_count > 0))
          } else {
            setPendingItems(list)
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false))
    } else {
      orderApi.list({ status: activeTab === 'all' ? undefined : activeTab })
        .then((res) => setOrders(res.data?.list || []))
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }, [activeTab, role])

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-on-surface">订单中心</h1>
          <span className="text-sm text-on-surface-variant">{role === 'employer' ? '雇主视角' : '创作者视角'}</span>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-surface-container rounded-full p-1 mb-6 overflow-x-auto scrollbar-thin">
          {tabs.map(({ key, label }) => {
            const count = key === 'pending_applications'
              ? pendingItems.length
              : key === 'all' ? orders.length : orders.filter(o => o.status === key).length
            return (
              <button key={key} onClick={() => setActiveTab(key)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${
                  activeTab === key ? 'bg-white text-on-surface shadow-sm' : 'text-on-surface-variant'
                }`}>
                {label}
                {count > 0 && <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === key ? 'bg-primary/10 text-primary' : 'bg-surface-container-high'}`}>{count}</span>}
              </button>
            )
          })}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <SkeletonOrder key={i} />)}
          </div>
        ) : activeTab === 'pending_applications' ? (
          pendingItems.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-on-surface-variant">
              <span className="material-symbols-outlined text-6xl mb-4 text-outline-variant">inbox</span>
              <p className="text-lg font-medium mb-2">{role === 'creator' ? '暂无待回复的申请' : '暂无待处理的申请'}</p>
              <Link to="/demand" className="btn-primary mt-3 text-sm">去浏览需求</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {role === 'creator'
                ? pendingItems.map(app => <ApplicationCard key={app.id} application={app} />)
                : pendingItems.map(req => <PendingRequirementCard key={req.id} requirement={req} />)
              }
            </div>
          )
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-on-surface-variant">
            <span className="material-symbols-outlined text-6xl mb-4 text-outline-variant">receipt_long</span>
            <p className="text-lg font-medium mb-2">暂无订单</p>
            <Link to="/demand" className="btn-primary mt-3 text-sm">去浏览需求</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => <OrderCard key={order.id} order={order} role={role} userId={user?.id} />)}
          </div>
        )}
      </div>
    </Layout>
  )
}

function OrderCard({ order, role, userId }) {
  const statusInfo = ORDER_STATUS_MAP[order.status] || {}
  const isEmployer = order.employer_id === userId
  const otherParty = isEmployer ? order.creator : order.employer
  const effectiveRole = isEmployer ? 'employer' : 'creator'
  const isUrgent = order.status === 'pending_confirm'
  const confirmDeadline = order.confirm_deadline ? new Date(order.confirm_deadline) : null
  const hoursLeft = confirmDeadline ? Math.max(0, (confirmDeadline - Date.now()) / 3600000) : null

  return (
    <Link to={`/orders/${order.id}`}
      className="block bg-white rounded-2xl p-5 hover:shadow-glass transition-all duration-200 hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
            {isUrgent && hoursLeft !== null && hoursLeft < 24 && (
              <span className="inline-flex items-center gap-1 text-xs text-error font-medium">
                <span className="material-symbols-outlined text-[12px]">timer</span>
                {Math.ceil(hoursLeft)}小时后截止确认
              </span>
            )}
          </div>
          <h3 className="font-semibold text-on-surface truncate">{order.title}</h3>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-bold text-primary">{formatMoney(order.final_price)}</p>
          <p className="text-xs text-on-surface-variant">{order.deadline_days}天</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Avatar src={otherParty?.avatar} name={otherParty?.nickname} size="xs" />
          <span className="text-sm text-on-surface-variant">{otherParty?.nickname}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-on-surface-variant">
          <span>{formatDate(order.created_at)}</span>
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
        </div>
      </div>

      {/* Progress bar for in_progress orders */}
      {order.status === 'in_progress' && order.milestones && (
        <div className="mt-3 pt-3 border-t border-outline-variant/20">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-on-surface-variant">项目进度</span>
            <span className="font-medium text-primary">{order.progress || 0}%</span>
          </div>
          <div className="h-1.5 bg-surface-container rounded-full overflow-hidden">
            <div className="h-full bg-gradient-primary rounded-full transition-all" style={{ width: `${order.progress || 0}%` }} />
          </div>
        </div>
      )}

      {/* Confirm reminder */}
      {order.status === 'pending_confirm' && !order[effectiveRole === 'employer' ? 'employer_confirmed' : 'creator_confirmed'] && (
        <div className="mt-3 pt-3 border-t border-outline-variant/20">
          <p className="text-xs text-yellow-600 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">warning</span>
            需要你的确认才能开始
          </p>
        </div>
      )}
    </Link>
  )
}

// 创作者：待回复的申请卡片
function ApplicationCard({ application }) {
  return (
    <Link to={`/demand/${application.requirement_id}`}
      className="block bg-white rounded-2xl p-5 hover:shadow-glass transition-all duration-200 hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
              待回复
            </span>
          </div>
          <h3 className="font-semibold text-on-surface truncate">{application.req_title}</h3>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-bold text-primary">{formatMoney(application.price)}</p>
          <p className="text-xs text-on-surface-variant">{application.timeline_days}天</p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Avatar src={application.employer_avatar} name={application.employer_nickname} size="xs" />
          <span className="text-sm text-on-surface-variant">{application.employer_nickname}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-on-surface-variant">
          <span>{formatDate(application.created_at)}</span>
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
        </div>
      </div>
    </Link>
  )
}

// 雇主：有待处理申请的需求卡片
function PendingRequirementCard({ requirement }) {
  return (
    <Link to={`/demand/${requirement.id}/applicants`}
      className="block bg-white rounded-2xl p-5 hover:shadow-glass transition-all duration-200 hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
              {requirement.apply_count} 人申请
            </span>
          </div>
          <h3 className="font-semibold text-on-surface truncate">{requirement.title}</h3>
        </div>
        <div className="text-right flex-shrink-0">
          {requirement.budget_max && <p className="font-bold text-primary">{formatMoney(requirement.budget_max)}</p>}
          <p className="text-xs text-on-surface-variant">{requirement.deadline_days ? `${requirement.deadline_days}天` : ''}</p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-on-surface-variant">{requirement.category}</p>
        <div className="flex items-center gap-1 text-xs text-primary font-medium">
          查看申请
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
        </div>
      </div>
    </Link>
  )
}

function SkeletonOrder() {
  return (
    <div className="bg-white rounded-2xl p-5 animate-pulse">
      <div className="flex justify-between mb-3">
        <div className="space-y-2 flex-1">
          <div className="h-5 bg-surface-container-high rounded-full w-16" />
          <div className="h-4 bg-surface-container-high rounded-full w-3/4" />
        </div>
        <div className="h-6 bg-surface-container-high rounded-full w-20" />
      </div>
      <div className="flex justify-between">
        <div className="h-3 bg-surface-container-high rounded-full w-24" />
        <div className="h-3 bg-surface-container-high rounded-full w-16" />
      </div>
    </div>
  )
}
