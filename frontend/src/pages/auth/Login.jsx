import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { authApi } from '../../services/api'
import useAuthStore from '../../store/authStore'
import { connectSocket } from '../../services/socket'

export default function Login() {
  const [tab, setTab] = useState('code') // 'code' | 'password'
  const [showReset, setShowReset] = useState(false)
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { setAuth } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const from = location.state?.from?.pathname || '/'

  // 处理 OAuth 回调：微信/抖音成功后带 ?token= 回来
  useEffect(() => {
    const token = searchParams.get('token')
    const oauthError = searchParams.get('error')
    if (token) {
      // 从 JWT 解析用户信息（简化：直接请求 /users/me 接口）
      fetch('/api/users/me', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(r => {
          if (r.data) {
            setAuth(r.data, token)
            connectSocket(token)
            navigate(from, { replace: true })
          }
        })
        .catch(() => setError('登录失败，请重试'))
    }
    if (oauthError) {
      setError('第三方登录失败，请使用手机号登录')
    }
  }, []) // eslint-disable-line

  const startCountdown = () => {
    setCountdown(60)
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(timer); return 0 }
        return c - 1
      })
    }, 1000)
  }

  const handleSendCode = async () => {
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      setError('请输入正确的手机号')
      return
    }
    try {
      await authApi.sendCode(phone)
      startCountdown()
    } catch (e) {
      setError(e.message || '发送失败')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      let res
      if (tab === 'code') {
        res = await authApi.loginByCode(phone, code)
      } else {
        res = await authApi.loginByPassword(phone, password)
      }
      setAuth(res.data.user, res.data.token)
      connectSocket(res.data.token)
      navigate(from, { replace: true })
    } catch (e) {
      setError(e.message || '登录失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-container-low to-primary-fixed/20 flex items-center justify-center p-4">
      {/* Background blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-primary/8 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-tertiary-container/8 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="text-3xl font-extrabold text-gradient">智创工坊</Link>
          <p className="text-on-surface-variant mt-2 text-sm">连接创意，成就非凡</p>
        </div>

        <div className="glass-panel rounded-2xl p-8">
          <h2 className="text-xl font-bold text-on-surface mb-6">欢迎回来</h2>

          {/* Tabs */}
          <div className="flex bg-surface-container rounded-full p-1 mb-6">
            <button
              onClick={() => setTab('code')}
              className={`flex-1 py-2 rounded-full text-sm font-medium transition-all ${
                tab === 'code' ? 'bg-white text-on-surface shadow-sm' : 'text-on-surface-variant'
              }`}
            >
              验证码登录
            </button>
            <button
              onClick={() => setTab('password')}
              className={`flex-1 py-2 rounded-full text-sm font-medium transition-all ${
                tab === 'password' ? 'bg-white text-on-surface shadow-sm' : 'text-on-surface-variant'
              }`}
            >
              密码登录
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Phone */}
            <div>
              <label className="text-sm font-medium text-on-surface-variant mb-1.5 block">手机号</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant material-symbols-outlined text-[20px]">smartphone</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="请输入手机号"
                  maxLength={11}
                  className="input-field pl-11"
                  required
                />
              </div>
            </div>

            {/* Code or Password */}
            {tab === 'code' ? (
              <div>
                <label className="text-sm font-medium text-on-surface-variant mb-1.5 block">验证码</label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="请输入验证码"
                    maxLength={6}
                    className="input-field flex-1"
                    required
                  />
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={countdown > 0}
                    className="btn-secondary whitespace-nowrap text-sm px-4 py-3 disabled:opacity-50"
                  >
                    {countdown > 0 ? `${countdown}s` : '发送验证码'}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-on-surface-variant">密码</label>
                  <button type="button" onClick={() => setShowReset(true)}
                    className="text-xs text-primary hover:underline">忘记密码？</button>
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant material-symbols-outlined text-[20px]">lock</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="请输入密码"
                    className="input-field pl-11"
                    required
                  />
                </div>
              </div>
            )}

            {error && (
              <p className="text-sm text-error flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">error</span>
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60 mt-2">
              {loading ? (
                <span className="material-symbols-outlined animate-spin text-[20px]">refresh</span>
              ) : '登录'}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-outline-variant/30" />
            <span className="text-xs text-on-surface-variant">其他方式</span>
            <div className="flex-1 h-px bg-outline-variant/30" />
          </div>

          {/* OAuth */}
          <div className="grid grid-cols-2 gap-3">
            <OAuthBtn
              label="微信登录"
              bg="bg-[#07C160]"
              icon={<svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M8.69 6C5.54 6 3 8.24 3 11c0 1.57.79 2.97 2.04 3.92l-.52 1.56 1.8-1.01c.66.2 1.36.31 2.09.31h.18C8.38 15.27 8.26 14.65 8.26 14c0-2.76 2.54-5 5.66-5H14C13.49 7.88 11.28 6 8.69 6zm-1.7 2.5a.8.8 0 1 1 0 1.6.8.8 0 0 1 0-1.6zm3.4 0a.8.8 0 1 1 0 1.6.8.8 0 0 1 0-1.6zm3.73 2.5c-2.76 0-5 1.96-5 4.38 0 2.42 2.24 4.38 5 4.38.66 0 1.29-.1 1.87-.3l1.6.9-.47-1.4C22.1 18.1 23 17.07 23 15.88 23 13.46 20.76 11.5 14.12 11.5z"/></svg>}
              getUrl={() => authApi.wechatOAuthUrl().then(r => r.data?.url)}
            />
            <OAuthBtn
              label="抖音登录"
              bg="bg-black"
              icon={<svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.79a4.85 4.85 0 01-1.01-.1z"/></svg>}
              getUrl={() => authApi.douyinOAuthUrl().then(r => r.data?.url)}
            />
          </div>

          <p className="text-center text-sm text-on-surface-variant mt-6">
            还没有账号？
            <Link to="/register" className="text-primary font-semibold ml-1 hover:underline">
              立即注册
            </Link>
          </p>
        </div>
      </div>

      {showReset && <ResetPasswordModal onClose={() => setShowReset(false)} />}
    </div>
  )
}

function ResetPasswordModal({ onClose }) {
  const [step, setStep] = useState(1) // 1: 手机+验证码  2: 设置新密码
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const timerRef = useRef(null)

  const startCountdown = () => {
    setCountdown(60)
    timerRef.current = setInterval(() => {
      setCountdown(c => { if (c <= 1) { clearInterval(timerRef.current); return 0 } return c - 1 })
    }, 1000)
  }

  const handleSendCode = async () => {
    if (!/^1[3-9]\d{9}$/.test(phone)) { setError('请输入正确的手机号'); return }
    setError('')
    try { await authApi.sendCode(phone); startCountdown() }
    catch (e) { setError(e.message || '发送失败') }
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    setError('')
    if (!code) { setError('请输入验证码'); return }
    // 用验证码登录来验证手机号归属（直接进入下一步，密码重置由后端验证码保护）
    setStep(2)
  }

  const handleReset = async (e) => {
    e.preventDefault()
    setError('')
    if (newPwd.length < 6) { setError('密码至少 6 位'); return }
    if (newPwd !== confirmPwd) { setError('两次密码不一致'); return }
    setLoading(true)
    try {
      await authApi.resetPassword(phone, code, newPwd)
      onClose()
      alert('密码重置成功，请用新密码登录')
    } catch (e) {
      setError(e.message || '重置失败，验证码可能已过期')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-on-surface">重置密码</h3>
            <p className="text-xs text-on-surface-variant mt-0.5">
              {step === 1 ? '验证手机号身份' : '设置新密码'}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center">
            <span className="material-symbols-outlined text-on-surface-variant text-[20px]">close</span>
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-5">
          {[1, 2].map(s => (
            <div key={s} className={`flex items-center gap-2 ${s < 2 ? 'flex-1' : ''}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step >= s ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant'}`}>
                {step > s ? <span className="material-symbols-outlined text-[14px]">check</span> : s}
              </div>
              <span className={`text-xs ${step >= s ? 'text-on-surface font-medium' : 'text-on-surface-variant'}`}>
                {s === 1 ? '验证手机' : '新密码'}
              </span>
              {s < 2 && <div className={`flex-1 h-px ${step > s ? 'bg-primary' : 'bg-outline-variant/30'}`} />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-on-surface-variant mb-1.5 block">手机号</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant text-[18px]">smartphone</span>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="请输入注册手机号" maxLength={11} required className="input-field pl-10" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-on-surface-variant mb-1.5 block">验证码</label>
              <div className="flex gap-2">
                <input type="text" value={code} onChange={e => setCode(e.target.value)}
                  placeholder="请输入验证码" maxLength={6} required className="input-field flex-1" />
                <button type="button" onClick={handleSendCode} disabled={countdown > 0}
                  className="btn-secondary text-sm px-3 py-2.5 whitespace-nowrap disabled:opacity-50">
                  {countdown > 0 ? `${countdown}s` : '发送'}
                </button>
              </div>
            </div>
            {error && <p className="text-xs text-error flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">error</span>{error}</p>}
            <button type="submit" className="btn-primary w-full">下一步</button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-on-surface-variant mb-1.5 block">新密码</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant text-[18px]">lock</span>
                <input type={showPwd ? 'text' : 'password'} value={newPwd} onChange={e => setNewPwd(e.target.value)}
                  placeholder="至少 6 位" required className="input-field pl-10 pr-10" />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[18px]">{showPwd ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-on-surface-variant mb-1.5 block">确认新密码</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant text-[18px]">lock_reset</span>
                <input type={showPwd ? 'text' : 'password'} value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)}
                  placeholder="再次输入新密码" required className="input-field pl-10" />
              </div>
            </div>
            {/* 密码强度提示 */}
            {newPwd && (
              <div className="flex gap-1">
                {[
                  newPwd.length >= 6,
                  /[A-Z]/.test(newPwd) || /[a-z]/.test(newPwd),
                  /\d/.test(newPwd),
                  /[^a-zA-Z0-9]/.test(newPwd),
                ].map((ok, i) => (
                  <div key={i} className={`flex-1 h-1 rounded-full transition-colors ${ok ? i < 2 ? 'bg-yellow-400' : 'bg-green-500' : 'bg-surface-container-high'}`} />
                ))}
              </div>
            )}
            {error && <p className="text-xs text-error flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">error</span>{error}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={() => { setStep(1); setError('') }} className="btn-secondary flex-1">上一步</button>
              <button type="submit" disabled={loading} className="btn-primary flex-1">
                {loading ? <span className="material-symbols-outlined animate-spin text-[18px]">refresh</span> : '确认重置'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function OAuthBtn({ label, bg, icon, getUrl }) {
  const [loading, setLoading] = useState(false)
  const handleClick = async () => {
    setLoading(true)
    try {
      const url = await getUrl()
      window.location.href = url
    } catch (e) {
      alert(e.message || `${label}暂不可用，请联系管理员配置`)
      setLoading(false)
    }
  }
  return (
    <button onClick={handleClick} disabled={loading}
      className="flex items-center justify-center gap-2 py-3 rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors text-sm font-medium text-on-surface-variant disabled:opacity-60">
      {loading
        ? <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>
        : <span className={`w-6 h-6 rounded-full ${bg} flex items-center justify-center`}>{icon}</span>}
      {label}
    </button>
  )
}
