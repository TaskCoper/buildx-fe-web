'use client'

import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Col, Form, Input, InputNumber, Row, Select, Space, Table, Tag, Tooltip, Typography } from 'antd'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import type { CmsCostItem } from '@/shared/cms'
import { useAdminCollection } from '../../hooks/use-admin-data'
import { newAdminId } from '../../services/admin.service'
import { sameName } from '../../services/catalog.service'
import { ResourceManager } from '../common/resource-manager'

const { Text } = Typography

/**
 * HẠNG MỤC & HẠNG MỤC CON (spec admin #3). Mỗi hạng mục thuộc một nhóm chi phí
 * và gồm các hạng mục con có đơn vị tính; khối lượng do hệ thống ước tính theo
 * dự án, giá lấy ở màn Giá vật tư theo khu vực. Hạng mục con đã có giá thì phải
 * xóa giá trước mới gỡ được.
 */
export function CostItemManager() {
  const t = useTranslations('admin')
  const [groupFilter, setGroupFilter] = useState<string>()
  const { data: groups = [] } = useAdminCollection('costGroups')
  const { data: items = [] } = useAdminCollection('costItems')
  const { data: prices = [] } = useAdminCollection('materialPrices')
  const groupName = (id: string) => groups.find((group) => group.id === id)?.name ?? id
  const pricedSubs = new Set(prices.map((price) => price.subItemId))

  return (
    <ResourceManager
      collection='costItems'
      title={t('nav.costItems')}
      description={t('costItems.description')}
      drawerWidth={720}
      searchText={(item) => `${item.name} ${item.subItems.map((sub) => sub.name).join(' ')}`}
      filterItems={(item) => !groupFilter || item.groupId === groupFilter}
      filterKey={groupFilter}
      banner={
        <Select
          allowClear
          placeholder={t('costItems.group')}
          value={groupFilter}
          onChange={setGroupFilter}
          options={[...groups]
            .sort((a, b) => a.order - b.order)
            .map((group) => ({ value: group.id, label: group.name }))}
          style={{ minWidth: 200 }}
        />
      }
      createItem={(): CmsCostItem => ({
        id: newAdminId('ci'),
        groupId: groupFilter ?? groups[0]?.id ?? '',
        name: '',
        order: items.length + 1,
        subItems: [{ id: newAdminId('cs'), name: '', unit: '' }]
      })}
      fromFormValues={(values, current): CmsCostItem => {
        const next = { ...current, ...values } as CmsCostItem
        return {
          ...next,
          name: next.name.trim(),
          subItems: next.subItems.map((sub) => ({
            id: sub.id || newAdminId('cs'),
            name: sub.name.trim(),
            unit: sub.unit.trim()
          }))
        }
      }}
      validate={(next, current) => {
        if (
          items.some((item) => item.id !== next.id && item.groupId === next.groupId && sameName(item.name, next.name))
        ) {
          return t('costItems.duplicate')
        }
        const names = next.subItems.map((sub) => sub.name.toLocaleLowerCase('vi'))
        if (new Set(names).size !== names.length) return t('costItems.duplicateSub')
        const removed = current.subItems.filter((sub) => !next.subItems.some((item) => item.id === sub.id))
        if (removed.some((sub) => pricedSubs.has(sub.id))) return t('costItems.subHasPrice')
        return null
      }}
      deleteBlockedReason={(item) =>
        item.subItems.some((sub) => pricedSubs.has(sub.id)) ? t('costItems.hasPrices') : null
      }
      renderView={(item) => (
        <Table
          rowKey='id'
          size='small'
          pagination={false}
          dataSource={item.subItems}
          columns={[
            { title: t('costItems.subName'), dataIndex: 'name' },
            { title: t('costItems.unit'), dataIndex: 'unit', width: 100 }
          ]}
        />
      )}
      columns={[
        {
          title: t('costItems.group'),
          dataIndex: 'groupId',
          width: 170,
          render: (groupId: string) => <Tag color='green'>{groupName(groupId)}</Tag>
        },
        { title: t('costItems.order'), dataIndex: 'order', width: 80, sorter: (a, b) => a.order - b.order },
        {
          title: t('costItems.name'),
          dataIndex: 'name',
          render: (_, record) => (
            <div>
              <Text strong style={{ display: 'block' }}>
                {record.name}
              </Text>
              <Text
                type='secondary'
                style={{ fontSize: 12 }}
                ellipsis={{ tooltip: record.subItems.map((sub) => sub.name).join(', ') }}
              >
                {t('costItems.subCount', { count: record.subItems.length })}
              </Text>
            </div>
          )
        }
      ]}
      renderForm={(form) => (
        <>
          <Row gutter={16}>
            <Col xs={24} md={10}>
              <Form.Item
                name='groupId'
                label={t('costItems.group')}
                rules={[{ required: true, message: t('fields.requiredMessage') }]}
              >
                <Select
                  options={[...groups]
                    .sort((a, b) => a.order - b.order)
                    .map((group) => ({ value: group.id, label: group.name }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={10}>
              <Form.Item
                name='name'
                label={t('costItems.name')}
                rules={[
                  { required: true, whitespace: true, message: t('fields.requiredMessage') },
                  { max: 150, message: t('fields.maxLength', { max: 150 }) }
                ]}
              >
                <Input maxLength={150} />
              </Form.Item>
            </Col>
            <Col xs={24} md={4}>
              <Form.Item
                name='order'
                label={t('costItems.order')}
                rules={[{ required: true, type: 'integer', min: 1, message: t('costGroups.orderRule') }]}
              >
                <InputNumber min={1} precision={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>
            {t('costItems.subItems')}
          </Text>
          <Form.List
            name='subItems'
            rules={[
              {
                validator: async (_, value?: unknown[]) => {
                  if (!value?.length) throw new Error(t('costItems.subRequired'))
                }
              }
            ]}
          >
            {(fields, { add, remove }, { errors }) => (
              <Space orientation='vertical' size={8} style={{ width: '100%' }}>
                {fields.map((field) => {
                  const subId = form.getFieldValue(['subItems', field.name, 'id']) as string | undefined
                  const priced = subId ? pricedSubs.has(subId) : false
                  return (
                    <div key={field.key} className='flex items-start gap-2'>
                      <Form.Item
                        name={[field.name, 'name']}
                        style={{ flex: 1, marginBottom: 0 }}
                        rules={[{ required: true, whitespace: true, message: t('fields.requiredMessage') }]}
                      >
                        <Input placeholder={t('costItems.subName')} maxLength={200} />
                      </Form.Item>
                      <Form.Item
                        name={[field.name, 'unit']}
                        style={{ width: 120, marginBottom: 0 }}
                        rules={[{ required: true, whitespace: true, message: t('fields.requiredMessage') }]}
                      >
                        <Input placeholder={t('costItems.unit')} maxLength={20} />
                      </Form.Item>
                      <Tooltip title={priced ? t('costItems.subHasPrice') : t('actions.removeRow')}>
                        <Button
                          type='text'
                          danger
                          disabled={priced}
                          icon={<DeleteOutlined />}
                          aria-label={t('actions.removeRow')}
                          onClick={() => remove(field.name)}
                        />
                      </Tooltip>
                    </div>
                  )
                })}
                <Form.ErrorList errors={errors} />
                <Button
                  type='dashed'
                  block
                  icon={<PlusOutlined />}
                  onClick={() => add({ id: newAdminId('cs'), name: '', unit: '' })}
                >
                  {t('costItems.addSub')}
                </Button>
              </Space>
            )}
          </Form.List>
        </>
      )}
    />
  )
}
