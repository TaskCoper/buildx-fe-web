import { z } from 'zod'

import type { RequiredMessage } from '@/shared/hooks'

/** Resolved, localized validation messages for the register form. */
export interface RegisterSchemaMessages {
  required: RequiredMessage
  email: string
  passwordMin: string
  passwordMismatch: string
  agreeTerms: string
}

/** Builds the register schema with localized messages (see createLoginSchema). */
export function createRegisterSchema(m: RegisterSchemaMessages) {
  return z
    .object({
      name: z.string().min(1, { message: m.required('fullName') }),
      email: z
        .string()
        .min(1, { message: m.required('email') })
        .email({ message: m.email }),
      password: z.string().min(8, { message: m.passwordMin }),
      confirmPassword: z.string().min(1, { message: m.required('confirmPassword') }),
      agreeTerms: z.boolean().refine((v) => v, { message: m.agreeTerms })
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: m.passwordMismatch,
      path: ['confirmPassword']
    })
}

export type RegisterFormValues = z.infer<ReturnType<typeof createRegisterSchema>>
