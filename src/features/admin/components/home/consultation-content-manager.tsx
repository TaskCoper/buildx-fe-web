'use client'

import { Skeleton, Tabs } from 'antd'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Suspense } from 'react'
import { AdminPage } from '../common/admin-page'
import { PlansContentManager } from './plans-content-manager'
import { SupervisionContentManager } from './supervision-content-manager'

export function ConsultationContentManager() {
  return (
    <Suspense fallback={<Skeleton active />}>
      <ConsultationContentTabs />
    </Suspense>
  )
}

function ConsultationContentTabs() {
  const t = useTranslations('admin')
  const params = useSearchParams()
  const tab = params.get('tab') === 'supervision' ? 'supervision' : 'design'

  const changeTab = (key: string) => {
    const url = new URL(window.location.href)
    url.searchParams.set('tab', key)
    window.history.replaceState(null, '', url)
  }

  return (
    <AdminPage title={t('nav.plansContent')}>
      <Tabs
        activeKey={tab}
        onChange={changeTab}
        items={[
          { key: 'design', label: t('homeContent.packageTabs.design'), children: <PlansContentManager embedded /> },
          {
            key: 'supervision',
            label: t('homeContent.packageTabs.supervision'),
            children: <SupervisionContentManager embedded />
          }
        ]}
      />
    </AdminPage>
  )
}
