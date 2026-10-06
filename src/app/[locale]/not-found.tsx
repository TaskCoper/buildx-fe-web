import { FileQuestion } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Link } from '@/i18n/navigation'
import { EmptyState } from '@/shared/components/common'
import { Button } from '@/shared/components/ui/button'
import { ROUTES } from '@/shared/constants/routes'

/** Localized 404 page. */
export default function NotFound() {
  const t = useTranslations('errors.pageNotFound')

  return (
    <div className='flex min-h-svh items-center justify-center p-6'>
      <EmptyState
        icon={FileQuestion}
        title={t('title')}
        description={t('description')}
        className='border-0'
        action={
          <Button asChild>
            <Link href={ROUTES.HOME}>{t('action')}</Link>
          </Button>
        }
      />
    </div>
  )
}
