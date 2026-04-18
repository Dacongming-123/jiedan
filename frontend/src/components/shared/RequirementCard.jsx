import { Link } from 'react-router-dom'
import Avatar from '../ui/Avatar'
import Badge from '../ui/Badge'
import { formatMoneyRange, formatDeadline, formatRelativeTime, REQUIREMENT_STATUS_MAP, CATEGORY_MAP } from '../../utils/format'

const APP_STATUS_BADGE = {
  pending:  { label: '已申请', color: 'bg-yellow-100 text-yellow-700' },
  accepted: { label: '已通过', color: 'bg-green-100 text-green-700' },
  rejected: { label: '未通过', color: 'bg-red-100 text-red-700' },
}

export default function RequirementCard({ req }) {
  const status = REQUIREMENT_STATUS_MAP[req.status] || REQUIREMENT_STATUS_MAP.open
  const appBadge = req.my_application_status ? APP_STATUS_BADGE[req.my_application_status] : null

  return (
    <Link
      to={`/demand/${req.id}`}
      className="block bg-white rounded-2xl p-5 hover:shadow-glass transition-all duration-200 hover:-translate-y-0.5 group"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-semibold text-on-surface text-base leading-snug line-clamp-2 group-hover:text-primary transition-colors flex-1">
          {req.title}
        </h3>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {appBadge && (
            <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${appBadge.color}`}>
              {appBadge.label}
            </span>
          )}
          <Badge variant={req.status === 'open' ? 'success' : 'default'}>
            {status.label}
          </Badge>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-on-surface-variant line-clamp-2 mb-4 leading-relaxed">
        {req.description}
      </p>

      {/* Tags */}
      {req.tags && req.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {req.tags.slice(0, 4).map((tag, i) => (
            <span key={i} className="text-xs px-2.5 py-1 bg-surface-container-low text-on-surface-variant rounded-full">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-outline-variant/20">
        <div className="flex items-center gap-3">
          <Avatar src={req.employer?.avatar} name={req.employer?.nickname} size="sm" />
          <div>
            <p className="text-xs font-medium text-on-surface">{req.employer?.nickname}</p>
            <p className="text-xs text-on-surface-variant">{CATEGORY_MAP[req.category] || req.category}</p>
          </div>
        </div>

        <div className="text-right">
          <p className="font-bold text-primary text-base">
            {formatMoneyRange(req.budget_min, req.budget_max)}
          </p>
          <p className="text-xs text-on-surface-variant">
            {formatDeadline(req.deadline_days)} · {req.apply_count || 0}人申请
          </p>
        </div>
      </div>
    </Link>
  )
}
