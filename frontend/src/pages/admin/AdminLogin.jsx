import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { adminApi } from '../../services/api'

export default function AdminLogin() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await adminApi.login(username, password)
      localStorage.setItem('zc-admin-token', res.data.token)
      localStorage.setItem('zc-admin-user', JSON.stringify(res.data.admin))
      navigate('/admin', { replace: true })
    } catch (e) {
      setError(e.message || '用户名或密码错误')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-inverse-surface flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="text-2xl font-extrabold text-inverse-on-surface">智创工坊</Link>
          <p className="text-inverse-on-surface/60 text-sm mt-1">管理后台</p>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-xl">
          <h2 className="text-lg font-bold text-on-surface mb-6">管理员登录</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-on-surface-variant mb-1.5 block">用户名</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant text-[20px]">manage_accounts</span>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin" className="input-field pl-11" required autoFocus />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-on-surface-variant mb-1.5 block">密码</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant text-[20px]">lock</span>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码" className="input-field pl-11" required />
              </div>
            </div>
            {error && (
              <p className="text-sm text-error flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">error</span>
                {error}
              </p>
            )}
            <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60 mt-2">
              {loading
                ? <span className="material-symbols-outlined animate-spin text-[20px]">refresh</span>
                : '登录'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
