import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { trackApi } from '../services/api'

export default function usePageTracking() {
  const location = useLocation()
  useEffect(() => {
    // Skip admin pages
    if (location.pathname.startsWith('/admin')) return
    trackApi.visit(location.pathname).catch(() => {})
  }, [location.pathname])
}
