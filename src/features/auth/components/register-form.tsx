'use client'

import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

import { Link, useRouter } from '@/i18n/navigation'
import { ROUTES } from '@/shared/constants/routes'
import { PasswordInput } from '@/shared/components/common'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/components/ui/form'
import { useRequiredMessage } from '@/shared/hooks'
import { useRegister } from '../hooks/use-register'
import { isApiError } from '@/shared/lib/api'
import { createRegisterSchema, type RegisterFormValues } from '../schemas/register.schema'
import { GoogleButton } from './google-button'

interface RegisterFormProps {
  /** Render bare (no Card chrome) for embedding inside the auth dialog. */
  embedded?: boolean
  /** In embedded mode, switch to the login tab instead of navigating. */
  onSwitchToLogin?: () => void
}

/**
 * Account creation form. On success it routes the new user to the login screen
 * (or, when embedded in the auth dialog, switches to the login tab).
 */
export function RegisterForm({ embedded = false, onSwitchToLogin }: RegisterFormProps = {}) {
  const t = useTranslations('auth.register')
  const tSocial = useTranslations('auth.social')
  const tv = useTranslations('validation')
  const required = useRequiredMessage()
  const router = useRouter()
  const register = useRegister()
  const pending = register.isPending

  const schema = useMemo(
    () =>
      createRegisterSchema({
        required,
        email: tv('email'),
        passwordMin: tv('passwordMin', { min: 8 }),
        passwordMismatch: tv('passwordMismatch'),
        agreeTerms: tv('agreeTerms')
      }),
    [required, tv]
  )

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      agreeTerms: false
    }
  })

  function onSubmit(values: RegisterFormValues) {
    register.mutate(
      { name: values.name, email: values.email, password: values.password },
      {
        onSuccess: () => {
          toast.success(t('success'))
          if (embedded && onSwitchToLogin) {
            onSwitchToLogin()
          } else {
            // Đăng nhập là dialog trên trang chủ, không có route `/login`.
            router.push(`${ROUTES.HOME}?auth=login`)
          }
        },
        onError: (error) => {
          toast.error(isApiError(error) ? error.message : t('error'))
        }
      }
    )
  }

  const content = (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
          <FormField
            control={form.control}
            name='name'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('nameLabel')}</FormLabel>
                <FormControl>
                  <Input autoComplete='name' placeholder={t('namePlaceholder')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
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

          <FormField
            control={form.control}
            name='password'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('passwordLabel')}</FormLabel>
                <FormControl>
                  <PasswordInput autoComplete='new-password' placeholder={t('passwordPlaceholder')} {...field} />
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
                <FormLabel>{t('confirmPasswordLabel')}</FormLabel>
                <FormControl>
                  <PasswordInput autoComplete='new-password' placeholder={t('confirmPasswordPlaceholder')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='agreeTerms'
            render={({ field }) => (
              <FormItem className='space-y-1'>
                <div className='flex flex-row items-start gap-2'>
                  <FormControl>
                    <Checkbox className='mt-0.5' checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  {/* `block`: FormLabel mặc định là `flex`, biến câu chữ và hai đường link thành các ô rời nhau nên
                      "Tôi đồng ý với" bị tách khỏi "Điều khoản…". Để chữ chảy liền như một đoạn văn, hết bề
                      ngang mới xuống dòng. */}
                  {/* Giữ toàn bộ câu đồng ý trên một dòng kể cả ở màn hình điện thoại hẹp. */}
                  <FormLabel className='block whitespace-nowrap text-xs leading-snug font-normal sm:text-sm'>
                    {t.rich('agree', {
                      terms: (chunks) => (
                        <Link
                          href={ROUTES.TERMS}
                          target='_blank'
                          className='text-foreground font-medium whitespace-nowrap underline underline-offset-2'
                        >
                          {chunks}
                        </Link>
                      ),
                      privacy: (chunks) => (
                        <Link
                          href={ROUTES.PRIVACY}
                          target='_blank'
                          className='text-foreground font-medium whitespace-nowrap underline underline-offset-2'
                        >
                          {chunks}
                        </Link>
                      )
                    })}
                  </FormLabel>
                </div>
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

      <div className='my-6 flex items-center gap-3'>
        <span className='bg-border h-px flex-1' />
        <span className='text-muted-foreground text-xs'>{tSocial('or')}</span>
        <span className='bg-border h-px flex-1' />
      </div>

      <GoogleButton />

      {!embedded && (
        <p className='text-muted-foreground mt-6 text-center text-sm'>
          {t('haveAccount')}{' '}
          <Link href={`${ROUTES.HOME}?auth=login`} className='text-foreground font-medium underline underline-offset-4'>
            {t('signIn')}
          </Link>
        </p>
      )}
    </>
  )

  if (embedded) return content

  return (
    <Card className='w-full max-w-sm'>
      <CardHeader className='text-center'>
        <CardTitle className='text-title'>{t('title')}</CardTitle>
        <CardDescription>{t('subtitle')}</CardDescription>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  )
}
