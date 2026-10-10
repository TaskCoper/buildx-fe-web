'use client'

import { ArrowLeftOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Alert, Avatar, Button, Card, Descriptions, Empty, Result, Skeleton, Table, Tag, Typography } from 'antd'
import dayjs from 'dayjs'
import { useLocale, useTranslations } from 'next-intl'
import type { ReactNode } from 'react'

import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { PERMISSIONS, useAuth } from '@/shared/auth'
import { ADMIN_ROUTES } from '@/shared/constants'
import { isApiError } from '@/shared/lib/api'
import { formatCurrency, getInitials } from '@/shared/utils'
import { adminKeys } from '../../api/admin.keys'
import {
  bmtCommerceApi,
  type BmtAdminBankTransactionSummary,
  type BmtAdminPackagePurchaseSummary,
  type BmtAdminPaymentOrderSummary,
  type PaymentOrderState,
  type PurchaseEffectiveState
} from '../../api/bmt/commerce.api'
import { bmtCustomersApi } from '../../api/bmt/customers.api'
import { currentPurchase, customerDisplayName, customerStatusView, quotaLeft } from '../../api/bmt/customers.logic'
import { AdminPage } from '../common/admin-page'

const { Text } = Typography

/** Một lần lấy tối đa 100 dòng (giới hạn của backend); khách có nhiều hơn thì báo đang xem phần mới nhất. */
const COMMERCE_PAGE = { pageIndex: 1, pageSize: 100 } as const

const ORDER_STATE_COLOR: Record<PaymentOrderState, string> = {
  Pending: 'gold',
  PartiallyPaid: 'orange',
  Paid: 'green',
  Expired: 'default',
  Canceled: 'red'
}

const PURCHASE_STATE_COLOR: Record<PurchaseEffectiveState, string> = {
  Active: 'green',
  Assigned: 'green',
  Completed: 'blue',
  Unassigned: 'gold',
  ExpiredUnassigned: 'default',
  Expired: 'default',
  CanceledByStaff: 'red',
  Superseded: 'default',
  SupersededBeforeActivation: 'default'
}

function stamp(value?: string | null): string {
  return value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '-'
}

/** Số tiền VND là chuỗi số nguyên (BE giữ chính xác); giá trị thực tế nằm trong khoảng an toàn của `number`. */
function vnd(value: string, locale: Locale): string {
  return formatCurrency(Number(value), locale)
}

/**
 * TRANG CHI TIẾT KHÁCH HÀNG (epic UserAccountManagement §2–§8), đọc từ API thật:
 * hồ sơ từ `GET /customers/{id}` (quyền `customer.manage`); gói đã mua, đơn và giao dịch của khách từ API thương mại
 * lọc theo `customerId` (quyền `commerce.read`, thiếu quyền thì các khối đó báo rõ thay vì để trống).
 *
 * Mọi khối đều CHỈ ĐỌC. Ban / Mở ban và lịch sử lượt chưa có API ở backend nên giữ chỗ trên giao diện nhưng không bấm
 * được. Không hiển thị mật khẩu, token hay dữ liệu xác thực.
 */
export function CustomerDetail({ id }: { id: string }) {
  const t = useTranslations('admin')
  const tc = useTranslations('admin.bmtCommerce')
  const locale = useLocale() as Locale
  const { hasPermission } = useAuth()
  const canCommerce = hasPermission(PERMISSIONS.COMMERCE_READ)

  const customerQuery = useQuery({
    queryKey: adminKeys.bmt('customers', 'detail', id),
    queryFn: () => bmtCustomersApi.get(id),
    retry: false
  })
  const purchasesQuery = useQuery({
    queryKey: adminKeys.bmt('package-purchases', 'customer', id),
    queryFn: () => bmtCommerceApi.listPackagePurchases({ customerId: id, ...COMMERCE_PAGE }),
    enabled: canCommerce
  })
  const ordersQuery = useQuery({
    queryKey: adminKeys.bmt('payment-orders', 'customer', id),
    queryFn: () => bmtCommerceApi.listPaymentOrders({ customerId: id, ...COMMERCE_PAGE }),
    enabled: canCommerce
  })
  const transactionsQuery = useQuery({
    queryKey: adminKeys.bmt('bank-transactions', 'customer', id),
    queryFn: () => bmtCommerceApi.listBankTransactions({ customerId: id, ...COMMERCE_PAGE }),
    enabled: canCommerce
  })

  const purchases = purchasesQuery.data?.items ?? []
  const designPurchase = currentPurchase(purchases, 'Design')
  const supervisionPurchase = currentPurchase(purchases, 'Supervision')
  const designDetail = useQuery({
    queryKey: adminKeys.bmt('package-purchases', 'detail', designPurchase?.purchaseId),
    queryFn: () => bmtCommerceApi.getPackagePurchase(designPurchase!.purchaseId),
    enabled: canCommerce && Boolean(designPurchase)
  })
  const supervisionDetail = useQuery({
    queryKey: adminKeys.bmt('package-purchases', 'detail', supervisionPurchase?.purchaseId),
    queryFn: () => bmtCommerceApi.getPackagePurchase(supervisionPurchase!.purchaseId),
    enabled: canCommerce && Boolean(supervisionPurchase)
  })

  const errorText = (error: unknown) => (isApiError(error) ? error.message : t('feedback.apiError'))
  const loadError = (error: unknown, retry: () => void): ReactNode => (
    <Alert
      type='error'
      showIcon
      title={errorText(error)}
      action={
        <Button size='small' onClick={retry}>
          {t('customers.retry')}
        </Button>
      }
    />
  )

  const backButton = (
    <Link href={ADMIN_ROUTES.CUSTOMERS}>
      <Button data-back-navigation style={{ color: 'var(--foreground)' }} icon={<ArrowLeftOutlined />}>
        {t('customers.backToList')}
      </Button>
    </Link>
  )

  if (customerQuery.isPending) return <Skeleton active paragraph={{ rows: 12 }} />

  if (customerQuery.isError) {
    const notFound = isApiError(customerQuery.error) && customerQuery.error.status === 404
    return (
      <Result
        status={notFound ? '404' : 'error'}
        title={notFound ? t('customers.notFound') : errorText(customerQuery.error)}
        extra={
          <>
            {notFound ? null : (
              <Button type='primary' onClick={() => void customerQuery.refetch()}>
                {t('customers.retry')}
              </Button>
            )}
            {backButton}
          </>
        }
      />
    )
  }

  const customer = customerQuery.data
  const name = customerDisplayName(customer)
  const statusView = customerStatusView(customer.status)
  const suspended = statusView === 'suspended'

  const noCommerce = (
    <Alert type='warning' showIcon title={t('customers.commerceForbidden')} style={{ marginBottom: 0 }} />
  )

  const quotaItems = (quotas: NonNullable<typeof designDetail.data>['designPeriod']) =>
    (quotas?.quotas ?? []).map((quota) => {
      const left = quotaLeft(quota)
      return {
        key: quota.code,
        label: quota.label,
        children:
          left === null
            ? `${tc('unlimited')} · ${tc('quotaUsage', { used: quota.used, reserved: quota.reserved, limit: tc('unlimited') })}`
            : t('customers.quotaLine', { granted: quota.limit ?? 0, held: quota.reserved, used: quota.used, left })
      }
    })

  const stateTag = (state: PurchaseEffectiveState) => (
    <Tag color={PURCHASE_STATE_COLOR[state]}>{tc(`effectiveStates.${state}`)}</Tag>
  )

  const purchaseLink = (purchaseId: string) => (
    <Link href={`${ADMIN_ROUTES.ORDERS}?view=purchases&act=view&rid=${purchaseId}`}>{purchaseId.slice(0, 8)}</Link>
  )

  return (
    <AdminPage title={name} description={t('customers.detailDescription')} actions={backButton}>
      <Card title={t('customers.profileTitle')}>
        <div className='flex flex-wrap items-start gap-6'>
          <Avatar size={72} src={customer.avatar || undefined}>
            {getInitials(name)}
          </Avatar>
          <Descriptions
            className='min-w-0 flex-1'
            size='small'
            column={{ xs: 1, md: 2 }}
            items={[
              { key: 'name', label: t('customers.name'), children: name },
              { key: 'email', label: t('customers.email'), children: customer.email },
              { key: 'phone', label: t('customers.phone'), children: customer.phoneNumber || '-' },
              { key: 'createdAt', label: t('customers.createdAt'), children: stamp(customer.createdAtUtc) },
              {
                key: 'verified',
                label: t('customers.emailVerified'),
                children: (
                  <Tag color={customer.isEmailVerified ? 'green' : 'gold'}>
                    {customer.isEmailVerified ? t('customers.verifiedYes') : t('customers.verifiedNo')}
                  </Tag>
                )
              },
              {
                key: 'status',
                label: t('customers.status'),
                children: <Tag color={suspended ? 'red' : 'green'}>{t(`customerStatus.${statusView}`)}</Tag>
              }
            ]}
          />
        </div>
      </Card>

      <Card title={t('customers.packagesTitle')}>
        {!canCommerce ? (
          noCommerce
        ) : purchasesQuery.isError ? (
          loadError(purchasesQuery.error, () => void purchasesQuery.refetch())
        ) : (
          <>
            <Alert type='info' showIcon style={{ marginBottom: 16 }} title={t('customers.packagesReadOnly')} />
            <div className='grid gap-4 lg:grid-cols-2'>
              <Card size='small' type='inner' title={t('customers.designPackage')} loading={purchasesQuery.isPending}>
                {designPurchase ? (
                  designDetail.isError ? (
                    loadError(designDetail.error, () => void designDetail.refetch())
                  ) : (
                    <Descriptions
                      size='small'
                      column={1}
                      items={[
                        {
                          key: 'plan',
                          label: t('customers.plan'),
                          children: `${designPurchase.planNameAtPurchase} · ${tc(`offerKeys.${designPurchase.offerKey}`)}`
                        },
                        {
                          key: 'order',
                          label: t('customers.orderCode'),
                          children: purchaseLink(designPurchase.purchaseId)
                        },
                        {
                          key: 'start',
                          label: t('customers.startsAt'),
                          children: stamp(designDetail.data?.designPeriod?.startsAtUtc)
                        },
                        {
                          key: 'end',
                          label: t('customers.endsAt'),
                          children: stamp(designDetail.data?.designPeriod?.scheduledEndsAtUtc)
                        },
                        {
                          key: 'status',
                          label: t('customers.activation'),
                          children: stateTag(designPurchase.effectiveState)
                        },
                        ...quotaItems(designDetail.data?.designPeriod)
                      ]}
                    />
                  )
                ) : (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('customers.noPackage')} />
                )}
              </Card>

              <Card
                size='small'
                type='inner'
                title={t('customers.supervisionPackage')}
                loading={purchasesQuery.isPending}
              >
                {supervisionPurchase ? (
                  supervisionDetail.isError ? (
                    loadError(supervisionDetail.error, () => void supervisionDetail.refetch())
                  ) : (
                    <Descriptions
                      size='small'
                      column={1}
                      items={[
                        {
                          key: 'plan',
                          label: t('customers.plan'),
                          children: supervisionPurchase.planNameAtPurchase
                        },
                        {
                          key: 'order',
                          label: t('customers.orderCode'),
                          children: purchaseLink(supervisionPurchase.purchaseId)
                        },
                        {
                          key: 'project',
                          label: tc('constructionSite'),
                          children: supervisionPurchase.constructionSiteName || '-'
                        },
                        {
                          key: 'status',
                          label: t('customers.activation'),
                          children: stateTag(supervisionPurchase.effectiveState)
                        },
                        ...(supervisionDetail.data?.supervisionGrant
                          ? [
                              {
                                key: 'grantedAt',
                                label: tc('grantedAt'),
                                children: stamp(supervisionDetail.data.supervisionGrant.grantedAtUtc)
                              },
                              {
                                key: 'deadline',
                                label: tc('assignmentDeadline'),
                                children: stamp(supervisionDetail.data.supervisionGrant.assignmentDeadlineUtc)
                              },
                              {
                                key: 'assignedAt',
                                label: tc('assignedAt'),
                                children: stamp(supervisionDetail.data.supervisionGrant.assignedAtUtc)
                              }
                            ]
                          : [])
                      ]}
                    />
                  )
                ) : (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('customers.noPackage')} />
                )}
              </Card>
            </div>

            <Text strong style={{ display: 'block', margin: '20px 0 8px' }}>
              {t('customers.packageHistory')}
            </Text>
            <Table<BmtAdminPackagePurchaseSummary>
              rowKey='purchaseId'
              size='small'
              loading={purchasesQuery.isPending}
              dataSource={purchases}
              pagination={false}
              scroll={{ x: 'max-content' }}
              locale={{ emptyText: t('customers.noPackage') }}
              columns={[
                {
                  title: t('customers.packageKind'),
                  dataIndex: 'kind',
                  render: (kind: BmtAdminPackagePurchaseSummary['kind']) => tc(`kinds.${kind}`)
                },
                { title: t('customers.plan'), dataIndex: 'planNameAtPurchase' },
                {
                  title: tc('offer'),
                  dataIndex: 'offerKey',
                  render: (offer: BmtAdminPackagePurchaseSummary['offerKey']) => tc(`offerKeys.${offer}`)
                },
                { title: tc('fulfilledAt'), dataIndex: 'fulfillmentAtUtc', render: (value: string) => stamp(value) },
                {
                  title: t('customers.finalStatus'),
                  dataIndex: 'effectiveState',
                  render: (state: PurchaseEffectiveState) => stateTag(state)
                },
                {
                  title: tc('constructionSite'),
                  dataIndex: 'constructionSiteName',
                  render: (site?: string | null) => site || '-'
                },
                {
                  title: t('customers.orderCode'),
                  dataIndex: 'purchaseId',
                  render: (purchaseId: string) => purchaseLink(purchaseId)
                }
              ]}
            />
            {purchasesQuery.data && purchasesQuery.data.totalCount > purchases.length ? (
              <Text type='secondary' style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
                {t('customers.listTruncated', { shown: purchases.length, total: purchasesQuery.data.totalCount })}
              </Text>
            ) : null}
          </>
        )}
      </Card>

      <Card title={t('customers.ordersTitle')}>
        {!canCommerce ? (
          noCommerce
        ) : ordersQuery.isError ? (
          loadError(ordersQuery.error, () => void ordersQuery.refetch())
        ) : (
          <>
            <Table<BmtAdminPaymentOrderSummary>
              rowKey='id'
              size='small'
              loading={ordersQuery.isPending}
              dataSource={ordersQuery.data?.items ?? []}
              pagination={false}
              scroll={{ x: 'max-content' }}
              locale={{ emptyText: t('table.empty') }}
              columns={[
                {
                  title: tc('paymentCode'),
                  dataIndex: 'paymentCode',
                  render: (value: string) => <Text code>{value}</Text>
                },
                {
                  title: t('customers.packageKind'),
                  dataIndex: 'kind',
                  render: (kind: BmtAdminPaymentOrderSummary['kind']) => tc(`kinds.${kind}`)
                },
                { title: t('customers.plan'), dataIndex: 'planNameAtPurchase' },
                {
                  title: tc('offer'),
                  dataIndex: 'offerKey',
                  render: (offer: BmtAdminPaymentOrderSummary['offerKey']) => tc(`offerKeys.${offer}`)
                },
                { title: tc('price'), dataIndex: 'priceVnd', render: (value: string) => vnd(value, locale) },
                {
                  title: tc('received'),
                  dataIndex: 'receivedAmountVnd',
                  render: (value: string) => vnd(value, locale)
                },
                {
                  title: t('customers.orderStatus'),
                  dataIndex: 'state',
                  render: (state: PaymentOrderState) => (
                    <Tag color={ORDER_STATE_COLOR[state]}>{tc(`orderStates.${state}`)}</Tag>
                  )
                },
                {
                  title: t('customers.createdTime'),
                  dataIndex: 'createdAtUtc',
                  render: (value: string) => stamp(value)
                },
                {
                  title: t('table.actions'),
                  key: 'go',
                  render: (_, row) => (
                    <Link href={`${ADMIN_ROUTES.ORDERS}?act=view&rid=${row.id}`}>{t('customers.viewOrder')}</Link>
                  )
                }
              ]}
            />
            {ordersQuery.data && ordersQuery.data.totalCount > ordersQuery.data.items.length ? (
              <Text type='secondary' style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
                {t('customers.listTruncated', {
                  shown: ordersQuery.data.items.length,
                  total: ordersQuery.data.totalCount
                })}
              </Text>
            ) : null}
          </>
        )}
      </Card>

      <Card title={t('customers.paymentsTitle')}>
        {!canCommerce ? (
          noCommerce
        ) : transactionsQuery.isError ? (
          loadError(transactionsQuery.error, () => void transactionsQuery.refetch())
        ) : (
          <>
            <Table<BmtAdminBankTransactionSummary>
              rowKey='id'
              size='small'
              loading={transactionsQuery.isPending}
              dataSource={transactionsQuery.data?.items ?? []}
              pagination={false}
              scroll={{ x: 'max-content' }}
              locale={{ emptyText: t('table.empty') }}
              columns={[
                {
                  title: t('customers.txCode'),
                  dataIndex: 'providerTransactionId',
                  render: (value: number) => <Text code>{value}</Text>
                },
                {
                  title: t('customers.orderCode'),
                  dataIndex: 'orderId',
                  render: (orderId?: string | null) => (orderId ? orderId.slice(0, 8) : '-')
                },
                { title: t('customers.amount'), dataIndex: 'amountVnd', render: (value: string) => vnd(value, locale) },
                {
                  title: t('customers.txStatus'),
                  dataIndex: 'matchState',
                  render: (state: BmtAdminBankTransactionSummary['matchState']) => (
                    <Tag color={state === 'Matched' ? 'green' : 'default'}>{tc(`matchStates.${state}`)}</Tag>
                  )
                },
                { title: t('customers.txTime'), dataIndex: 'occurredAtUtc', render: (value: string) => stamp(value) },
                {
                  title: t('table.actions'),
                  key: 'go',
                  render: (_, row) =>
                    row.orderId ? (
                      <Link href={`${ADMIN_ROUTES.TRANSACTIONS}?orderId=${row.orderId}`}>
                        {t('customers.viewTransaction')}
                      </Link>
                    ) : (
                      '-'
                    )
                }
              ]}
            />
            {transactionsQuery.data && transactionsQuery.data.totalCount > transactionsQuery.data.items.length ? (
              <Text type='secondary' style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
                {t('customers.listTruncated', {
                  shown: transactionsQuery.data.items.length,
                  total: transactionsQuery.data.totalCount
                })}
              </Text>
            ) : null}
          </>
        )}
      </Card>
    </AdminPage>
  )
}
