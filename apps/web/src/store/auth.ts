import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserRole } from '@aerotaxi/shared'

interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
}

interface AuthState {
  user: AuthUser | null
  token: string | null
  _hasHydrated: boolean
  setAuth: (user: AuthUser, token: string) => void
  setUser: (user: AuthUser) => void
  clearAuth: () => void
  setHasHydrated: (v: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      _hasHydrated: false,
      setAuth: (user, token) => set({ user, token }),
      setUser: (user) => set({ user }),
      clearAuth: () => set({ user: null, token: null }),
      setHasHydrated: (v) => set({ _hasHydrated: v }),
    }),
    {
      name: 'aerotaxi-auth',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    },
  ),
)
