import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import Modal from '../../components/ui/Modal'
import Avatar from '../../components/ui/Avatar'
import { walletApi } from '../../services/api'
import { formatMoney, formatDateTime, formatDate } from '../../utils/format'

const TX_TYPE_MAP = {
  income: { label: '收入', color: 'text-green-600', prefix: '+' },
  expense: { label: '支出', color: 'text-error', prefix: '-' },
  freeze: { label: '冻结', color: 'text-yellow-600', prefix: '' },
  unfreeze: { label: '解冻', color: 'text-blue-600', prefix: '' },
  withdraw: { label: '提现', color: 'text-on-surface-variant', prefix: '-' },
  refund: { label: '退款', color: 'text-green-600', prefix: '+' },
}

export default function Wallet() {
  const [wallet, setWallet] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [withdrawModal, setWithdrawModal] = useState(false)
  const [withdrawForm, setWithdrawForm] = useState({ amount: '', method: 'alipay' })
  const [withdrawing, setWithdrawing] = useState(false)
  const [activeTab, setActiveTab] = useState('all')

  useEffect(() => {
    Promise.all([walletApi.get(), walletApi.transactions({ limit: 50 })])
      .then(([wRes, txRes]) => {
        setWallet(wRes.data)
        setTransactions(txRes.data?.list || [])
      })
      .finally(() => setLoading(false))
  }, [])

  const handleWithdraw = async (e) => {
    e.preventDefault()
    setWithdrawing(true)
    try {
      await walletApi.withdraw(withdrawForm.amount, withdrawForm.method)
      const res = await walletApi.get()
      setWallet(res.data)
      setWithdrawModal(false)
    } catch (err) { alert(err.message) }
    finally { setWithdrawing(false) }
  }

  const filteredTx = activeTab === 'all' ? transactions
    : transactions.filter(t => t.type === activeTab)

  if (loading) return <Layout><div className="flex items-center justify-center min-h-96"><span className="material-symbols-outlined animate-spin text-primary text-4xl">refresh</span></div></Layout>

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold text-on-surface mb-6">我的钱包</h1>

        {/* Wallet Card */}
        <div className="bg-gradient-primary rounded-2xl p-6 mb-6 text-white relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/5 rounded-full" />
          <div className="absolute -right-4 bottom-4 w-24 h-24 bg-white/5 rounded-full" />
          <div className="relative z-10">
            <p className="text-white/70 text-sm mb-1">可提现余额</p>
            <p className="text-4xl font-extrabold mb-6">{wallet ? formatMoney(wallet.available) : '¥0'}</p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-white/60 text-xs">冻结中</p>
                <p className="font-semibold">{wallet ? formatMoney(wallet.frozen) : '¥0'}</p>
              </div>
              <div>
                <p className="text-white/60 text-xs">历史收入</p>
                <p className="font-semibold">{wallet ? formatMoney(wallet.total_income) : '¥0'}</p>
              </div>
              <div>
                <p className="text-white/60 text-xs">历史支出</p>
                <p className="font-semibold">{wallet ? formatMoney(wallet.total_spent) : '¥0'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={() => setWithdrawModal(true)}
            disabled={!wallet || wallet.available <= 0}
            className="flex items-center justify-center gap-2 p-4 bg-white rounded-2xl font-medium text-on-surface hover:shadow-glass transition-all disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-primary">account_balance</span>
            提现到账户
          </button>
          <div className="flex items-center justify-center gap-2 p-4 bg-white rounded-2xl text-on-surface-variant">
            <span className="material-symbols-outlined text-outline">history</span>
            <span className="text-sm">冻结金额自动结算</span>
          </div>
        </div>

        {/* Transaction List */}
        <div className="bg-white rounded-2xl overflow-hidden">
          <div className="flex gap-1 p-3 bg-surface-container-low">
            {[
              { key: 'all', label: '全部' },
              { key: 'income', label: '收入' },
              { key: 'expense', label: '支出' },
              { key: 'withdraw', label: '提现' },
            ].map(({ key, label }) => (
              <button key={key} onClick={() => setActiveTab(key)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  activeTab === key ? 'bg-white text-on-surface shadow-sm' : 'text-on-surface-variant'
                }`}>
                {label}
              </button>
            ))}
          </div>

          {filteredTx.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-on-surface-variant">
              <span className="material-symbols-outlined text-4xl mb-3 text-outline-variant">receipt</span>
              <p className="text-sm">暂无流水记录</p>
            </div>
          ) : (
            <div className="divide-y divide-outline-variant/10">
              {filteredTx.map((tx) => <TxCard key={tx.id} tx={tx} />)}
            </div>
          )}
        </div>
      </div>

      {/* Withdraw Modal */}
      <Modal open={withdrawModal} onClose={() => setWithdrawModal(false)} title="申请提现"
        footer={
          <>
            <button onClick={() => setWithdrawModal(false)} className="btn-secondary">取消</button>
            <button form="withdraw-form" type="submit" disabled={withdrawing} className="btn-primary disabled:opacity-60">
              {withdrawing ? <span className="material-symbols-outlined animate-spin text-[18px]">refresh</span> : '确认提现'}
            </button>
          </>
        }
      >
        <form id="withdraw-form" onSubmit={handleWithdraw} className="space-y-4">
          <div className="p-3 bg-surface-container-low rounded-xl text-sm text-on-surface-variant">
            可提现余额：<strong className="text-on-surface">{wallet ? formatMoney(wallet.available) : '¥0'}</strong>
          </div>
          <div>
            <label className="text-sm font-medium text-on-surface-variant mb-1.5 block">提现金额（元）</label>
            <input type="number" value={withdrawForm.amount}
              onChange={(e) => setWithdrawForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="输入提现金额" min="1" max={wallet?.available || 0}
              className="input-field" required />
          </div>
          <div>
            <label className="text-sm font-medium text-on-surface-variant mb-1.5 block">提现方式</label>
            <div className="grid grid-cols-2 gap-2">
              {[['alipay', '支付宝', 'bg-blue-500'], ['wechat', '微信', 'bg-green-500']].map(([v, label, color]) => (
                <button key={v} type="button" onClick={() => setWithdrawForm(f => ({ ...f, method: v }))}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-sm ${
                    withdrawForm.method === v ? 'border-primary bg-primary/5' : 'border-transparent bg-surface-container'
                  }`}>
                  <span className={`w-6 h-6 rounded-full ${color} text-white flex items-center justify-center text-xs font-bold`}>
                    {label[0]}
                  </span>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-on-surface-variant">
            ⚠️ 提现通常1-3个工作日到账，请确保账户信息正确
        </p>
        </form>
      </Modal>
    </Layout>
  )
}

function TxCard({ tx }) {
  const hasOrder = !!tx.order_id

  // 每种类型的视觉配置
  const TYPE_CONFIG = {
    income:   { label: '收入',    amountColor: 'text-green-600',  amountSign: '+', iconBg: 'bg-green-50',           icon: 'arrow_downward', badgeBg: 'bg-green-100 text-green-700' },
    expense:  { label: '支出',    amountColor: 'text-error',      amountSign: '-', iconBg: 'bg-red-50',             icon: 'arrow_upward',   badgeBg: 'bg-red-100 text-red-700' },
    freeze:   { label: '托管中',  amountColor: 'text-yellow-600', amountSign: '',  iconBg: 'bg-yellow-50',          icon: 'lock',           badgeBg: 'bg-yellow-100 text-yellow-700' },
    unfreeze: { label: '解冻',    amountColor: 'text-blue-600',   amountSign: '+', iconBg: 'bg-blue-50',            icon: 'lock_open',      badgeBg: 'bg-blue-100 text-blue-700' },
    withdraw: { label: '提现',    amountColor: 'text-on-surface-variant', amountSign: '-', iconBg: 'bg-surface-container', icon: 'payments', badgeBg: 'bg-surface-container text-on-surface-variant' },
    refund:   { label: '退款',    amountColor: 'text-green-600',  amountSign: '+', iconBg: 'bg-green-50',           icon: 'replay',         badgeBg: 'bg-green-100 text-green-700' },
  }
  const cfg = TYPE_CONFIG[tx.type] || TYPE_CONFIG.withdraw

  return (
    <div className="px-5 py-4 hover:bg-surface-container/30 transition-colors">
      <div className="flex items-start justify-between gap-4">

        {/* 左：图标 + 详情 */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5 ${cfg.iconBg}`}>
            <span className={`material-symbols-outlined text-[20px] ${cfg.amountColor}`}>{cfg.icon}</span>
          </div>

          <div className="flex-1 min-w-0">
            {/* 行1：类型徽章 + 订单号 */}
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badgeBg}`}>{cfg.label}</span>
              {tx.order_no && (
                <span className="text-xs font-mono text-on-surface-variant tracking-tight">{tx.order_no}</span>
              )}
            </div>

            {/* 行2：订单标题（可点击） */}
            {hasOrder ? (
              <Link to={`/orders/${tx.order_id}`}
                className="text-sm font-semibold text-on-surface hover:text-primary line-clamp-1 block mb-1">
                {tx.order_title}
              </Link>
            ) : (
              <p className="text-sm font-semibold text-on-surface mb-1 line-clamp-1">{tx.description}</p>
            )}

            {/* 行3：对方信息（头像 + 角色 + 名称） */}
            {hasOrder && tx.other_nickname && (
              <div className="flex items-center gap-1.5 mb-1.5">
                <Avatar src={tx.other_avatar} name={tx.other_nickname} size="xs" />
                <span className="text-xs text-on-surface-variant">
                  <span className="font-medium">{tx.other_role === 'employer' ? '雇主' : '创作者'}</span>
                  &nbsp;{tx.other_nickname}
                </span>
              </div>
            )}

            {/* 行4：接单日期 → 交付日期 */}
            {hasOrder && (tx.start_date || tx.expected_end) && (
              <div className="flex items-center gap-1 text-xs text-on-surface-variant mb-1">
                {tx.start_date && <span>接单 {formatDate(tx.start_date)}</span>}
                {tx.start_date && tx.expected_end && (
                  <span className="material-symbols-outlined text-[12px] mx-0.5">arrow_forward</span>
                )}
                {tx.expected_end && <span>交付 {formatDate(tx.expected_end)}</span>}
              </div>
            )}

            {/* 行5：时间 */}
            <p className="text-xs text-on-surface-variant/60">{formatDateTime(tx.created_at)}</p>
          </div>
        </div>

        {/* 右：金额 + 余额 */}
        <div className="text-right flex-shrink-0 pt-1">
          <p className={`text-base font-bold ${cfg.amountColor}`}>
            {cfg.amountSign}{formatMoney(Math.abs(tx.amount))}
          </p>
          {tx.balance_after != null && (
            <p className="text-xs text-on-surface-variant mt-0.5">余额 {formatMoney(tx.balance_after)}</p>
          )}
        </div>

      </div>
    </div>
  )
}
