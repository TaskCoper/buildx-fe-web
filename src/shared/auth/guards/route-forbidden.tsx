'use client'

import { ShieldAlert } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Button } from '@/shared/components/ui/button'
import { ROUTES } from '@/shared/constants/routes'
import { useAuth } from '../hooks/use-auth'
import { authHome } from '../route-access'

export function RouteForbidden() {
  const t = useTranslations('auth.forbidden')
  const { user } = useAuth()
  return (
    <div className='flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center' role='alert'>
      <ShieldAlert className='text-muted-foreground size-10' />
      <h1 className='text-xl font-semibold'>{t('title')}</h1>
      <p className='text-muted-foreground max-w-lg'>
        {t(user?.accountKind ? 'routeDescription' : 'sessionUnavailable')}
      </p>
      <Button asChild>
        <Link href={user ? authHome(user) : ROUTES.HOME}>
          {t(user?.accountKind === 'Staff' ? 'adminHome' : 'backHome')}
        </Link>
      </Button>
    </div>
  )
}
