import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import Modal from '../../components/ui/Modal'
import { orderApi } from '../../services/api'
import useAuthStore from '../../store/authStore'
import { formatDateTime, formatMoney } from '../../utils/format'

export default function ProjectProgress() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitModal, setSubmitModal] = useState(false)
  const [activeMilestone, setActiveMilestone] = useState(null)
  const [submitForm, setSubmitForm] = useState({ description: '', deliverables: [] })
  const [submitting, setSubmitting] = useState(false)

  const reload = () => {
    orderApi.detail(id).then(res => setOrder(res.data)).finally(() => setLoading(false))
  }

  useEffect(() => { reload() }, [id])

  const isCreator = order && user?.id === order.creator_id
  const isEmployer = order && user?.id === order.employer_id

  const handleSubmitMilestone = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await orderApi.submitMilestone(activeMilestone.id, submitForm)
      reload()
      setSubmitModal(false)
    } catch (err) { alert(err.message) }
    finally { setSubmitting(false) }
  }

  const handleApprove = async (milestoneId) => {
    try { await orderApi.approveMilestone(milestoneId); reload() }
    catch (e) { alert(e.message) }
  }

  const handleRevision = async (milestoneId, feedback) => {
    try { await orderApi.requestRevision(milestoneId, feedback); reload() }
    catch (e) { alert(e.message) }
  }

  if (loading) return <Layout><div className="flex justify-center items-center min-h-96"><span className="material-symbols-outlined animate-spin text-primary text-4xl">refresh</span></div></Layout>
  if (!order) return null

  const milestones = order.milestones || []
  const completedPct = milestones.filter(m => m.status === 'approved').reduce((s, m) => s + m.percentage, 0)
  const releasedAmount = order.final_price * completedPct / 100

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <button onClick={() => navigate(`/orders/${id}`)} className="flex items-center gap-2 text-sm text-on-surface-variant hover:text-on-surface mb-6">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          返回订单详情
        </button>

        <h1 className="text-2xl font-bold text-on-surface mb-2">项目进度</h1>
        <p className="text-on-surface-variant text-sm mb-6">{order.title}</p>

        {/* Overall Progress */}
        <div className="bg-white rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-on-surface-variant">整体进度</p>
              <p className="text-3xl font-extrabold text-on-surface">{completedPct}%</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-on-surface-variant">已解锁金额</p>
              <p className="text-xl font-bold text-green-600">{formatMoney(releasedAmount)}</p>
              <p className="text-xs text-on-surface-variant">共 {formatMoney(order.final_price)}</p>
            </div>
          </div>
          <div className="h-3 bg-surface-container rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-primary rounded-full transition-all duration-500"
              style={{ width: `${completedPct}%` }}
            />
          </div>
        </div>

        {/* Milestones */}
        <div className="space-y-4">
          {milestones.map((m, i) => (
            <MilestoneCard key={m.id} milestone={m} index={i} isCreator={isCreator} isEmployer={isEmployer}
              onSubmit={() => { setActiveMilestone(m); setSubmitModal(true) }}
              onApprove={() => handleApprove(m.id)}
              onRevision={(f) => handleRevision(m.id, f)}
            />
          ))}

          {milestones.length === 0 && (
            <div className="text-center py-12 text-on-surface-variant">
              <span className="material-symbols-outlined text-5xl mb-3 text-outline-variant">list_alt</span>
              <p>暂无里程碑，请联系对方设置</p>
            </div>
          )}
        </div>
      </div>

      {/* Submit Milestone Modal */}
      <Modal open={submitModal} onClose={() => setSubmitModal(false)} title={`提交：${activeMilestone?.title}`}
        footer={
          <>
            <button onClick={() => setSubmitModal(false)} className="btn-secondary">取消</button>
            <button form="submit-milestone" type="submit" disabled={submitting} className="btn-primary disabled:opacity-60">
              {submitting ? <span className="material-symbols-outlined animate-spin text-[18px]">refresh</span> : '提交验收'}
            </button>
          </>
        }
      >
        <form id="submit-milestone" onSubmit={handleSubmitMilestone} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-on-surface-variant mb-1.5 block">完成说明</label>
            <textarea value={submitForm.description}
              onChange={(e) => setSubmitForm(f => ({ ...f, description: e.target.value }))}
              placeholder="描述你完成的内容..." rows={4} className="input-field resize-none" />
          </div>
          <div>
            <label className="text-sm font-medium text-on-surface-variant mb-1.5 block">交付物链接（可选）</label>
            <input type="url" placeholder="https://... (文件链接、网盘等)"
              className="input-field"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target.value) {
                  e.preventDefault()
                  setSubmitForm(f => ({ ...f, deliverables: [...f.deliverables, e.target.value] }))
                  e.target.value = ''
                }
              }}
            />
          </div>
        </form>
      </Modal>
    </Layout>
  )
}

function MilestoneCard({ milestone, index, isCreator, isEmployer, onSubmit, onApprove, onRevision }) {
  const [feedbackModal, setFeedbackModal] = useState(false)
  const [feedback, setFeedback] = useState('')

  const statusConfig = {
    pending: { label: '未开始', icon: 'radio_button_unchecked', color: 'text-outline', bg: 'bg-surface-container' },
    submitted: { label: '待雇主验收', icon: 'pending', color: 'text-yellow-600', bg: 'bg-yellow-50' },
    revision: { label: '修改中', icon: 'loop', color: 'text-purple-600', bg: 'bg-purple-50' },
    approved: { label: '已验收', icon: 'check_circle', color: 'text-green-600', bg: 'bg-green-50' },
  }
  const sc = statusConfig[milestone.status] || statusConfig.pending

  return (
    <div className={`rounded-2xl p-5 ${sc.bg} border border-outline-variant/20`}>
      <div className="flex items-start gap-4">
        <div className="flex flex-col items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${milestone.status === 'approved' ? 'bg-green-100' : 'bg-white'}`}>
            <span className={`material-symbols-outlined text-[18px] ${sc.color} ${milestone.status === 'approved' ? 'icon-filled' : ''}`}>
              {sc.icon}
            </span>
          </div>
          {index < 10 && <div className="w-px h-full bg-outline-variant/30 mt-2 hidden" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3 mb-1">
            <h3 className="font-semibold text-on-surface">{milestone.title}</h3>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`text-xs font-medium ${sc.color}`}>{sc.label}</span>
              <span className="text-xs text-on-surface-variant bg-white px-2 py-0.5 rounded-full">{milestone.percentage}%</span>
            </div>
          </div>

          {milestone.description && (
            <p className="text-sm text-on-surface-variant mb-3 leading-relaxed">{milestone.description}</p>
          )}

          {/* Deliverables */}
          {milestone.deliverables && milestone.deliverables.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {milestone.deliverables.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                  className="text-xs flex items-center gap-1 text-primary hover:underline">
                  <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                  交付物 {i + 1}
                </a>
              ))}
            </div>
          )}

          {/* Employer feedback */}
          {milestone.employer_feedback && (
            <div className="bg-white rounded-xl p-3 text-xs text-on-surface-variant mb-3">
              <p className="font-medium text-on-surface mb-1">雇主反馈：</p>
              <p>{milestone.employer_feedback}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 mt-2">
            {isCreator && milestone.status === 'pending' && (
              <button onClick={onSubmit} className="btn-primary text-xs py-1.5 px-4">提交验收</button>
            )}
            {isCreator && milestone.status === 'revision' && (
              <button onClick={onSubmit} className="btn-primary text-xs py-1.5 px-4">重新提交</button>
            )}
            {isEmployer && milestone.status === 'submitted' && (
              <>
                <button onClick={onApprove} className="btn-primary text-xs py-1.5 px-4">
                  <span className="material-symbols-outlined text-[14px]">check</span>
                  验收通过
                </button>
                <button onClick={() => setFeedbackModal(true)} className="btn-secondary text-xs py-1.5 px-4">
                  要求修改
                </button>
              </>
            )}
            {milestone.submitted_at && (
              <span className="text-xs text-on-surface-variant self-center">
                提交于 {formatDateTime(milestone.submitted_at)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Revision feedback modal */}
      {feedbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setFeedbackModal(false)} />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-md z-10">
            <h3 className="font-semibold mb-3">请说明修改意见</h3>
            <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)}
              placeholder="告知创作者需要如何修改..." rows={4} className="input-field resize-none mb-4" />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setFeedbackModal(false)} className="btn-secondary">取消</button>
              <button onClick={() => { onRevision(feedback); setFeedbackModal(false) }} className="btn-primary">提交反馈</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
