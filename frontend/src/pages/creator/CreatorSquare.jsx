import { useState, useEffect, useCallback } from 'react'
import Layout from '../../components/layout/Layout'
import CreatorCard from '../../components/shared/CreatorCard'
import { CATEGORIES } from '../../utils/format'
import api from '../../services/api'

export default function CreatorSquare() {
  const [creators, setCreators] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState({ category: '', sort: 'rating', search: '' })
  const [page, setPage] = useState(1)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/users', { params: { ...filters, role: 'creator', page, limit: 12 } })
      setCreators(res.data?.list || [])
      setTotal(res.data?.total || 0)
    } catch (_) {}
    finally { setLoading(false) }
  }, [filters, page])

  useEffect(() => { fetch() }, [fetch])

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-on-surface mb-2">创作者广场</h1>
          <p className="text-on-surface-variant">发现优质创作者，开启你的项目</p>
        </div>

        {/* Search */}
        <div className="relative max-w-2xl mx-auto mb-6">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant text-[20px]">search</span>
          <input type="search" placeholder="搜索创作者..." value={filters.search}
            onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
            className="input-field pl-12" />
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-thin">
          <FilterChip active={!filters.category} onClick={() => setFilters(f => ({ ...f, category: '' }))} label="全部" />
          {CATEGORIES.map(({ value, label }) => (
            <FilterChip key={value} active={filters.category === value}
              onClick={() => setFilters(f => ({ ...f, category: value }))} label={label} />
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-on-surface-variant">共 <span className="font-semibold text-on-surface">{total}</span> 位创作者</p>
          <div className="flex gap-2">
            {[['rating', '评分最高'], ['completed_orders', '完成最多'], ['latest', '最新加入']].map(([v, l]) => (
              <button key={v} onClick={() => setFilters(f => ({ ...f, sort: v }))}
                className={`text-sm px-3 py-1.5 rounded-full transition-all ${filters.sort === v ? 'bg-primary text-white' : 'text-on-surface-variant hover:bg-surface-container-low'}`}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : creators.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {creators.map(c => <CreatorCard key={c.id} creator={c} />)}
          </div>
        ) : (
          <div className="flex flex-col items-center py-20 text-on-surface-variant">
            <span className="material-symbols-outlined text-6xl mb-4 text-outline-variant">person_search</span>
            <p className="text-lg font-medium">暂无创作者</p>
          </div>
        )}
      </div>
    </Layout>
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
      <div className="flex items-center gap-3 mb-4">
        <div className="w-14 h-14 bg-surface-container-high rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-surface-container-high rounded-full w-2/3" />
          <div className="h-3 bg-surface-container-high rounded-full w-full" />
        </div>
      </div>
      <div className="h-16 bg-surface-container-high rounded-xl mb-3" />
      <div className="h-4 bg-surface-container-high rounded-full w-1/2" />
    </div>
  )
}
