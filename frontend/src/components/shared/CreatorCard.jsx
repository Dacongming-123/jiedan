import { Link } from 'react-router-dom'
import Avatar from '../ui/Avatar'
import StarRating from '../ui/StarRating'
import { formatMoney, CATEGORY_MAP } from '../../utils/format'

export default function CreatorCard({ creator }) {
  const categories = creator.categories
    ? (typeof creator.categories === 'string' ? JSON.parse(creator.categories) : creator.categories)
    : []

  return (
    <Link
      to={`/profile/${creator.id}`}
      className="block bg-white rounded-2xl p-5 hover:shadow-glass transition-all duration-200 hover:-translate-y-0.5 group"
    >
      {/* Avatar & Name */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          <Avatar src={creator.avatar} name={creator.nickname} size="lg" />
          {creator.verified && (
            <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-[12px] icon-filled">verified</span>
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-on-surface group-hover:text-primary transition-colors truncate">
            {creator.nickname}
          </h3>
          <p className="text-xs text-on-surface-variant truncate">{creator.bio || '创意无限，期待合作'}</p>
        </div>
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {categories.slice(0, 3).map((cat, i) => (
            <span key={i} className="text-xs px-2.5 py-1 bg-primary/8 text-primary rounded-full font-medium">
              {CATEGORY_MAP[cat] || cat}
            </span>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 p-3 bg-surface-container-low rounded-xl mb-3">
        <div className="text-center">
          <p className="text-sm font-bold text-on-surface">{creator.completed_orders || 0}</p>
          <p className="text-xs text-on-surface-variant">完成单</p>
        </div>
        <div className="text-center border-x border-outline-variant/20">
          <p className="text-sm font-bold text-on-surface">{creator.on_time_rate || 100}%</p>
          <p className="text-xs text-on-surface-variant">准时率</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-on-surface">{creator.response_rate || 100}%</p>
          <p className="text-xs text-on-surface-variant">响应率</p>
        </div>
      </div>

      {/* Rating & Price */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <StarRating value={creator.rating_avg || 0} size="xs" />
          <span className="text-xs font-medium text-on-surface">
            {creator.rating_avg ? Number(creator.rating_avg).toFixed(1) : '暂无'}
          </span>
          <span className="text-xs text-on-surface-variant">({creator.rating_count || 0})</span>
        </div>
      </div>
    </Link>
  )
}
