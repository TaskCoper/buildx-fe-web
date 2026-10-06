/** Small, reusable type helpers used across the codebase. */

export type Nullable<T> = T | null
export type Maybe<T> = T | null | undefined
export type Dictionary<T = unknown> = Record<string, T>

/** Make selected keys optional. */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

/** Make selected keys required. */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>

/** Async state machine status, useful for non-Query async flows. */
export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error'

/** A value that may be wrapped in a promise. */
export type Awaitable<T> = T | Promise<T>
