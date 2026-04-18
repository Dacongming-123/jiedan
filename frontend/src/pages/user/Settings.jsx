import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import Avatar from '../../components/ui/Avatar'
import Modal from '../../components/ui/Modal'
import { userApi, authApi } from '../../services/api'
const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001'
import useAuthStore from '../../store/authStore'
import { CATEGORIES } from '../../utils/format'

const TABS = [
  { key: 'profile', label: '个人资料', icon: 'person' },
  { key: 'account', label: '账号安全', icon: 'security' },
  { key: 'notify', label: '通知设置', icon: 'notifications' },
]

export default function Settings() {
  const { user, updateUser, logout } = useAuthStore()
  const navigate = useNavigate()
  const [tab, setTab] = useState('profile')
  const [form, setForm] = useState({
    nickname: user?.nickname || '',
    bio: user?.bio || '',
    location: user?.location || '',
    skills: user?.skills || [],
    categories: user?.categories || [],
  })
  const [skillInput, setSkillInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [portfolio, setPortfolio] = useState(() => {
    const p = user?.portfolio_urls
    if (!p) return []
    return typeof p === 'string' ? JSON.parse(p) : p
  })
  const [portfolioUploading, setPortfolioUploading] = useState(false)
  const [pwdModal, setPwdModal] = useState(false)
  const [pwdForm, setPwdForm] = useState({ current_password: '', new_password: '', confirm: '' })
  const [pwdSaving, setPwdSaving] = useState(false)
  const [pwdError, setPwdError] = useState('')
  const [pwdDone, setPwdDone] = useState(false)

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await userApi.updateProfile(form)
      updateUser(res.data)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setError(e.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarUploading(true)
    try {
      const fd = new FormData()
      fd.append('avatar', file)
      const res = await userApi.uploadAvatar(fd)
      updateUser({ avatar: res.data.avatar })
    } catch (e) {
      setError('头像上传失败')
    } finally {
      setAvatarUploading(false)
    }
  }

  const handlePortfolioUpload = async (e, accept) => {
    const file = e.target.files?.[0]
    if (!file) return
    // 视频前端校验时长（通过临时 URL）
    if (file.type.startsWith('video/')) {
      const ok = await new Promise(resolve => {
        const vid = document.createElement('video')
        vid.preload = 'metadata'
        vid.onloadedmetadata = () => { URL.revokeObjectURL(vid.src); resolve(vid.duration <= 65) }
        vid.onerror = () => { URL.revokeObjectURL(vid.src); resolve(false) }
        vid.src = URL.createObjectURL(file)
      })
      if (!ok) { setError('视频时长不能超过1分钟'); e.target.value = ''; return }
    }
    setPortfolioUploading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('title', file.name)
      const res = await userApi.uploadPortfolio(fd)
      setPortfolio(res.data.items || [])
    } catch (e) {
      setError('上传失败：' + (e.message || ''))
    } finally {
      setPortfolioUploading(false)
      e.target.value = ''
    }
  }

  const handlePortfolioDelete = async (index) => {
    if (!confirm('确认删除该作品？')) return
    try {
      const res = await userApi.deletePortfolio(index)
      setPortfolio(res.data.items || [])
    } catch (e) {
      setError('删除失败')
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setPwdError('')
    if (pwdForm.new_password !== pwdForm.confirm) { setPwdError('两次密码不一致'); return }
    if (pwdForm.new_password.length < 6) { setPwdError('新密码至少6位'); return }
    setPwdSaving(true)
    try {
      await authApi.changePassword(pwdForm.current_password, pwdForm.new_password)
      setPwdDone(true)
      setPwdForm({ current_password: '', new_password: '', confirm: '' })
      setTimeout(() => { setPwdDone(false); setPwdModal(false) }, 1500)
    } catch (e) {
      setPwdError(e.message || '修改失败')
    } finally {
      setPwdSaving(false)
    }
  }

  const addSkill = () => {
    const s = skillInput.trim()
    if (s && !form.skills.includes(s) && form.skills.length < 10) {
      update('skills', [...form.skills, s])
      setSkillInput('')
    }
  }

  const toggleCategory = (cat) => {
    const cats = form.categories
    if (cats.includes(cat)) update('categories', cats.filter(c => c !== cat))
    else if (cats.length < 5) update('categories', [...cats, cat])
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold text-on-surface mb-6">设置</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {/* Sidebar */}
          <div className="space-y-1">
            {TABS.map(({ key, label, icon }) => (
              <button key={key} onClick={() => setTab(key)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left ${
                  tab === key ? 'bg-primary/8 text-primary' : 'text-on-surface-variant hover:bg-surface-container-low'
                }`}>
                <span className="material-symbols-outlined text-[18px]">{icon}</span>
                {label}
              </button>
            ))}
            <button onClick={() => { logout(); navigate('/') }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-error hover:bg-error/5 transition-all text-left mt-4">
              <span className="material-symbols-outlined text-[18px]">logout</span>
              退出登录
            </button>
          </div>

          {/* Content */}
          <div className="md:col-span-3">
            {tab === 'profile' && (
              <form onSubmit={handleSave} className="space-y-5">
                {/* Avatar */}
                <div className="bg-white rounded-2xl p-6">
                  <h2 className="font-semibold text-on-surface mb-4">头像</h2>
                  <div className="flex items-center gap-4">
                    <Avatar src={user?.avatar} name={user?.nickname} size="xl" />
                    <div>
                      <label className="btn-secondary text-sm py-2 px-4 cursor-pointer">
                        {avatarUploading ? '上传中...' : '更换头像'}
                        <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                          onChange={handleAvatarChange} disabled={avatarUploading} />
                      </label>
                      <p className="text-xs text-on-surface-variant mt-2">支持 JPG、PNG，最大 5MB</p>
                    </div>
                  </div>
                </div>

                {/* Basic Info */}
                <div className="bg-white rounded-2xl p-6 space-y-4">
                  <h2 className="font-semibold text-on-surface">基本信息</h2>
                  <div>
                    <label className="text-sm font-medium text-on-surface-variant mb-1.5 block">昵称</label>
                    <input type="text" value={form.nickname} onChange={(e) => update('nickname', e.target.value)}
                      className="input-field" maxLength={30} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-on-surface-variant mb-1.5 block">个人简介</label>
                    <textarea value={form.bio} onChange={(e) => update('bio', e.target.value)}
                      placeholder="介绍你自己..." rows={3} className="input-field resize-none" maxLength={200} />
                    <p className="text-xs text-on-surface-variant mt-1 text-right">{form.bio.length}/200</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-on-surface-variant mb-1.5 block">所在城市</label>
                    <input type="text" value={form.location} onChange={(e) => update('location', e.target.value)}
                      placeholder="如：上海、北京..." className="input-field" />
                  </div>
                </div>

                {/* Skills */}
                <div className="bg-white rounded-2xl p-6">
                  <h2 className="font-semibold text-on-surface mb-3">技能标签</h2>
                  <div className="flex gap-2 mb-3">
                    <input type="text" value={skillInput} onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                      placeholder="添加技能标签" className="input-field flex-1 text-sm" />
                    <button type="button" onClick={addSkill} className="btn-secondary px-4 text-sm">添加</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {form.skills.map((s) => (
                      <span key={s} className="flex items-center gap-1 px-3 py-1 bg-primary/8 text-primary text-sm rounded-full">
                        {s}
                        <button type="button" onClick={() => update('skills', form.skills.filter(x => x !== s))}>
                          <span className="material-symbols-outlined text-[14px] text-primary/60 hover:text-error">close</span>
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Categories */}
                <div className="bg-white rounded-2xl p-6">
                  <h2 className="font-semibold text-on-surface mb-3">擅长领域（最多5个）</h2>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {CATEGORIES.map(({ value, label }) => (
                      <button key={value} type="button" onClick={() => toggleCategory(value)}
                        className={`py-2 px-3 rounded-xl text-xs font-medium transition-all border-2 ${
                          form.categories.includes(value)
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-transparent bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                        }`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Portfolio */}
                {user?.role === 'creator' && (
                  <div className="bg-white rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="font-semibold text-on-surface">我的作品集</h2>
                      <span className="text-xs text-on-surface-variant">{portfolio.length}/20</span>
                    </div>

                    {/* Upload buttons */}
                    {portfolio.length < 20 && (
                      <div className="grid grid-cols-3 gap-3 mb-5">
                        {[
                          { label: '上传图片', icon: 'image', accept: 'image/jpeg,image/png,image/webp,image/gif', hint: 'JPG/PNG/WebP/GIF，最大10MB' },
                          { label: '上传视频', icon: 'videocam', accept: 'video/mp4,video/quicktime,video/webm', hint: 'MP4/MOV/WebM，1分钟内' },
                          { label: '上传文档', icon: 'description', accept: '.pdf,.doc,.docx,.ppt,.pptx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation', hint: 'PDF/Word/PPT，最大20MB' },
                        ].map(({ label, icon, accept, hint }) => (
                          <label key={icon} className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-outline-variant cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors text-center ${portfolioUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                            <span className="material-symbols-outlined text-primary text-[28px]">{portfolioUploading ? 'refresh' : icon}</span>
                            <span className="text-sm font-medium text-on-surface">{portfolioUploading ? '上传中...' : label}</span>
                            <span className="text-[10px] text-on-surface-variant leading-tight">{hint}</span>
                            <input type="file" accept={accept} className="hidden"
                              onChange={handlePortfolioUpload} disabled={portfolioUploading} />
                          </label>
                        ))}
                      </div>
                    )}

                    {/* Items list */}
                    {portfolio.length > 0 && (
                      <div className="space-y-2">
                        {portfolio.map((item, i) => (
                          <PortfolioItemRow key={i} item={item} apiBase={API_BASE} onDelete={() => handlePortfolioDelete(i)} />
                        ))}
                      </div>
                    )}
                    {portfolio.length === 0 && !portfolioUploading && (
                      <p className="text-sm text-on-surface-variant text-center py-4">还没有作品，选择上方类型开始上传</p>
                    )}
                  </div>
                )}

                {error && <p className="text-sm text-error">{error}</p>}

                <button type="submit" disabled={saving} className="btn-primary w-full disabled:opacity-60">
                  {saved ? (
                    <><span className="material-symbols-outlined text-[18px]">check</span>已保存</>
                  ) : saving ? (
                    <span className="material-symbols-outlined animate-spin text-[20px]">refresh</span>
                  ) : '保存修改'}
                </button>
              </form>
            )}

            {tab === 'account' && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl p-6 space-y-4">
                  <h2 className="font-semibold text-on-surface">账号信息</h2>
                  <div className="flex items-center justify-between py-3 border-b border-outline-variant/20">
                    <div>
                      <p className="text-sm font-medium text-on-surface">手机号</p>
                      <p className="text-sm text-on-surface-variant">{user?.phone || '未绑定'}</p>
                    </div>
                    <button className="btn-ghost text-sm py-1.5 px-3">更换</button>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-outline-variant/20">
                    <div>
                      <p className="text-sm font-medium text-on-surface">登录密码</p>
                      <p className="text-sm text-on-surface-variant">{user?.password_hash ? '已设置' : '未设置'}</p>
                    </div>
                    <button onClick={() => { setPwdModal(true); setPwdError('') }} className="btn-ghost text-sm py-1.5 px-3">
                      {user?.password_hash ? '修改' : '设置'}
                    </button>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-on-surface">微信绑定</p>
                      <p className="text-sm text-on-surface-variant">{user?.wechat_openid ? '已绑定' : '未绑定'}</p>
                    </div>
                    <button className="btn-ghost text-sm py-1.5 px-3">{user?.wechat_openid ? '解绑' : '绑定'}</button>
                  </div>
                </div>
              </div>
            )}

            {tab === 'notify' && (
              <div className="bg-white rounded-2xl p-6 space-y-4">
                <h2 className="font-semibold text-on-surface">通知偏好</h2>
                {[
                  ['订单状态变更', true],
                  ['新消息提醒', true],
                  ['申请被接受', true],
                  ['评价提醒', true],
                  ['平台公告', false],
                ].map(([label, defaultOn]) => (
                  <div key={label} className="flex items-center justify-between py-2">
                    <span className="text-sm text-on-surface">{label}</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked={defaultOn} className="sr-only peer" />
                      <div className="w-11 h-6 bg-surface-container peer-checked:bg-primary rounded-full peer transition-all" />
                      <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-all peer-checked:translate-x-5 shadow-sm" />
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <Modal open={pwdModal} onClose={() => setPwdModal(false)} title="修改密码"
        footer={
          <>
            <button onClick={() => setPwdModal(false)} className="btn-secondary">取消</button>
            <button form="pwd-form" type="submit" disabled={pwdSaving} className="btn-primary disabled:opacity-60">
              {pwdDone ? <><span className="material-symbols-outlined text-[16px]">check</span>已更新</> : pwdSaving ? <span className="material-symbols-outlined animate-spin text-[18px]">refresh</span> : '确认修改'}
            </button>
          </>
        }
      >
        <form id="pwd-form" onSubmit={handleChangePassword} className="space-y-4">
          {user?.password_hash && (
            <div>
              <label className="text-sm font-medium text-on-surface-variant mb-1.5 block">当前密码</label>
              <input type="password" value={pwdForm.current_password}
                onChange={e => setPwdForm(f => ({ ...f, current_password: e.target.value }))}
                className="input-field" required />
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-on-surface-variant mb-1.5 block">新密码</label>
            <input type="password" value={pwdForm.new_password}
              onChange={e => setPwdForm(f => ({ ...f, new_password: e.target.value }))}
              placeholder="至少6位" className="input-field" required />
          </div>
          <div>
            <label className="text-sm font-medium text-on-surface-variant mb-1.5 block">确认新密码</label>
            <input type="password" value={pwdForm.confirm}
              onChange={e => setPwdForm(f => ({ ...f, confirm: e.target.value }))}
              className="input-field" required />
          </div>
          {pwdError && <p className="text-sm text-error">{pwdError}</p>}
        </form>
      </Modal>
    </Layout>
  )
}

const DOC_EXT_MAP = {
  pdf: { icon: 'picture_as_pdf', color: 'text-red-500' },
  doc:  { icon: 'description', color: 'text-blue-600' },
  docx: { icon: 'description', color: 'text-blue-600' },
  ppt:  { icon: 'slideshow', color: 'text-orange-500' },
  pptx: { icon: 'slideshow', color: 'text-orange-500' },
}

function PortfolioItemRow({ item, apiBase, onDelete }) {
  const ext = (item.filename || item.url || '').split('.').pop()?.toLowerCase()
  const docInfo = DOC_EXT_MAP[ext] || { icon: 'insert_drive_file', color: 'text-on-surface-variant' }

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low group">
      {item.type === 'image' && (
        <img src={`${apiBase}${item.url}`} alt={item.title}
          className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
      )}
      {item.type === 'video' && (
        <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined text-primary text-[24px]">play_circle</span>
        </div>
      )}
      {item.type === 'document' && (
        <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center flex-shrink-0">
          <span className={`material-symbols-outlined text-[24px] ${docInfo.color}`}>{docInfo.icon}</span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-on-surface truncate">{item.title || item.filename || '未命名'}</p>
        <p className="text-xs text-on-surface-variant capitalize">{item.type}</p>
      </div>
      <a href={`${apiBase}${item.url}`} target="_blank" rel="noopener noreferrer"
        className="p-1.5 rounded-full hover:bg-surface-container text-on-surface-variant transition-colors">
        <span className="material-symbols-outlined text-[18px]">open_in_new</span>
      </a>
      <button onClick={onDelete}
        className="p-1.5 rounded-full hover:bg-error/10 text-on-surface-variant hover:text-error transition-colors">
        <span className="material-symbols-outlined text-[18px]">delete</span>
      </button>
    </div>
  )
}
