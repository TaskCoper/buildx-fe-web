import { quotationApi, type SubmitQuotation } from '@/shared/quotations'
import { useAuthStore } from '@/shared/auth'
import { briefDrafts } from './brief-drafts'

export function quotationSiteId(projectId: string) {
  return (
    briefDrafts.get(projectId)?.constructionSiteId ??
    (/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(projectId) ? projectId : undefined)
  )
}
function attemptKey(projectId: string, contractorId: string) {
  const userId = useAuthStore.getState().user?.id
  if (!userId) throw new Error('AuthenticationRequired')
  return `savico.rfq-attempt.${userId}.${projectId}.${contractorId}`
}
export function readQuotationAttempt(
  projectId: string,
  contractorId: string
): { key: string; body: SubmitQuotation } | null {
  if (typeof window === 'undefined') return null
  const raw = sessionStorage.getItem(attemptKey(projectId, contractorId))
  return raw ? JSON.parse(raw) : null
}
export const quotationRequestsApi = {
  list: async (projectId: string, persistedSiteId?: string) => {
    const siteId = persistedSiteId ?? quotationSiteId(projectId)
    if (!siteId) return null
    const summary = await quotationApi.summary(siteId)
    const items = [...summary.requests.items]
    for (let index = 2; summary.requests.hasNextPage; index++) {
      const page = await quotationApi.summary(siteId, index)
      items.push(...page.requests.items)
      summary.requests.hasNextPage = page.requests.hasNextPage
    }
    return { ...summary, requests: { ...summary.requests, items } }
  },
  submit: async (projectId: string, body: SubmitQuotation) => {
    const siteId = quotationSiteId(projectId)
    if (!siteId) throw new Error('ConstructionSiteRequired')
    const storageKey = attemptKey(projectId, body.contractorId)
    const previous = readQuotationAttempt(projectId, body.contractorId)
    // An uncertain response must be replayed with the same body/key, including after F5.
    const attempt = previous ?? { key: crypto.randomUUID(), body }
    sessionStorage.setItem(storageKey, JSON.stringify(attempt))
    try {
      const receipt = await quotationApi.submit(siteId, attempt.body, attempt.key)
      sessionStorage.removeItem(storageKey)
      return receipt
    } catch (error) {
      // Keep network/timeouts/5xx ambiguous; explicit rejections allow correcting the form.
      if (
        typeof error === 'object' &&
        error &&
        'status' in error &&
        typeof error.status === 'number' &&
        error.status >= 400 &&
        error.status < 500
      )
        sessionStorage.removeItem(storageKey)
      throw error
    }
  }
}
