'use client'

import { useAuthStore } from '@/shared/auth'
import { ConstructionSiteForm } from './construction-site-form'
export function BriefForm({ projectId }: { projectId: string }) {
  const userId = useAuthStore((state) => state.user?.id)
  return <ConstructionSiteForm key={`${userId}:${projectId}`} projectId={projectId} />
}
export { BriefSteps, BRIEF_STEP_TRANSITION_KEY } from './brief-steps'
