'use client'

import { Col, Form, InputNumber, Row, Select, Space, Tag, Typography } from 'antd'
import type { FormInstance } from 'antd'
import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'

import type { Locale } from '@/i18n/routing'
import type { CmsMaterialPrice, CmsServiceRegion } from '@/shared/cms'
import { formatCurrency } from '@/shared/utils'
import { useAdminCollection } from '../../hooks/use-admin-data'
import { newAdminId } from '../../services/admin.service'
import { ResourceManager } from '../common/resource-manager'

const { Text } = Typography

const REGIONS: CmsServiceRegion[] = ['north', 'central', 'south']
const TIERS = ['basic', 'standard', 'vip'] as const

interface Filters {
  region?: CmsServiceRegion
  group?: string
}

/**
 * GIÁ VẬT TƯ THEO KHU VỰC (spec admin #3) — mỗi hạng mục con có một dòng giá cho
 * mỗi khu vực, ba mức theo gói hoàn thiện ở Bước 1 (Cơ bản · Tiêu chuẩn · VIP).
 * Không trùng cặp hạng mục con + khu vực.
 */
export function MaterialPriceManager() {
  const t = useTranslations('admin')
  const locale = useLocale() as Locale
  const [filters, setFilters] = useState<Filters>({})
  const { data: groups = [] } = useAdminCollection('costGroups')
  const { data: items = [] } = useAdminCollection('costItems')
  const { data: prices = [] } = useAdminCollection('materialPrices')
  const itemOf = (id: string) => items.find((item) => item.id === id)
  const subOf = (price: CmsMaterialPrice) => itemOf(price.itemId)?.subItems.find((sub) => sub.id === price.subItemId)

  const matches = (price: CmsMaterialPrice) =>
    (!filters.region || price.region === filters.region) &&
    (!filters.group || itemOf(price.itemId)?.groupId === filters.group)

  return (
    <ResourceManager
      collection='materialPrices'
      title={t('nav.materialPrices')}
      description={t('materialPrices.description')}
      drawerWidth={640}
      filterItems={matches}
      filterKey={JSON.stringify(filters)}
      searchText={(price) => `${itemOf(price.itemId)?.name ?? ''} ${subOf(price)?.name ?? ''}`}
      banner={
        <Space wrap size={8}>
          <Select
            allowClear
            placeholder={t('costItems.group')}
            value={filters.group}
            onChange={(group?: string) => setFilters((prev) => ({ ...prev, group }))}
            options={[...groups]
              .sort((a, b) => a.order - b.order)
              .map((group) => ({ value: group.id, label: group.name }))}
            style={{ minWidth: 180 }}
          />
          <Select
            allowClear
            placeholder={t('materialPrices.region')}
            value={filters.region}
            onChange={(region?: CmsServiceRegion) => setFilters((prev) => ({ ...prev, region }))}
            options={REGIONS.map((value) => ({ value, label: t(`contractors.regions.${value}`) }))}
            style={{ minWidth: 150 }}
          />
        </Space>
      }
      createItem={(): CmsMaterialPrice => ({
        id: newAdminId('mp'),
        itemId: '',
        subItemId: '',
        region: filters.region ?? 'south',
        basic: 0,
        standard: 0,
        vip: 0
      })}
      validate={(next) => {
        if (!itemOf(next.itemId)?.subItems.some((sub) => sub.id === next.subItemId))
          return t('materialPrices.subMismatch')
        if (
          prices.some(
            (price) => price.id !== next.id && price.subItemId === next.subItemId && price.region === next.region
          )
        ) {
          return t('materialPrices.duplicate')
        }
        if (!(next.basic <= next.standard && next.standard <= next.vip)) return t('materialPrices.tierOrder')
        return null
      }}
      columns={[
        {
          title: t('materialPrices.subItem'),
          key: 'sub',
          render: (_, record) => (
            <div>
              <Text strong style={{ display: 'block' }}>
                {subOf(record)?.name ?? '-'}
              </Text>
              <Text type='secondary' style={{ fontSize: 12 }}>
                {itemOf(record.itemId)?.name ?? '-'} · {subOf(record)?.unit ?? ''}
              </Text>
            </div>
          )
        },
        {
          title: t('materialPrices.region'),
          dataIndex: 'region',
          width: 120,
          render: (region: CmsServiceRegion) => <Tag>{t(`contractors.regions.${region}`)}</Tag>
        },
        ...TIERS.map((tier) => ({
          title: t(`packageTier.${tier}`),
          dataIndex: tier,
          width: 150,
          sorter: (a: CmsMaterialPrice, b: CmsMaterialPrice) => a[tier] - b[tier],
          render: (value: number) => formatCurrency(value, locale)
        }))
      ]}
      renderForm={(form) => <PriceFields form={form} />}
    />
  )
}

function PriceFields({ form }: { form: FormInstance }) {
  const t = useTranslations('admin')
  const { data: groups = [] } = useAdminCollection('costGroups')
  const { data: items = [] } = useAdminCollection('costItems')
  const itemId = Form.useWatch('itemId', form) as string | undefined
  const item = items.find((entry) => entry.id === itemId)
  const groupName = (id: string) => groups.find((group) => group.id === id)?.name ?? ''
  const money = (name: (typeof TIERS)[number]) => (
    <Form.Item
      name={name}
      label={t(`packageTier.${name}`)}
      rules={[{ required: true, type: 'number', min: 1, message: t('materialPrices.priceRule') }]}
    >
      <InputNumber<number>
        min={0}
        step={1000}
        style={{ width: '100%' }}
        formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
        parser={(value) => Number(`${value}`.replace(/\./g, ''))}
        suffix='₫'
      />
    </Form.Item>
  )

  return (
    <>
      <Form.Item
        name='itemId'
        label={t('materialPrices.item')}
        rules={[{ required: true, message: t('fields.requiredMessage') }]}
      >
        <Select
          showSearch={{ optionFilterProp: 'label' }}
          onChange={() => form.setFieldValue('subItemId', undefined)}
          options={items.map((entry) => ({ value: entry.id, label: `${groupName(entry.groupId)} · ${entry.name}` }))}
        />
      </Form.Item>
      <Row gutter={16}>
        <Col xs={24} md={16}>
          <Form.Item
            name='subItemId'
            label={t('materialPrices.subItem')}
            rules={[{ required: true, message: t('fields.requiredMessage') }]}
          >
            <Select
              disabled={!item}
              options={(item?.subItems ?? []).map((sub) => ({ value: sub.id, label: `${sub.name} (${sub.unit})` }))}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item
            name='region'
            label={t('materialPrices.region')}
            rules={[{ required: true, message: t('fields.requiredMessage') }]}
          >
            <Select options={REGIONS.map((value) => ({ value, label: t(`contractors.regions.${value}`) }))} />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        {TIERS.map((tier) => (
          <Col key={tier} xs={24} md={8}>
            {money(tier)}
          </Col>
        ))}
      </Row>
    </>
  )
}
