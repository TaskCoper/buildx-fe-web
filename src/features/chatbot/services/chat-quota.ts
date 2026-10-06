import { CHAT_USAGE_STORAGE_KEY } from '../constants/chatbot.constants'

/**
 * Per-day chat-usage counter persisted in localStorage. Pure-ish helpers that
 * no-op on the server. The count resets automatically when the date changes.
 *
 * NOTE: this is a client-side UX guard only — the real per-account quota is
 * enforced by the backend.
 */

interface UsageRecord {
  date: string
  count: number
}

/** Local YYYY-MM-DD key for "today". */
function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function read(): UsageRecord {
  if (typeof window === 'undefined') return { date: todayKey(), count: 0 }
  try {
    const raw = window.localStorage.getItem(CHAT_USAGE_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as UsageRecord
      if (parsed.date === todayKey()) return parsed
    }
  } catch {
    // ignore malformed storage
  }
  return { date: todayKey(), count: 0 }
}

// --- External store wiring (for useSyncExternalStore) ---
const listeners = new Set<() => void>()

function emit(): void {
  listeners.forEach((l) => l())
}

/** Subscribe to usage changes. */
export function subscribeUsage(callback: () => void): () => void {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

/** Client snapshot: messages already sent today. */
export function getTodayCount(): number {
  return read().count
}

/** Server snapshot: always 0 (no localStorage on the server). */
export function getServerCount(): number {
  return 0
}

/** Increment today's counter, notify subscribers, and return the new total. */
export function incrementTodayCount(): number {
  const next: UsageRecord = { date: todayKey(), count: read().count + 1 }
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(CHAT_USAGE_STORAGE_KEY, JSON.stringify(next))
    } catch {
      // ignore quota/permission errors
    }
  }
  emit()
  return next.count
}
