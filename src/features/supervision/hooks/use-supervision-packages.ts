'use client'

import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { useCmsCollection } from '@/shared/cms'
import { supervisionKeys } from '../api/supervision.keys'
import { fetchPublishedSupervisionPlans } from '../api/supervision-plans.api'
import { mergeApiIntoPackages, type SupervisionPackageView } from '../api/supervision.merge'

/** Published API plans own the card list; CMS only supplies matching legacy presentation.
 * Valid cached data stays visible during a failed refresh; errors remain available to the page.
 */
export function useSupervisionPackageList(): {
  packages: SupervisionPackageView[]
  isPending: boolean
  isError: boolean
  error: Error | null
  retry: () => void
} {
  const base = useCmsCollection('supervisionPackages')
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: supervisionKeys.packages(),
    queryFn: fetchPublishedSupervisionPlans,
    staleTime: 60_000
  })

  const packages = useMemo(() => (data === undefined ? [] : mergeApiIntoPackages(base, data)), [base, data])
  return {
    packages,
    isPending,
    isError,
    error,
    retry: () => {
      void refetch()
    }
  }
}

export function useSupervisionPackages(): SupervisionPackageView[] {
  return useSupervisionPackageList().packages
}
