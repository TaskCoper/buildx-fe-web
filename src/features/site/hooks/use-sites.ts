'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { siteApi } from '../api/site.api'
import { siteKeys } from '../api/site.keys'
import type { SiteInput } from '../types/site.types'

/** Danh sách công trình của khách. */
export function useSites() {
  return useQuery({
    queryKey: siteKeys.sites(),
    queryFn: () => siteApi.listSites()
  })
}

/** Danh sách gói giám sát của khách (gồm chưa gán). */
export function useGrants() {
  return useQuery({
    queryKey: siteKeys.grants(),
    queryFn: () => siteApi.listGrants()
  })
}

export function useCreateSite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: SiteInput) => siteApi.createSite(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: siteKeys.sites() })
  })
}

export function useUpdateSite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: SiteInput & { expectedVersion: number } }) =>
      siteApi.updateSite(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: siteKeys.sites() })
  })
}

export function useDeleteSite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => siteApi.deleteSite(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: siteKeys.sites() })
  })
}

export function useAssignGrant() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ grantId, siteId, expectedVersion }: { grantId: string; siteId: string; expectedVersion: number }) =>
      siteApi.assignGrant(grantId, siteId, expectedVersion),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: siteKeys.grants() })
      void qc.invalidateQueries({ queryKey: siteKeys.sites() })
    }
  })
}
