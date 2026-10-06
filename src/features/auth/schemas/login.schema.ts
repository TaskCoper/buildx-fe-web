import { z } from 'zod'

/** Resolved, localized validation messages injected into the schema. */
export interface LoginSchemaMessages {
  emailRequired: string
  email: string
  passwordMin: string
}

/**
 * Builds the login schema with localized messages.
 *
 * Resolve the strings from translation files at the call site and pass them in
 * — keeps the schema framework-agnostic and trivially unit-testable, and
 * guarantees no hardcoded UI text leaks into validation.
 */
export function createLoginSchema(m: LoginSchemaMessages) {
  return z.object({
    email: z.string().min(1, { message: m.emailRequired }).email({ message: m.email }),
    password: z.string().min(8, { message: m.passwordMin }),
    // Default is supplied by the form's `defaultValues` to keep Zod's
    // input/output types aligned for `zodResolver`.
    rememberMe: z.boolean()
  })
}

export type LoginFormValues = z.infer<ReturnType<typeof createLoginSchema>>
