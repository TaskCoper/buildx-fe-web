'use client'

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocale } from 'next-intl'
import { useAuthStore } from '@/shared/auth'
import { QUERY_KEY_ROOTS } from '@/shared/constants/query-keys'
import { constructionSitesApi } from '../api/construction-sites.api'
import { contractorKeys } from '../api/contractors.keys'
import type { CreateSiteRequest, UpdateSiteRequest } from '../types/construction-site.types'

export function useSiteOptions(siteId?: string) {
  const userId = useAuthStore((state) => state.user?.id)
  const locale = useLocale()
  return useQuery({
    queryKey: [...contractorKeys.all, 'site-options', userId, locale, siteId],
    queryFn: () => (siteId ? constructionSitesApi.catalog(siteId) : constructionSitesApi.options()),
    enabled: Boolean(userId),
    retry: false
  })
}
export function useSiteSources(enabled: boolean) {
  const userId = useAuthStore((state) => state.user?.id)
  return useInfiniteQuery({
    queryKey: [...contractorKeys.all, 'site-sources', userId],
    queryFn: ({ pageParam }) => constructionSitesApi.sources(pageParam),
    initialPageParam: 1,
    getNextPageParam: (page) => (page.hasNextPage ? page.pageIndex + 1 : undefined),
    enabled: enabled && Boolean(userId),
    retry: false
  })
}
export function useSiteSource(id: string, enabled: boolean) {
  const userId = useAuthStore((state) => state.user?.id)
  return useQuery({
    queryKey: [...contractorKeys.all, 'site-source', userId, id],
    queryFn: () => constructionSitesApi.source(id),
    enabled: enabled && Boolean(id),
    retry: false
  })
}
export function useSiteLocations(provinceCode: string, datasetVersion: string, enabled: boolean) {
  const provinces = useQuery({
    queryKey: [...contractorKeys.all, 'site-provinces'],
    queryFn: constructionSitesApi.provinces,
    enabled,
    retry: false
  })
  const wards = useQuery({
    queryKey: [...contractorKeys.all, 'site-wards', provinceCode, datasetVersion],
    queryFn: () => constructionSitesApi.wards(provinceCode, datasetVersion),
    enabled: enabled && Boolean(provinceCode && datasetVersion),
    retry: false
  })
  return { provinces, wards }
}
export function useWriteConstructionSite() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (
      input: { kind: 'create'; request: CreateSiteRequest } | { kind: 'update'; id: string; request: UpdateSiteRequest }
    ) =>
      input.kind === 'create'
        ? constructionSitesApi.create(input.request)
        : constructionSitesApi.update(input.id, input.request),
    retry: false,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: [QUERY_KEY_ROOTS.site, 'sites'] })
      void client.invalidateQueries({ queryKey: contractorKeys.briefList() })
      void client.invalidateQueries({ queryKey: contractorKeys.briefSummaries() })
      void client.invalidateQueries({ queryKey: [...contractorKeys.all, 'site-sources'] })
    }
  })
}
