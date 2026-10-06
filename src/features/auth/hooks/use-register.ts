'use client'

import { useMutation } from '@tanstack/react-query'

import { authApi } from '../api/auth.api'
import type { RegisterPayload } from '../types/auth.types'

/** Register mutation. Success/error UI stays in the form. */
export function useRegister() {
  return useMutation({
    mutationFn: (payload: RegisterPayload) => authApi.register(payload)
  })
}
