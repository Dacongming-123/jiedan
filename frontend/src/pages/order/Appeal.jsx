import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import { orderApi, appealApi } from '../../services/api'
import useAuthStore from '../../store/authStore'

export default function Appeal() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ reason: '', evidence_urls: [] })
  const [urlInput, setUrlInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    orderApi.detail(id).then(res => setOrder(res.data)).finally(() => setLoading(false))
  }, [id])

  const addUrl = () => {
    if (urlInput.trim()) {
      setForm(f => ({ ...f, evidence_urls: [...f.evidence_urls, urlInput.trim()] }))
      setUrlInput('')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.reason.trim()) { setError('请填写申诉原因'); return }
    setError('')
    setSubmitting(true)
    try {
      const res = await appealApi.submit(id, form)
      navigate(`/orders/${id}`)
    } catch (e) {
      setError(e.message || '提交失败')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <Layout><div className="flex justify-center items-center min-h-96"><span className="material-symbols-outlined animate-spin text-primary text-4xl">refresh</span></div></Layout>
  if (!order) return null

  return (
    <Layout>
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-on-surface-variant mb-6">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          返回
        </button>

        <h1 className="text-2xl font-bold text-on-surface mb-2">发起申诉</h1>
        <p className="text-on-surface-variant text-sm mb-6">申诉将由平台客服介入处理，请提供充分证据</p>

        {/* Warning */}
        <div className="bg-yellow-50 rounded-2xl p-4 mb-6 flex gap-3">
          <span className="material-symbols-outlined text-yellow-600 text-[20px] flex-shrink-0 mt-0.5">warning</span>
          <div className="text-sm text-yellow-700">
            <p className="font-semibold mb-1">申诉须知</p>
            <ul className="space-y-1 text-yellow-600">
              <li>• 申诉期间订单资金继续托管</li>
              <li>• 平台将在3-5个工作日内处理</li>
              <li>• 请如实提供证据，虚假申诉将受到处罚</li>
            </ul>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="bg-white rounded-2xl p-6">
            <label className="text-sm font-medium text-on-surface block mb-3">
              申诉原因 <span className="text-error">*</span>
            </label>
            <div className="grid grid-cols-1 gap-2 mb-4">
              {[
                '对方未按约定时间交付',
                '交付质量严重不符合要求',
                '对方恶意失联/拒绝沟通',
                '需求在未经同意的情况下被更改',
                '其他原因',
              ].map(reason => (
                <button key={reason} type="button"
                  onClick={() => setForm(f => ({ ...f, reason }))}
                  className={`text-left px-4 py-3 rounded-xl text-sm transition-all border-2 ${
                    form.reason === reason
                      ? 'border-primary bg-primary/5 text-primary font-medium'
                      : 'border-transparent bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                  }`}>
                  {reason}
                </button>
              ))}
            </div>
            <textarea
              value={form.reason}
              onChange={(e) => setForm(f => ({ ...f, reason: e.target.value }))}
              placeholder="或者详细描述你的申诉原因..."
              rows={4}
              className="input-field resize-none"
            />
          </div>

          <div className="bg-white rounded-2xl p-6">
            <label className="text-sm font-medium text-on-surface block mb-3">证据链接（可选）</label>
            <p className="text-xs text-on-surface-variant mb-3">上传截图到网盘后粘贴链接，支持多个</p>
            <div className="flex gap-2 mb-3">
              <input type="url" value={urlInput} onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addUrl())}
                placeholder="https://..." className="input-field flex-1 text-sm" />
              <button type="button" onClick={addUrl} className="btn-secondary px-4 text-sm py-3">添加</button>
            </div>
            {form.evidence_urls.length > 0 && (
              <div className="space-y-2">
                {form.evidence_urls.map((url, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-surface-container-low rounded-lg text-xs">
                    <span className="material-symbols-outlined text-primary text-[14px]">link</span>
                    <span className="flex-1 truncate text-on-surface-variant">{url}</span>
                    <button type="button" onClick={() => setForm(f => ({ ...f, evidence_urls: f.evidence_urls.filter((_, j) => j !== i) }))}
                      className="text-outline hover:text-error">
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-error flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px]">error</span>{error}</p>}

          <button type="submit" disabled={submitting} className="btn-primary w-full disabled:opacity-60">
            {submitting ? <span className="material-symbols-outlined animate-spin text-[20px]">refresh</span> : '提交申诉'}
          </button>
        </form>
      </div>
    </Layout>
  )
}
