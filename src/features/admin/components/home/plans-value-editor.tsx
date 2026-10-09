'use client'

import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Form, Input, Popconfirm, Space } from 'antd'
import { useTranslations } from 'next-intl'
import { COMPARISON_TIERS } from '@/shared/cms/plans-comparison-content'
import { VALUE_MAX_ROWS, newValueItem, readValueItems } from '@/shared/cms/plans-value-content'
import { plansCopyField } from '@/shared/cms/plans-sections'
import type { HomeSectionDef } from '../../services/home-sections.service'
import { FieldItem } from './page-content-manager'
import { ValueIconPicker } from './value-icon-picker'

export function PlansValueEditor({
  section,
  columnLabels,
  tableLabel
}: {
  section: HomeSectionDef
  columnLabels?: Record<'basic' | 'advanced' | 'pro', string>
  tableLabel?: string
}) {
  const t = useTranslations('admin.homeContent.valueTable')
  const tc = useTranslations('admin.homeContent')
  const tt = useTranslations('admin.homeContent.plansTable')
  const tp = useTranslations('plans')
  const tierLabel = (tier: 'basic' | 'advanced' | 'pro') => columnLabels?.[tier] ?? tp(`tiers.${tier}`)
  const title = section.fields.find((item) => item.name === plansCopyField('title'))
  return (
    <div className='min-w-0'>
      {title ? (
        <FieldItem field={title} name={[section.key, title.name]} sectionKey={section.textKey ?? section.key} />
      ) : null}
      <p className='text-muted-foreground mb-3 text-sm'>{t('hint')}</p>
      <p className='text-muted-foreground mb-2 text-xs md:hidden'>{tt('scrollHint')}</p>
      <Form.List
        name={[section.key, 'items']}
        rules={[
          {
            validator: (_, value: unknown) =>
              readValueItems(value) !== undefined ? Promise.resolve() : Promise.reject(new Error(t('invalidItems')))
          }
        ]}
      >
        {(fields, { add, remove, move }, { errors }) => (
          <>
            <div
              className='overflow-x-auto rounded-lg border'
              tabIndex={0}
              role='region'
              aria-label={tableLabel ?? tp('value.title')}
            >
              <table className='w-full min-w-[900px] table-fixed border-collapse' data-testid='plans-value-editor'>
                <caption className='sr-only'>{tableLabel ?? tp('value.title')}</caption>
                <colgroup>
                  <col className='w-[28%]' />
                  {COMPARISON_TIERS.map((tier) => (
                    <col key={tier} className='w-[24%]' />
                  ))}
                </colgroup>
                <thead>
                  <tr className='bg-muted/50'>
                    <th scope='col' className='border-r border-b p-3 text-left'>
                      {tt('itemColumn')}
                    </th>
                    {COMPARISON_TIERS.map((tier) => (
                      <th key={tier} scope='col' className='text-primary-strong border-r border-b p-3 text-center'>
                        {tierLabel(tier)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fields.map((row, index) => (
                    <tr key={row.key} data-value-row={index}>
                      <th
                        scope='row'
                        className='bg-accent border-r border-b p-3 text-left font-normal align-top md:sticky md:left-0 md:z-10'
                      >
                        <Form.Item name={[row.name, 'label']} className='!mb-2'>
                          <Input.TextArea
                            aria-label={t('rowName', { index: index + 1 })}
                            maxLength={1000}
                            autoSize={{ minRows: 1, maxRows: 4 }}
                          />
                        </Form.Item>
                        <Form.Item name={[row.name, 'icon']} className='!mb-2'>
                          <ValueIconPicker label={t('icon', { index: index + 1 })} />
                        </Form.Item>
                        <Space size={4}>
                          <Button
                            size='small'
                            aria-label={tc('moveUp')}
                            icon={<ArrowUpOutlined />}
                            disabled={index === 0}
                            onClick={() => move(index, index - 1)}
                          />
                          <Button
                            size='small'
                            aria-label={tc('moveDown')}
                            icon={<ArrowDownOutlined />}
                            disabled={index === fields.length - 1}
                            onClick={() => move(index, index + 1)}
                          />
                          <Popconfirm
                            title={t('deleteConfirm')}
                            okText={tt('deleteRow')}
                            cancelText={tt('cancel')}
                            onConfirm={() => remove(row.name)}
                          >
                            <Button size='small' danger aria-label={tt('deleteRow')} icon={<DeleteOutlined />} />
                          </Popconfirm>
                        </Space>
                      </th>
                      {COMPARISON_TIERS.map((tier) => (
                        <td key={tier} className='bg-card border-r border-b p-3 align-top' data-tier={tier}>
                          <Form.Item name={[row.name, tier]} className='!mb-0'>
                            <Input.TextArea
                              aria-label={t('cell', { index: index + 1, tier: tierLabel(tier) })}
                              maxLength={1000}
                              autoSize={{ minRows: 2, maxRows: 8 }}
                            />
                          </Form.Item>
                        </td>
                      ))}
                    </tr>
                  ))}
                  {fields.length === 0 ? (
                    <tr>
                      <td colSpan={4} className='text-muted-foreground p-6 text-center'>
                        {t('empty')}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            <Form.ErrorList errors={errors} />
            <Button
              className='mt-3'
              icon={<PlusOutlined />}
              disabled={fields.length >= VALUE_MAX_ROWS}
              onClick={() => add(newValueItem())}
            >
              {tt('addRow')}
            </Button>
          </>
        )}
      </Form.List>
    </div>
  )
}
