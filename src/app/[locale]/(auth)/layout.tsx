import type { ReactNode } from 'react'

import { Link } from '@/i18n/navigation'
import { GuestRoute } from '@/shared/auth'
import { Logo } from '@/shared/components/common'
import { ROUTES } from '@/shared/constants/routes'

/**
 * Centered auth layout. `GuestRoute` keeps authenticated users out of
 * login/register screens.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <GuestRoute>
      <div className='bg-muted/30 flex min-h-svh flex-col'>
        <header className='flex h-16 items-center px-4 lg:px-8'>
          <Link href={ROUTES.HOME} aria-label='Home'>
            <Logo />
          </Link>
        </header>
        <main className='flex flex-1 items-center justify-center px-4 py-12'>{children}</main>
      </div>
    </GuestRoute>
  )
}
