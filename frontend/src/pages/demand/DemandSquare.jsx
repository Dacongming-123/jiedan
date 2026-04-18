import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import RequirementCard from '../../components/shared/RequirementCard'
import { requirementApi, applicationApi } from '../../services/api'
import useAuthStore from '../../store/authStore'
import { CATEGORIES, formatMoney, formatDate, CATEGORY_MAP } from '../../utils/format'

const SORT_OPTIONS = [
  { value: 'latest', label: '最新' },
  { value: 'budget_high', label: '预算最高' },
  { value: 'apply_count', label: '最多申请' },
]

const APPLICATION_STATUS_MAP = {
  pending:  { label: '待回复', color: 'bg-yellow-100 text-yellow-700' },
  accepted: { label: '已通过', color: 'bg-green-100 text-green-700' },
  rejected: { label: '未通过', color: 'bg-red-100 text-red-700' },
  withdrawn:{ label: '已撤回', color: 'bg-surface-container text-on-surface-variant' },
}

export default function DemandSquare() {
  const { user } = useAuthStore()
  const isCreator = user?.role === 'creator'

  const [activeTab, setActiveTab] = useState('square')
  const [reqs, setReqs] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ category: '', sort: 'latest', search: '' })

  // 我的申请 tab
  const [myApps, setMyApps] = useState([])
  const [myAppsLoading, setMyAppsLoading] = useState(false)

  const fetchReqs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await requirementApi.list({ ...filters, page, limit: 12, status: 'open' })
      setReqs(res.data?.list || [])
      setTotal(res.data?.total || 0)
    } catch (_) {}
    finally { setLoading(false) }
  }, [filters, page])

  const fetchMyApps = useCallback(async () => {
    if (!isCreator) return
    setMyAppsLoading(true)
    try {
      const res = await applicationApi.myApplications({ limit: 50 })
      setMyApps(res.data?.list || [])
    } catch (_) {}
    finally { setMyAppsLoading(false) }
  }, [isCreator])

  useEffect(() => {
    if (activeTab === 'square') fetchReqs()
    else fetchMyApps()
  }, [activeTab, fetchReqs, fetchMyApps])

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-on-surface tracking-tight mb-2">需求广场</h1>
          <p className="text-on-surface-variant">浏览最新的创作需求，发挥您的才华赚取报酬</p>
        </div>

        {/* Tabs — 创作者才显示"我的申请" */}
        {isCreator && (
          <div className="flex gap-1 bg-surface-container rounded-full p-1 mb-6 w-fit mx-auto">
            <button
              onClick={() => setActiveTab('square')}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'square' ? 'bg-white text-on-surface shadow-sm' : 'text-on-surface-variant'}`}
            >
              需求广场
            </button>
            <button
              onClick={() => setActiveTab('mine')}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${activeTab === 'mine' ? 'bg-white text-on-surface shadow-sm' : 'text-on-surface-variant'}`}
            >
              我的申请
              {myApps.filter(a => a.status === 'accepted').length > 0 && (
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              )}
            </button>
          </div>
        )}

        {activeTab === 'mine' ? (
          <MyApplications apps={myApps} loading={myAppsLoading} />
        ) : (
          <>
            {/* Search */}
            <div className="relative mb-6 max-w-2xl mx-auto">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant text-[20px]">search</span>
              <input
                type="search"
                placeholder="搜索需求..."
                value={filters.search}
                onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                className="input-field pl-12"
              />
            </div>

            {/* Category Filter */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-thin">
              <FilterChip active={!filters.category} onClick={() => setFilters(f => ({ ...f, category: '' }))} label="全部" />
              {CATEGORIES.map(({ value, label }) => (
                <FilterChip key={value} active={filters.category === value} onClick={() => setFilters(f => ({ ...f, category: value }))} label={label} />
              ))}
            </div>

            {/* Sort */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-on-surface-variant">
                共 <span className="font-semibold text-on-surface">{total}</span> 个需求
              </p>
              <div className="flex gap-2">
                {SORT_OPTIONS.map(({ value, label }) => (
                  <button key={value} onClick={() => setFilters(f => ({ ...f, sort: value }))}
                    className={`text-sm px-3 py-1.5 rounded-full transition-all ${filters.sort === value ? 'bg-primary text-white font-medium' : 'text-on-surface-variant hover:bg-surface-container-low'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : reqs.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {reqs.map((req) => <RequirementCard key={req.id} req={req} />)}
                </div>
                {total > 12 && (
                  <div className="flex justify-center gap-2 mt-8">
                    {Array.from({ length: Math.ceil(total / 12) }, (_, i) => i + 1).slice(0, 10).map((p) => (
                      <button key={p} onClick={() => setPage(p)}
                        className={`w-9 h-9 rounded-full text-sm font-medium transition-all ${page === p ? 'bg-gradient-primary text-white shadow-float' : 'text-on-surface-variant hover:bg-surface-container-low'}`}>
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center py-20 text-on-surface-variant">
                <span className="material-symbols-outlined text-6xl mb-4 text-outline-variant">inbox</span>
                <p className="text-lg font-medium mb-2">暂无符合条件的需求</p>
                <Link to="/post" className="btn-primary mt-4 text-sm">发布第一个需求</Link>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}

function MyApplications({ apps, loading }) {
  if (loading) return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
    </div>
  )

  if (apps.length === 0) return (
    <div className="flex flex-col items-center py-20 text-on-surface-variant">
      <span className="material-symbols-outlined text-6xl mb-4 text-outline-variant">description</span>
      <p className="text-lg font-medium mb-2">还没有申请过任何需求</p>
      <button onClick={() => {}} className="btn-primary mt-4 text-sm">去浏览需求</button>
    </div>
  )

  return (
    <div className="space-y-3 max-w-3xl mx-auto">
      {apps.map(app => {
        const statusInfo = APPLICATION_STATUS_MAP[app.status] || APPLICATION_STATUS_MAP.pending
        return (
          <Link key={app.id} to={`/demand/${app.requirement_id}`}
            className="block bg-white rounded-2xl p-5 hover:shadow-glass transition-all duration-200 hover:-translate-y-0.5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-on-surface mb-1 truncate">{app.req_title}</h3>
                <div className="flex items-center gap-3 text-xs text-on-surface-variant">
                  <span>{CATEGORY_MAP?.[app.category] || app.category}</span>
                  <span>报价 {formatMoney(app.price)}</span>
                  <span>{app.timeline_days}天</span>
                </div>
                {app.status === 'accepted' && app.order_id && (
                  <Link to={`/orders/${app.order_id}`}
                    onClick={e => e.stopPropagation()}
                    className="inline-flex items-center gap-1 text-xs text-primary mt-2 hover:underline">
                    <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                    查看订单
                  </Link>
                )}
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusInfo.color}`}>
                  {statusInfo.label}
                </span>
                <span className="text-xs text-on-surface-variant">{formatDate(app.created_at)}</span>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}

function FilterChip({ active, onClick, label }) {
  return (
    <button onClick={onClick}
      className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all flex-shrink-0 ${
        active ? 'bg-gradient-primary text-white shadow-float' : 'bg-white text-on-surface-variant hover:bg-surface-container-low border border-outline-variant/30'
      }`}>
      {label}
    </button>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl p-5 animate-pulse">
      <div className="h-4 bg-surface-container-high rounded-full w-3/4 mb-3" />
      <div className="h-3 bg-surface-container-high rounded-full w-full mb-2" />
      <div className="h-3 bg-surface-container-high rounded-full w-2/3 mb-4" />
      <div className="flex gap-2 mb-4">
        <div className="h-6 bg-surface-container-high rounded-full w-16" />
        <div className="h-6 bg-surface-container-high rounded-full w-16" />
      </div>
      <div className="flex justify-between items-center pt-3 border-t border-outline-variant/20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-surface-container-high rounded-full" />
          <div className="h-3 bg-surface-container-high rounded-full w-20" />
        </div>
        <div className="h-5 bg-surface-container-high rounded-full w-24" />
      </div>
    </div>
  )
}
