export type JourneyBranch = 'design' | 'upload'

export type JourneyCustomerState = 'S0' | 'S1' | 'OTHER'

export interface JourneyPopupMemory {
  dismissCount: number
  lastShownAt: number | null
  suppressedUntil: number | null
  completedAt: number | null
}

export interface JourneyState {
  stepOne: JourneyPopupMemory
  preferredBranch: JourneyBranch | null
  lastDismissedAt: number | null
}

export interface JourneyActions {
  markStepOneShown: () => void
  dismissStepOne: () => void
  completeStepOne: (branch: JourneyBranch) => void
}

export type JourneyStore = JourneyState & JourneyActions
