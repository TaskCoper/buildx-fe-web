'use client'

import { useTranslations } from 'next-intl'
import { useEffect } from 'react'

import { ErrorState } from '@/shared/components/common'

/** Localized route error boundary. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations('errors.boundary')

  useEffect(() => {
    // TODO: forward to an error-reporting service (Sentry, etc.).
    console.error(error)
  }, [error])

  return (
    <div className='flex min-h-svh items-center justify-center p-6'>
      <ErrorState
        title={t('title')}
        description={t('description')}
        retryLabel={t('action')}
        onRetry={reset}
        className='border-0'
      />
    </div>
  )
}
