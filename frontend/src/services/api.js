import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// 请求拦截：自动附加token
api.interceptors.request.use((config) => {
  try {
    const stored = localStorage.getItem('zc-auth')
    if (stored) {
      const { state } = JSON.parse(stored)
      if (state?.token) config.headers.Authorization = `Bearer ${state.token}`
    }
  } catch (_) {}
  return config
})

// 响应拦截：统一错误处理
api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('zc-auth')
      window.location.href = '/login'
    }
    return Promise.reject(err.response?.data || { message: '网络错误，请重试' })
  }
)

// ─── Auth ───────────────────────────────────────────────
export const authApi = {
  sendCode: (phone) => api.post('/auth/send-code', { phone }),
  loginByCode: (phone, code) => api.post('/auth/login/code', { phone, code }),
  loginByPassword: (phone, password) => api.post('/auth/login/password', { phone, password }),
  register: (data) => api.post('/auth/register', data),
  resetPassword: (phone, code, new_password) => api.post('/auth/reset-password', { phone, code, new_password }),
  wechatOAuthUrl: () => api.get('/auth/wechat/url'),
  douyinOAuthUrl: () => api.get('/auth/douyin/url'),
  changePassword: (current_password, new_password) => api.put('/users/me/password', { current_password, new_password }),
}

// ─── Users ──────────────────────────────────────────────
export const userApi = {
  getProfile: (id) => api.get(`/users/${id}`),
  updateProfile: (data) => api.put('/users/me', data),
  uploadAvatar: (formData) =>
    api.post('/users/me/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  uploadPortfolio: (formData) =>
    api.post('/users/me/portfolio', formData, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 }),
  deletePortfolio: (index) => api.delete(`/users/me/portfolio/${index}`),
}

// ─── Requirements ───────────────────────────────────────
export const requirementApi = {
  list: (params) => api.get('/requirements', { params }),
  detail: (id) => api.get(`/requirements/${id}`),
  create: (data) => api.post('/requirements', data),
  update: (id, data) => api.put(`/requirements/${id}`, data),
  delete: (id) => api.delete(`/requirements/${id}`),
  myList: (params) => api.get('/requirements/mine', { params }),
}

// ─── Applications ───────────────────────────────────────
export const applicationApi = {
  apply: (requirementId, data) => api.post(`/requirements/${requirementId}/apply`, data),
  list: (requirementId) => api.get(`/requirements/${requirementId}/applications`),
  myApplications: (params) => api.get('/applications/mine', { params }),
  accept: (id) => api.put(`/applications/${id}/accept`),
  reject: (id, note) => api.put(`/applications/${id}/reject`, { note }),
  withdraw: (id) => api.put(`/applications/${id}/withdraw`),
}

// ─── Orders ─────────────────────────────────────────────
export const orderApi = {
  list: (params) => api.get('/orders', { params }),
  detail: (id) => api.get(`/orders/${id}`),
  confirm: (id) => api.post(`/orders/${id}/confirm`),
  requestChange: (id, data) => api.post(`/orders/${id}/change`, data),
  approveChange: (changeId) => api.put(`/orders/changes/${changeId}/approve`),
  rejectChange: (changeId) => api.put(`/orders/changes/${changeId}/reject`),
  submitMilestone: (milestoneId, data) =>
    api.post(`/orders/milestones/${milestoneId}/submit`, data),
  approveMilestone: (milestoneId) => api.put(`/orders/milestones/${milestoneId}/approve`),
  requestRevision: (milestoneId, feedback) =>
    api.put(`/orders/milestones/${milestoneId}/revision`, { feedback }),
  cancel: (id) => api.post(`/orders/${id}/cancel`),
}

// ─── Payments ───────────────────────────────────────────
export const paymentApi = {
  createAlipay: (orderId) => api.post('/payments/alipay', { order_id: orderId }),
  createWechat: (orderId) => api.post('/payments/wechat', { order_id: orderId }),
  mockPay: (orderId) => api.post('/payments/mock', { order_id: orderId }),
  status: (paymentNo) => api.get(`/payments/${paymentNo}/status`),
}

// ─── Wallet ─────────────────────────────────────────────
export const walletApi = {
  get: () => api.get('/wallet'),
  transactions: (params) => api.get('/wallet/transactions', { params }),
  withdraw: (amount, method) => api.post('/wallet/withdraw', { amount, method }),
}

// ─── Favorites ──────────────────────────────────────────
export const favoriteApi = {
  toggle: (requirementId) => api.post(`/requirements/${requirementId}/favorite`),
  toggleLike: (requirementId) => api.post(`/requirements/${requirementId}/like`),
  list: (params) => api.get('/users/me/favorites', { params }),
}

// ─── Messages ───────────────────────────────────────────
export const messageApi = {
  conversations: () => api.get('/conversations'),
  messages: (convId, params) => api.get(`/conversations/${convId}/messages`, { params }),
  startConversation: (userId) => api.post('/conversations', { user_id: userId }),
}

// ─── Reviews ────────────────────────────────────────────
export const reviewApi = {
  submit: (orderId, data) => api.post(`/orders/${orderId}/review`, data),
  getByOrder: (orderId) => api.get(`/orders/${orderId}/reviews`),
  getByUser: (userId) => api.get(`/users/${userId}/reviews`),
}

// ─── Appeals ────────────────────────────────────────────
export const appealApi = {
  submit: (orderId, data) => api.post(`/orders/${orderId}/appeal`, data),
  detail: (id) => api.get(`/appeals/${id}`),
  reply: (id, content) => api.post(`/appeals/${id}/reply`, { content }),
}

// ─── Notifications ──────────────────────────────────────
export const notificationApi = {
  list: (params) => api.get('/notifications', { params }),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
  unreadCount: () => api.get('/notifications/unread-count'),
}

// ─── Admin (separate axios instance using admin token) ───
const adminAxios = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})
adminAxios.interceptors.request.use((config) => {
  const token = localStorage.getItem('zc-admin-token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
adminAxios.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('zc-admin-token')
      localStorage.removeItem('zc-admin-user')
      window.location.href = '/admin/login'
    }
    return Promise.reject(err.response?.data || { message: '网络错误，请重试' })
  }
)

// ─── Page Tracking ──────────────────────────────────────
export const trackApi = {
  visit: (path) => api.post('/track', { path }),
}

export const adminApi = {
  login: (username, password) => api.post('/admin/login', { username, password }),
  logout: () => { localStorage.removeItem('zc-admin-token'); localStorage.removeItem('zc-admin-user') },
  stats: () => adminAxios.get('/admin/stats'),
  users: (params) => adminAxios.get('/admin/users', { params }),
  orders: (params) => adminAxios.get('/admin/orders', { params }),
  appeals: (params) => adminAxios.get('/admin/appeals', { params }),
  resolveAppeal: (id, data) => adminAxios.put(`/admin/appeals/${id}/resolve`, data),
  banUser: (id, reason) => adminAxios.put(`/admin/users/${id}/ban`, { reason }),
  pageConfigs: () => adminAxios.get('/admin/configs'),
  updateConfig: (key, json) => adminAxios.put(`/admin/configs/${key}`, { config_json: json }),
  analytics: () => adminAxios.get('/admin/analytics'),
  analyticsIps: (params) => adminAxios.get('/admin/analytics/ips', { params }),
  platformConfigs: () => adminAxios.get('/admin/platform-configs'),
  updatePlatformConfig: (platform, data) => adminAxios.put(`/admin/platform-configs/${platform}`, data),
  testPlatformConfig: (platform) => adminAxios.post(`/admin/platform-configs/${platform}/test`),
  listAssets: () => adminAxios.get('/admin/assets'),
  uploadAsset: (formData) => adminAxios.post('/admin/assets', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteAsset: (filename) => adminAxios.delete(`/admin/assets/${filename}`),
}

// ─── Page Config (public) ────────────────────────────────
export const configApi = {
  get: (key) => api.get(`/configs/${key}`),
}

export default api
