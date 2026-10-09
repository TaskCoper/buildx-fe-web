'use client'
import { useQuery } from '@tanstack/react-query'
import { useLocale } from 'next-intl'
import { useHomeSections } from '@/shared/cms/home-content'
import { cmsSectionsQueryKey } from '@/shared/cms/cms-cache'
import { supervisionCopy, type SupervisionSection } from '@/shared/cms/supervision-content'
import { supervisionPageApi } from '../api/supervision-page.api'
export function useSupervisionSections() {
  const initial = useHomeSections()
  const locale = useLocale()
  const query = useQuery({
    queryKey: cmsSectionsQueryKey('supervision', locale),
    queryFn: () => supervisionPageApi.sections(locale),
    initialData: Object.keys(initial).length ? initial : undefined,
    staleTime: 60000,
    retry: false
  })
  return query.data ?? initial
}
export function useSupervisionCopy(section: SupervisionSection) {
  const sections = useSupervisionSections()
  return (key: string, fallback: string, values?: Record<string, string | number>) =>
    supervisionCopy(sections[section], key, fallback, values)
}
