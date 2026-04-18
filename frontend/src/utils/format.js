import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

export const formatMoney = (amount) => {
  if (amount == null) return '¥0'
  return '¥' + Number(amount).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

export const formatMoneyRange = (min, max) => {
  if (!min && !max) return '面议'
  if (!max) return `¥${formatNum(min)}+`
  if (min === max) return `¥${formatNum(min)}`
  return `¥${formatNum(min)}-${formatNum(max)}`
}

export const formatNum = (n) => {
  if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, '') + 'w'
  if (n >= 1000) return (n / 1000).toFixed(0) + 'k'
  return String(n)
}

export const formatDate = (date, fmt = 'YYYY-MM-DD') => {
  if (!date) return ''
  return dayjs(date).format(fmt)
}

export const formatRelativeTime = (date) => {
  if (!date) return ''
  return dayjs(date).fromNow()
}

export const formatDateTime = (date) => {
  if (!date) return ''
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

export const formatDeadline = (days) => {
  if (!days) return '待定'
  if (days <= 7) return `${days}天`
  if (days <= 30) return `${Math.ceil(days / 7)}周`
  return `${Math.ceil(days / 30)}个月`
}

export const formatRating = (rating) => {
  if (!rating) return '暂无评分'
  return Number(rating).toFixed(1)
}

export const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + 'B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB'
  return (bytes / 1024 / 1024).toFixed(1) + 'MB'
}

export const ORDER_STATUS_MAP = {
  pending_confirm: { label: '待确认', color: 'text-yellow-600 bg-yellow-50' },
  confirmed: { label: '已确认', color: 'text-blue-600 bg-blue-50' },
  paid: { label: '待开始', color: 'text-blue-600 bg-blue-50' },
  in_progress: { label: '进行中', color: 'text-green-600 bg-green-50' },
  pending_review: { label: '待验收', color: 'text-orange-600 bg-orange-50' },
  revision: { label: '修改中', color: 'text-purple-600 bg-purple-50' },
  completed: { label: '已完成', color: 'text-gray-600 bg-gray-50' },
  cancelled: { label: '已取消', color: 'text-red-600 bg-red-50' },
  appealing: { label: '申诉中', color: 'text-red-600 bg-red-50' },
}

export const REQUIREMENT_STATUS_MAP = {
  draft: { label: '草稿', color: 'text-gray-500 bg-gray-100' },
  open: { label: '招募中', color: 'text-green-600 bg-green-50' },
  in_progress: { label: '进行中', color: 'text-blue-600 bg-blue-50' },
  completed: { label: '已完成', color: 'text-gray-600 bg-gray-100' },
  cancelled: { label: '已取消', color: 'text-red-600 bg-red-50' },
}

export const CATEGORY_MAP = {
  ui_design: 'UI设计',
  ai_illustration: 'AI插画',
  '3d_modeling': '3D建模',
  video: '视频后期',
  copywriting: '文案策划',
  brand_design: '品牌设计',
  motion: '动态设计',
  photography: '摄影修图',
  other: '其他',
}

export const CATEGORIES = Object.entries(CATEGORY_MAP).map(([value, label]) => ({ value, label }))
