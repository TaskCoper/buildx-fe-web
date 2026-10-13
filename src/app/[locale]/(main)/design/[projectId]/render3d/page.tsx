import { setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import type { Locale } from '@/i18n/routing'
import { ProtectedRoute } from '@/shared/auth'
import { env } from '@/shared/config/env'
import { StepRender3dView } from './step-render3d-view'
export function generateStaticParams() {
  return []
}
export default async function Render3dPage({ params }: { params: Promise<{ locale: Locale; projectId: string }> }) {
  const { locale, projectId } = await params
  setRequestLocale(locale)
  if (!env.NEXT_PUBLIC_ESTIMATE_PIPELINE_ENABLED || env.NEXT_PUBLIC_USE_MOCK_API) notFound()
  return (
    <ProtectedRoute>
      <StepRender3dView projectId={projectId} />
    </ProtectedRoute>
  )
}
