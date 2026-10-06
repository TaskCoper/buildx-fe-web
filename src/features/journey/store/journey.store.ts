'use client'

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import {
  JOURNEY_DISMISS_COOLDOWN_MS,
  JOURNEY_POPUP_TEST_MODE,
  JOURNEY_STORAGE_KEY
} from '../constants/journey.constants'
import type { JourneyStore } from '../types/journey.types'

const EMPTY_STEP_ONE = {
  dismissCount: 0,
  lastShownAt: null,
  suppressedUntil: null,
  completedAt: null
}

export const useJourneyStore = create<JourneyStore>()(
  persist(
    (set) => ({
      stepOne: EMPTY_STEP_ONE,
      preferredBranch: null,
      lastDismissedAt: null,

      markStepOneShown: () => {
        set((state) => ({
          stepOne: {
            ...state.stepOne,
            lastShownAt: JOURNEY_POPUP_TEST_MODE ? null : Date.now(),
            suppressedUntil: JOURNEY_POPUP_TEST_MODE ? null : state.stepOne.suppressedUntil,
            completedAt: JOURNEY_POPUP_TEST_MODE ? null : state.stepOne.completedAt
          }
        }))
      },

      dismissStepOne: () => {
        const now = Date.now()
        set((state) => {
          const dismissCount = state.stepOne.dismissCount + 1
          const suppressFor = JOURNEY_DISMISS_COOLDOWN_MS
          return {
            stepOne: {
              ...state.stepOne,
              dismissCount,
              suppressedUntil: now + suppressFor
            },
            lastDismissedAt: now
          }
        })
      },

      completeStepOne: (branch) => {
        if (JOURNEY_POPUP_TEST_MODE) {
          set((state) => ({
            stepOne: {
              ...state.stepOne,
              dismissCount: 0,
              lastShownAt: null,
              suppressedUntil: null,
              completedAt: null
            },
            preferredBranch: branch,
            lastDismissedAt: null
          }))
          return
        }

        const now = Date.now()
        set((state) => ({
          stepOne: {
            ...state.stepOne,
            completedAt: now,
            suppressedUntil: null
          },
          preferredBranch: branch
        }))
      }
    }),
    {
      name: JOURNEY_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage)
    }
  )
)
