export default function Badge({ children, variant = 'default', className = '' }) {
  const variants = {
    default: 'bg-surface-container text-on-surface-variant',
    primary: 'bg-primary/10 text-primary',
    success: 'bg-green-50 text-green-600',
    warning: 'bg-yellow-50 text-yellow-600',
    error: 'bg-error-container text-error',
    info: 'bg-blue-50 text-blue-600',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant] || variants.default} ${className}`}>
      {children}
    </span>
  )
}
