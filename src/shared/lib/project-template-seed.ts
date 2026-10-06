export const PROJECT_TEMPLATE_SEED_SESSION_KEY = 'savico.project-template-seed'

export interface ProjectTemplateSeed {
  templateId: string
  templateName: string
  buildingType?: string
  floorCount?: string
  hasAttic?: boolean
  style?: string
  createdAt: number
}

const MAX_AGE_MS = 15 * 60 * 1_000

export function rememberProjectTemplateSeed(seed: Omit<ProjectTemplateSeed, 'createdAt'>): void {
  if (typeof window === 'undefined') return

  try {
    window.sessionStorage.setItem(
      PROJECT_TEMPLATE_SEED_SESSION_KEY,
      JSON.stringify({ ...seed, createdAt: Date.now() } satisfies ProjectTemplateSeed)
    )
  } catch {
    // Session storage unavailable: project creation still works, just without prefill.
  }
}

export function consumeProjectTemplateSeed(): ProjectTemplateSeed | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.sessionStorage.getItem(PROJECT_TEMPLATE_SEED_SESSION_KEY)
    window.sessionStorage.removeItem(PROJECT_TEMPLATE_SEED_SESSION_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as Partial<ProjectTemplateSeed>
    if (
      typeof parsed.templateId !== 'string' ||
      typeof parsed.templateName !== 'string' ||
      typeof parsed.createdAt !== 'number' ||
      Date.now() - parsed.createdAt > MAX_AGE_MS
    ) {
      return null
    }

    return parsed as ProjectTemplateSeed
  } catch {
    return null
  }
}

export function clearProjectTemplateSeed(): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.removeItem(PROJECT_TEMPLATE_SEED_SESSION_KEY)
  } catch {
    // Nothing to clear when storage is unavailable.
  }
}
