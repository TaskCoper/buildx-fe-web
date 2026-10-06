import { z } from 'zod'

import type { RequiredMessage } from '@/shared/hooks'

/** Resolved, localized validation messages for the change-password form. */
export interface ChangePasswordSchemaMessages {
  required: RequiredMessage
  passwordMin: string
  passwordMismatch: string
}

/**
 * Builds the change-password schema with localized messages (see
 * {@link createLoginSchema}). Used by the forced first-login change flow.
 */
export function createChangePasswordSchema(m: ChangePasswordSchemaMessages) {
  return z
    .object({
      currentPassword: z.string().min(1, { message: m.required('currentPassword') }),
      newPassword: z.string().min(8, { message: m.passwordMin }),
      confirmPassword: z.string().min(1, { message: m.required('confirmPassword') })
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: m.passwordMismatch,
      path: ['confirmPassword']
    })
}

export type ChangePasswordFormValues = z.infer<ReturnType<typeof createChangePasswordSchema>>
