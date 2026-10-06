'use client'

import { mostRecentActiveProject, type Project, useProjects } from '@/features/design'
import { useAuth } from '@/shared/auth'

/**
 * The homepage's "dự án dở" — the most recently touched project that isn't
 * finished yet (mục II.2: hero's "Mở tiếp dự án →", dải 5 bước, CTA cuối
 * trang, chấm xanh trên avatar). Only logged-in accounts get this — a guest
 * has nothing durable to "continue".
 *
 * Lives in `app/` (not a hook inside `features/landing`) because it reaches
 * into `features/design`, which `features/landing` may never import.
 */
export function useActiveProject(): Project | undefined {
  const { user, isAuthenticated, isInitialized } = useAuth()
  const { data: projects } = useProjects()
  if (!isInitialized || !isAuthenticated || user?.accountKind !== 'Customer') return undefined
  return mostRecentActiveProject(projects ?? [])
}
