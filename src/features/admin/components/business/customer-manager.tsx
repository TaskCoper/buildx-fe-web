'use client'

import { EyeOutlined } from '@ant-design/icons'
import { Avatar, Button, Segmented, Tag, Typography } from 'antd'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { Link } from '@/i18n/navigation'
import type { CmsCustomer } from '@/shared/cms'
import { adminCustomerRoute } from '@/shared/constants'
import { getInitials } from '@/shared/utils'
import { useAdminCollection } from '../../hooks/use-admin-data'
import { ResourceManager } from '../common/resource-manager'

const { Text } = Typography

type View = 'all' | CmsCustomer['status']

/**
 * DANH SÁCH TÀI KHOẢN KHÁCH HÀNG (epic UserAccountManagement §1).
 *
 * Danh sách chỉ hiện thông tin cơ bản — gói, quota, đơn hàng, giao dịch và thao
 * tác Ban / Mở ban nằm ở trang chi tiết. Không tạo, không xóa tài khoản.
 */
export function CustomerManager() {
  const t = useTranslations('admin')
  const [view, setView] = useState<View>('all')
  const { data: customers = [] } = useAdminCollection('customers')
  const count = (value: View) => customers.filter((item) => value === 'all' || item.status === value).length

  return (
    <ResourceManager
      collection='customers'
      title={t('nav.customers')}
      description={t('customers.description')}
      allowEdit={false}
      allowDelete={false}
      searchText={(item) => `${item.name} ${item.email} ${item.phone ?? ''}`}
      filterItems={(item) => view === 'all' || item.status === view}
      filterKey={view}
      banner={
        <Segmented<View>
          value={view}
          onChange={setView}
          options={(['all', 'active', 'suspended'] as const).map((value) => ({
            value,
            label: `${value === 'all' ? t('customers.allStatuses') : t(`customerStatus.${value}`)} (${count(value)})`
          }))}
        />
      }
      columns={[
        {
          title: t('customers.name'),
          dataIndex: 'name',
          render: (_, record) => (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <Avatar size={34} src={record.avatarUrl}>
                {getInitials(record.name)}
              </Avatar>
              <div style={{ minWidth: 0 }}>
                <Text strong style={{ display: 'block' }}>
                  {record.name}
                </Text>
                <Text type='secondary' style={{ fontSize: 12 }}>
                  {record.email}
                </Text>
              </div>
            </div>
          )
        },
        {
          title: t('customers.phone'),
          dataIndex: 'phone',
          width: 140,
          render: (phone: string | undefined) => phone || <Text type='secondary'>-</Text>
        },
        {
          title: t('customers.status'),
          dataIndex: 'status',
          width: 130,
          render: (status: CmsCustomer['status']) => (
            <Tag color={status === 'active' ? 'green' : 'red'}>{t(`customerStatus.${status}`)}</Tag>
          )
        },
        { title: t('customers.createdAt'), dataIndex: 'createdAt', width: 130 },
        {
          title: t('customers.action'),
          key: 'action',
          width: 140,
          render: (_, record) => (
            <Link href={adminCustomerRoute(record.id)}>
              <Button size='small' icon={<EyeOutlined />}>
                {t('actions.view')}
              </Button>
            </Link>
          )
        }
      ]}
      renderForm={() => null}
    />
  )
}
