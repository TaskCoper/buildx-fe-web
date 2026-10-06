'use client'

import { useEffect, useRef } from 'react'
import { isSelectableProject, sameSelectedProject } from '../services/project-selection.service'
import type { ProjectBrief } from '../types/contractor.types'
import { useSelectedProject, useSelectProject } from './use-selected-project'

/** An explicitly opened owned URL updates the server preference once, without fighting refetches. */
export function useSyncSelectedProject(brief: ProjectBrief | undefined) {
  const { userId, selectedProject, isReady } = useSelectedProject()
  const { mutate } = useSelectProject()
  const synchronized = useRef('')
  useEffect(() => {
    if (!isReady || !userId || !brief?.constructionSiteId || !isSelectableProject(brief, userId)) return
    const key = `${userId}:${brief.constructionSiteId}`
    if (synchronized.current === key) return
    synchronized.current = key
    if (!sameSelectedProject(selectedProject, brief)) mutate(brief)
  }, [brief, isReady, userId, selectedProject, mutate])
}
