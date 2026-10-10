'use client'

import { useTranslations } from 'next-intl'
import { plansPageAdminApi } from '../../api/bmt/plans-page.api'
import { PLANS_SECTIONS } from '../../services/plans-sections.service'
import { PageContentManager, type ContentLocale } from './page-content-manager'
import { PlansComparisonEditor } from './plans-comparison-editor'
import { PlansValueEditor } from './plans-value-editor'

const loadDefaults = async (locale: ContentLocale) => {
  const [module, plans] = await Promise.all([
    import(`../../../../../messages/${locale}.json`),
    plansPageAdminApi.comparisonDefaultsPlans()
  ])
  return { ...module.default, plansComparisonDefaults: plans, plansComparisonLocale: locale }
}

export function PlansContentManager({ embedded = false }: { embedded?: boolean }) {
  const t = useTranslations('admin')
  return (
    <PageContentManager
      pageKey='plans'
      embedded={embedded}
      sections={PLANS_SECTIONS}
      api={plansPageAdminApi}
      title={t('nav.plansContent')}
      description={t('homeContent.plansDescription')}
      loadDefaults={loadDefaults}
      renderSectionFields={(section) => {
        if (section.key === 'comparison') return <PlansComparisonEditor section={section} />
        if (section.key === 'value') return <PlansValueEditor section={section} />
        return undefined
      }}
    />
  )
}
