import { useEffect } from 'react'

export default function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${sizes[size]} glass-panel rounded-2xl shadow-ambient z-10 max-h-[90vh] flex flex-col`}>
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20">
            <h3 className="text-lg font-semibold text-on-surface">{title}</h3>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-surface-container-low transition-colors">
              <span className="material-symbols-outlined text-on-surface-variant">close</span>
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-outline-variant/20 flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
