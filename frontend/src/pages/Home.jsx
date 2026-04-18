import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import RequirementCard from '../components/shared/RequirementCard'
import CreatorCard from '../components/shared/CreatorCard'
import { requirementApi, userApi, configApi } from '../services/api'
import useAuthStore from '../store/authStore'

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001'

const DEFAULT_STATS = [
  { num: '10,000+', label: '注册创作者' },
  { num: '5,000+',  label: '完成项目' },
  { num: '98%',     label: '满意度' },
  { num: '¥3000万+', label: '创作者累计收入' },
]

export default function Home() {
  const { isLoggedIn } = useAuthStore()
  const [featuredReqs, setFeaturedReqs] = useState([])
  const [featuredCreators, setFeaturedCreators] = useState([])
  const [loading, setLoading] = useState(true)
  const [config, setConfig] = useState(null)
  const [announcementClosed, setAnnouncementClosed] = useState(false)

  useEffect(() => {
    Promise.all([
      requirementApi.list({ status: 'open', limit: 4, sort: 'latest' }),
      fetch('/api/users?role=creator&limit=4&sort=rating').then(r => r.json()).catch(() => ({ data: [] })),
      configApi.get('home').catch(() => null),
    ]).then(([reqRes, creatorRes, cfgRes]) => {
      setFeaturedReqs(reqRes?.data?.list || [])
      setFeaturedCreators(creatorRes?.data?.list || [])
      if (cfgRes?.data) setConfig(cfgRes.data)
    }).finally(() => setLoading(false))
  }, [])

  const cfg = config || {}
  const banners = cfg.banners || []
  const stats = cfg.stats || DEFAULT_STATS
  const bannerTitle = cfg.banner_title || '激发无限创意'
  const bannerSubtitle = cfg.banner_subtitle || '连接顶尖创作者与优质雇主，让每一个创意都能落地'
  const announcement = cfg.announcement

  return (
    <Layout>
      {/* 公告条 */}
      {announcement?.text && !announcementClosed && (
        <div className="bg-primary text-white text-sm px-4 py-2.5 flex items-center justify-between gap-4">
          <p className="flex-1 text-center">
            {announcement.link
              ? <a href={announcement.link} className="underline underline-offset-2">{announcement.text}</a>
              : announcement.text}
          </p>
          <button onClick={() => setAnnouncementClosed(true)} className="flex-shrink-0 opacity-80 hover:opacity-100">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      {/* Hero */}
      <section className="relative overflow-hidden bg-surface pt-8 pb-16">
        {/* 背景装饰 */}
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-tertiary-container/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Banner 轮播（有图片时显示，否则显示文字 Hero） */}
          {banners.length > 0
            ? <BannerCarousel banners={banners} />
            : (
              <div className="text-center mb-12">
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-on-surface mb-4">
                  {bannerTitle.includes('无限创意')
                    ? <>{bannerTitle.split('无限创意')[0]}<span className="text-gradient">无限创意</span>{bannerTitle.split('无限创意')[1]}</>
                    : bannerTitle}
                </h1>
                <p className="text-lg text-on-surface-variant max-w-2xl mx-auto leading-relaxed">
                  {bannerSubtitle}
                </p>
              </div>
            )
          }

          {/* CTA Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto mb-12">
            <Link to="/demand"
              className="glass-card rounded-2xl p-8 flex flex-col items-center text-center hover:shadow-glass-lg transition-all duration-300 hover:-translate-y-1 group">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                <span className="material-symbols-outlined text-primary text-4xl">work_outline</span>
              </div>
              <h2 className="text-2xl font-bold text-on-surface mb-2">我要接单</h2>
              <p className="text-on-surface-variant text-sm leading-relaxed">发挥你的创意才华，赚取丰厚回报</p>
              <span className="mt-4 btn-secondary text-sm py-2 px-5">浏览需求</span>
            </Link>

            <Link to="/post"
              className="glass-card rounded-2xl p-8 flex flex-col items-center text-center hover:shadow-glass-lg transition-all duration-300 hover:-translate-y-1 group">
              <div className="w-16 h-16 bg-tertiary-container/10 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-tertiary-container/20 transition-colors">
                <span className="material-symbols-outlined text-tertiary-container text-4xl">rocket_launch</span>
              </div>
              <h2 className="text-2xl font-bold text-on-surface mb-2">发布需求</h2>
              <p className="text-on-surface-variant text-sm leading-relaxed">寻找顶尖创作者，实现你的奇思妙想</p>
              <span className="mt-4 btn-secondary text-sm py-2 px-5">立即发布</span>
            </Link>
          </div>

          {/* Stats */}
          <div className="flex justify-center gap-8 sm:gap-16 text-center">
            {stats.map(({ num, label }) => (
              <div key={label}>
                <p className="text-xl sm:text-2xl font-extrabold text-on-surface">{num}</p>
                <p className="text-xs sm:text-sm text-on-surface-variant mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Latest Requirements */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-on-surface">最新需求</h2>
            <p className="text-sm text-on-surface-variant mt-1">最新发布的创作需求</p>
          </div>
          <Link to="/demand" className="btn-ghost text-sm">
            查看全部 <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-white rounded-2xl p-5 h-48 animate-pulse">
                <div className="h-4 bg-surface-container-high rounded-full w-3/4 mb-3" />
                <div className="h-3 bg-surface-container-high rounded-full w-full mb-2" />
                <div className="h-3 bg-surface-container-high rounded-full w-2/3" />
              </div>
            ))}
          </div>
        ) : featuredReqs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {featuredReqs.map(req => <RequirementCard key={req.id} req={req} />)}
          </div>
        ) : (
          <EmptyState icon="inbox" text="暂无需求，快来发布第一个吧" />
        )}
      </section>

      {/* Top Creators */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-on-surface">优质创作者</h2>
            <p className="text-sm text-on-surface-variant mt-1">平台口碑最佳的创作者</p>
          </div>
          <Link to="/creators" className="btn-ghost text-sm">
            查看全部 <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </div>
        {featuredCreators.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {featuredCreators.map(c => <CreatorCard key={c.id} creator={c} />)}
          </div>
        ) : (
          <EmptyState icon="people" text="暂无数据" />
        )}
      </section>

      {/* How It Works */}
      <section className="bg-surface-container-low py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl font-bold text-on-surface mb-2">如何运作</h2>
          <p className="text-on-surface-variant mb-12">透明安全的撮合流程，全程资金托管</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { step: '01', icon: 'post_add',    title: '发布需求', desc: '描述你的需求，设定预算与时间' },
              { step: '02', icon: 'group',        title: '选择创作者', desc: '浏览申请者，选择最合适的人才' },
              { step: '03', icon: 'handshake',    title: '双方确认', desc: '3天确认期，达成共识后正式开始' },
              { step: '04', icon: 'verified',     title: '安全结算', desc: '按进度托管资金，完成后双方互评' },
            ].map(({ step, icon, title, desc }) => (
              <div key={step} className="bg-white rounded-2xl p-6 text-left relative overflow-hidden">
                <div className="absolute top-4 right-4 text-5xl font-black text-surface-container-low leading-none">{step}</div>
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-primary">{icon}</span>
                </div>
                <h3 className="font-bold text-on-surface mb-2">{title}</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  )
}

function BannerCarousel({ banners }) {
  const [current, setCurrent] = useState(0)
  const timerRef = useRef(null)

  const go = (idx) => {
    setCurrent((idx + banners.length) % banners.length)
  }

  useEffect(() => {
    if (banners.length <= 1) return
    timerRef.current = setInterval(() => setCurrent(c => (c + 1) % banners.length), 5000)
    return () => clearInterval(timerRef.current)
  }, [banners.length])

  const b = banners[current]

  return (
    <div className="relative w-full rounded-2xl overflow-hidden mb-12 aspect-[16/5] min-h-[160px] bg-surface-container-low group">
      <img
        src={`${API_BASE}${b.url}`}
        alt={b.title || ''}
        className="w-full h-full object-cover transition-opacity duration-500"
      />
      {/* 文字遮罩 */}
      {(b.title || b.subtitle) && (
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent flex flex-col justify-center px-10">
          {b.title && <h2 className="text-white text-3xl sm:text-4xl font-extrabold drop-shadow mb-2">{b.title}</h2>}
          {b.subtitle && <p className="text-white/80 text-base sm:text-lg drop-shadow max-w-md">{b.subtitle}</p>}
          {b.link && (
            <a href={b.link} className="mt-4 inline-flex items-center gap-1 btn-primary text-sm w-fit">
              了解更多 <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </a>
          )}
        </div>
      )}
      {/* 箭头 */}
      {banners.length > 1 && (
        <>
          <button onClick={() => go(current - 1)}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="material-symbols-outlined text-[20px]">chevron_left</span>
          </button>
          <button onClick={() => go(current + 1)}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="material-symbols-outlined text-[20px]">chevron_right</span>
          </button>
          {/* 点指示器 */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {banners.map((_, i) => (
              <button key={i} onClick={() => go(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === current ? 'bg-white w-5' : 'bg-white/50'}`} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function EmptyState({ icon, text }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant">
      <span className="material-symbols-outlined text-5xl mb-3 text-outline-variant">{icon}</span>
      <p className="text-sm">{text}</p>
    </div>
  )
}
