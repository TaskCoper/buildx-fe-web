'use client'

import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Form, Input, Popconfirm, Select, Space } from 'antd'
import { Fragment, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import {
  COMPARISON_MAX_GROUPS,
  COMPARISON_MAX_ROWS,
  COMPARISON_TIERS,
  newComparisonRow,
  readComparisonGroups,
  type ComparisonCellKind,
  type ComparisonGroup,
  type ComparisonRow
} from '@/shared/cms/plans-comparison-content'
import { plansCopyField } from '@/shared/cms/plans-sections'
import type { HomeSectionDef } from '../../services/home-sections.service'
import { FieldItem } from './page-content-manager'

/** Một trường form có cấu trúc: giữ chung cơ chế dirty, locale, version và khôi phục của cả trang. */
export function PlansComparisonEditor({
  section,
  columnLabels,
  buttonKeys,
  showStyle = true
}: {
  section: HomeSectionDef
  columnLabels?: Record<'basic' | 'advanced' | 'pro', string>
  buttonKeys?: Record<'basic' | 'advanced' | 'pro', string>
  showStyle?: boolean
}) {
  const t = useTranslations('admin.homeContent.plansTable')
  const field = (key: string, compact = true) => {
    const definition = section.fields.find((item) => item.name === plansCopyField(key))
    if (!definition) return null
    return (
      <FieldItem
        field={compact ? { ...definition, kind: 'textarea' } : definition}
        name={[section.key, definition.name]}
        sectionKey={section.textKey ?? section.key}
        compact={compact}
      />
    )
  }
  return (
    <div className='min-w-0'>
      {field('title', false)}
      <p className='text-muted-foreground mb-3 text-sm'>{t('dynamicHint')}</p>
      <Form.Item
        name={[section.key, 'groups']}
        rules={[
          {
            validator: (_, value: unknown) =>
              readComparisonGroups(value) ? Promise.resolve() : Promise.reject(new Error(t('invalidGroups')))
          }
        ]}
      >
        <ComparisonGroupsControl
          heading={field('criterion')}
          columnLabels={columnLabels}
          showStyle={showStyle}
          footer={
            <tr className='bg-muted/50' data-testid='plans-comparison-actions'>
              <th scope='row' className='border-r p-3 text-left font-normal align-top md:sticky md:left-0 md:z-10'>
                {field('choosePlanRow')}
              </th>
              {COMPARISON_TIERS.map((tier) => (
                <td key={tier} className='border-r p-3 align-top'>
                  {field(`buttons.${buttonKeys?.[tier] ?? tier}`)}
                </td>
              ))}
            </tr>
          }
        />
      </Form.Item>
    </div>
  )
}

function ComparisonGroupsControl({
  value = [],
  onChange,
  heading,
  footer,
  columnLabels,
  showStyle
}: {
  value?: ComparisonGroup[]
  onChange?: (value: ComparisonGroup[]) => void
  heading: ReactNode
  footer: ReactNode
  columnLabels?: Record<'basic' | 'advanced' | 'pro', string>
  showStyle: boolean
}) {
  const t = useTranslations('admin.homeContent.plansTable')
  const tc = useTranslations('admin.homeContent')
  const tp = useTranslations('plans')
  const tierLabel = (tier: 'basic' | 'advanced' | 'pro') => columnLabels?.[tier] ?? tp(`tiers.${tier}`)
  const rowCount = value.reduce((sum, group) => sum + group.rows.length, 0)
  const updateGroup = (index: number, change: Partial<ComparisonGroup>) =>
    onChange?.(value.map((group, position) => (position === index ? { ...group, ...change } : group)))
  const updateRow = (groupIndex: number, rowIndex: number, change: Partial<ComparisonRow>) => {
    const group = value[groupIndex]
    if (group)
      updateGroup(groupIndex, {
        rows: group.rows.map((row, position) => (position === rowIndex ? { ...row, ...change } : row))
      })
  }
  const moveGroup = (from: number, to: number) => {
    const next = [...value]
    const group = next.splice(from, 1)[0]
    if (group) {
      next.splice(to, 0, group)
      onChange?.(next)
    }
  }
  const moveRow = (groupIndex: number, from: number, to: number) => {
    const group = value[groupIndex]
    if (!group) return
    const rows = [...group.rows]
    const row = rows.splice(from, 1)[0]
    if (row) {
      rows.splice(to, 0, row)
      updateGroup(groupIndex, { rows })
    }
  }
  return (
    <div>
      <p className='text-muted-foreground mb-2 text-xs md:hidden'>{t('scrollHint')}</p>
      <div className='overflow-x-auto rounded-lg border' tabIndex={0} role='region' aria-label={t('label')}>
        <table className='w-full min-w-[900px] table-fixed border-collapse' data-testid='plans-comparison-editor'>
          <caption className='sr-only'>{t('label')}</caption>
          <colgroup>
            <col className='w-[34%]' />
            {COMPARISON_TIERS.map((tier) => (
              <col key={tier} className='w-[22%]' />
            ))}
          </colgroup>
          <thead>
            <tr className='bg-muted/50'>
              <th scope='col' className='border-r border-b p-3 text-left'>
                {heading}
              </th>
              {COMPARISON_TIERS.map((tier) => (
                <th key={tier} scope='col' className='text-primary-strong border-r border-b p-3 text-center'>
                  {tierLabel(tier)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {value.map((group, groupIndex) => (
              <Fragment key={group.id}>
                <tr
                  data-group-id={group.id}
                  className={group.style === 'accent' ? 'bg-brand-orange-soft' : 'bg-primary/10'}
                >
                  <th colSpan={4} className='border-b p-3 text-left'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <Input
                        aria-label={t('groupName')}
                        value={group.title}
                        maxLength={1000}
                        style={{ flex: '1 1 220px' }}
                        onChange={(event) => updateGroup(groupIndex, { title: event.target.value })}
                      />
                      {showStyle ? (
                        <Select
                          aria-label={t('groupStyle')}
                          value={group.style}
                          style={{ width: 130 }}
                          options={[
                            { value: 'standard', label: t('standard') },
                            { value: 'accent', label: t('accent') }
                          ]}
                          onChange={(style) => updateGroup(groupIndex, { style })}
                        />
                      ) : null}
                      <Space size={4}>
                        <Button
                          aria-label={t('groupUp')}
                          icon={<ArrowUpOutlined />}
                          disabled={groupIndex === 0}
                          onClick={() => moveGroup(groupIndex, groupIndex - 1)}
                        />
                        <Button
                          aria-label={t('groupDown')}
                          icon={<ArrowDownOutlined />}
                          disabled={groupIndex === value.length - 1}
                          onClick={() => moveGroup(groupIndex, groupIndex + 1)}
                        />
                        <Popconfirm
                          title={t('deleteGroupConfirm')}
                          okText={t('deleteGroup')}
                          cancelText={t('cancel')}
                          onConfirm={() => onChange?.(value.filter((_, position) => position !== groupIndex))}
                        >
                          <Button danger aria-label={t('deleteGroup')} icon={<DeleteOutlined />} />
                        </Popconfirm>
                      </Space>
                    </div>
                  </th>
                </tr>
                {group.rows.map((row, rowIndex) => (
                  <tr key={row.id} data-row-id={row.id} className='bg-card'>
                    <th
                      scope='row'
                      className='bg-card border-r border-b p-3 text-left font-normal align-top md:sticky md:left-0 md:z-10'
                    >
                      <Input.TextArea
                        aria-label={t('rowName')}
                        value={row.label}
                        maxLength={1000}
                        autoSize={{ minRows: 1, maxRows: 4 }}
                        onChange={(event) => updateRow(groupIndex, rowIndex, { label: event.target.value })}
                      />
                      <Space size={4} className='mt-2'>
                        <Button
                          size='small'
                          aria-label={tc('moveUp')}
                          icon={<ArrowUpOutlined />}
                          disabled={rowIndex === 0}
                          onClick={() => moveRow(groupIndex, rowIndex, rowIndex - 1)}
                        />
                        <Button
                          size='small'
                          aria-label={tc('moveDown')}
                          icon={<ArrowDownOutlined />}
                          disabled={rowIndex === group.rows.length - 1}
                          onClick={() => moveRow(groupIndex, rowIndex, rowIndex + 1)}
                        />
                        <Button
                          size='small'
                          danger
                          aria-label={t('deleteRow')}
                          icon={<DeleteOutlined />}
                          onClick={() =>
                            updateGroup(groupIndex, { rows: group.rows.filter((_, position) => position !== rowIndex) })
                          }
                        />
                      </Space>
                    </th>
                    {COMPARISON_TIERS.map((tier) => (
                      <td key={tier} className='border-r border-b p-3 align-top' data-tier={tier}>
                        <Select<ComparisonCellKind>
                          aria-label={t('cellKind', { tier: tierLabel(tier) })}
                          value={row[tier].kind}
                          style={{ width: '100%' }}
                          options={[
                            { value: 'yes', label: t('yes') },
                            { value: 'no', label: t('no') },
                            { value: 'text', label: t('text') }
                          ]}
                          onChange={(kind) => updateRow(groupIndex, rowIndex, { [tier]: { ...row[tier], kind } })}
                        />
                        {row[tier].kind === 'text' ? (
                          <Input.TextArea
                            className='mt-2'
                            aria-label={t('cellText', { tier: tierLabel(tier) })}
                            value={row[tier].text}
                            maxLength={1000}
                            autoSize={{ minRows: 1, maxRows: 6 }}
                            onChange={(event) =>
                              updateRow(groupIndex, rowIndex, { [tier]: { ...row[tier], text: event.target.value } })
                            }
                          />
                        ) : null}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <td colSpan={4} className='border-b p-3'>
                    <Button
                      size='small'
                      icon={<PlusOutlined />}
                      disabled={rowCount >= COMPARISON_MAX_ROWS}
                      onClick={() =>
                        updateGroup(groupIndex, { rows: [...group.rows, newComparisonRow(crypto.randomUUID())] })
                      }
                    >
                      {t('addRow')}
                    </Button>
                  </td>
                </tr>
              </Fragment>
            ))}
            {value.length === 0 ? (
              <tr>
                <td colSpan={4} className='text-muted-foreground p-6 text-center'>
                  {t('empty')}
                </td>
              </tr>
            ) : null}
          </tbody>
          <tfoot>{footer}</tfoot>
        </table>
      </div>
      <Button
        className='mt-3'
        icon={<PlusOutlined />}
        disabled={value.length >= COMPARISON_MAX_GROUPS}
        onClick={() =>
          onChange?.([
            ...value,
            { id: crypto.randomUUID(), title: t('newGroup', { index: value.length + 1 }), style: 'standard', rows: [] }
          ])
        }
      >
        {t('addGroup')}
      </Button>
    </div>
  )
}
