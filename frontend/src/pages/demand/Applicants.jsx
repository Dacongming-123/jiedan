import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import StarRating from '../../components/ui/StarRating'
import { applicationApi, requirementApi } from '../../services/api'
import { formatMoney, formatRelativeTime } from '../../utils/format'
import useAuthStore from '../../store/authStore'

const STATUS_MAP = {
  pending: { label: '待审核', variant: 'warning' },
  reviewing: { label: '审核中', variant: 'info' },
  accepted: { label: '已录用', variant: 'success' },
  rejected: { label: '已拒绝', variant: 'default' },
}

export default function Applicants() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [req, setReq] = useState(null)
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedApp, setSelectedApp] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [rejectNote, setRejectNote] = useState('')
  const [rejectModal, setRejectModal] = useState(false)

  useEffect(() => {
    Promise.all([requirementApi.detail(id), applicationApi.list(id)])
      .then(([reqRes, appRes]) => {
        if (reqRes.data.employer_id !== user?.id) { navigate('/demand'); return }
        setReq(reqRes.data)
        setApps(appRes.data?.list || [])
      })
      .finally(() => setLoading(false))
  }, [id])

  const handleAccept = async (appId) => {
    setActionLoading(true)
    try {
      await applicationApi.accept(appId)
      setApps(apps.map(a => a.id === appId ? { ...a, status: 'accepted' } : a))
    } catch (e) { alert(e.message) }
    finally { setActionLoading(false) }
  }

  const handleReject = async () => {
    setActionLoading(true)
    try {
      await applicationApi.reject(selectedApp.id, rejectNote)
      setApps(apps.map(a => a.id === selectedApp.id ? { ...a, status: 'rejected' } : a))
      setRejectModal(false)
      setRejectNote('')
    } catch (e) { alert(e.message) }
    finally { setActionLoading(false) }
  }

  if (loading) return <Layout><div className="flex items-center justify-center min-h-96"><span className="material-symbols-outlined animate-spin text-4xl text-primary">refresh</span></div></Layout>

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-surface-container-low transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant">arrow_back</span>
          </button>
          <div>
            <h1 className="text-xl font-bold text-on-surface">申请列表</h1>
            {req && <p className="text-sm text-on-surface-variant">{req.title}</p>}
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-on-surface-variant">共 <span className="font-semibold text-on-surface">{apps.length}</span> 个申请</p>
          <div className="flex gap-2 text-sm">
            {Object.entries(STATUS_MAP).map(([k, v]) => {
              const count = apps.filter(a => a.status === k).length
              return count > 0 ? (
                <span key={k} className="text-on-surface-variant">{v.label}: {count}</span>
              ) : null
            })}
          </div>
        </div>

        <div className="space-y-4">
          {apps.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-on-surface-variant">
              <span className="material-symbols-outlined text-5xl mb-3 text-outline-variant">person_search</span>
              <p>暂无申请</p>
            </div>
          ) : (
            apps.map((app) => (
              <div key={app.id} className="bg-white rounded-2xl p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <Link to={`/profile/${app.creator_id}`} onClick={e => e.stopPropagation()} className="relative flex-shrink-0 group/avatar">
                      <Avatar src={app.creator?.avatar} name={app.creator?.nickname} size="lg" />
                      <div className="absolute inset-0 rounded-full bg-black/0 group-hover/avatar:bg-black/10 transition-colors" />
                      {app.creator?.verified && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-white text-[10px]">verified</span>
                        </span>
                      )}
                    </Link>
                    <div>
                      <div className="flex items-center gap-2">
                        <Link to={`/profile/${app.creator_id}`} className="font-semibold text-on-surface hover:text-primary transition-colors">{app.creator?.nickname}</Link>
                        <Badge variant={STATUS_MAP[app.status]?.variant || 'default'}>
                          {STATUS_MAP[app.status]?.label || app.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <StarRating value={app.creator?.rating_avg || 0} size="xs" />
                        <span className="text-xs text-on-surface-variant">
                          {app.creator?.completed_orders || 0} 单完成
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-primary">{formatMoney(app.price)}</p>
                    <p className="text-xs text-on-surface-variant">{app.timeline_days} 天完成</p>
                  </div>
                </div>

                {app.proposal && (
                  <div className="bg-surface-container-low rounded-xl p-4 mb-4 text-sm text-on-surface-variant leading-relaxed">
                    {app.proposal}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-xs text-on-surface-variant">{formatRelativeTime(app.created_at)}</span>
                  {app.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setSelectedApp(app); setRejectModal(true) }}
                        className="btn-secondary text-sm py-2 px-4"
                      >
                        拒绝
                      </button>
                      <button
                        onClick={() => handleAccept(app.id)}
                        disabled={actionLoading}
                        className="btn-primary text-sm py-2 px-4 disabled:opacity-60"
                      >
                        录用
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Modal open={rejectModal} onClose={() => setRejectModal(false)} title="拒绝申请"
        footer={
          <>
            <button onClick={() => setRejectModal(false)} className="btn-secondary">取消</button>
            <button onClick={handleReject} disabled={actionLoading} className="btn-primary disabled:opacity-60">确认拒绝</button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-on-surface-variant">确认拒绝 <strong className="text-on-surface">{selectedApp?.creator?.nickname}</strong> 的申请？</p>
          <div>
            <label className="text-sm font-medium text-on-surface-variant mb-1.5 block">拒绝原因（可选）</label>
            <textarea value={rejectNote} onChange={(e) => setRejectNote(e.target.value)}
              placeholder="告知申请者拒绝原因，有助于改进..." rows={3} className="input-field resize-none" />
          </div>
        </div>
      </Modal>
    </Layout>
  )
}
