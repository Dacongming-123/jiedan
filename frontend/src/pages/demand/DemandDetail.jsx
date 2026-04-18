import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import { requirementApi, applicationApi, messageApi, favoriteApi } from '../../services/api'
import useAuthStore from '../../store/authStore'
import { formatMoneyRange, formatDeadline, formatRelativeTime, CATEGORY_MAP, REQUIREMENT_STATUS_MAP } from '../../utils/format'

export default function DemandDetail() {
  const { id } = useParams()
  const { user, isLoggedIn } = useAuthStore()
  const navigate = useNavigate()
  const [req, setReq] = useState(null)
  const [loading, setLoading] = useState(true)
  const [applyModal, setApplyModal] = useState(false)
  const [applyForm, setApplyForm] = useState({ proposal: '', price: '', timeline_days: '' })
  const [applying, setApplying] = useState(false)
  const [applyError, setApplyError] = useState('')
  const [applied, setApplied] = useState(false)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [bookmarked, setBookmarked] = useState(false)
  const [favoriteCount, setFavoriteCount] = useState(0)
  const [favLoading, setFavLoading] = useState(false)
  const [likeLoading, setLikeLoading] = useState(false)
  const [chatLoading, setChatLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    requirementApi.detail(id)
      .then((res) => {
        setReq(res.data)
        setApplied(res.data.has_applied || false)
        setBookmarked(res.data.has_favorited || false)
        setFavoriteCount(res.data.favorite_count || 0)
        setLiked(res.data.has_liked || false)
        setLikeCount(res.data.like_count || 0)
      })
      .catch(() => navigate('/demand'))
      .finally(() => setLoading(false))
  }, [id])

  const handleApply = async (e) => {
    e.preventDefault()
    setApplyError('')
    if (!applyForm.price || isNaN(applyForm.price)) { setApplyError('请输入报价'); return }
    if (!applyForm.timeline_days) { setApplyError('请输入预计完成天数'); return }
    setApplying(true)
    try {
      await applicationApi.apply(id, applyForm)
      setApplied(true)
      setApplyModal(false)
    } catch (e) {
      setApplyError(e.message || '申请失败')
    } finally {
      setApplying(false)
    }
  }

  const handleFavorite = async () => {
    if (!isLoggedIn) { navigate('/login'); return }
    setFavLoading(true)
    try {
      const res = await favoriteApi.toggle(id)
      setBookmarked(res.data.favorited)
      setFavoriteCount(res.data.favorite_count)
    } catch (e) {
      alert(e.message || '操作失败')
    } finally {
      setFavLoading(false)
    }
  }

  const handleLike = async () => {
    if (!isLoggedIn) { navigate('/login'); return }
    setLikeLoading(true)
    try {
      const res = await favoriteApi.toggleLike(id)
      setLiked(res.data.liked)
      setLikeCount(res.data.like_count)
    } catch (e) {
      alert(e.message || '操作失败')
    } finally {
      setLikeLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('确认删除该需求？删除后不可恢复。')) return
    setDeleting(true)
    try {
      await requirementApi.delete(id)
      navigate('/demand')
    } catch (e) {
      alert(e.message || '删除失败')
      setDeleting(false)
    }
  }

  const handleChat = async () => {
    if (!isLoggedIn) { navigate('/login'); return }
    setChatLoading(true)
    try {
      const res = await messageApi.startConversation(req.employer_id)
      navigate(`/chat/${res.data.conversation_id}`)
    } catch (e) {
      alert(e.message || '发起私信失败，请稍后重试')
    } finally {
      setChatLoading(false)
    }
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: req.title, url: window.location.href }).catch(() => {})
    } else {
      navigator.clipboard?.writeText(window.location.href)
        .then(() => alert('链接已复制'))
        .catch(() => alert('复制失败，请手动复制地址栏链接'))
    }
  }

  if (loading) return <Layout><div className="flex items-center justify-center min-h-96"><span className="material-symbols-outlined animate-spin text-4xl text-primary">refresh</span></div></Layout>
  if (!req) return null

  const status = REQUIREMENT_STATUS_MAP[req.status] || REQUIREMENT_STATUS_MAP.open
  const isOwner = user?.id === req.employer_id
  const canApply = isLoggedIn && !isOwner && user?.role === 'creator' && req.status === 'open' && !applied


  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-on-surface-variant mb-6">
          <Link to="/" className="hover:text-on-surface">首页</Link>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <Link to="/demand" className="hover:text-on-surface">需求广场</Link>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-on-surface line-clamp-1">{req.title}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title Card */}
            <div className="bg-white rounded-2xl p-6">
              <div className="flex items-start justify-between gap-4 mb-3">
                <h1 className="text-2xl font-bold text-on-surface leading-snug flex-1">{req.title}</h1>
                <Badge variant={req.status === 'open' ? 'success' : 'default'}>{status.label}</Badge>
              </div>

              <div className="flex flex-wrap gap-3 mb-5 text-sm text-on-surface-variant">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">category</span>
                  {CATEGORY_MAP[req.category] || req.category}
                </span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">schedule</span>
                  {formatRelativeTime(req.created_at)}发布
                </span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">visibility</span>
                  {req.view_count || 0}次浏览
                </span>
              </div>

              {req.tags && req.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-5">
                  {req.tags.map((tag, i) => (
                    <span key={i} className="text-xs px-3 py-1 bg-surface-container-low text-on-surface-variant rounded-full">{tag}</span>
                  ))}
                </div>
              )}

              <div className="prose prose-sm max-w-none text-on-surface-variant leading-relaxed whitespace-pre-wrap">
                {req.description}
              </div>

              {req.attachments && req.attachments.length > 0 && (
                <div className="mt-5">
                  <p className="text-sm font-medium text-on-surface mb-2">参考附件</p>
                  <div className="flex flex-wrap gap-2">
                    {req.attachments.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 bg-surface-container-low rounded-xl text-sm text-primary hover:bg-surface-container transition-colors">
                        <span className="material-symbols-outlined text-[16px]">attachment</span>
                        附件{i + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Bar */}
              <div className="flex items-center gap-1 mt-5 pt-4 border-t border-outline-variant/20">
                <button
                  onClick={handleLike}
                  disabled={likeLoading}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm transition-colors disabled:opacity-60 ${liked ? 'text-red-500 bg-red-50' : 'text-on-surface-variant hover:bg-surface-container-low'}`}
                >
                  <span className={`material-symbols-outlined text-[18px] ${liked ? 'icon-filled' : ''}`}>favorite</span>
                  {likeCount > 0 ? likeCount : (liked ? '已点赞' : '点赞')}
                </button>
                <button
                  onClick={handleFavorite}
                  disabled={favLoading}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm transition-colors disabled:opacity-60 ${bookmarked ? 'text-primary bg-primary/5' : 'text-on-surface-variant hover:bg-surface-container-low'}`}
                >
                  <span className={`material-symbols-outlined text-[18px] ${bookmarked ? 'icon-filled' : ''}`}>bookmark</span>
                  {favoriteCount > 0 ? favoriteCount : (bookmarked ? '已收藏' : '收藏')}
                </button>
                <button
                  onClick={handleShare}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm text-on-surface-variant hover:bg-surface-container-low transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">share</span>
                  分享
                </button>
              </div>
            </div>

            {/* Owner actions */}
            {isOwner && (
              <div className="bg-white rounded-2xl p-5 flex gap-3">
                <Link to={`/demand/${id}/edit`} className="btn-secondary flex-1 text-center text-sm flex items-center justify-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">edit</span>
                  编辑需求
                </Link>
                {['open', 'draft'].includes(req.status) && (
                  <button onClick={handleDelete} disabled={deleting}
                    className="btn-ghost text-error flex-1 text-sm flex items-center justify-center gap-1.5 disabled:opacity-60">
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                    {deleting ? '删除中...' : '删除需求'}
                  </button>
                )}
              </div>
            )}

            {/* Applications preview (only for owner) */}
            {isOwner && (
              <div className="bg-white rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-on-surface">申请者 ({req.apply_count || 0})</h2>
                  <Link to={`/demand/${id}/applicants`} className="btn-ghost text-sm py-1.5 px-3">
                    查看全部
                  </Link>
                </div>
                {req.recent_applicants?.length > 0 ? (
                  <div className="flex -space-x-2">
                    {req.recent_applicants.slice(0, 8).map((a) => (
                      <Avatar key={a.id} src={a.avatar} name={a.nickname} size="sm"
                        className="ring-2 ring-white" />
                    ))}
                    {req.apply_count > 8 && (
                      <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-xs font-medium text-on-surface-variant ring-2 ring-white">
                        +{req.apply_count - 8}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-on-surface-variant">暂无申请</p>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Budget + Key Info Card */}
            <div className="bg-white rounded-2xl p-6">
              <p className="text-sm text-on-surface-variant mb-1">预算范围</p>
              <p className="text-3xl font-extrabold text-primary mb-4">
                {formatMoneyRange(req.budget_min, req.budget_max)}
              </p>

              {/* Deadline & Apply count — 醒目展示 */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-surface-container-low rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="material-symbols-outlined text-[15px] text-primary">timer</span>
                    <span className="text-xs text-on-surface-variant">交付周期</span>
                  </div>
                  <p className="text-sm font-bold text-on-surface">{formatDeadline(req.deadline_days)}</p>
                </div>
                <div className="bg-surface-container-low rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="material-symbols-outlined text-[15px] text-primary">group</span>
                    <span className="text-xs text-on-surface-variant">已申请</span>
                  </div>
                  <p className="text-sm font-bold text-on-surface">{req.apply_count || 0} 人</p>
                </div>
              </div>

              {canApply ? (
                <button onClick={() => setApplyModal(true)} className="btn-primary w-full">
                  <span className="material-symbols-outlined text-[20px]">send</span>
                  立即申请
                </button>
              ) : applied ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2 py-3 rounded-full bg-green-50 text-green-600 font-medium text-sm">
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    已申请
                  </div>
                  <Link to="/applications" className="btn-ghost w-full text-center text-sm py-2">
                    查看我的申请
                  </Link>
                </div>
              ) : !isLoggedIn ? (
                <Link to="/login" className="btn-primary w-full text-center">登录后申请</Link>
              ) : isOwner ? (
                <Link to={`/demand/${id}/applicants`} className="btn-secondary w-full text-center">
                  管理申请者
                </Link>
              ) : null}

              {!isLoggedIn && (
                <p className="text-xs text-on-surface-variant text-center mt-3">登录后查看更多详情</p>
              )}
            </div>

            {/* Employer Card */}
            <div className="bg-white rounded-2xl p-5">
              <p className="text-sm font-medium text-on-surface mb-3">发布方</p>
              <Link to={`/profile/${req.employer_id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity mb-3">
                <Avatar src={req.employer?.avatar} name={req.employer?.nickname} size="md" />
                <div>
                  <p className="font-medium text-on-surface">{req.employer?.nickname}</p>
                  <p className="text-xs text-on-surface-variant">
                    {req.employer?.completed_orders || 0} 个成功项目
                  </p>
                </div>
              </Link>
              {!isOwner && (
                <button
                  onClick={handleChat}
                  disabled={chatLoading}
                  className="btn-secondary w-full text-sm py-2 disabled:opacity-60"
                >
                  {chatLoading
                    ? <span className="material-symbols-outlined animate-spin text-[16px]">refresh</span>
                    : <><span className="material-symbols-outlined text-[16px]">chat</span> 私信 TA</>
                  }
                </button>
              )}
            </div>

            {/* Safety Badge */}
            <div className="bg-primary/5 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-primary text-[20px]">shield</span>
                <span className="text-sm font-semibold text-primary">资金安全保障</span>
              </div>
              <ul className="space-y-1.5 text-xs text-on-surface-variant">
                <li className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-green-500 text-[14px]">check</span>
                  全程资金托管，按进度结算
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-green-500 text-[14px]">check</span>
                  3天确认期，双方沟通充分
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-green-500 text-[14px]">check</span>
                  完成后双方互评，诚信保障
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Apply Modal */}
      <Modal open={applyModal} onClose={() => setApplyModal(false)} title="申请接单"
        footer={
          <>
            <button onClick={() => setApplyModal(false)} className="btn-secondary">取消</button>
            <button form="apply-form" type="submit" disabled={applying} className="btn-primary disabled:opacity-60">
              {applying ? <span className="material-symbols-outlined animate-spin text-[18px]">refresh</span> : '提交申请'}
            </button>
          </>
        }
      >
        <form id="apply-form" onSubmit={handleApply} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-on-surface-variant mb-1.5 block">我的方案</label>
            <textarea
              value={applyForm.proposal}
              onChange={(e) => setApplyForm(f => ({ ...f, proposal: e.target.value }))}
              placeholder="描述你的创作方案、经验和优势..."
              rows={4}
              className="input-field resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-on-surface-variant mb-1.5 block">报价（元）</label>
              <input type="number" value={applyForm.price}
                onChange={(e) => setApplyForm(f => ({ ...f, price: e.target.value }))}
                placeholder="0" min="1" className="input-field" required />
            </div>
            <div>
              <label className="text-sm font-medium text-on-surface-variant mb-1.5 block">预计天数</label>
              <input type="number" value={applyForm.timeline_days}
                onChange={(e) => setApplyForm(f => ({ ...f, timeline_days: e.target.value }))}
                placeholder="天" min="1" className="input-field" required />
            </div>
          </div>
          {applyError && <p className="text-sm text-error">{applyError}</p>}
        </form>
      </Modal>
    </Layout>
  )
}
