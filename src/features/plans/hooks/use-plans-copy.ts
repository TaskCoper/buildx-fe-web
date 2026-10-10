'use client'

import { useQuery } from '@tanstack/react-query'
import { useLocale } from 'next-intl'
import { useHomeSections } from '@/shared/cms/home-content'
import { sectionText } from '@/shared/cms/home-sections'
import { cmsSectionsQueryKey } from '@/shared/cms/cms-cache'
import { formatPlansCopy, plansCopyField, type PlansSectionKey } from '@/shared/cms/plans-sections'
import { plansPageApi } from '../api/plans-page.api'

export function usePlansSections() {
  const locale = useLocale()
  const initial = useHomeSections()
  const query = useQuery({
    queryKey: cmsSectionsQueryKey('plans', locale),
    queryFn: () => plansPageApi.sections(locale),
    initialData: Object.keys(initial).length > 0 ? initial : undefined,
    staleTime: 60_000,
    retry: false
  })
  return query.data ?? initial
}

export function usePlansCopy(section: PlansSectionKey) {
  const sections = usePlansSections()
  return (key: string, fallback: string, values?: Record<string, string | number>) =>
    formatPlansCopy(sectionText(sections, section, plansCopyField(key)) ?? fallback, values)
}
