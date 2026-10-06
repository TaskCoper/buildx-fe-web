'use client'

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { AUTH_STORAGE_KEY } from './auth.constants'
import type { AuthStore } from './auth.types'

/**
 * Global auth store (client state).
 *
 * Holds only the non-sensitive user profile + derived flags. Tokens live in
 * httpOnly cookies managed by the backend and are never stored here.
 */
export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isInitialized: false,
      isAuthenticated: false,

      setUser: (user) => set({ user, isAuthenticated: Boolean(user) }),
      setInitialized: (value) => set({ isInitialized: value }),
      reset: () => set({ user: null, isAuthenticated: false, isInitialized: true })
    }),
    {
      name: AUTH_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // Storage is a profile cache, never evidence that this session was checked.
      merge: (persisted, current) => {
        const profile = (persisted as Partial<AuthStore> | undefined)?.user ?? null
        return { ...current, user: profile, isAuthenticated: Boolean(profile), isInitialized: false }
      },
      // Never persist the `isInitialized` flag — it must re-derive per session.
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
)
