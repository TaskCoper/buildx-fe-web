import { QueryClient, defaultShouldDehydrateQuery, isServer } from '@tanstack/react-query'
import { isApiError } from './api'

/**
 * Create a configured QueryClient. Defaults tuned for a SaaS dashboard:
 * sensible stale time, no refetch-on-focus thrash, and no retry on 4xx
 * client errors (only transient/5xx failures retry).
 */
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 min
        gcTime: 5 * 60 * 1000, // 5 min
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          if (isApiError(error) && error.status >= 400 && error.status < 500) {
            return false
          }
          return failureCount < 2
        }
      },
      mutations: {
        retry: false
      },
      dehydrate: {
        // Include pending queries so streamed SSR prefetches hydrate cleanly.
        shouldDehydrateQuery: (query) => defaultShouldDehydrateQuery(query) || query.state.status === 'pending'
      }
    }
  })
}

let browserQueryClient: QueryClient | undefined

/**
 * Return a stable QueryClient. On the server a fresh client is created per
 * request; in the browser a singleton is reused across renders.
 */
export function getQueryClient(): QueryClient {
  if (isServer) return makeQueryClient()
  browserQueryClient ??= makeQueryClient()
  return browserQueryClient
}

/** Browser singleton convenience export for imperative cache access. */
export const queryClient = getQueryClient()
