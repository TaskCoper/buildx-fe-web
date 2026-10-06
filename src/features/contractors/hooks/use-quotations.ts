'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEY_ROOTS } from '@/shared/constants/query-keys'
import { useAuthStore } from '@/shared/auth'
import { quotationApi, type SubmitQuotation } from '@/shared/quotations'
import { quotationRequestsApi } from '../api/quotation-requests.api'
import { contractorKeys } from '../api/contractors.keys'
import { useBrief } from './use-brief'

export function useQuotations(projectId: string, enabled = true, live = false) {
  const userId = useAuthStore((state) => state.user?.id)
  const brief = useBrief(projectId)
  const siteId = brief.data?.constructionSiteId
  const query = useQuery({
    queryKey: [...contractorKeys.invitations(), 'rfq', userId, projectId, siteId],
    queryFn: () => quotationRequestsApi.list(projectId, siteId),
    enabled: Boolean(userId && siteId && projectId !== 'preview' && enabled),
    retry: false,
    refetchInterval: live ? 15000 : false
  })
  return {
    ...query,
    isError: brief.isError || query.isError,
    error: brief.error ?? query.error,
    siteRequired: brief.isSuccess && !siteId,
    refetch: async () => {
      if (brief.isError) await brief.refetch()
      return query.refetch()
    }
  }
}
export function useQuotationDetail(id: string) {
  const userId = useAuthStore((state) => state.user?.id)
  return useQuery({
    queryKey: [...contractorKeys.invitations(), 'detail', userId, id],
    queryFn: () => quotationApi.detail(id),
    enabled: Boolean(userId && id),
    retry: false
  })
}
export function useSubmitQuotation(projectId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: SubmitQuotation) => quotationRequestsApi.submit(projectId, body),
    retry: false,
    onSettled: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: contractorKeys.invitations() }),
        client.invalidateQueries({ queryKey: contractorKeys.briefs() }),
        client.invalidateQueries({ queryKey: [QUERY_KEY_ROOTS.site, 'sites'] })
      ])
    }
  })
}
