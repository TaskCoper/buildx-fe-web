'use client'

import { Form, Input, InputNumber } from 'antd'
import { useTranslations } from 'next-intl'

import type { CmsCostGroup } from '@/shared/cms'
import { useAdminCollection } from '../../hooks/use-admin-data'
import { newAdminId } from '../../services/admin.service'
import { sameName } from '../../services/catalog.service'
import { ResourceManager } from '../common/resource-manager'

/**
 * NHÓM CHI PHÍ (spec admin #3, BR-026) — kết quả dự toán trình bày theo các
 * nhóm này, tổng dự toán bằng tổng các nhóm. Nhóm còn hạng mục thì không xóa.
 */
export function CostGroupManager() {
  const t = useTranslations('admin')
  const { data: groups = [] } = useAdminCollection('costGroups')
  const { data: items = [] } = useAdminCollection('costItems')
  const itemCount = (group: CmsCostGroup) => items.filter((item) => item.groupId === group.id).length

  return (
    <ResourceManager
      collection='costGroups'
      title={t('nav.costGroups')}
      description={t('costGroups.description')}
      searchText={(item) => item.name}
      createItem={(): CmsCostGroup => ({
        id: newAdminId('cg'),
        name: '',
        order: groups.reduce((max, group) => Math.max(max, group.order), 0) + 1
      })}
      fromFormValues={(values, current) => ({
        ...current,
        ...values,
        name: String(values.name ?? current.name).trim()
      })}
      validate={(next) =>
        groups.some((group) => group.id !== next.id && sameName(group.name, next.name))
          ? t('costGroups.duplicate')
          : null
      }
      deleteBlockedReason={(item) => (itemCount(item) ? t('costGroups.inUse', { count: itemCount(item) }) : null)}
      columns={[
        {
          title: t('costGroups.order'),
          dataIndex: 'order',
          width: 90,
          defaultSortOrder: 'ascend',
          sorter: (a, b) => a.order - b.order
        },
        { title: t('costGroups.name'), dataIndex: 'name' },
        { title: t('costGroups.items'), key: 'items', width: 140, render: (_, record) => itemCount(record) }
      ]}
      renderForm={() => (
        <>
          <Form.Item
            name='name'
            label={t('costGroups.name')}
            rules={[
              { required: true, whitespace: true, message: t('fields.requiredMessage') },
              { max: 100, message: t('fields.maxLength', { max: 100 }) }
            ]}
          >
            <Input maxLength={100} />
          </Form.Item>
          <Form.Item
            name='order'
            label={t('costGroups.order')}
            rules={[{ required: true, type: 'integer', min: 1, message: t('costGroups.orderRule') }]}
          >
            <InputNumber min={1} precision={0} style={{ width: 160 }} />
          </Form.Item>
        </>
      )}
    />
  )
}
