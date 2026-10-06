import {
  JOURNEY_DISMISS_COOLDOWN_MS,
  JOURNEY_POPUP_TEST_MODE,
  JOURNEY_STEP_ONE_REPEAT_MS
} from '../constants/journey.constants'
import type { JourneyPopupMemory } from '../types/journey.types'

interface StepOnePolicyInput {
  now: number
  memory: JourneyPopupMemory
  lastDismissedAt: number | null
}

/** Pure policy for Popup 1/3. Page/state/busy guards stay in the app host. */
export function canShowJourneyStepOne({ now, memory, lastDismissedAt }: StepOnePolicyInput): boolean {
  // Dismissal must survive reloads, including during popup QA.
  if (lastDismissedAt !== null)
    return (
      now - lastDismissedAt >= JOURNEY_DISMISS_COOLDOWN_MS && (JOURNEY_POPUP_TEST_MODE || memory.completedAt === null)
    )
  if (JOURNEY_POPUP_TEST_MODE) return true

  if (memory.completedAt !== null) return false
  if (memory.lastShownAt != null && now - memory.lastShownAt < JOURNEY_STEP_ONE_REPEAT_MS) return false
  if (memory.suppressedUntil !== null && now < memory.suppressedUntil) return false
  return true
}
