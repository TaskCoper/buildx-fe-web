'use client'
import { useTranslations } from 'next-intl'
import { supervisionPageAdminApi } from '../../api/bmt/supervision-page.api'
import { SUPERVISION_CONTENT_SECTIONS } from '../../services/supervision-sections.service'
import { PageContentManager, FieldItem, type ContentLocale } from './page-content-manager'
import { PlansComparisonEditor } from './plans-comparison-editor'
import { PlansValueEditor } from './plans-value-editor'
import { SupervisionItemsEditor } from './supervision-items-editor'
import { ValueIconPicker } from './value-icon-picker'
import { Form } from 'antd'
const loadDefaults = async (locale: ContentLocale) => {
  const [messages, packages] = await Promise.all([
    import(`../../../../../messages/${locale}.json`),
    supervisionPageAdminApi.defaultsPackages()
  ])
  return { ...messages.default, supervisionDefaults: packages, supervisionLocale: locale }
}
export function SupervisionContentManager({ embedded = false }: { embedded?: boolean }) {
  const t = useTranslations('admin')
  const tiers = useTranslations('supervision.tiers')
  const columnLabels = { basic: tiers('self'), advanced: tiers('check'), pro: tiers('control') }
  return (
    <PageContentManager
      pageKey='supervision'
      embedded={embedded}
      sections={SUPERVISION_CONTENT_SECTIONS}
      api={supervisionPageAdminApi}
      title={t('nav.supervisionContent')}
      description={t('homeContent.supervisionDescription')}
      loadDefaults={loadDefaults}
      renderSectionFields={(section) => {
        if (section.key === 'comparison')
          return (
            <PlansComparisonEditor
              section={section}
              columnLabels={columnLabels}
              buttonKeys={{ basic: 'self', advanced: 'check', pro: 'control' }}
              showStyle={false}
            />
          )
        if (section.key === 'value')
          return (
            <PlansValueEditor
              section={section}
              columnLabels={columnLabels}
              tableLabel={t('homeContent.sections.supervision_value.title')}
            />
          )
        if (['addons', 'scope', 'journey'].includes(section.key)) return <SupervisionItemsEditor section={section} />
        if (section.key === 'notes')
          return (
            <div className='grid gap-4 md:grid-cols-3'>
              {['payment', 'scope', 'area'].map((key) => {
                const field = section.fields.find((f) => f.name === key)!
                return (
                  <div key={key}>
                    <FieldItem
                      field={{ ...field, kind: 'textarea' }}
                      name={['notes', key]}
                      sectionKey={section.textKey!}
                    />
                    <Form.Item name={['notes', key + 'Icon']}>
                      <ValueIconPicker
                        label={t(
                          ('homeContent.sections.supervision_notes.fields.' + key + 'Icon') as Parameters<typeof t>[0]
                        )}
                      />
                    </Form.Item>
                  </div>
                )
              })}
            </div>
          )
        return undefined
      }}
    />
  )
}
