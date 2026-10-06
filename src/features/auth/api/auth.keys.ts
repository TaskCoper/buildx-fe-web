import { QUERY_KEY_ROOTS } from '@/shared/constants/query-keys'

/** Query-key factory for the auth feature. */
export const authKeys = {
  all: [QUERY_KEY_ROOTS.auth] as const,
  currentUser: () => [...authKeys.all, 'current-user'] as const
}
