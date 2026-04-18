import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import Avatar from '../../components/ui/Avatar'
import Modal from '../../components/ui/Modal'
import { orderApi, paymentApi, messageApi, reviewApi } from '../../services/api'
import useAuthStore from '../../store/authStore'
import { formatMoney, formatDate, formatDateTime, ORDER_STATUS_MAP } from '../../utils/format'

export default function OrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [hasReviewed, setHasReviewed] = useState(false)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [payModal, setPayModal] = useState(false)
  const [payStep, setPayStep] = useState('choose') // 'choose' | 'wechat_qr' | 'alipay_form' | 'polling'
  const [payData, setPayData] = useState(null)
  const [changeModal, setChangeModal] = useState(false)
  const [changeForm, setChangeForm] = useState({ description: '', price_delta: 0, days_delta: 0 })

  const reload = () => {
    orderApi.detail(id)
      .then((res) => {
        setOrder(res.data)
        if (res.data?.status === 'completed') {
          reviewApi.getByOrder(id).then(r => {
            setHasReviewed((r.data?.list || []).some(rv => rv.reviewer_id === user?.id))
          }).catch(() => {})
        }
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { reload() }, [id])

  // 监听订单事件
  useEffect(() => {
    const handler = (e) => { if (e.detail.order_id == id) reload() }
    window.addEventListener('orderEvent', handler)
    return () => window.removeEventListener('orderEvent', handler)
  }, [id])

  const handleConfirm = async () => {
    setConfirmLoading(true)
    try {
      await orderApi.confirm(id)
      reload()
    } catch (e) { alert(e.message) }
    finally { setConfirmLoading(false) }
  }

  const handleMockPay = async () => {
    try {
      await paymentApi.mockPay(id)
      reload()
      setPayModal(false)
      setPayStep('choose')
    } catch (e) { alert(e.message) }
  }

  const handleWechatPay = async () => {
    try {
      const res = await paymentApi.createWechat(id)
      setPayData(res.data)
      setPayStep('wechat_qr')
      // 开始轮询支付结果
      const payNo = res.data.payment_no
      const timer = setInterval(async () => {
        try {
          const s = await paymentApi.status(payNo)
          if (s.data?.status === 'success') {
            clearInterval(timer)
            reload()
            setPayModal(false)
            setPayStep('choose')
          }
        } catch (_) {}
      }, 3000)
      setTimeout(() => clearInterval(timer), 10 * 60 * 1000) // 10 分钟超时
    } catch (e) { alert(e.message || '创建微信支付失败') }
  }

  const handleAlipay = async () => {
    try {
      const res = await paymentApi.createAlipay(id)
      setPayData(res.data)
      setPayStep('alipay_form')
      // 提交表单跳转到支付宝
      setTimeout(() => {
        const div = document.createElement('div')
        div.innerHTML = res.data.form_html
        document.body.appendChild(div)
        div.querySelector('form')?.submit()
        document.body.removeChild(div)
      }, 100)
    } catch (e) { alert(e.message || '创建支付宝支付失败') }
  }

  const handleChat = async () => {
    try {
      const targetId = isEmployer ? order.creator_id : order.employer_id
      const res = await messageApi.startConversation(targetId)
      navigate(`/chat/${res.data.conversation_id}`)
    } catch (e) { alert(e.message || '发起会话失败') }
  }

  const handleCancel = async () => {
    if (!confirm('确认取消订单？')) return
    try { await orderApi.cancel(id); reload() }
    catch (e) { alert(e.message) }
  }

  const handleSubmitChange = async (e) => {
    e.preventDefault()
    try {
      await orderApi.requestChange(id, changeForm)
      reload()
      setChangeModal(false)
    } catch (e) { alert(e.message) }
  }

  if (loading) return <Layout><div className="flex items-center justify-center min-h-96"><span className="material-symbols-outlined animate-spin text-4xl text-primary">refresh</span></div></Layout>
  if (!order) return null

  const statusInfo = ORDER_STATUS_MAP[order.status] || {}
  const isEmployer = user?.id === order.employer_id
  const myConfirmed = isEmployer ? order.employer_confirmed : order.creator_confirmed
  const otherParty = isEmployer ? order.creator : order.employer

  // 3天确认期倒计时
  const confirmDeadline = order.confirm_deadline ? new Date(order.confirm_deadline) : null
  const hoursLeft = confirmDeadline ? Math.max(0, (confirmDeadline - Date.now()) / 3600000) : null

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Back */}
        <button onClick={() => navigate('/orders')} className="flex items-center gap-2 text-sm text-on-surface-variant hover:text-on-surface mb-6 transition-colors">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          返回订单列表
        </button>

        {/* Header */}
        <div className="bg-white rounded-2xl p-6 mb-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mb-2 ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
              <h1 className="text-xl font-bold text-on-surface">{order.title}</h1>
              <p className="text-sm text-on-surface-variant mt-1">订单号: {order.order_no}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-extrabold text-primary">{formatMoney(order.final_price)}</p>
              <p className="text-xs text-on-surface-variant mt-1">平台服务费: {formatMoney(order.platform_fee)}</p>
            </div>
          </div>

          {/* Parties */}
          <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl">
            <div className="flex items-center gap-3">
              <Avatar src={order.employer?.avatar} name={order.employer?.nickname} size="md" />
              <div>
                <p className="text-xs text-on-surface-variant">雇主</p>
                <p className="text-sm font-medium text-on-surface">{order.employer?.nickname}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${order.employer_confirmed ? 'bg-green-100' : 'bg-surface-container'}`}>
                <span className={`material-symbols-outlined text-[16px] ${order.employer_confirmed ? 'text-green-600 icon-filled' : 'text-outline'}`}>
                  {order.employer_confirmed ? 'check_circle' : 'radio_button_unchecked'}
                </span>
              </div>
              <span className="material-symbols-outlined text-outline-variant text-[20px]">sync_alt</span>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${order.creator_confirmed ? 'bg-green-100' : 'bg-surface-container'}`}>
                <span className={`material-symbols-outlined text-[16px] ${order.creator_confirmed ? 'text-green-600 icon-filled' : 'text-outline'}`}>
                  {order.creator_confirmed ? 'check_circle' : 'radio_button_unchecked'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-on-surface-variant">创作者</p>
                <p className="text-sm font-medium text-on-surface">{order.creator?.nickname}</p>
              </div>
              <Avatar src={order.creator?.avatar} name={order.creator?.nickname} size="md" />
            </div>
          </div>
        </div>

        {/* 3-Day Confirm Period Banner */}
        {order.status === 'pending_confirm' && (
          <div className={`rounded-2xl p-5 mb-5 ${myConfirmed ? 'bg-green-50' : 'bg-yellow-50'}`}>
            <div className="flex items-start gap-3">
              <span className={`material-symbols-outlined text-[22px] mt-0.5 ${myConfirmed ? 'text-green-600' : 'text-yellow-600'}`}>
                {myConfirmed ? 'check_circle' : 'pending'}
              </span>
              <div className="flex-1">
                <p className={`font-semibold text-sm ${myConfirmed ? 'text-green-700' : 'text-yellow-700'}`}>
                  {myConfirmed ? '你已确认，等待对方确认' : '3天确认期 — 需要你的确认'}
                </p>
                <p className="text-xs mt-1 text-on-surface-variant">
                  确认期内请与对方充分沟通需求细节。确认后需求将锁定，双方均同意后正式开始。
                  {hoursLeft !== null && <span className="ml-1 font-medium text-yellow-600">剩余 {Math.ceil(hoursLeft)} 小时</span>}
                </p>
                {!myConfirmed && (
                  <button onClick={handleConfirm} disabled={confirmLoading}
                    className="mt-3 btn-primary text-sm py-2 px-5 disabled:opacity-60">
                    {confirmLoading ? <span className="material-symbols-outlined animate-spin text-[18px]">refresh</span> : '确认开始合作'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Pay Banner */}
        {order.status === 'confirmed' && isEmployer && (
          <div className="bg-blue-50 rounded-2xl p-5 mb-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-blue-700">双方已确认，请支付项目款项</p>
                <p className="text-xs text-on-surface-variant mt-1">付款后资金由平台托管，项目完成后结算给创作者</p>
              </div>
              <button onClick={() => setPayModal(true)} className="btn-primary text-sm py-2 px-5 whitespace-nowrap">
                立即支付 {formatMoney(order.final_price)}
              </button>
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="bg-white rounded-2xl p-6 mb-5">
          <h2 className="font-semibold text-on-surface mb-4">订单时间线</h2>
          <div className="space-y-4">
            {[
              { label: '订单创建', time: order.created_at, done: true },
              { label: '双方确认截止', time: order.confirm_deadline, done: !!order.start_date },
              { label: '正式开始', time: order.start_date, done: !!order.start_date },
              { label: '预计交付', time: order.expected_end, done: order.status === 'completed' },
              { label: '实际完成', time: order.actual_end, done: !!order.actual_end },
            ].map(({ label, time, done }) => (
              <div key={label} className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${done ? 'bg-primary/10' : 'bg-surface-container'}`}>
                  <span className={`material-symbols-outlined text-[16px] ${done ? 'text-primary icon-filled' : 'text-outline'}`}>
                    {done ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                </div>
                <div>
                  <p className={`text-sm font-medium ${done ? 'text-on-surface' : 'text-on-surface-variant'}`}>{label}</p>
                  {time && <p className="text-xs text-on-surface-variant">{formatDateTime(time)}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Milestones */}
        {order.milestones && order.milestones.length > 0 && (
          <div className="bg-white rounded-2xl p-6 mb-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-on-surface">项目里程碑</h2>
              <Link to={`/orders/${id}/progress`} className="btn-ghost text-sm py-1 px-3">查看详情</Link>
            </div>
            <div className="space-y-3">
              {order.milestones.map((m, i) => (
                <MilestoneItem key={m.id} milestone={m} index={i} isEmployer={isEmployer} onUpdate={reload} />
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <button onClick={handleChat} className="btn-secondary flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">chat</span>
            联系{isEmployer ? '创作者' : '雇主'}
          </button>
          {order.status === 'completed' && (
            hasReviewed ? (
              <Link to={`/orders/${id}/review`} className="btn-secondary flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] icon-filled">star</span>
                已评价
              </Link>
            ) : (
              <Link to={`/orders/${id}/review`} className="btn-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">star</span>
                去评价
              </Link>
            )
          )}
          {order.status === 'pending_confirm' && (
            <button onClick={handleCancel} className="btn-ghost text-error flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">cancel</span>
              取消订单
            </button>
          )}
          {order.status === 'in_progress' && (
            <button onClick={() => setChangeModal(true)} className="btn-ghost flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">edit_note</span>
              申请变更
            </button>
          )}
          {order.status === 'in_progress' && !isEmployer && (
            <Link to={`/orders/${id}/progress`} className="btn-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">upload</span>
              提交进度
            </Link>
          )}
          {['in_progress', 'pending_review', 'revision'].includes(order.status) && (
            <Link to={`/orders/${id}/appeal`} className="btn-ghost text-error flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">gavel</span>
              发起申诉
            </Link>
          )}
        </div>
      </div>

      {/* Pay Modal */}
      <Modal open={payModal} onClose={() => { setPayModal(false); setPayStep('choose') }} title={payStep === 'wechat_qr' ? '微信扫码支付' : '选择支付方式'}
        footer={
          payStep === 'wechat_qr'
            ? <button onClick={() => setPayStep('choose')} className="btn-secondary">返回</button>
            : <button onClick={() => setPayModal(false)} className="btn-secondary">关闭</button>
        }
      >
        {payStep === 'choose' && (
          <div className="space-y-3">
            <p className="text-on-surface-variant text-sm mb-4">
              支付金额：<strong className="text-primary text-lg">{formatMoney(order.final_price)}</strong>
            </p>
            <button onClick={handleAlipay}
              className="w-full flex items-center gap-3 p-4 rounded-xl bg-surface-container-low hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-colors text-sm font-medium">
              <span className="w-8 h-8 bg-[#1677FF] rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">支</span>
              </span>
              <div className="text-left">
                <p className="font-medium text-on-surface">支付宝支付</p>
                <p className="text-xs text-on-surface-variant">跳转到支付宝完成支付</p>
              </div>
            </button>
            <button onClick={handleWechatPay}
              className="w-full flex items-center gap-3 p-4 rounded-xl bg-surface-container-low hover:bg-green-50 border border-transparent hover:border-green-200 transition-colors text-sm font-medium">
              <span className="w-8 h-8 bg-[#07C160] rounded-full flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-white text-[16px]">qr_code</span>
              </span>
              <div className="text-left">
                <p className="font-medium text-on-surface">微信扫码支付</p>
                <p className="text-xs text-on-surface-variant">打开微信扫一扫完成支付</p>
              </div>
            </button>
            <button onClick={handleMockPay}
              className="w-full flex items-center gap-3 p-4 rounded-xl bg-primary/5 border-2 border-dashed border-primary/20 hover:bg-primary/10 transition-colors text-sm font-medium text-primary">
              <span className="material-symbols-outlined text-[20px]">science</span>
              <div className="text-left">
                <p>模拟支付（测试用）</p>
                <p className="text-xs opacity-70">开发环境专用，生产请使用上方方式</p>
              </div>
            </button>
          </div>
        )}

        {payStep === 'wechat_qr' && payData && (
          <div className="flex flex-col items-center py-4">
            <div className="bg-surface-container-low rounded-2xl p-4 mb-4">
              <img src={payData.qr_base64} alt="微信支付二维码" className="w-48 h-48" />
            </div>
            <p className="text-sm text-on-surface-variant mb-1">请用微信扫描二维码完成支付</p>
            <p className="text-xs text-outline-variant">支付成功后页面将自动跳转</p>
            <div className="flex items-center gap-1.5 mt-4 text-xs text-on-surface-variant">
              <span className="material-symbols-outlined text-[14px] animate-spin">refresh</span>
              等待支付结果...
            </div>
          </div>
        )}

        {payStep === 'alipay_form' && (
          <div className="flex flex-col items-center py-8">
            <span className="material-symbols-outlined text-5xl text-[#1677FF] mb-3 animate-spin">sync</span>
            <p className="text-on-surface">正在跳转到支付宝...</p>
          </div>
        )}
      </Modal>

      {/* Change Request Modal */}
      <Modal open={changeModal} onClose={() => setChangeModal(false)} title="申请变更"
        footer={
          <>
            <button onClick={() => setChangeModal(false)} className="btn-secondary">取消</button>
            <button form="change-form" type="submit" className="btn-primary">提交变更</button>
          </>
        }
      >
        <form id="change-form" onSubmit={handleSubmitChange} className="space-y-4">
          <div className="bg-yellow-50 rounded-xl p-3 text-xs text-yellow-700">
            变更申请需要双方共同确认，确认后将自动生成补充协议
          </div>
          <div>
            <label className="text-sm font-medium text-on-surface-variant mb-1.5 block">变更内容描述 *</label>
            <textarea value={changeForm.description}
              onChange={(e) => setChangeForm(f => ({ ...f, description: e.target.value }))}
              placeholder="详细描述变更内容..." rows={4} className="input-field resize-none" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-on-surface-variant mb-1.5 block">价格变更（元）</label>
              <input type="number" value={changeForm.price_delta}
                onChange={(e) => setChangeForm(f => ({ ...f, price_delta: e.target.value }))}
                placeholder="正数追加，负数减少" className="input-field" />
            </div>
            <div>
              <label className="text-sm font-medium text-on-surface-variant mb-1.5 block">工期变更（天）</label>
              <input type="number" value={changeForm.days_delta}
                onChange={(e) => setChangeForm(f => ({ ...f, days_delta: e.target.value }))}
                placeholder="正数延期，负数缩短" className="input-field" />
            </div>
          </div>
        </form>
      </Modal>
    </Layout>
  )
}

function MilestoneItem({ milestone, index, isEmployer, onUpdate }) {
  const statusMap = { pending: '未开始', submitted: '待验收', revision: '修改中', approved: '已完成' }
  const colorMap = { pending: 'text-on-surface-variant', submitted: 'text-yellow-600', revision: 'text-purple-600', approved: 'text-green-600' }

  const handleApprove = async () => {
    try { await orderApi.approveMilestone(milestone.id); onUpdate() }
    catch (e) { alert(e.message) }
  }

  return (
    <div className="flex items-center gap-4 p-3 rounded-xl bg-surface-container-low">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
        milestone.status === 'approved' ? 'bg-green-100 text-green-600' : 'bg-surface-container text-on-surface-variant'
      }`}>
        {milestone.status === 'approved' ? <span className="material-symbols-outlined text-[14px] icon-filled">check</span> : index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-on-surface truncate">{milestone.title}</p>
        <p className={`text-xs ${colorMap[milestone.status]}`}>{statusMap[milestone.status]}</p>
      </div>
      <div className="text-xs text-on-surface-variant">{milestone.percentage}%</div>
      {isEmployer && milestone.status === 'submitted' && (
        <button onClick={handleApprove} className="text-xs btn-primary py-1 px-3">验收</button>
      )}
    </div>
  )
}
