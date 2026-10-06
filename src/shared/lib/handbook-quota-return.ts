const HANDBOOK_QUOTA_RETURN_KEY = 'savico.handbook.quota-return'
const HANDBOOK_QUOTA_RETURN_TTL_MS = 60 * 60 * 1000

export interface HandbookQuotaReturnMarker {
  templateId: string
  at: number
}

export function rememberHandbookQuotaReturn(templateId: string): void {
  if (typeof window === 'undefined') return
  try {
    const marker: HandbookQuotaReturnMarker = { templateId, at: Date.now() }
    window.sessionStorage.setItem(HANDBOOK_QUOTA_RETURN_KEY, JSON.stringify(marker))
  } catch {
    // Navigation still works when sessionStorage is unavailable.
  }
}

export function readHandbookQuotaReturn(): HandbookQuotaReturnMarker | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(HANDBOOK_QUOTA_RETURN_KEY)
    if (!raw) return null
    const marker = JSON.parse(raw) as Partial<HandbookQuotaReturnMarker>
    if (
      typeof marker.templateId !== 'string' ||
      typeof marker.at !== 'number' ||
      Date.now() - marker.at > HANDBOOK_QUOTA_RETURN_TTL_MS
    ) {
      clearHandbookQuotaReturn()
      return null
    }
    return marker as HandbookQuotaReturnMarker
  } catch {
    return null
  }
}

export function clearHandbookQuotaReturn(): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.removeItem(HANDBOOK_QUOTA_RETURN_KEY)
  } catch {
    // Nothing to clear.
  }
}
