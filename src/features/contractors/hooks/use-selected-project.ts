'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { useAuthStore } from '@/shared/auth'
import { isApiError } from '@/shared/lib/api'
import { contractorKeys } from '../api/contractors.keys'
import { projectSelectionApi } from '../api/project-selection.api'
import { selectedProjectSiteId } from '../services/project-selection.service'
import type { ProjectBrief } from '../types/contractor.types'

/** Server preference, isolated by account; no browser persistence or metadata snapshots. */
export function useSelectedProject() {
  const user = useAuthStore((state) => state.user)
  const userId = user?.accountKind === 'Customer' ? user.id : undefined
  const query = useQuery({
    queryKey: contractorKeys.selection(userId),
    queryFn: ({ signal }) => projectSelectionApi.get(userId!, signal),
    enabled: Boolean(userId),
    staleTime: 0,
    retry: false
  })
  const siteId = query.data?.constructionSiteId
  return {
    userId,
    selectedProject: siteId ? { id: siteId, constructionSiteId: siteId } : undefined,
    isReady: !userId || query.isSuccess,
    isError: Boolean(userId && query.isError),
    refetch: query.refetch
  }
}

export function useSelectProject() {
  const userId = useAuthStore((state) => state.user?.id)
  const client = useQueryClient()
  const t = useTranslations('contractors.picker')
  return useMutation({
    // Queue writes for this account, including explicit URL synchronization.
    scope: { id: `project-selection:${userId}` },
    mutationFn: (brief: ProjectBrief) => {
      if (!userId) throw new Error('AuthenticationRequired')
      return projectSelectionApi.set(userId, selectedProjectSiteId(brief, userId))
    },
    onMutate: () => client.cancelQueries({ queryKey: contractorKeys.selection(userId) }),
    onSuccess: async (selection) => {
      if (useAuthStore.getState().user?.id !== userId) return
      // Cancel GETs started while PUT was pending before publishing the committed selection.
      await client.cancelQueries({ queryKey: contractorKeys.selection(userId) })
      if (useAuthStore.getState().user?.id !== userId) return
      client.setQueryData(contractorKeys.selection(userId), selection)
    },
    onError: (error) => toast.error(isApiError(error) ? error.message : t('saveSelectionError'))
  })
}
