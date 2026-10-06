'use client'

import { useTranslations } from 'next-intl'
import { useMemo } from 'react'
import { env } from '@/shared/config/env'
import { constructionScopeLabel, LEGACY_CONSTRUCTION_SCOPES } from '../services/construction-scope.service'
import { useContractorFilterOptions } from './use-contractors'

/** Cùng danh mục ConstructionScope của hồ sơ năng lực và dự án nhà thầu. */
export function useConstructionScopes() {
  const query = useContractorFilterOptions()
  const legacy = useTranslations('contractors.scope')
  const t = useTranslations('contractors.siteForm')
  const mock = env.NEXT_PUBLIC_USE_MOCK_API
  const options = useMemo(
    () => (mock ? LEGACY_CONSTRUCTION_SCOPES.map((id) => ({ id, name: legacy(id) })) : (query.data?.scopes ?? [])),
    [mock, query.data?.scopes, legacy]
  )
  return {
    options,
    isPending: !mock && query.isPending,
    isError: !mock && query.isError,
    refetch: query.refetch,
    label: (id: string, savedName?: string) => constructionScopeLabel(id, savedName, options, legacy, t('savedScope'))
  }
}
