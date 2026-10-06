'use client'

import { Loader2, MailCheck } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { useAuthStore } from '@/shared/auth'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { useRequiredMessage } from '@/shared/hooks'
import { isApiError } from '@/shared/lib/api'
import { authApi } from '../api/auth.api'
import { useVerifyEmail } from '../hooks/use-verify-email'

/**
 * Buộc XÁC MINH EMAIL (STORY-AUTH-001 ALT-01).
 *
 * Hiện đè lên mọi thứ khi tài khoản đang đăng nhập có `emailVerified === false`,
 * và KHÔNG cho đóng (backend chặn các chức năng cần email đã xác minh). Khách
 * nhập mã gửi qua email; xác minh xong đọc lại `/me` để mở khoá. Mount một lần
 * ở `AuthBootstrap` để phủ cả site khách lẫn khu quản trị. Nhường cho màn buộc
 * đổi mật khẩu khi cả hai cùng bật.
 */
export function EmailVerifyDialog() {
  const t = useTranslations('auth.verifyEmail')
  const required = useRequiredMessage()
  const user = useAuthStore((s) => s.user)
  const isInitialized = useAuthStore((s) => s.isInitialized)
  const open = isInitialized && Boolean(user && user.emailVerified === false && !user.mustChangePassword)
  const verify = useVerifyEmail()
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState<string | null>(null)
  const [resending, setResending] = useState(false)

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = code.trim()
    if (!/^\d+$/.test(trimmed)) {
      setCodeError(trimmed ? t('codeInvalid') : required('verifyCode'))
      return
    }
    setCodeError(null)
    verify.mutate(Number(trimmed), {
      onSuccess: () => {
        toast.success(t('success'))
        setCode('')
      },
      onError: (error) => toast.error(isApiError(error) ? error.message : t('error'))
    })
  }

  async function onResend() {
    if (!user?.email) return
    setResending(true)
    try {
      await authApi.resendVerifyCode(user.email)
      toast.success(t('resendOk'))
    } catch (error) {
      toast.error(isApiError(error) ? error.message : t('error'))
    } finally {
      setResending(false)
    }
  }

  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        className='sm:max-w-sm'
      >
        <DialogHeader className='items-center text-center'>
          <div className='bg-primary/10 mb-1 flex size-11 items-center justify-center rounded-full'>
            <MailCheck className='text-primary size-5' />
          </div>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('subtitle', { email: user?.email ?? '' })}</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='verify-email-code'>{t('codeLabel')}</Label>
            <Input
              id='verify-email-code'
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
          <Button type='submit' className='w-full' disabled={verify.isPending}>
            {verify.isPending ? <Loader2 className='size-4 animate-spin' /> : null}
            {t('submit')}
          </Button>
        </form>

        <button
          type='button'
          className='text-primary text-sm hover:underline disabled:opacity-50'
          onClick={onResend}
          disabled={resending}
        >
          {t('resend')}
        </button>
      </DialogContent>
    </Dialog>
  )
}
