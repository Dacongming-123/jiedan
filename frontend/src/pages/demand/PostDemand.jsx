import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import { requirementApi } from '../../services/api'
import { CATEGORIES } from '../../utils/format'
import useAuthStore from '../../store/authStore'

const BUDGET_PRESETS = [
  { label: '1k以下', min: 0, max: 1000 },
  { label: '1k-5k', min: 1000, max: 5000 },
  { label: '5k-2w', min: 5000, max: 20000 },
  { label: '2w-5w', min: 20000, max: 50000 },
  { label: '5w+', min: 50000, max: null },
]

export default function PostDemand() {
  const { isLoggedIn } = useAuthStore()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    title: '', description: '', category: '', budget_min: '', budget_max: '',
    deadline_days: '', tags: [], status: 'open',
  })
  const [tagInput, setTagInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isLoggedIn) { navigate('/login', { state: { from: { pathname: '/post' } } }); return null }

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const qualityScore = () => {
    let score = 0
    if (form.title.length > 10) score += 25
    if (form.description.length > 50) score += 25
    if (form.category) score += 15
    if (form.budget_min || form.budget_max) score += 15
    if (form.deadline_days) score += 10
    if (form.tags.length > 0) score += 10
    return Math.min(100, score)
  }

  const addTag = () => {
    const t = tagInput.trim()
    if (t && !form.tags.includes(t) && form.tags.length < 8) {
      update('tags', [...form.tags, t])
      setTagInput('')
    }
  }

  const handleSubmit = async (e, isDraft = false) => {
    e.preventDefault()
    if (!form.title.trim()) { setError('请填写需求标题'); return }
    if (!form.description.trim()) { setError('请填写需求描述'); return }
    if (!form.category) { setError('请选择需求分类'); return }
    setError('')
    setLoading(true)
    try {
      const res = await requirementApi.create({ ...form, status: isDraft ? 'draft' : 'open' })
      navigate(`/demand/${res.data.id}`)
    } catch (e) {
      setError(e.message || '发布失败')
    } finally {
      setLoading(false)
    }
  }

  const score = qualityScore()

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-on-surface mb-2">发布需求</h1>
          <p className="text-on-surface-variant">描述你的需求，吸引优质创作者申请</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form onSubmit={(e) => handleSubmit(e, false)} className="lg:col-span-2 space-y-6">
            {/* Title */}
            <div className="bg-white rounded-2xl p-6">
              <h2 className="font-semibold text-on-surface mb-4">基本信息</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-on-surface-variant mb-1.5 block">
                    需求标题 <span className="text-error">*</span>
                  </label>
                  <input type="text" value={form.title} onChange={(e) => update('title', e.target.value)}
                    placeholder="简洁描述你的需求，如：为品牌设计一套VI视觉体系"
                    className="input-field" maxLength={100} />
                  <p className="text-xs text-on-surface-variant mt-1 text-right">{form.title.length}/100</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-on-surface-variant mb-1.5 block">
                    分类 <span className="text-error">*</span>
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {CATEGORIES.map(({ value, label }) => (
                      <button key={value} type="button" onClick={() => update('category', value)}
                        className={`py-2 px-3 rounded-xl text-xs font-medium transition-all border-2 ${
                          form.category === value
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-transparent bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                        }`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-2xl p-6">
              <h2 className="font-semibold text-on-surface mb-4">需求描述</h2>
              <textarea
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                placeholder="详细描述你的需求：&#10;• 具体要做什么&#10;• 期望的风格和效果&#10;• 有什么特殊要求&#10;• 参考案例（可附链接）"
                rows={8}
                className="input-field resize-none"
              />
              <p className="text-xs text-on-surface-variant mt-1 text-right">{form.description.length} 字</p>
            </div>

            {/* Budget & Timeline */}
            <div className="bg-white rounded-2xl p-6">
              <h2 className="font-semibold text-on-surface mb-4">预算与时间</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-on-surface-variant mb-2 block">预算范围</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {BUDGET_PRESETS.map(({ label, min, max }) => (
                      <button key={label} type="button"
                        onClick={() => { update('budget_min', min || ''); update('budget_max', max || '') }}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                          form.budget_min == min && form.budget_max == max
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-low'
                        }`}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <input type="number" value={form.budget_min} onChange={(e) => update('budget_min', e.target.value)}
                        placeholder="最低预算（元）" className="input-field" min="0" />
                    </div>
                    <div>
                      <input type="number" value={form.budget_max} onChange={(e) => update('budget_max', e.target.value)}
                        placeholder="最高预算（元）" className="input-field" min="0" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-on-surface-variant mb-1.5 block">交付天数</label>
                  <input type="number" value={form.deadline_days} onChange={(e) => update('deadline_days', e.target.value)}
                    placeholder="期望在多少天内完成？" className="input-field" min="1" />
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="bg-white rounded-2xl p-6">
              <h2 className="font-semibold text-on-surface mb-4">标签（可选）</h2>
              <div className="flex gap-2 mb-3">
                <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  placeholder="输入标签后按回车" className="input-field flex-1" />
                <button type="button" onClick={addTag} className="btn-secondary px-4 py-3">添加</button>
              </div>
              {form.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.tags.map((tag) => (
                    <span key={tag} className="flex items-center gap-1 px-3 py-1 bg-surface-container-low rounded-full text-sm text-on-surface-variant">
                      {tag}
                      <button type="button" onClick={() => update('tags', form.tags.filter(t => t !== tag))}
                        className="text-outline hover:text-error transition-colors">
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 p-4 bg-error-container rounded-xl text-error text-sm">
                <span className="material-symbols-outlined text-[18px]">error</span>
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button type="button" onClick={(e) => handleSubmit(e, true)}
                className="btn-secondary flex-1" disabled={loading}>
                保存草稿
              </button>
              <button type="submit" className="btn-primary flex-1" disabled={loading}>
                {loading ? <span className="material-symbols-outlined animate-spin text-[18px]">refresh</span> : '立即发布'}
              </button>
            </div>
          </form>

          {/* Quality Sidebar */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5 sticky top-20">
              <h3 className="font-semibold text-on-surface mb-4">需求质量</h3>
              <div className="relative w-24 h-24 mx-auto mb-4">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#e8e8ed" strokeWidth="8" />
                  <circle cx="50" cy="50" r="40" fill="none"
                    stroke={score >= 80 ? '#16a34a' : score >= 60 ? '#0058bc' : '#f59e0b'}
                    strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={`${(score / 100) * 251.2} 251.2`} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-on-surface">{score}</span>
                  <span className="text-xs text-on-surface-variant">分</span>
                </div>
              </div>
              <div className="space-y-2">
                {[
                  { label: '标题完整', done: form.title.length > 10 },
                  { label: '描述详细', done: form.description.length > 50 },
                  { label: '已选分类', done: !!form.category },
                  { label: '设定预算', done: !!(form.budget_min || form.budget_max) },
                  { label: '设定工期', done: !!form.deadline_days },
                  { label: '添加标签', done: form.tags.length > 0 },
                ].map(({ label, done }) => (
                  <div key={label} className={`flex items-center gap-2 text-sm ${done ? 'text-green-600' : 'text-on-surface-variant'}`}>
                    <span className={`material-symbols-outlined text-[16px] ${done ? 'icon-filled' : ''}`}>
                      {done ? 'check_circle' : 'radio_button_unchecked'}
                    </span>
                    {label}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-primary/5 rounded-2xl p-4 text-xs text-on-surface-variant space-y-2">
              <p className="font-medium text-primary flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">lightbulb</span>
                发布小贴士
              </p>
              <p>描述越详细，获得精准申请越多</p>
              <p>合理预算可加快匹配速度</p>
              <p>发布后可随时编辑需求内容</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
