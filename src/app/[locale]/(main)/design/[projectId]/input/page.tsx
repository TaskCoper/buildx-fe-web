import { setRequestLocale } from 'next-intl/server'

import type { Locale } from '@/i18n/routing'
import { ProtectedRoute } from '@/shared/auth'
import { pageMetadata } from '@/shared/lib/page-metadata'
import { StepInputView } from './step-input-view'

export const generateMetadata = pageMetadata('designInput')

interface PageProps {
  params: Promise<{ locale: Locale; projectId: string }>
}

/** Màn hình 5 — Bước 1: Nhập liệu (mục III.2). */
export default async function DesignInputPage({ params }: PageProps) {
  const { locale, projectId } = await params
  setRequestLocale(locale)

  return (
    <ProtectedRoute>
      <StepInputView projectId={projectId} />
    </ProtectedRoute>
  )
}
