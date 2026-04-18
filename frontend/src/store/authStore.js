import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoggedIn: false,
      mode: 'employer', // mirrors user.role, never changes independently

      setAuth: (user, token) => {
        set({ user, token, isLoggedIn: true, mode: user.role })
      },

      logout: () => {
        set({ user: null, token: null, isLoggedIn: false, mode: 'employer' })
        localStorage.removeItem('zc-auth')
      },

      updateUser: (updates) => {
        const { user } = get()
        if (user) set({ user: { ...user, ...updates } })
      },
    }),
    {
      name: 'zc-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isLoggedIn: state.isLoggedIn,
        mode: state.mode,
      }),
    }
  )
)

export default useAuthStore
