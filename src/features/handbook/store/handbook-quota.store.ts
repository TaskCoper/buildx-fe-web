'use client'

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

const HANDBOOK_QUOTA_LEDGER_KEY = 'savico.handbook.quota-ledger'

interface HandbookQuotaLedger {
  dayKey: string
  lookupPeriodKey: string
  lookupUsed: number
  detailViewedIds: Record<string, true>
  resetForToday: () => void
  syncLookupPeriod: (periodKey: string) => void
  consumeLookup: (available: number, periodKey: string) => boolean
  consumeDetail: (templateId: string, available: number) => 'consumed' | 'seen' | 'blocked'
}

export function localDayKey(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Mock-only daily usage ledger for the handbook library.
 *
 * The real API remains the authority once quota consumption is implemented on
 * the backend. In mock mode the GET endpoint always returns the configured
 * allowance, so this tiny persisted ledger gives the frontend realistic daily
 * decrement/reset behaviour without changing the public API contract.
 */
export const useHandbookQuotaLedger = create<HandbookQuotaLedger>()(
  persist(
    (set, get) => ({
      dayKey: localDayKey(),
      lookupPeriodKey: `day:${localDayKey()}`,
      lookupUsed: 0,
      detailViewedIds: {},

      resetForToday: () => {
        const today = localDayKey()
        if (get().dayKey === today) return
        const current = get()
        set({
          dayKey: today,
          detailViewedIds: {},
          ...(current.lookupPeriodKey.startsWith('day:') ? { lookupPeriodKey: `day:${today}`, lookupUsed: 0 } : {})
        })
      },

      syncLookupPeriod: (periodKey) => {
        const current = get()
        if (current.lookupPeriodKey === periodKey) return
        set({ lookupPeriodKey: periodKey, lookupUsed: 0 })
      },

      consumeLookup: (available, periodKey) => {
        const current = get()
        const used = current.lookupPeriodKey === periodKey ? current.lookupUsed : 0
        if (used >= Math.max(available, 0)) {
          if (current.lookupPeriodKey !== periodKey) set({ lookupPeriodKey: periodKey, lookupUsed: 0 })
          return false
        }

        set({ lookupPeriodKey: periodKey, lookupUsed: used + 1 })
        return true
      },

      consumeDetail: (templateId, available) => {
        const today = localDayKey()
        const current = get()
        const viewed = current.dayKey === today ? current.detailViewedIds : {}
        if (viewed[templateId]) {
          if (current.dayKey !== today) set({ dayKey: today, detailViewedIds: {} })
          return 'seen'
        }

        const used = Object.keys(viewed).length
        if (used >= Math.max(available, 0)) {
          if (current.dayKey !== today) set({ dayKey: today, detailViewedIds: {} })
          return 'blocked'
        }

        set({
          dayKey: today,
          detailViewedIds: { ...viewed, [templateId]: true }
        })
        return 'consumed'
      }
    }),
    {
      name: HANDBOOK_QUOTA_LEDGER_KEY,
      storage: createJSONStorage(() => localStorage)
    }
  )
)
