'use client'

import { ArrowLeftOutlined, LockOutlined, UnlockOutlined } from '@ant-design/icons'
import {
  Alert,
  App,
  Avatar,
  Button,
  Card,
  Descriptions,
  Empty,
  Form,
  Input,
  Modal,
  Result,
  Skeleton,
  Space,
  Table,
  Tag,
  Typography
} from 'antd'
import dayjs from 'dayjs'
import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'

import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import type {
  CmsCustomer,
  CmsCustomerPackage,
  CmsOrder,
  CmsPackageActivation,
  CmsQuotaBalance,
  CmsQuotaEvent,
  CmsTransaction
} from '@/shared/cms'
import { ADMIN_ROUTES } from '@/shared/constants'
import { formatCurrency, getInitials } from '@/shared/utils'
import { useAdminCollection, useSaveAdminItem } from '../../hooks/use-admin-data'
import { AdminPage } from '../common/admin-page'
import { MockApiNotice } from '../common/mock-api-notice'

const { Text } = Typography

const ACTIVATION_TAG: Record<CmsPackageActivation, string> = {
  pending: 'gold',
  active: 'green',
  failed: 'red',
  ended: 'default'
}

function stamp(value?: string): string {
  return value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '-'
}

/** Còn lại = cấp − giữ − dùng, không bao giờ âm (§3). */
function remaining(balance: CmsQuotaBalance): number {
  return Math.max(0, balance.granted - balance.held - balance.used)
}

/**
 * TRANG CHI TIẾT KHÁCH HÀNG (epic UserAccountManagement §2–§8).
 *
 * Mọi khối đều CHỈ ĐỌC: gói và quota theo snapshot của đơn đã mua; đơn hàng và
 * giao dịch dẫn sang màn tương ứng; lịch sử lượt không thêm / sửa / hoàn tay.
 * Thao tác duy nhất là Ban / Mở ban — có xác nhận, không đụng gói, đơn hay lượt.
 * Không hiển thị mật khẩu, token hay dữ liệu xác thực.
 */
export function CustomerDetail({ id }: { id: string }) {
  const t = useTranslations('admin')
  const locale = useLocale() as Locale
  const { message } = App.useApp()

  const customers = useAdminCollection('customers')
  const packages = useAdminCollection('customerPackages')
  const orders = useAdminCollection('orders')
  const transactions = useAdminCollection('transactions')
  const events = useAdminCollection('quotaEvents')
  const save = useSaveAdminItem('customers')

  const [banOpen, setBanOpen] = useState(false)
  const [form] = Form.useForm<{ reason?: string }>()

  if ([customers, packages, orders, transactions, events].some((query) => query.isPending)) {
    return <Skeleton active paragraph={{ rows: 12 }} />
  }

  const customer = (customers.data ?? []).find((item) => item.id === id)
  if (!customer) {
    return (
      <Result
        status='404'
        title={t('customers.notFound')}
        extra={
          <Link href={ADMIN_ROUTES.CUSTOMERS}>
            <Button>{t('customers.backToList')}</Button>
          </Link>
        }
      />
    )
  }

  const ownPackages = (packages.data ?? []).filter((item) => item.customerId === customer.id)
  const currentOf = (kind: CmsCustomerPackage['kind']) =>
    ownPackages
      .filter((item) => item.kind === kind && item.status !== 'ended')
      .sort((a, b) => b.startsAt.localeCompare(a.startsAt))[0]
  const designPackage = currentOf('design')
  const supervisionPackage = currentOf('supervision')
  const email = customer.email.toLowerCase()
  const ownOrders = (orders.data ?? [])
    .filter((order) => order.buyer.email.toLowerCase() === email)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const ownOrderIds = new Set(ownOrders.map((order) => order.id))
  const ownTransactions = (transactions.data ?? [])
    .filter((tx) => (tx.orderId ? ownOrderIds.has(tx.orderId) : tx.customerEmail.toLowerCase() === email))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const ownEvents = (events.data ?? [])
    .filter((event) => event.customerId === customer.id)
    .sort((a, b) => b.at.localeCompare(a.at))

  const banning = customer.status === 'active'

  const submitBan = async () => {
    // Form sai thì antd reject kèm lỗi từng ô — đã hiện dưới ô, không cần ném tiếp.
    const values = await form.validateFields().catch(() => null)
    if (!values) return
    const next: CmsCustomer = banning
      ? {
          ...customer,
          status: 'suspended',
          banReason: values.reason?.trim() || undefined,
          bannedAt: new Date().toISOString()
        }
      : { ...customer, status: 'active' }
    await save.mutateAsync(next)
    message.success(t(banning ? 'customers.bannedToast' : 'customers.unbannedToast', { name: customer.name }))
    setBanOpen(false)
  }

  const quotaRows = (label: string, balance: CmsQuotaBalance) => ({
    key: label,
    label,
    children: t('customers.quotaLine', {
      granted: balance.granted,
      held: balance.held,
      used: balance.used,
      left: remaining(balance)
    })
  })

  const activation = (item: CmsCustomerPackage) => (
    <Space size={4} wrap>
      <Tag color={ACTIVATION_TAG[item.status]}>{t(`packageActivation.${item.status}`)}</Tag>
      {item.status === 'ended' && item.endReason ? (
        <Text type='secondary' style={{ fontSize: 12 }}>
          {t(`packageEndReason.${item.endReason}`)}
        </Text>
      ) : null}
    </Space>
  )

  return (
    <AdminPage
      title={customer.name}
      description={t('customers.detailDescription')}
      actions={
        <>
          <Link href={ADMIN_ROUTES.CUSTOMERS}>
            <Button icon={<ArrowLeftOutlined />}>{t('customers.backToList')}</Button>
          </Link>
          {banning ? (
            <Button danger icon={<LockOutlined />} onClick={() => setBanOpen(true)}>
              {t('customers.ban')}
            </Button>
          ) : (
            <Button icon={<UnlockOutlined />} onClick={() => setBanOpen(true)}>
              {t('customers.unban')}
            </Button>
          )}
        </>
      }
    >
      <MockApiNotice />
      <Card title={t('customers.profileTitle')}>
        <div className='flex flex-wrap items-start gap-6'>
          <Avatar size={72} src={customer.avatarUrl}>
            {getInitials(customer.name)}
          </Avatar>
          <Descriptions
            className='min-w-0 flex-1'
            size='small'
            column={{ xs: 1, md: 2 }}
            items={[
              { key: 'name', label: t('customers.name'), children: customer.name },
              { key: 'email', label: t('customers.email'), children: customer.email },
              { key: 'phone', label: t('customers.phone'), children: customer.phone || '-' },
              {
                key: 'role',
                label: t('customers.role'),
                children: customer.role === 'admin' ? t('customers.roleAdmin') : t('customers.roleCustomer')
              },
              { key: 'createdAt', label: t('customers.createdAt'), children: customer.createdAt },
              {
                key: 'verified',
                label: t('customers.emailVerified'),
                children: (
                  <Tag color={customer.emailVerified ? 'green' : 'gold'}>
                    {customer.emailVerified ? t('customers.verifiedYes') : t('customers.verifiedNo')}
                  </Tag>
                )
              },
              {
                key: 'login',
                label: t('customers.loginMethod'),
                children: t(`customers.loginMethods.${customer.loginMethod}`)
              },
              {
                key: 'status',
                label: t('customers.status'),
                children: (
                  <Tag color={customer.status === 'active' ? 'green' : 'red'}>
                    {t(`customerStatus.${customer.status}`)}
                  </Tag>
                )
              },
              ...(customer.status === 'suspended'
                ? [{ key: 'reason', label: t('customers.banReasonLabel'), children: customer.banReason || '-' }]
                : [])
            ]}
          />
        </div>
      </Card>

      <Card title={t('customers.packagesTitle')}>
        <Alert type='info' showIcon style={{ marginBottom: 16 }} title={t('customers.packagesReadOnly')} />
        <div className='grid gap-4 lg:grid-cols-2'>
          <Card size='small' type='inner' title={t('customers.designPackage')}>
            {designPackage ? (
              <Descriptions
                size='small'
                column={1}
                items={[
                  {
                    key: 'plan',
                    label: t('customers.plan'),
                    children: `${designPackage.planName} · ${designPackage.planCode}`
                  },
                  { key: 'order', label: t('customers.orderCode'), children: designPackage.orderId },
                  { key: 'start', label: t('customers.startsAt'), children: stamp(designPackage.startsAt) },
                  { key: 'end', label: t('customers.endsAt'), children: stamp(designPackage.endsAt) },
                  { key: 'status', label: t('customers.activation'), children: activation(designPackage) },
                  ...(designPackage.designQuota
                    ? [quotaRows(t('customers.designQuota'), designPackage.designQuota)]
                    : []),
                  ...(designPackage.libraryQuota
                    ? [quotaRows(t('customers.libraryQuota'), designPackage.libraryQuota)]
                    : []),
                  {
                    key: 'benefits',
                    label: t('customers.benefits'),
                    children: (
                      <ul className='m-0 list-disc pl-4'>
                        {designPackage.benefits.map((benefit) => (
                          <li key={benefit}>{benefit}</li>
                        ))}
                      </ul>
                    )
                  },
                  ...(designPackage.gift
                    ? [
                        {
                          key: 'gift',
                          label: t('customers.gift'),
                          children: (
                            <div>
                              <Text strong style={{ display: 'block' }}>
                                {designPackage.gift.title}
                              </Text>
                              <Text type='secondary' style={{ fontSize: 12 }}>
                                {designPackage.gift.conditions}
                              </Text>
                            </div>
                          )
                        }
                      ]
                    : [])
                ]}
              />
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('customers.noPackage')} />
            )}
          </Card>

          <Card size='small' type='inner' title={t('customers.supervisionPackage')}>
            {supervisionPackage?.supervision ? (
              <Descriptions
                size='small'
                column={1}
                items={[
                  { key: 'plan', label: t('customers.plan'), children: supervisionPackage.planName },
                  { key: 'order', label: t('customers.orderCode'), children: supervisionPackage.orderId },
                  {
                    key: 'project',
                    label: t('customers.project'),
                    children: `${supervisionPackage.supervision.projectName} · ${supervisionPackage.supervision.projectId}`
                  },
                  { key: 'start', label: t('customers.startsAt'), children: stamp(supervisionPackage.startsAt) },
                  { key: 'end', label: t('customers.endsAt'), children: stamp(supervisionPackage.endsAt) },
                  { key: 'status', label: t('customers.activation'), children: activation(supervisionPackage) },
                  {
                    key: 'stage',
                    label: t('customers.currentStage'),
                    children: supervisionPackage.supervision.currentStage
                  },
                  {
                    key: 'inspections',
                    label: t('customers.inspections'),
                    children: t('customers.inspectionLine', {
                      total: supervisionPackage.supervision.inspectionsTotal,
                      used: supervisionPackage.supervision.inspectionsUsed,
                      left: Math.max(
                        0,
                        supervisionPackage.supervision.inspectionsTotal - supervisionPackage.supervision.inspectionsUsed
                      )
                    })
                  },
                  {
                    key: 'benefits',
                    label: t('customers.benefits'),
                    children: (
                      <ul className='m-0 list-disc pl-4'>
                        {supervisionPackage.benefits.map((benefit) => (
                          <li key={benefit}>{benefit}</li>
                        ))}
                      </ul>
                    )
                  }
                ]}
              />
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('customers.noPackage')} />
            )}
          </Card>
        </div>

        <Text strong style={{ display: 'block', margin: '20px 0 8px' }}>
          {t('customers.packageHistory')}
        </Text>
        <Table<CmsCustomerPackage>
          rowKey='id'
          size='small'
          dataSource={[...ownPackages].sort((a, b) => b.startsAt.localeCompare(a.startsAt))}
          pagination={false}
          scroll={{ x: 'max-content' }}
          locale={{ emptyText: t('customers.noPackage') }}
          columns={[
            {
              title: t('customers.packageKind'),
              dataIndex: 'kind',
              render: (kind: CmsCustomerPackage['kind']) => t(`customers.packageKinds.${kind}`)
            },
            { title: t('customers.plan'), dataIndex: 'planName' },
            {
              title: t('customers.period'),
              key: 'period',
              render: (_, row) => `${stamp(row.startsAt)} → ${stamp(row.endsAt)}`
            },
            { title: t('customers.finalStatus'), key: 'status', render: (_, row) => activation(row) },
            { title: t('customers.orderCode'), dataIndex: 'orderId' }
          ]}
        />
      </Card>

      <Card title={t('customers.ordersTitle')}>
        <Table<CmsOrder>
          rowKey='id'
          size='small'
          dataSource={ownOrders}
          pagination={false}
          scroll={{ x: 'max-content' }}
          locale={{ emptyText: t('table.empty') }}
          columns={[
            { title: t('customers.orderCode'), dataIndex: 'id', render: (value: string) => <Text code>{value}</Text> },
            {
              title: t('customers.packageKind'),
              key: 'kind',
              render: (_, row) => t(`customers.packageKinds.${row.product.kind}`)
            },
            { title: t('customers.plan'), key: 'plan', render: (_, row) => row.product.name.toUpperCase() },
            { title: t('customers.subtotal'), dataIndex: 'subtotal', render: (v: number) => formatCurrency(v, locale) },
            {
              title: t('customers.discount'),
              dataIndex: 'discountAmount',
              render: (v: number) => (v ? `−${formatCurrency(v, locale)}` : '-')
            },
            { title: t('customers.total'), dataIndex: 'total', render: (v: number) => formatCurrency(v, locale) },
            {
              title: t('customers.orderStatus'),
              dataIndex: 'status',
              render: (status: CmsOrder['status']) => <Tag>{t(`orderStatus.${status}`)}</Tag>
            },
            { title: t('customers.createdTime'), dataIndex: 'createdAt', render: (v: string) => stamp(v) },
            {
              title: t('table.actions'),
              key: 'go',
              render: (_, row) => (
                <Link href={`${ADMIN_ROUTES.ORDERS}?order=${row.id}`}>{t('customers.viewOrder')}</Link>
              )
            }
          ]}
        />
      </Card>

      <Card title={t('customers.paymentsTitle')}>
        <Table<CmsTransaction>
          rowKey='id'
          size='small'
          dataSource={ownTransactions}
          pagination={false}
          scroll={{ x: 'max-content' }}
          locale={{ emptyText: t('table.empty') }}
          columns={[
            { title: t('customers.txCode'), dataIndex: 'id', render: (value: string) => <Text code>{value}</Text> },
            { title: t('customers.orderCode'), dataIndex: 'orderId', render: (v?: string) => v ?? '-' },
            { title: t('customers.plan'), dataIndex: 'tier', render: (tier: string) => tier.toUpperCase() },
            { title: t('customers.amount'), dataIndex: 'amount', render: (v: number) => formatCurrency(v, locale) },
            { title: t('customers.method'), key: 'method', render: () => t('customers.qrTransfer') },
            {
              title: t('customers.txStatus'),
              dataIndex: 'status',
              render: (status: CmsTransaction['status']) => <Tag>{t(`transactionStatus.${status}`)}</Tag>
            },
            { title: t('customers.txTime'), dataIndex: 'createdAt', render: (v: string) => stamp(v) },
            {
              title: t('table.actions'),
              key: 'go',
              render: (_, row) => (
                <Link href={`${ADMIN_ROUTES.TRANSACTIONS}?q=${row.id}`}>{t('customers.viewTransaction')}</Link>
              )
            }
          ]}
        />
      </Card>

      <Card title={t('customers.quotaTitle')}>
        <Table<CmsQuotaEvent>
          rowKey='id'
          size='small'
          dataSource={ownEvents}
          pagination={{ pageSize: 10, hideOnSinglePage: true }}
          scroll={{ x: 'max-content' }}
          locale={{ emptyText: t('table.empty') }}
          columns={[
            { title: t('customers.eventTime'), dataIndex: 'at', render: (v: string) => stamp(v) },
            {
              title: t('customers.quotaType'),
              dataIndex: 'quotaType',
              render: (v: CmsQuotaEvent['quotaType']) => t(`customers.quotaTypes.${v}`)
            },
            {
              title: t('customers.quotaAction'),
              dataIndex: 'action',
              render: (v: CmsQuotaEvent['action']) => t(`customers.quotaActions.${v}`)
            },
            { title: t('customers.quotaDelta'), dataIndex: 'delta' },
            { title: t('customers.quotaBeforeAfter'), key: 'ba', render: (_, row) => `${row.before} → ${row.after}` },
            {
              title: t('customers.quotaResult'),
              dataIndex: 'result',
              render: (v: CmsQuotaEvent['result']) => (
                <Tag color={v === 'success' ? 'green' : v === 'failed' ? 'red' : 'gold'}>
                  {t(`customers.quotaResults.${v}`)}
                </Tag>
              )
            },
            {
              title: t('customers.quotaRef'),
              key: 'ref',
              // Lượt thư viện chỉ ghi "Xem chi tiết mẫu" — không lộ khách đã xem mẫu nào.
              render: (_, row) => (row.quotaType === 'library' ? t('customers.libraryView') : (row.ref ?? '-'))
            }
          ]}
        />
      </Card>

      <Modal
        open={banOpen}
        onCancel={() => setBanOpen(false)}
        onOk={submitBan}
        confirmLoading={save.isPending}
        okText={banning ? t('customers.ban') : t('customers.unban')}
        okButtonProps={{ danger: banning }}
        cancelText={t('actions.cancel')}
        title={banning ? t('customers.banTitle') : t('customers.unbanTitle')}
        destroyOnHidden
      >
        <Form form={form} layout='vertical'>
          <Descriptions
            size='small'
            column={1}
            bordered
            style={{ marginBottom: 16 }}
            items={[
              { key: 'name', label: t('customers.name'), children: customer.name },
              { key: 'email', label: t('customers.email'), children: customer.email },
              { key: 'status', label: t('customers.status'), children: t(`customerStatus.${customer.status}`) },
              ...(!banning
                ? [{ key: 'reason', label: t('customers.previousReason'), children: customer.banReason || '-' }]
                : [])
            ]}
          />
          <Alert
            type={banning ? 'warning' : 'info'}
            showIcon
            style={{ marginBottom: banning ? 16 : 0 }}
            title={banning ? t('customers.banWarning') : t('customers.unbanNote')}
          />
          {banning ? (
            <Form.Item
              name='reason'
              label={t('customers.banReason')}
              rules={[{ max: 500, message: t('customers.banReasonMax') }]}
            >
              <Input.TextArea rows={3} maxLength={500} showCount />
            </Form.Item>
          ) : null}
        </Form>
      </Modal>
    </AdminPage>
  )
}
