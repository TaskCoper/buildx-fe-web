'use client'

import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

import { Link } from '@/i18n/navigation'
import { ROUTES } from '@/shared/constants/routes'
import { PasswordInput } from '@/shared/components/common'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/components/ui/form'
import { useLogin } from '../hooks/use-login'
import { createLoginSchema, type LoginFormValues } from '../schemas/login.schema'
import { GoogleButton } from './google-button'

interface LoginFormProps {
  /** Render bare (no Card chrome) for embedding inside the auth dialog. */
  embedded?: boolean
}

/**
 * Reference form: React Hook Form + Zod (localized) + shadcn Form primitives.
 * The exact pattern every feature form should follow.
 */
export function LoginForm({ embedded = false }: LoginFormProps = {}) {
  const t = useTranslations('auth.login')
  const tSocial = useTranslations('auth.social')
  const tv = useTranslations('validation')
  const searchParams = useSearchParams()
  // Only redirect when an explicit target is present (protected-route bounce);
  // a plain popup login stays on the current page and resumes its intent.
  const redirectTo = searchParams.get('redirect') ?? undefined

  const schema = useMemo(
    () =>
      createLoginSchema({
        emailRequired: tv('emailRequired'),
        email: tv('email'),
        passwordMin: tv('passwordMin', { min: 8 })
      }),
    [tv]
  )
  const login = useLogin(redirectTo)

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', rememberMe: false }
  })

  function onSubmit(values: LoginFormValues) {
    login.mutate(values)
  }

  const content = (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
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
                <div className='flex items-center justify-between'>
                  <FormLabel>{t('passwordLabel')}</FormLabel>
                  <Link href={ROUTES.FORGOT_PASSWORD} className='text-muted-foreground hover:text-foreground text-sm'>
                    {t('forgotPassword')}
                  </Link>
                </div>
                <FormControl>
                  <PasswordInput autoComplete='current-password' placeholder={t('passwordPlaceholder')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='rememberMe'
            render={({ field }) => (
              <FormItem className='flex flex-row items-center gap-2 space-y-0'>
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className='font-normal'>{t('rememberMe')}</FormLabel>
              </FormItem>
            )}
          />

          <Button type='submit' className='w-full' disabled={login.isPending}>
            {login.isPending ? <Loader2 className='size-4 animate-spin' /> : null}
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
          {t('noAccount')}{' '}
          <Link href={ROUTES.REGISTER} className='text-foreground font-medium underline underline-offset-4'>
            {t('signUp')}
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
