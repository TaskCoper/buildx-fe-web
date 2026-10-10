'use client'

import { EyeOutlined } from '@ant-design/icons'
import { Avatar, Button, Tag, Typography } from 'antd'
import dayjs from 'dayjs'
import { useTranslations } from 'next-intl'

import { Link } from '@/i18n/navigation'
import { adminCustomerRoute } from '@/shared/constants'
import { getInitials } from '@/shared/utils'
import { adminKeys } from '../../api/admin.keys'
import { bmtCustomersApi, type BmtCustomerInfo } from '../../api/bmt/customers.api'
import { customerDisplayName, customerStatusView } from '../../api/bmt/customers.logic'
import { ApiResourceManager } from '../common/api-resource-manager'

const { Text } = Typography

/**
 * DANH SÁCH TÀI KHOẢN KHÁCH HÀNG (epic UserAccountManagement §1), đọc từ `GET /customers`.
 *
 * Tìm kiếm (tên, email, SĐT) và phân trang chạy phía server. Mọi cột đều lấy từ API; không có bộ lọc trạng thái vì
 * backend chưa có tham số này. Gói, đơn hàng, giao dịch nằm ở trang chi tiết. Không tạo, không xóa tài khoản.
 */
export function CustomerManager() {
  const t = useTranslations('admin')

  return (
    <ApiResourceManager<BmtCustomerInfo>
      title={t('nav.customers')}
      description={t('customers.description')}
      queryKey={adminKeys.bmt('customers', 'list')}
      fetchPage={({ pageIndex, pageSize, keyword }) => bmtCustomersApi.list({ pageIndex, pageSize, search: keyword })}
      rowKey={(item) => item.id}
      searchable
      searchPlaceholder={t('customers.searchPlaceholder')}
      pageSize={20}
      columns={[
        {
          title: t('customers.name'),
          key: 'name',
          render: (_, record) => {
            const name = customerDisplayName(record)
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <Avatar size={34} src={record.avatar || undefined}>
                  {getInitials(name)}
                </Avatar>
                <div style={{ minWidth: 0 }}>
                  <Text strong style={{ display: 'block' }}>
                    {name}
                  </Text>
                  {/* Khách chưa có tên đã dùng email làm tên: không in lại lần nữa. */}
                  {name === record.email ? null : (
                    <Text type='secondary' style={{ fontSize: 12 }}>
                      {record.email}
                    </Text>
                  )}
                </div>
              </div>
            )
          }
        },
        {
          title: t('customers.phone'),
          dataIndex: 'phoneNumber',
          width: 140,
          render: (phone: string | null | undefined) => phone || <Text type='secondary'>-</Text>
        },
        {
          title: t('customers.status'),
          dataIndex: 'status',
          width: 130,
          render: (status: BmtCustomerInfo['status']) => {
            const view = customerStatusView(status)
            return <Tag color={view === 'active' ? 'green' : 'red'}>{t(`customerStatus.${view}`)}</Tag>
          }
        },
        {
          title: t('customers.createdAt'),
          dataIndex: 'createdAtUtc',
          width: 130,
          render: (value: string) => dayjs(value).format('DD/MM/YYYY')
        },
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
    />
  )
}
