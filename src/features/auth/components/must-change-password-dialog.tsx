'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { useAuthStore } from '@/shared/auth'
import { PasswordInput } from '@/shared/components/common'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/components/ui/form'
import { useRequiredMessage } from '@/shared/hooks'
import { isApiError } from '@/shared/lib/api'
import { useChangePassword } from '../hooks/use-change-password'
import { createChangePasswordSchema, type ChangePasswordFormValues } from '../schemas/change-password.schema'

/**
 * Màn buộc đổi mật khẩu lần đầu (BR-RBAC-006).
 *
 * Hiện đè lên mọi thứ khi tài khoản đang đăng nhập có `mustChangePassword`, và
 * KHÔNG cho đóng (không nút X, không đóng bằng Esc hay bấm ra ngoài): backend đã
 * chặn mọi chức năng khác, nên đây là việc duy nhất làm được. Mount một lần ở
 * khu đã đăng nhập (`AuthBootstrap`) để phủ cả site khách lẫn khu quản trị.
 */
export function MustChangePasswordDialog() {
  const t = useTranslations('auth.mustChange')
  const tv = useTranslations('validation')
  const required = useRequiredMessage()
  const open = useAuthStore((s) => s.isInitialized && Boolean(s.user?.mustChangePassword))
  const changePassword = useChangePassword()

  const schema = useMemo(
    () =>
      createChangePasswordSchema({
        required,
        passwordMin: tv('passwordMin', { min: 8 }),
        passwordMismatch: tv('passwordMismatch')
      }),
    [required, tv]
  )

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' }
  })

  function onSubmit(values: ChangePasswordFormValues) {
    changePassword.mutate(
      { currentPassword: values.currentPassword, newPassword: values.newPassword },
      {
        onSuccess: () => {
          toast.success(t('success'))
          form.reset()
        },
        onError: (error) => {
          toast.error(isApiError(error) ? error.message : t('error'))
        }
      }
    )
  }

  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('subtitle')}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='currentPassword'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('currentLabel')}</FormLabel>
                  <FormControl>
                    <PasswordInput autoComplete='current-password' placeholder={t('currentPlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='newPassword'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('newLabel')}</FormLabel>
                  <FormControl>
                    <PasswordInput autoComplete='new-password' placeholder={t('newPlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='confirmPassword'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('confirmLabel')}</FormLabel>
                  <FormControl>
                    <PasswordInput autoComplete='new-password' placeholder={t('confirmPlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type='submit' className='w-full' disabled={changePassword.isPending}>
              {changePassword.isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
              {t('submit')}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
