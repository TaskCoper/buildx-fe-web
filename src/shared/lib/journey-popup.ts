import { JOURNEY_POPUP_TEST_MODE } from '@/shared/constants'

const READY_PROJECT_POPUP_KEY = 'savico.journey.popup2'
const MANAGEMENT_POPUP_KEY = 'savico.journey.popup3'
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1_000

interface JourneyPopupMemory {
  suppressedUntil: number | null
  completedAt: number | null
}

function storageKey(prefix: string, projectId: string): string {
  return `${prefix}.${projectId}`
}

function readMemory(prefix: string, projectId: string): JourneyPopupMemory {
  if (typeof window === 'undefined') return { suppressedUntil: null, completedAt: null }

  try {
    const raw = window.localStorage.getItem(storageKey(prefix, projectId))
    if (!raw) return { suppressedUntil: null, completedAt: null }

    const parsed = JSON.parse(raw) as Partial<JourneyPopupMemory>
    return {
      suppressedUntil: typeof parsed.suppressedUntil === 'number' ? parsed.suppressedUntil : null,
      completedAt: typeof parsed.completedAt === 'number' ? parsed.completedAt : null
    }
  } catch {
    return { suppressedUntil: null, completedAt: null }
  }
}

function writeMemory(prefix: string, projectId: string, memory: JourneyPopupMemory): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(storageKey(prefix, projectId), JSON.stringify(memory))
}

/**
 * Popup 2/3 is intentionally unrestricted while the shared QA switch is on.
 * Turn JOURNEY_POPUP_TEST_MODE off after visual/flow QA to restore per-project
 * completion and the seven-day "later" suppression.
 */
export function canShowReadyProjectPopup(projectId: string): boolean {
  if (JOURNEY_POPUP_TEST_MODE) return true

  const memory = readMemory(READY_PROJECT_POPUP_KEY, projectId)
  if (memory.completedAt !== null) return false
  if (memory.suppressedUntil !== null && Date.now() < memory.suppressedUntil) return false
  return true
}

export function dismissReadyProjectPopup(projectId: string): void {
  if (JOURNEY_POPUP_TEST_MODE) return

  const memory = readMemory(READY_PROJECT_POPUP_KEY, projectId)
  writeMemory(READY_PROJECT_POPUP_KEY, projectId, {
    ...memory,
    suppressedUntil: Date.now() + SEVEN_DAYS_MS
  })
}

export function completeReadyProjectPopup(projectId: string): void {
  if (JOURNEY_POPUP_TEST_MODE) return

  writeMemory(READY_PROJECT_POPUP_KEY, projectId, {
    suppressedUntil: null,
    completedAt: Date.now()
  })
}

/** Popup 3/3 — một lần mỗi dự án sau khi đã chốt nhà thầu. */
export function canShowManagementPopup(projectId: string): boolean {
  if (JOURNEY_POPUP_TEST_MODE) return true

  const memory = readMemory(MANAGEMENT_POPUP_KEY, projectId)
  if (memory.completedAt !== null) return false
  if (memory.suppressedUntil !== null && Date.now() < memory.suppressedUntil) return false
  return true
}

export function dismissManagementPopup(projectId: string): void {
  if (JOURNEY_POPUP_TEST_MODE) return

  const memory = readMemory(MANAGEMENT_POPUP_KEY, projectId)
  writeMemory(MANAGEMENT_POPUP_KEY, projectId, {
    ...memory,
    suppressedUntil: Date.now() + SEVEN_DAYS_MS
  })
}

export function completeManagementPopup(projectId: string): void {
  if (JOURNEY_POPUP_TEST_MODE) return

  writeMemory(MANAGEMENT_POPUP_KEY, projectId, {
    suppressedUntil: null,
    completedAt: Date.now()
  })
}
