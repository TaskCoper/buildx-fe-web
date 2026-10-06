import { setRequestLocale } from 'next-intl/server'

import type { Locale } from '@/i18n/routing'
import { ProtectedRoute } from '@/shared/auth'
import { pageMetadata } from '@/shared/lib/page-metadata'
import { StepDossierView } from './step-dossier-view'

export const generateMetadata = pageMetadata('designDossier')

interface PageProps {
  params: Promise<{ locale: Locale; projectId: string }>
}

/**
 * Màn hình 8 + 9 + 10 — Bước 3: Hồ sơ thi công (mục III.4).
 * Ba trạng thái trên cùng một route: chưa render → đang render → hoàn tất.
 */
export default async function DesignDossierPage({ params }: PageProps) {
  const { locale, projectId } = await params
  setRequestLocale(locale)

  return (
    <ProtectedRoute>
      <StepDossierView projectId={projectId} />
    </ProtectedRoute>
  )
}
