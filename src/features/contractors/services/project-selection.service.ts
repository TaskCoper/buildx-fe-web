import { z } from 'zod'
import type { ProjectBrief } from '../types/contractor.types'
import { isBriefComplete } from './brief.service'

export type SelectedProject = { id: string; constructionSiteId?: string }

/** Only owned, completed server sites can become an account preference. */
export function selectedProjectSiteId(brief: ProjectBrief, userId: string): string {
  if (!isSelectableProject(brief, userId) || !brief.constructionSiteId)
    throw new Error('ConstructionSiteSelectionOwnerMismatch')
  return z.string().uuid().parse(brief.constructionSiteId)
}

export function isSelectableProject(brief: ProjectBrief, userId: string): boolean {
  return (
    brief.userId === userId && brief.ownershipVersion === 1 && brief.status !== 'contracted' && isBriefComplete(brief)
  )
}

export function sameSelectedProject(selected: SelectedProject | undefined, brief: ProjectBrief): boolean {
  return Boolean(
    selected &&
    (selected.id === brief.id ||
      (selected.constructionSiteId && selected.constructionSiteId === brief.constructionSiteId))
  )
}

/** Resolve against the current owned list, including local-ID/server-ID aliases. */
export function resolveSelectedProject(
  briefs: readonly ProjectBrief[],
  selected: SelectedProject | undefined,
  userId: string
): ProjectBrief | undefined {
  const eligible = briefs.filter((brief) => isSelectableProject(brief, userId))
  return (
    eligible.find((brief) => sameSelectedProject(selected, brief)) ??
    [...eligible].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
  )
}
