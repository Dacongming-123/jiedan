export default function StarRating({ value = 0, max = 5, size = 'sm', interactive = false, onChange }) {
  const sizes = { xs: 'text-[14px]', sm: 'text-[18px]', md: 'text-[22px]', lg: 'text-[28px]' }
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <button
          key={i}
          type={interactive ? 'button' : undefined}
          onClick={interactive ? () => onChange?.(i + 1) : undefined}
          className={interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'}
          disabled={!interactive}
        >
          <span
            className={`material-symbols-outlined ${sizes[size] || sizes.sm} ${
              i < Math.floor(value) ? 'text-yellow-400 icon-filled' : 'text-outline-variant'
            }`}
          >
            star
          </span>
        </button>
      ))}
    </div>
  )
}
