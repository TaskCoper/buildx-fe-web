'use client'

import { useMemo, useState, type FormEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { ArrowLeft, KeyRound, Loader2, MailCheck } from 'lucide-react'
import { toast } from 'sonner'

import { Link } from '@/i18n/navigation'
import { ROUTES } from '@/shared/constants/routes'
import { isApiError } from '@/shared/lib/api'
import { PasswordInput } from '@/shared/components/common'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/components/ui/form'
import { useRequiredMessage } from '@/shared/hooks'
import {
  createForgotPasswordSchema,
  createResetPasswordSchema,
  type ForgotPasswordFormValues,
  type ResetPasswordFormValues
} from '../schemas/forgot-password.schema'
import { authApi } from '../api/auth.api'

type Step = 'email' | 'code' | 'password' | 'done'

/**
 * Luồng QUÊN MẬT KHẨU 3 bước nối BMT API (STORY-AUTH-001 ALT-02):
 * nhập email → nhập mã gửi qua email (BE cấp phiên quên MK qua cookie) → đặt
 * mật khẩu mới. Xong thì mọi phiên bị cắt, đưa người dùng đăng nhập lại.
 */
export function ForgotPasswordForm() {
  const t = useTranslations('auth.forgot')
  const tv = useTranslations('validation')
  const required = useRequiredMessage()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [pending, setPending] = useState(false)
  // Ô mã dùng state thường (không qua RHF Controller) để chắc chắn nhập được.
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState<string | null>(null)

  const emailSchema = useMemo(() => createForgotPasswordSchema({ required, email: tv('email') }), [required, tv])
  const passwordSchema = useMemo(
    () =>
      createResetPasswordSchema({
        required,
        passwordMin: tv('passwordMin', { min: 8 }),
        passwordMismatch: tv('passwordMismatch')
      }),
    [required, tv]
  )

  const emailForm = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' }
  })
  const passwordForm = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' }
  })

  /** Chuẩn hóa lỗi API về một thông báo, fallback là thông báo mặc định. */
  /**
   * Hiện lỗi bằng tiếng Việt theo `messageCode` của BE (envelope trả `detail`
   * tiếng Anh nên KHÔNG phô message thô); còn lại dùng thông báo mặc định của
   * từng bước.
   */
  function showError(error: unknown, fallback: string) {
    const code = isApiError(error) ? error.messageCode : undefined
    if (code === 'UserNotExisted') return toast.error(t('emailNotFound'))
    if (code === 'InvalidVerificationCode') return toast.error(t('codeError'))
    toast.error(fallback)
  }

  async function onSubmitEmail(values: ForgotPasswordFormValues) {
    setPending(true)
    try {
      await authApi.requestPasswordReset(values.email)
      setEmail(values.email)
      setStep('code')
    } catch (error) {
      showError(error, t('requestError'))
    } finally {
      setPending(false)
    }
  }

  async function onSubmitCode(event: FormEvent) {
    event.preventDefault()
    const trimmed = code.trim()
    if (!/^\d+$/.test(trimmed)) {
      setCodeError(trimmed ? t('codeInvalid') : required('verifyCode'))
      return
    }
    setCodeError(null)
    setPending(true)
    try {
      await authApi.verifyResetCode(email, Number(trimmed))
      setStep('password')
    } catch (error) {
      showError(error, t('codeError'))
    } finally {
      setPending(false)
    }
  }

  async function onSubmitPassword(values: ResetPasswordFormValues) {
    setPending(true)
    try {
      await authApi.resetPassword(values.newPassword)
      setStep('done')
    } catch (error) {
      showError(error, t('resetError'))
    } finally {
      setPending(false)
    }
  }

  async function onResend() {
    setPending(true)
    try {
      await authApi.requestPasswordReset(email)
      toast.success(t('resendOk'))
    } catch (error) {
      showError(error, t('requestError'))
    } finally {
      setPending(false)
    }
  }

  const backToLogin = (
    <Button asChild variant='link' className='mt-4 w-full'>
      {/* Đăng nhập là DIALOG (`?auth=login` trên trang chủ), không có route `/login`. */}
      <Link href={`${ROUTES.HOME}?auth=login`}>
        <ArrowLeft className='size-4' />
        {t('backToLogin')}
      </Link>
    </Button>
  )

  if (step === 'done') {
    return (
      <Card className='w-full max-w-sm'>
        <CardHeader className='items-center text-center'>
          <div className='bg-success/10 mb-2 flex size-12 items-center justify-center rounded-full'>
            <MailCheck className='text-success size-6' />
          </div>
          <CardTitle className='text-title'>{t('doneTitle')}</CardTitle>
          <CardDescription>{t('doneSubtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className='w-full'>
            <Link href={`${ROUTES.HOME}?auth=login`}>{t('goToLogin')}</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (step === 'code') {
    return (
      <Card className='w-full max-w-sm'>
        <CardHeader className='items-center text-center'>
          <div className='bg-primary/10 mb-2 flex size-12 items-center justify-center rounded-full'>
            <KeyRound className='text-primary size-6' />
          </div>
          <CardTitle className='text-title'>{t('codeTitle')}</CardTitle>
          <CardDescription>{t('codeSubtitle', { email })}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmitCode} className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='reset-code'>{t('codeLabel')}</Label>
              <Input
                id='reset-code'
                inputMode='numeric'
                autoComplete='off'
                placeholder={t('codePlaceholder')}
                value={code}
                onChange={(event) => {
                  setCode(event.target.value)
                  if (codeError) setCodeError(null)
                }}
                aria-invalid={codeError ? true : undefined}
              />
              {codeError ? <p className='text-destructive text-sm font-medium'>{codeError}</p> : null}
            </div>
            <Button type='submit' className='w-full' disabled={pending}>
              {pending ? <Loader2 className='size-4 animate-spin' /> : null}
              {t('codeSubmit')}
            </Button>
          </form>
          <div className='mt-4 flex items-center justify-between text-sm'>
            <button
              type='button'
              className='text-muted-foreground hover:text-foreground'
              onClick={() => {
                setCode('')
                setCodeError(null)
                setStep('email')
              }}
              disabled={pending}
            >
              {t('changeEmail')}
            </button>
            <button
              type='button'
              className='text-primary hover:underline disabled:opacity-50'
              onClick={onResend}
              disabled={pending}
            >
              {t('resend')}
            </button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (step === 'password') {
    return (
      <Card className='w-full max-w-sm'>
        <CardHeader className='text-center'>
          <CardTitle className='text-title'>{t('passwordTitle')}</CardTitle>
          <CardDescription>{t('passwordSubtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onSubmitPassword)} className='space-y-4'>
              <FormField
                control={passwordForm.control}
                name='newPassword'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('newPasswordLabel')}</FormLabel>
                    <FormControl>
                      <PasswordInput autoComplete='new-password' placeholder={t('passwordPlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name='confirmPassword'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('confirmPasswordLabel')}</FormLabel>
                    <FormControl>
                      <PasswordInput autoComplete='new-password' placeholder={t('passwordPlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type='submit' className='w-full' disabled={pending}>
                {pending ? <Loader2 className='size-4 animate-spin' /> : null}
                {t('resetSubmit')}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className='w-full max-w-sm'>
      <CardHeader className='text-center'>
        <CardTitle className='text-title'>{t('title')}</CardTitle>
        <CardDescription>{t('subtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...emailForm}>
          <form onSubmit={emailForm.handleSubmit(onSubmitEmail)} className='space-y-4'>
            <FormField
              control={emailForm.control}
              name='email'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('emailLabel')}</FormLabel>
                  <FormControl>
                    <Input type='email' autoComplete='email' placeholder={t('emailPlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type='submit' className='w-full' disabled={pending}>
              {pending ? <Loader2 className='size-4 animate-spin' /> : null}
              {t('submit')}
            </Button>
          </form>
        </Form>
        {backToLogin}
      </CardContent>
    </Card>
  )
}
