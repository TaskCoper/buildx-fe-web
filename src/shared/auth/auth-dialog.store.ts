'use client'

import { create } from 'zustand'

export type AuthDialogMode = 'login' | 'register'

interface AuthDialogStore {
  isOpen: boolean
  mode: AuthDialogMode
  /**
   * Action to run once login succeeds — lets a gated trigger (e.g. a gallery
   * download or "view detail") resume the user's original intent instead of
   * bouncing them to the dashboard. Cleared when consumed or dismissed.
   */
  pendingAction: (() => void) | null
  /** Open the auth popup on the given tab, optionally deferring an action. */
  open: (mode?: AuthDialogMode, pendingAction?: () => void) => void
  close: () => void
  setOpen: (open: boolean) => void
  /** Switch tabs without losing the action that requested authentication. */
  setMode: (mode: AuthDialogMode) => void
  /** Return and clear the pending action (run it after a successful login). */
  consumePendingAction: () => (() => void) | null
}

/**
 * Global open-state for the guest auth popup so any public trigger (navbar,
 * hero, spotlight CTAs, gallery cards) opens the single AuthDialog without
 * prop-drilling. This is the auth feature's UI state; the dialog itself lives
 * in features/auth.
 */
export const useAuthDialogStore = create<AuthDialogStore>((set, get) => ({
  isOpen: false,
  mode: 'login',
  pendingAction: null,
  open: (mode = 'login', pendingAction) => set({ isOpen: true, mode, pendingAction: pendingAction ?? null }),
  close: () => set({ isOpen: false, pendingAction: null }),
  setOpen: (isOpen) => set(isOpen ? { isOpen } : { isOpen, pendingAction: null }),
  setMode: (mode) => set({ mode }),
  consumePendingAction: () => {
    const action = get().pendingAction
    set({ pendingAction: null })
    return action
  }
}))
