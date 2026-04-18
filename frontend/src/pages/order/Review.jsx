import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import Avatar from '../../components/ui/Avatar'
import StarRating from '../../components/ui/StarRating'
import { orderApi, reviewApi } from '../../services/api'
import useAuthStore from '../../store/authStore'

export default function Review() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [alreadyReviewed, setAlreadyReviewed] = useState(false)
  const [form, setForm] = useState({ rating: 5, quality: 5, communication: 5, timeliness: 5, comment: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([orderApi.detail(id), reviewApi.getByOrder(id)])
      .then(([orderRes, reviewRes]) => {
        setOrder(orderRes.data)
        const reviewed = (reviewRes.data?.list || []).some(r => r.reviewer_id === user?.id)
        setAlreadyReviewed(reviewed)
      })
      .finally(() => setLoading(false))
  }, [id])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await reviewApi.submit(id, form)
      navigate(`/orders/${id}`)
    } catch (e) {
      setError(e.message || '提交失败')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <Layout><div className="flex justify-center items-center min-h-96"><span className="material-symbols-outlined animate-spin text-primary text-4xl">refresh</span></div></Layout>
  if (!order) return null

  const isEmployer = user?.id === order.employer_id
  const reviewee = isEmployer ? order.creator : order.employer

  if (alreadyReviewed) {
    return (
      <Layout>
        <div className="max-w-xl mx-auto px-4 sm:px-6 py-8">
          <button onClick={() => navigate(`/orders/${id}`)} className="flex items-center gap-2 text-sm text-on-surface-variant mb-6">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            返回订单
          </button>
          <div className="bg-white rounded-2xl p-10 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-green-600 text-4xl icon-filled">check_circle</span>
            </div>
            <h2 className="text-xl font-bold text-on-surface mb-2">已完成评价</h2>
            <p className="text-on-surface-variant text-sm mb-6">你已经对本次合作提交过评价，无法重复评价。</p>
            <button onClick={() => navigate(`/orders/${id}`)} className="btn-primary">返回订单详情</button>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-on-surface-variant mb-6">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          返回
        </button>

        <h1 className="text-2xl font-bold text-on-surface mb-2">完成评价</h1>
        <p className="text-on-surface-variant text-sm mb-6">评价将公开显示，请客观真实地填写</p>

        {/* Reviewee Card */}
        <div className="bg-white rounded-2xl p-5 mb-6 flex items-center gap-4">
          <Avatar src={reviewee?.avatar} name={reviewee?.nickname} size="lg" />
          <div>
            <p className="font-semibold text-on-surface">{reviewee?.nickname}</p>
            <p className="text-sm text-on-surface-variant">{isEmployer ? '创作者' : '雇主'}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Overall Rating */}
          <div className="bg-white rounded-2xl p-6">
            <h3 className="font-semibold text-on-surface mb-4">综合评分</h3>
            <div className="flex flex-col items-center gap-3">
              <StarRating value={form.rating} size="lg" interactive onChange={(v) => setForm(f => ({ ...f, rating: v }))} />
              <p className="text-on-surface-variant text-sm">
                {['', '非常不满意', '不满意', '一般', '满意', '非常满意'][form.rating]}
              </p>
            </div>
          </div>

          {/* Detailed Ratings */}
          <div className="bg-white rounded-2xl p-6">
            <h3 className="font-semibold text-on-surface mb-4">细项评分</h3>
            <div className="space-y-4">
              {[
                { key: 'quality', label: isEmployer ? '交付质量' : '需求明确度' },
                { key: 'communication', label: '沟通协作' },
                { key: 'timeliness', label: isEmployer ? '按时交付' : '按时付款' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm text-on-surface-variant">{label}</span>
                  <StarRating value={form[key]} size="sm" interactive onChange={(v) => setForm(f => ({ ...f, [key]: v }))} />
                </div>
              ))}
            </div>
          </div>

          {/* Comment */}
          <div className="bg-white rounded-2xl p-6">
            <h3 className="font-semibold text-on-surface mb-3">评语</h3>
            <textarea
              value={form.comment}
              onChange={(e) => setForm(f => ({ ...f, comment: e.target.value }))}
              placeholder="分享你的合作体验，帮助其他用户做出更好的选择..."
              rows={4}
              className="input-field resize-none"
            />
            <p className="text-xs text-on-surface-variant mt-1 text-right">{form.comment.length}/500</p>
          </div>

          {error && <p className="text-sm text-error">{error}</p>}

          <button type="submit" disabled={submitting} className="btn-primary w-full disabled:opacity-60">
            {submitting ? <span className="material-symbols-outlined animate-spin text-[20px]">refresh</span> : '提交评价'}
          </button>
        </form>
      </div>
    </Layout>
  )
}
