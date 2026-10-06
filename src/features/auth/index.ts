/**
 * Public API of the `auth` feature.
 * Auth INFRASTRUCTURE (store, guards, roles) lives in `@/shared/auth`; this
 * feature owns the auth FLOWS (forms, API calls, session hooks).
 */
export { AuthDialog } from './components/auth-dialog'
export { LoginForm } from './components/login-form'
export { RegisterForm } from './components/register-form'
export { ForgotPasswordForm } from './components/forgot-password-form'
export { AuthBootstrap } from './components/auth-bootstrap'
export { GoogleCallback } from './components/google-callback'
export { MustChangePasswordDialog } from './components/must-change-password-dialog'
export { useLogin } from './hooks/use-login'
export { useLogout } from './hooks/use-logout'
export { useRegister } from './hooks/use-register'
export { useCurrentUser } from './hooks/use-current-user'
export { useChangePassword } from './hooks/use-change-password'
export { authApi } from './api/auth.api'
export { authKeys } from './api/auth.keys'
export { createLoginSchema, type LoginFormValues, type LoginSchemaMessages } from './schemas/login.schema'
export { createRegisterSchema, type RegisterFormValues, type RegisterSchemaMessages } from './schemas/register.schema'
export {
  createForgotPasswordSchema,
  type ForgotPasswordFormValues,
  type ForgotPasswordSchemaMessages,
  createResetCodeSchema,
  type ResetCodeFormValues,
  type ResetCodeSchemaMessages,
  createResetPasswordSchema,
  type ResetPasswordFormValues,
  type ResetPasswordSchemaMessages
} from './schemas/forgot-password.schema'
export {
  createChangePasswordSchema,
  type ChangePasswordFormValues,
  type ChangePasswordSchemaMessages
} from './schemas/change-password.schema'
export type { ChangePasswordPayload, LoginPayload, LoginResponse, RegisterPayload } from './types/auth.types'
