'use client'

import { Loader2, MailCheck, TriangleAlert } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState, type FormEvent } from 'react'

import { Link } from '@/i18n/navigation'
import { LoadingSpinner } from '@/shared/components/common'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { ROUTES } from '@/shared/constants/routes'
import { useGoogleCallback } from '../hooks/use-google-callback'
import { useStartGoogleLogin } from '../hooks/use-google-login'
import { isEmailCode } from '../services/google-login.logic'

/** Nhập mã 6 số gửi tới hộp thư Google khi email chưa đủ bằng chứng xác minh. */
function EmailCodeForm({
  maskedEmail,
  wrongCode,
  verifying,
  onSubmit
}: {
  maskedEmail: string
  wrongCode: boolean
  verifying: boolean
  onSubmit: (code: string) => void
}) {
  const t = useTranslations('auth.google.callback')
  const [code, setCode] = useState('')
  const [touched, setTouched] = useState(false)
  const malformed = touched && !isEmailCode(code)

  function submit(event: FormEvent) {
    event.preventDefault()
    setTouched(true)
    if (isEmailCode(code)) onSubmit(code)
  }

  return (
    <Card className='w-full max-w-sm'>
      <CardHeader className='items-center text-center'>
        <div className='bg-primary/10 mb-1 flex size-11 justify-self-center items-center justify-center rounded-full'>
          <MailCheck className='text-primary size-5' />
        </div>
        <CardTitle className='text-title'>{t('emailTitle')}</CardTitle>
        <CardDescription>{t('emailDescription', { email: maskedEmail })}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='google-email-code'>{t('codeLabel')}</Label>
            {/* Mã giữ dạng chuỗi: số 0 đứng đầu là một phần của mã. */}
            <Input
              id='google-email-code'
              inputMode='numeric'
              autoComplete='one-time-code'
              maxLength={6}
              placeholder='000000'
              value={code}
              onChange={(event) => {
                setCode(event.target.value.replace(/\D/g, ''))
                setTouched(false)
              }}
              aria-invalid={malformed || wrongCode ? true : undefined}
              disabled={verifying}
            />
            {malformed ? <p className='text-destructive text-sm font-medium'>{t('codeInvalid')}</p> : null}
            {wrongCode && !malformed ? <p className='text-destructive text-sm font-medium'>{t('codeWrong')}</p> : null}
          </div>
          <Button type='submit' className='w-full' disabled={verifying}>
            {verifying ? <Loader2 className='size-4 animate-spin' /> : null}
            {t('codeSubmit')}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

/** Trang đích của Google (`/callback`): đổi mã lấy phiên, nhập mã email nếu cần, hoặc báo lỗi kèm đường quay lại. */
export function GoogleCallback() {
  const t = useTranslations('auth.google.callback')
  const tErrors = useTranslations('auth.google.errors')
  const { state, submitCode } = useGoogleCallback()
  const restart = useStartGoogleLogin()

  if (state.phase === 'working') {
    return (
      <div className='flex flex-col items-center gap-4 py-24' role='status'>
        <LoadingSpinner />
        <p className='text-muted-foreground text-sm'>{t('working')}</p>
      </div>
    )
  }

  if (state.phase === 'email') {
    return (
      <EmailCodeForm
        maskedEmail={state.challenge.maskedEmail}
        wrongCode={state.wrongCode}
        verifying={state.verifying}
        onSubmit={submitCode}
      />
    )
  }

  // Khách tự huỷ ở Google thì không cần thúc "thử lại" — chỉ để lối về trang chủ nổi bật.
  const retryable = state.kind !== 'cancelled' && state.kind !== 'notAllowed'

  return (
    <Card className='w-full max-w-sm'>
      <CardHeader className='items-center text-center'>
        <div className='bg-destructive/10 mb-1 flex size-11 justify-self-center items-center justify-center rounded-full'>
          <TriangleAlert className='text-destructive size-5' />
        </div>
        <CardTitle className='text-title'>{t('failedTitle')}</CardTitle>
        <CardDescription>{tErrors(state.kind)}</CardDescription>
      </CardHeader>
      <CardContent className='flex flex-col gap-3'>
        {retryable ? (
          <Button onClick={() => restart.mutate(state.returnTo)} disabled={restart.isPending}>
            {restart.isPending ? <Loader2 className='size-4 animate-spin' /> : null}
            {t('retry')}
          </Button>
        ) : null}
        <Button variant={retryable ? 'outline' : 'default'} asChild>
          <Link href={ROUTES.HOME}>{t('backHome')}</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
