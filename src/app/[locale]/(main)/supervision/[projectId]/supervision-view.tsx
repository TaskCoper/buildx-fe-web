'use client'

import { useSearchParams } from 'next/navigation'

import { SupervisionDashboard } from '@/features/supervision'

export function SupervisionView({ projectId }: { projectId: string }) {
  const parsed = Number(useSearchParams().get('stage'))
  const stageIndex = Number.isInteger(parsed) && parsed >= 1 && parsed <= 6 ? parsed : undefined

  return <SupervisionDashboard projectId={projectId} stageIndex={stageIndex} />
}
