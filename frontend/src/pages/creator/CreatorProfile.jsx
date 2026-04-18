import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import Avatar from '../../components/ui/Avatar'
import StarRating from '../../components/ui/StarRating'
import Badge from '../../components/ui/Badge'
import { userApi, reviewApi, messageApi } from '../../services/api'
import useAuthStore from '../../store/authStore'
import { formatMoney, formatRelativeTime, CATEGORY_MAP } from '../../utils/format'

export default function CreatorProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user: currentUser, isLoggedIn } = useAuthStore()
  const [profile, setProfile] = useState(null)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('about')
  const isOwn = currentUser?.id == id || id === 'me'

  useEffect(() => {
    const targetId = id === 'me' ? currentUser?.id : id
    if (!targetId) { navigate('/login'); return }
    Promise.all([
      userApi.getProfile(targetId),
      reviewApi.getByUser(targetId),
    ]).then(([pRes, rRes]) => {
      setProfile(pRes.data)
      setReviews(rRes.data?.list || [])
    }).finally(() => setLoading(false))
  }, [id, currentUser?.id])

  const handleContact = async () => {
    if (!isLoggedIn) { navigate('/login'); return }
    try {
      const res = await messageApi.startConversation(profile.id)
      navigate(`/chat/${res.data.conversation_id}`)
    } catch (e) {
      alert(e.message || '发起私信失败，请稍后重试')
    }
  }

  if (loading) return <Layout><div className="flex justify-center items-center min-h-96"><span className="material-symbols-outlined animate-spin text-primary text-4xl">refresh</span></div></Layout>
  if (!profile) return null

  const skills = profile.skills ? (typeof profile.skills === 'string' ? JSON.parse(profile.skills) : profile.skills) : []
  const categories = profile.categories ? (typeof profile.categories === 'string' ? JSON.parse(profile.categories) : profile.categories) : []
  const portfolio = profile.portfolio_urls ? (typeof profile.portfolio_urls === 'string' ? JSON.parse(profile.portfolio_urls) : profile.portfolio_urls) : []
  const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001'

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Profile Card */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-6 text-center">
              <div className="relative inline-block mb-4">
                <Avatar src={profile.avatar} name={profile.nickname} size="xl" />
                {profile.verified && (
                  <span className="absolute bottom-0 right-0 w-7 h-7 bg-primary rounded-full flex items-center justify-center ring-2 ring-white">
                    <span className="material-symbols-outlined text-white text-[14px] icon-filled">verified</span>
                  </span>
                )}
              </div>
              <h1 className="text-xl font-bold text-on-surface mb-1">{profile.nickname}</h1>
              {profile.location && (
                <p className="text-sm text-on-surface-variant flex items-center justify-center gap-1 mb-3">
                  <span className="material-symbols-outlined text-[14px]">location_on</span>
                  {profile.location}
                </p>
              )}
              <div className="flex items-center justify-center gap-2 mb-4">
                <StarRating value={profile.rating_avg || 0} size="sm" />
                <span className="text-sm font-semibold text-on-surface">
                  {profile.rating_avg ? Number(profile.rating_avg).toFixed(1) : '暂无'}
                </span>
                <span className="text-sm text-on-surface-variant">({profile.rating_count || 0})</span>
              </div>

              {isOwn ? (
                <Link to="/settings" className="btn-secondary w-full text-sm py-2.5">编辑资料</Link>
              ) : (
                <button onClick={handleContact} className="btn-primary w-full text-sm py-2.5">
                  <span className="material-symbols-outlined text-[18px]">chat</span>
                  联系TA
                </button>
              )}
            </div>

            {/* Stats */}
            <div className="bg-white rounded-2xl p-5">
              <h3 className="font-semibold text-on-surface mb-3">数据概览</h3>
              <div className="space-y-3">
                {[
                  { icon: 'task_alt', label: '完成订单', value: `${profile.completed_orders || 0} 单` },
                  { icon: 'schedule', label: '准时完成率', value: `${profile.on_time_rate || 100}%` },
                  { icon: 'reply', label: '响应率', value: `${profile.response_rate || 100}%` },
                  { icon: 'payments', label: '累计收入', value: formatMoney(profile.total_income || 0) },
                ].map(({ icon, label, value }) => (
                  <div key={label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                      <span className="material-symbols-outlined text-[16px]">{icon}</span>
                      {label}
                    </div>
                    <span className="text-sm font-semibold text-on-surface">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Skills */}
            {skills.length > 0 && (
              <div className="bg-white rounded-2xl p-5">
                <h3 className="font-semibold text-on-surface mb-3">技能标签</h3>
                <div className="flex flex-wrap gap-2">
                  {skills.map((s, i) => (
                    <span key={i} className="px-3 py-1 bg-primary/8 text-primary text-xs font-medium rounded-full">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Tabs */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="flex gap-1 bg-white rounded-full p-1 mb-5 shadow-sm">
              {[['about', '个人介绍'], ['portfolio', `作品集 (${portfolio.length})`], ['reviews', `评价 (${reviews.length})`]].map(([key, label]) => (
                <button key={key} onClick={() => setActiveTab(key)}
                  className={`flex-1 py-2 rounded-full text-sm font-medium transition-all ${
                    activeTab === key ? 'bg-gradient-primary text-white shadow-sm' : 'text-on-surface-variant'
                  }`}>
                  {label}
                </button>
              ))}
            </div>

            {activeTab === 'about' && (
              <div className="space-y-4">
                {/* Bio */}
                <div className="bg-white rounded-2xl p-6">
                  <h2 className="font-semibold text-on-surface mb-3">关于我</h2>
                  <p className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap">
                    {profile.bio || '这个人很懒，什么都没写...'}
                  </p>
                </div>

                {/* Categories */}
                {categories.length > 0 && (
                  <div className="bg-white rounded-2xl p-6">
                    <h2 className="font-semibold text-on-surface mb-3">擅长领域</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {categories.map((cat, i) => (
                        <div key={i} className="flex items-center gap-2 p-3 bg-surface-container-low rounded-xl">
                          <span className="material-symbols-outlined text-primary text-[20px]">palette</span>
                          <span className="text-sm font-medium text-on-surface">{CATEGORY_MAP[cat] || cat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'portfolio' && (
              <div>
                {portfolio.length === 0 ? (
                  <div className="flex flex-col items-center py-12 text-on-surface-variant bg-white rounded-2xl">
                    <span className="material-symbols-outlined text-5xl mb-3 text-outline-variant">photo_library</span>
                    <p>{isOwn ? '还没有作品，去设置页面上传吧' : '该创作者还没有上传作品'}</p>
                    {isOwn && <a href="/settings" className="btn-primary text-sm mt-4">去上传</a>}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* 图片网格 */}
                    {portfolio.filter(i => i.type === 'image').length > 0 && (
                      <div className="bg-white rounded-2xl p-5">
                        <h3 className="text-sm font-semibold text-on-surface-variant mb-3 flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px]">image</span>图片作品
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {portfolio.filter(i => i.type === 'image').map((item, i) => (
                            <a key={i} href={`${API_BASE}${item.url}`} target="_blank" rel="noopener noreferrer"
                              className="group relative aspect-square rounded-xl overflow-hidden bg-surface-container block">
                              <img src={`${API_BASE}${item.url}`} alt={item.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                              {item.title && (
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 translate-y-full group-hover:translate-y-0 transition-transform">
                                  <p className="text-white text-xs truncate">{item.title}</p>
                                </div>
                              )}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 视频列表 */}
                    {portfolio.filter(i => i.type === 'video').length > 0 && (
                      <div className="bg-white rounded-2xl p-5">
                        <h3 className="text-sm font-semibold text-on-surface-variant mb-3 flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px]">videocam</span>视频作品
                        </h3>
                        <div className="space-y-3">
                          {portfolio.filter(i => i.type === 'video').map((item, i) => (
                            <div key={i} className="rounded-xl overflow-hidden bg-black">
                              <video controls className="w-full max-h-64" preload="metadata">
                                <source src={`${API_BASE}${item.url}`} />
                              </video>
                              {item.title && (
                                <p className="text-xs text-on-surface-variant px-3 py-2">{item.title}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 文档列表 */}
                    {portfolio.filter(i => i.type === 'document').length > 0 && (
                      <div className="bg-white rounded-2xl p-5">
                        <h3 className="text-sm font-semibold text-on-surface-variant mb-3 flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px]">description</span>文档作品
                        </h3>
                        <div className="space-y-2">
                          {portfolio.filter(i => i.type === 'document').map((item, i) => {
                            const ext = (item.filename || '').split('.').pop()?.toLowerCase()
                            const iconMap = { pdf: ['picture_as_pdf','text-red-500'], doc: ['description','text-blue-600'], docx: ['description','text-blue-600'], ppt: ['slideshow','text-orange-500'], pptx: ['slideshow','text-orange-500'] }
                            const [icon, color] = iconMap[ext] || ['insert_drive_file', 'text-on-surface-variant']
                            return (
                              <a key={i} href={`${API_BASE}${item.url}`} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors">
                                <span className={`material-symbols-outlined text-[28px] ${color}`}>{icon}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-on-surface truncate">{item.title || item.filename}</p>
                                  <p className="text-xs text-on-surface-variant uppercase">{ext}</p>
                                </div>
                                <span className="material-symbols-outlined text-on-surface-variant text-[18px]">open_in_new</span>
                              </a>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-4">
                {reviews.length === 0 ? (
                  <div className="flex flex-col items-center py-12 text-on-surface-variant bg-white rounded-2xl">
                    <span className="material-symbols-outlined text-5xl mb-3 text-outline-variant">rate_review</span>
                    <p>暂无评价</p>
                  </div>
                ) : (
                  reviews.map(review => (
                    <div key={review.id} className="bg-white rounded-2xl p-5">
                      <div className="flex items-start gap-3 mb-3">
                        <Avatar src={review.reviewer?.avatar} name={review.reviewer?.nickname} size="sm" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-on-surface">{review.reviewer?.nickname}</p>
                            <span className="text-xs text-on-surface-variant">{formatRelativeTime(review.created_at)}</span>
                          </div>
                          <StarRating value={review.rating} size="xs" />
                        </div>
                      </div>
                      <p className="text-sm text-on-surface-variant leading-relaxed">{review.comment || '该用户没有留下评语'}</p>
                      <div className="flex gap-3 mt-2">
                        {review.quality && <span className="text-xs text-on-surface-variant">质量 {review.quality}/5</span>}
                        {review.communication && <span className="text-xs text-on-surface-variant">沟通 {review.communication}/5</span>}
                        {review.timeliness && <span className="text-xs text-on-surface-variant">准时 {review.timeliness}/5</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
