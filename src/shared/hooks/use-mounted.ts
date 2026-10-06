'use client'

import { useSyncExternalStore } from 'react'

const emptySubscribe = () => () => {}
const getClientSnapshot = () => true
const getServerSnapshot = () => false

/**
 * Returns `true` after the component has mounted on the client.
 * Use to defer rendering theme/locale-dependent UI and avoid hydration
 * mismatches.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot)
}
