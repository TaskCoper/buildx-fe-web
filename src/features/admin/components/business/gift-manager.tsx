'use client'

import { SwapOutlined } from '@ant-design/icons'
import { App, Descriptions, Form, Input, InputNumber, Select, Tag, Typography } from 'antd'
import { useLocale, useTranslations } from 'next-intl'

import type { Locale } from '@/i18n/routing'
import type { CmsGift } from '@/shared/cms'
import { formatCurrency } from '@/shared/utils'
import { useAdminCollection, useSaveAdminItem } from '../../hooks/use-admin-data'
import { newAdminId } from '../../services/admin.service'
import { ImageUrlField } from '../common/field-kit'
import { ResourceManager } from '../common/resource-manager'
import type { RowAction } from '../common/row-actions-menu'

const { Text } = Typography

/**
 * DANH MỤC QUÀ TẶNG (epic GiftManagement).
 *
 * Gói chỉ chọn được quà Đang hoạt động. Quà được snapshot vào đơn khi tạo đơn,
 * nên sửa / ẩn quà sau đó không đổi quà đã cam kết. Chỉ xóa được quà chưa gắn
 * với gói nào và chưa từng xuất hiện trong đơn — còn lại chỉ chuyển sang Ẩn.
 */
export function GiftManager() {
  const t = useTranslations('admin')
  const locale = useLocale() as Locale
  const { message, modal } = App.useApp()
  const { data: plans = [] } = useAdminCollection('plans')
  const { data: orders = [] } = useAdminCollection('orders')
  const save = useSaveAdminItem('gifts')

  const plansUsing = (gift: CmsGift) => plans.filter((plan) => plan.giftId === gift.id)
  const inOrders = (gift: CmsGift) => orders.some((order) => order.product.gift?.title === gift.title)
  const statusLabel = (status: CmsGift['status']) => t(`giftStatus.${status}`)

  return (
    <ResourceManager
      collection='gifts'
      title={t('nav.gifts')}
      description={t('gifts.description')}
      drawerWidth={560}
      searchText={(item) => item.title}
      createItem={(): CmsGift => ({
        id: newAdminId('gift'),
        title: '',
        description: '',
        value: 0,
        imageUrl: '',
        extraOffer: '',
        status: 'active'
      })}
      fromFormValues={(values, current) => ({
        ...current,
        ...values,
        title: String(values.title ?? '').trim(),
        description: String(values.description ?? '').trim() || undefined,
        extraOffer: String(values.extraOffer ?? '').trim() || undefined
      })}
      deleteBlockedReason={(item) =>
        plansUsing(item).length > 0
          ? t('gifts.deleteBlockedPlan')
          : inOrders(item)
            ? t('gifts.deleteBlockedOrder')
            : null
      }
      deleteConfirm={(item) => t('gifts.deleteConfirm', { title: item.title, count: plansUsing(item).length })}
      rowActions={(item): RowAction[] => {
        const next: CmsGift['status'] = item.status === 'active' ? 'hidden' : 'active'
        const using = plansUsing(item)
        const warning =
          next === 'hidden' && using.length > 0
            ? t('gifts.hideWarning', { plans: using.map((plan) => plan.name).join(', ') })
            : null
        return [
          {
            key: 'status',
            label: t('actions.switchStatus'),
            icon: <SwapOutlined />,
            onClick: () =>
              modal.confirm({
                title: t('actions.switchStatusTitle', { name: item.title }),
                content: (
                  <div>
                    <div>
                      {t('actions.switchStatusBody', { current: statusLabel(item.status), next: statusLabel(next) })}
                    </div>
                    {warning ? (
                      <Text type='warning' style={{ display: 'block', marginTop: 8 }}>
                        {warning}
                      </Text>
                    ) : null}
                  </div>
                ),
                okText: t('actions.confirm'),
                cancelText: t('actions.cancel'),
                onOk: async () => {
                  await save.mutateAsync({ ...item, status: next })
                  message.success(t('feedback.saved'))
                }
              })
          }
        ]
      }}
      renderView={(item) => (
        <Descriptions
          size='small'
          column={1}
          bordered
          items={[
            {
              key: 'image',
              label: t('gifts.image'),
              children: item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.imageUrl} alt='' width={160} style={{ borderRadius: 8 }} />
              ) : (
                '-'
              )
            },
            { key: 'title', label: t('gifts.title'), children: item.title },
            { key: 'description', label: t('gifts.descriptionField'), children: item.description || '-' },
            { key: 'value', label: t('gifts.value'), children: formatCurrency(item.value, locale) },
            { key: 'extra', label: t('gifts.extraOffer'), children: item.extraOffer || '-' },
            { key: 'status', label: t('gifts.status'), children: statusLabel(item.status) },
            {
              key: 'plans',
              label: t('gifts.usedByPlans'),
              children:
                plansUsing(item)
                  .map((plan) => plan.name)
                  .join(', ') || '-'
            }
          ]}
        />
      )}
      columns={[
        {
          title: t('gifts.title'),
          dataIndex: 'title',
          render: (_, record) => (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, maxWidth: 420 }}>
              {record.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={record.imageUrl}
                  alt=''
                  width={44}
                  height={44}
                  style={{ objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
                />
              ) : null}
              <div style={{ minWidth: 0 }}>
                <Text strong style={{ display: 'block' }}>
                  {record.title}
                </Text>
                {record.description ? (
                  <Text type='secondary' style={{ fontSize: 12 }} ellipsis={{ tooltip: record.description }}>
                    {record.description}
                  </Text>
                ) : null}
              </div>
            </div>
          )
        },
        {
          title: t('gifts.value'),
          dataIndex: 'value',
          width: 160,
          render: (value: number) => formatCurrency(value, locale)
        },
        {
          title: t('gifts.extraOffer'),
          dataIndex: 'extraOffer',
          width: 260,
          render: (value?: string) =>
            value ? (
              <Text ellipsis={{ tooltip: value }} style={{ maxWidth: 240 }}>
                {value}
              </Text>
            ) : (
              '-'
            )
        },
        {
          title: t('gifts.status'),
          dataIndex: 'status',
          width: 150,
          render: (status: CmsGift['status']) => (
            <Tag color={status === 'active' ? 'green' : 'default'}>{statusLabel(status)}</Tag>
          )
        },
        {
          title: t('gifts.usedByPlans'),
          key: 'plans',
          width: 140,
          render: (_, record) => plansUsing(record).length
        }
      ]}
      renderForm={() => (
        <>
          <Form.Item
            name='title'
            label={t('gifts.title')}
            rules={[
              { required: true, whitespace: true, message: t('fields.requiredMessage') },
              { max: 150, message: t('fields.maxLength', { max: 150 }) }
            ]}
          >
            <Input maxLength={150} />
          </Form.Item>
          <Form.Item
            name='description'
            label={t('gifts.descriptionField')}
            rules={[{ max: 500, message: t('fields.maxLength', { max: 500 }) }]}
          >
            <Input.TextArea rows={3} maxLength={500} showCount />
          </Form.Item>
          <Form.Item
            name='value'
            label={t('gifts.value')}
            rules={[{ required: true, type: 'integer', min: 1, message: t('gifts.valueRule') }]}
          >
            <InputNumber min={1} precision={0} step={1_000_000} suffix='₫' style={{ width: '100%' }} />
          </Form.Item>
          <ImageUrlField name='imageUrl' label={t('gifts.image')} required />
          <Form.Item
            name='extraOffer'
            label={t('gifts.extraOffer')}
            extra={t('gifts.extraOfferHint')}
            rules={[{ max: 500, message: t('fields.maxLength', { max: 500 }) }]}
          >
            <Input.TextArea rows={3} maxLength={500} showCount />
          </Form.Item>
          <Form.Item name='status' label={t('gifts.status')}>
            <Select
              options={(['active', 'hidden'] as const).map((value) => ({ value, label: t(`giftStatus.${value}`) }))}
            />
          </Form.Item>
          <Text type='secondary' style={{ fontSize: 12 }}>
            {t('gifts.snapshotNote')}
          </Text>
        </>
      )}
    />
  )
}
