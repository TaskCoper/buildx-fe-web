import { z } from 'zod'

import type { RequiredMessage } from '@/shared/hooks'

/** Resolved, localized validation messages for the forgot-password form. */
export interface ForgotPasswordSchemaMessages {
  required: RequiredMessage
  email: string
}

/** Builds the forgot-password schema with localized messages. */
export function createForgotPasswordSchema(m: ForgotPasswordSchemaMessages) {
  return z.object({
    email: z
      .string()
      .min(1, { message: m.required('email') })
      .email({ message: m.email })
  })
}

export type ForgotPasswordFormValues = z.infer<ReturnType<typeof createForgotPasswordSchema>>

/** Bước 2 — nhập mã quên mật khẩu (BE nhận số nguyên). */
export interface ResetCodeSchemaMessages {
  required: RequiredMessage
  code: string
}

export function createResetCodeSchema(m: ResetCodeSchemaMessages) {
  return z.object({
    code: z
      .string()
      .min(1, { message: m.required('verifyCode') })
      .regex(/^\d+$/, { message: m.code })
  })
}

export type ResetCodeFormValues = z.infer<ReturnType<typeof createResetCodeSchema>>

/** Bước 3 — đặt mật khẩu mới (không cần mật khẩu hiện tại). */
export interface ResetPasswordSchemaMessages {
  required: RequiredMessage
  passwordMin: string
  passwordMismatch: string
}

export function createResetPasswordSchema(m: ResetPasswordSchemaMessages) {
  return z
    .object({
      newPassword: z.string().min(8, { message: m.passwordMin }),
      confirmPassword: z.string().min(1, { message: m.required('confirmPassword') })
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: m.passwordMismatch,
      path: ['confirmPassword']
    })
}

export type ResetPasswordFormValues = z.infer<ReturnType<typeof createResetPasswordSchema>>
