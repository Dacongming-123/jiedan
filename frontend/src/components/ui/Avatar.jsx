export default function Avatar({ src, name, size = 'md', className = '' }) {
  const sizes = { xs: 'w-6 h-6 text-xs', sm: 'w-8 h-8 text-sm', md: 'w-10 h-10 text-base', lg: 'w-14 h-14 text-xl', xl: 'w-20 h-20 text-2xl' }
  const fallback = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || 'U')}&backgroundColor=0058bc&textColor=ffffff`
  return (
    <img
      src={src || fallback}
      alt={name}
      className={`rounded-full object-cover bg-surface-container-high ${sizes[size] || sizes.md} ${className}`}
      onError={(e) => { e.target.src = fallback }}
    />
  )
}
