'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { AUTH_SESSION_ENDED_EVENT, AUTH_SESSION_REFRESHED_EVENT, useAuthStore } from '@/shared/auth'
import { authApi } from '../api/auth.api'
import { authKeys } from '../api/auth.keys'

/**
 * Fetches the current user (`/auth/me`) and syncs the result into the auth
 * store. Call once near the top of authenticated areas to hydrate session
 * state from the httpOnly cookie.
 */
export function useCurrentUser() {
  const queryClient = useQueryClient()
  const setUser = useAuthStore((s) => s.setUser)
  const setInitialized = useAuthStore((s) => s.setInitialized)

  const query = useQuery({
    queryKey: authKeys.currentUser(),
    queryFn: ({ signal }) => authApi.getCurrentUser(signal),
    // Don't hammer the endpoint on a clearly-expired session.
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: 'always',
    refetchInterval: () => (useAuthStore.getState().isAuthenticated ? 60_000 : false)
  })

  useEffect(() => {
    if (query.isSuccess) {
      setUser(query.data)
      setInitialized(true)
    } else if (query.isError) {
      setUser(null)
      setInitialized(true)
    }
  }, [query.isSuccess, query.isError, query.data, query.dataUpdatedAt, setUser, setInitialized])

  useEffect(() => {
    const refreshed = () => {
      setInitialized(false)
      void queryClient
        .cancelQueries({ queryKey: authKeys.currentUser() })
        .then(() => queryClient.invalidateQueries({ queryKey: authKeys.currentUser() }))
    }
    const ended = () => {
      void queryClient.cancelQueries().then(() => {
        queryClient.clear()
        useAuthStore.getState().reset()
      })
    }
    window.addEventListener(AUTH_SESSION_REFRESHED_EVENT, refreshed)
    window.addEventListener(AUTH_SESSION_ENDED_EVENT, ended)
    return () => {
      window.removeEventListener(AUTH_SESSION_REFRESHED_EVENT, refreshed)
      window.removeEventListener(AUTH_SESSION_ENDED_EVENT, ended)
    }
  }, [queryClient, setInitialized])

  return query
}
