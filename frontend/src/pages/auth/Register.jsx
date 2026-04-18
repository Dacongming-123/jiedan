import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../../services/api'
import useAuthStore from '../../store/authStore'
import { connectSocket } from '../../services/socket'

export default function Register() {
  const [step, setStep] = useState(1) // 1: phone+code, 2: profile
  const [form, setForm] = useState({ phone: '', code: '', nickname: '', password: '', role: 'employer' })
  const [countdown, setCountdown] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const startCountdown = () => {
    setCountdown(60)
    const t = setInterval(() => setCountdown((c) => { if (c <= 1) { clearInterval(t); return 0 } return c - 1 }), 1000)
  }

  const handleSendCode = async () => {
    if (!/^1[3-9]\d{9}$/.test(form.phone)) { setError('请输入正确的手机号'); return }
    setError('')
    try { await authApi.sendCode(form.phone); startCountdown() }
    catch (e) { setError(e.message || '发送失败') }
  }

  const handleStep1 = (e) => {
    e.preventDefault()
    if (!form.code) { setError('请输入验证码'); return }
    setError('')
    setStep(2)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nickname.trim()) { setError('请输入昵称'); return }
    if (form.password && form.password.length < 6) { setError('密码至少6位'); return }
    setLoading(true)
    setError('')
    try {
      const res = await authApi.register(form)
      setAuth(res.data.user, res.data.token)
      connectSocket(res.data.token)
      navigate('/', { replace: true })
    } catch (e) {
      setError(e.message || '注册失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-container-low to-primary-fixed/20 flex items-center justify-center p-4">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/8 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <Link to="/" className="text-3xl font-extrabold text-gradient">智创工坊</Link>
          <p className="text-on-surface-variant mt-2 text-sm">创建你的账号</p>
        </div>

        <div className="glass-panel rounded-2xl p-8">
          {/* Step indicator */}
          <div className="flex items-center gap-3 mb-6">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-3 flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step >= s ? 'bg-gradient-primary text-white' : 'bg-surface-container text-on-surface-variant'
                }`}>
                  {step > s ? <span className="material-symbols-outlined text-[14px]">check</span> : s}
                </div>
                <span className={`text-sm font-medium ${step >= s ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                  {s === 1 ? '验证手机' : '完善资料'}
                </span>
                {s < 2 && <div className={`flex-1 h-px ${step > s ? 'bg-primary' : 'bg-outline-variant/30'}`} />}
              </div>
            ))}
          </div>

          {step === 1 ? (
            <form onSubmit={handleStep1} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-on-surface-variant mb-1.5 block">手机号</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant material-symbols-outlined text-[20px]">smartphone</span>
                  <input type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)}
                    placeholder="请输入手机号" maxLength={11} className="input-field pl-11" required />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-on-surface-variant mb-1.5 block">验证码</label>
                <div className="flex gap-3">
                  <input type="text" value={form.code} onChange={(e) => update('code', e.target.value)}
                    placeholder="请输入验证码" maxLength={6} className="input-field flex-1" required />
                  <button type="button" onClick={handleSendCode} disabled={countdown > 0}
                    className="btn-secondary whitespace-nowrap text-sm px-4 py-3 disabled:opacity-50">
                    {countdown > 0 ? `${countdown}s` : '发送验证码'}
                  </button>
                </div>
              </div>
              {error && <p className="text-sm text-error">{error}</p>}
              <button type="submit" className="btn-primary w-full">下一步</button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-on-surface-variant mb-1.5 block">昵称</label>
                <input type="text" value={form.nickname} onChange={(e) => update('nickname', e.target.value)}
                  placeholder="给自己起个名字" className="input-field" required />
              </div>
              <div>
                <label className="text-sm font-medium text-on-surface-variant mb-1.5 block">密码（可选）</label>
                <input type="password" value={form.password} onChange={(e) => update('password', e.target.value)}
                  placeholder="设置登录密码（至少6位）" className="input-field" />
              </div>
              <div>
                <label className="text-sm font-medium text-on-surface-variant mb-1.5 block">我的身份</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ['employer', '我要发单', 'business_center', '发布需求，寻找创作者'],
                    ['creator', '我要接单', 'palette', '接受需求，赚取报酬'],
                  ].map(([v, label, icon, desc]) => (
                    <button key={v} type="button" onClick={() => update('role', v)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl text-sm font-medium transition-all border-2 ${
                        form.role === v
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-transparent bg-surface-container text-on-surface-variant'
                      }`}>
                      <span className="material-symbols-outlined text-[28px]">{icon}</span>
                      <span className="font-semibold">{label}</span>
                      <span className="text-xs font-normal opacity-70">{desc}</span>
                    </button>
                  ))}
                </div>
              </div>
              {error && <p className="text-sm text-error">{error}</p>}
              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1">上一步</button>
                <button type="submit" disabled={loading} className="btn-primary flex-1 disabled:opacity-60">
                  {loading ? <span className="material-symbols-outlined animate-spin text-[20px]">refresh</span> : '完成注册'}
                </button>
              </div>
            </form>
          )}

          <p className="text-center text-sm text-on-surface-variant mt-6">
            已有账号？<Link to="/login" className="text-primary font-semibold ml-1 hover:underline">立即登录</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
