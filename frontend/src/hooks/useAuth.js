import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import { authApi } from '../services/api'
import { connectSocket, disconnectSocket } from '../services/socket'

export function useAuth() {
  const { user, token, isLoggedIn, setAuth, logout: storeLogout } = useAuthStore()
  const navigate = useNavigate()

  const login = useCallback(
    async (credentials, type = 'code') => {
      const res = type === 'code'
        ? await authApi.loginByCode(credentials.phone, credentials.code)
        : await authApi.loginByPassword(credentials.phone, credentials.password)
      setAuth(res.data.user, res.data.token)
      connectSocket(res.data.token)
      return res.data.user
    },
    [setAuth]
  )

  const register = useCallback(
    async (data) => {
      const res = await authApi.register(data)
      setAuth(res.data.user, res.data.token)
      connectSocket(res.data.token)
      return res.data.user
    },
    [setAuth]
  )

  const logout = useCallback(() => {
    disconnectSocket()
    storeLogout()
    navigate('/login')
  }, [storeLogout, navigate])

  return { user, token, isLoggedIn, login, register, logout }
}
