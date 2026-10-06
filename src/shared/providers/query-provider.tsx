'use client'

import { getQueryClient } from '@/shared/lib/query-client'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState, type ReactNode } from 'react'

/**
 * Provides the TanStack Query client to the React tree.
 * `useState` ensures one client per browser tab survives re-renders without
 * being recreated; on the server `getQueryClient` returns a per-request client.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(getQueryClient)

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' ? (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition='bottom-left' />
      ) : null}
    </QueryClientProvider>
  )
}
