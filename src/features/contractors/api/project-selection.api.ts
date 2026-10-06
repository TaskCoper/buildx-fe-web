import { z } from 'zod'
import { useAuthStore } from '@/shared/auth'
import { env } from '@/shared/config/env'
import { http } from '@/shared/lib/api'

export const projectSelectionSchema = z.object({ constructionSiteId: z.string().uuid().nullable() })
const base = '/me/construction-sites/selection'
// Explicit mock mode only: preference lives in memory, never in localStorage.
const mockSelections = new Map<string, string>()

function requireOwner(userId: string) {
  const user = useAuthStore.getState().user
  if (!user || user.id !== userId || user.accountKind !== 'Customer')
    throw new Error('ConstructionSiteSelectionOwnerMismatch')
}

export const projectSelectionApi = {
  get: async (userId: string, signal?: AbortSignal) => {
    requireOwner(userId)
    const selection = projectSelectionSchema.parse(
      env.NEXT_PUBLIC_USE_MOCK_API
        ? { constructionSiteId: mockSelections.get(userId) ?? null }
        : await http.get(base, { signal })
    )
    requireOwner(userId)
    return selection
  },
  set: async (userId: string, constructionSiteId: string) => {
    requireOwner(userId)
    const body = projectSelectionSchema.parse({ constructionSiteId })
    const selection = projectSelectionSchema.parse(env.NEXT_PUBLIC_USE_MOCK_API ? body : await http.put(base, body))
    requireOwner(userId)
    if (selection.constructionSiteId !== constructionSiteId) throw new Error('ConstructionSiteSelectionMismatch')
    if (env.NEXT_PUBLIC_USE_MOCK_API) mockSelections.set(userId, constructionSiteId)
    return selection
  }
}
