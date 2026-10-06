'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  App,
  Button,
  Descriptions,
  Empty,
  Form,
  Input,
  Modal,
  Segmented,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography
} from 'antd'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useState, type ReactNode } from 'react'

import { PERMISSIONS, useAuth } from '@/shared/auth'
import { isApiError } from '@/shared/lib/api'
import { adminKeys } from '../../api/admin.keys'
import {
  bmtCommerceApi,
  type BmtAdminBankTransactionSummary,
  type BmtAdminPackagePurchaseDetail,
  type BmtAdminPackagePurchaseSummary,
  type BmtAdminPaymentOrderEvent,
  type BmtAdminPaymentOrderSummary,
  type BmtAdminPurchaseHistoryItem,
  type CommerceKind,
  type FulfillmentDisposition,
  type PaymentOrderState,
  type PurchaseEffectiveState
} from '../../api/bmt/commerce.api'
import { ApiResourceManager } from '../common/api-resource-manager'
import { StatusTag, type StatusTone } from '../common/status-tag'
import { DateRangeFilter, rangeToUtc, stamp, useCommerceLabels, useVnd, type DateRange } from './commerce-kit'

const { Text } = Typography

/** Sắc thái trạng thái đơn thanh toán — quy ước tone dùng chung. */
const ORDER_STATE_TONE: Record<PaymentOrderState, StatusTone> = {
  Pending: 'warning',
  PartiallyPaid: 'warning',
  Paid: 'success',
  Expired: 'danger',
  Canceled: 'danger'
}

/** Sắc thái hiệu lực gói đã cấp — hết hạn/khoá là danger, bị thay thế là off (xám). */
const EFFECTIVE_STATE_TONE: Record<PurchaseEffectiveState, StatusTone> = {
  Active: 'success',
  Assigned: 'success',
  Unassigned: 'warning',
  Completed: 'success',
  Expired: 'danger',
  ExpiredUnassigned: 'danger',
  Superseded: 'off',
  SupersededBeforeActivation: 'off',
  CanceledByStaff: 'danger'
}

/** Sắc thái trạng thái khớp giao dịch — dùng ở bảng lồng chi tiết đơn. */
const MATCH_STATE_TONE: Record<BmtAdminBankTransactionSummary['matchState'], StatusTone> = {
  Pending: 'warning',
  Matched: 'success',
  Unmatched: 'danger',
  IgnoredDirection: 'off',
  ConnectionMismatch: 'danger'
}

type View = 'orders' | 'purchases'

const ORDER_STATES: PaymentOrderState[] = ['Pending', 'PartiallyPaid', 'Paid', 'Expired', 'Canceled']
const EFFECTIVE_STATES: PurchaseEffectiveState[] = [
  'Active',
  'Expired',
  'Superseded',
  'SupersededBeforeActivation',
  'Unassigned',
  'ExpiredUnassigned',
  'Assigned',
  'Completed',
  'CanceledByStaff'
]
const DISPOSITIONS: FulfillmentDisposition[] = ['Activated', 'SupersededBeforeActivation']

/**
 * ĐƠN MUA GÓI & GÓI ĐÃ CẤP — tra cứu trên BMT API (STORY-PAY-002, TDD-PAY-002).
 *
 * Trạng thái thanh toán do backend khớp từ giao dịch SePay; màn này KHÔNG có nút
 * xác nhận thanh toán, không tạo / sửa / xóa đơn. Hai góc nhìn:
 *   · Đơn thanh toán — mọi đơn (chờ, nhận thiếu, hết hạn, hủy, đã trả), kèm lịch
 *     sử thanh toán và giao dịch ngân hàng đã khớp đơn.
 *   · Gói đã cấp — mỗi lần mua đã được cấp gói; từ đây nhân viên có quyền mới
 *     hủy hiệu lực gói, hoàn thành / mở lại / gỡ gói giám sát khỏi công trình.
 */
export function OrderManager() {
  const t = useTranslations('admin.bmtCommerce')
  const searchParams = useSearchParams()
  const [view, setView] = useState<View>(searchParams.get('view') === 'purchases' ? 'purchases' : 'orders')

  const switcher = (
    <Segmented<View>
      value={view}
      onChange={setView}
      options={[
        { value: 'orders', label: t('views.orders') },
        { value: 'purchases', label: t('views.purchases') }
      ]}
    />
  )

  return view === 'orders' ? <PaymentOrderTable switcher={switcher} /> : <PurchaseTable switcher={switcher} />
}

function PaymentOrderTable({ switcher }: { switcher: ReactNode }) {
  const t = useTranslations('admin.bmtCommerce')
  const tAdmin = useTranslations('admin')
  const vnd = useVnd()
  const labels = useCommerceLabels()
  const [kind, setKind] = useState<CommerceKind | 'all'>('all')
  const [state, setState] = useState<PaymentOrderState | 'all'>('all')
  const [paymentCode, setPaymentCode] = useState('')
  const [range, setRange] = useState<DateRange>(null)
  const filters = {
    kind: kind === 'all' ? undefined : kind,
    state: state === 'all' ? undefined : state,
    paymentCode: paymentCode || undefined,
    ...rangeToUtc(range)
  }

  return (
    <ApiResourceManager<BmtAdminPaymentOrderSummary>
      title={tAdmin('nav.orders')}
      description={t('ordersDescription')}
      queryKey={adminKeys.bmt('payment-orders', filters)}
      fetchPage={({ pageIndex, pageSize }) => bmtCommerceApi.listPaymentOrders({ pageIndex, pageSize, ...filters })}
      rowKey={(order) => order.id}
      drawerWidth={760}
      banner={
        <Space orientation='vertical' size={12}>
          {switcher}
          <Space wrap>
            <Select<CommerceKind | 'all'>
              value={kind}
              onChange={setKind}
              style={{ minWidth: 170 }}
              options={[
                { value: 'all', label: t('allKinds') },
                { value: 'Design', label: labels.kind('Design') },
                { value: 'Supervision', label: labels.kind('Supervision') }
              ]}
            />
            <Select<PaymentOrderState | 'all'>
              value={state}
              onChange={setState}
              style={{ minWidth: 190 }}
              options={[
                { value: 'all', label: t('allOrderStates') },
                ...ORDER_STATES.map((value) => ({ value, label: t(`orderStates.${value}`) }))
              ]}
            />
            <Input.Search
              allowClear
              placeholder={t('paymentCodePlaceholder')}
              onSearch={(value) => setPaymentCode(value.trim())}
              style={{ width: 220 }}
            />
            <DateRangeFilter value={range} onChange={setRange} fromLabel={t('createdFrom')} toLabel={t('createdTo')} />
          </Space>
        </Space>
      }
      columns={[
        {
          title: t('paymentCode'),
          dataIndex: 'paymentCode',
          width: 150,
          render: (code: string, order) => (
            <Space orientation='vertical' size={2}>
              <Text code copyable>
                {code}
              </Text>
              {order.orderingDiscrepancy ? <Tag color='volcano'>{t('orderingDiscrepancy')}</Tag> : null}
            </Space>
          )
        },
        {
          title: t('buyer'),
          key: 'buyer',
          render: (_, order) => <Buyer name={order.buyerDisplayName} email={order.buyerEmail} />
        },
        {
          title: t('plan'),
          key: 'plan',
          width: 220,
          render: (_, order) => (
            <div>
              <Text strong style={{ display: 'block' }}>
                {order.planNameAtPurchase}
              </Text>
              <Space size={4}>
                <Tag color={order.kind === 'Design' ? 'green' : 'purple'}>{labels.kind(order.kind)}</Tag>
                <Text type='secondary' style={{ fontSize: 12 }}>
                  {labels.offer(order.offerKey)}
                </Text>
              </Space>
            </div>
          )
        },
        {
          title: t('price'),
          dataIndex: 'priceVnd',
          width: 140,
          align: 'right' as const,
          render: (value: string) => <Text strong>{vnd(value)}</Text>
        },
        {
          title: t('received'),
          dataIndex: 'receivedAmountVnd',
          width: 140,
          align: 'right' as const,
          render: (value: string) => vnd(value)
        },
        {
          title: t('orderState'),
          dataIndex: 'state',
          width: 170,
          render: (value: PaymentOrderState, order) => (
            <Space orientation='vertical' size={2}>
              <StatusTag tone={ORDER_STATE_TONE[value]}>{t(`orderStates.${value}`)}</StatusTag>
              {order.fulfillmentDisposition ? (
                <Text type='secondary' style={{ fontSize: 12 }}>
                  {t(`dispositions.${order.fulfillmentDisposition}`)}
                </Text>
              ) : null}
            </Space>
          )
        },
        {
          title: t('createdAt'),
          dataIndex: 'createdAtUtc',
          width: 150,
          render: (value: string) => stamp(value)
        }
      ]}
      renderView={(order) => <PaymentOrderDetail orderId={order.id} />}
    />
  )
}

function Buyer({ name, email }: { name?: string | null; email?: string | null }) {
  const t = useTranslations('admin.bmtCommerce')
  if (!name && !email) return <Text type='secondary'>{t('unknownBuyer')}</Text>
  return (
    <div style={{ minWidth: 0 }}>
      <Text strong style={{ display: 'block' }}>
        {name || '—'}
      </Text>
      <Text type='secondary' style={{ fontSize: 12 }}>
        {email || '—'}
      </Text>
    </div>
  )
}

function QueryError({ error }: { error: unknown }) {
  const tAdmin = useTranslations('admin')
  return <Alert type='error' showIcon title={isApiError(error) ? error.message : tAdmin('feedback.apiError')} />
}

function PaymentOrderDetail({ orderId }: { orderId: string }) {
  const t = useTranslations('admin.bmtCommerce')
  const vnd = useVnd()
  const labels = useCommerceLabels()
  const detail = useQuery({
    queryKey: adminKeys.bmt('payment-orders', 'detail', orderId),
    queryFn: () => bmtCommerceApi.getPaymentOrder(orderId)
  })
  const events = useQuery({
    queryKey: adminKeys.bmt('payment-orders', 'events', orderId),
    queryFn: () => bmtCommerceApi.listPaymentOrderEvents(orderId)
  })
  const transactions = useQuery({
    queryKey: adminKeys.bmt('bank-transactions', 'order', orderId),
    queryFn: () => bmtCommerceApi.listBankTransactions({ orderId, pageIndex: 1, pageSize: 100 })
  })

  if (detail.isPending) return <Spin />
  if (detail.isError) return <QueryError error={detail.error} />
  const order = detail.data

  return (
    <Space orientation='vertical' size={16} style={{ width: '100%' }}>
      {order.orderingDiscrepancy ? <Alert type='warning' showIcon title={t('orderingDiscrepancyHint')} /> : null}
      <Descriptions
        size='small'
        column={1}
        bordered
        title={t('orderBlock')}
        items={[
          {
            key: 'code',
            label: t('paymentCode'),
            children: (
              <Text code copyable>
                {order.paymentCode}
              </Text>
            )
          },
          { key: 'id', label: t('orderId'), children: <Text copyable>{order.id}</Text> },
          {
            key: 'state',
            label: t('orderState'),
            children: <StatusTag tone={ORDER_STATE_TONE[order.state]}>{t(`orderStates.${order.state}`)}</StatusTag>
          },
          { key: 'plan', label: t('plan'), children: order.planNameAtPurchase },
          { key: 'kind', label: t('kind'), children: labels.kind(order.kind) },
          { key: 'offer', label: t('offer'), children: labels.offer(order.offerKey) },
          {
            key: 'buyer',
            label: t('buyer'),
            children: <Buyer name={order.buyerDisplayName} email={order.buyerEmail} />
          },
          { key: 'created', label: t('createdAt'), children: stamp(order.createdAtUtc) },
          { key: 'expires', label: t('expiresAt'), children: stamp(order.expiresAtUtc) },
          { key: 'paid', label: t('paidAt'), children: stamp(order.paidAtUtc) },
          ...(order.canceledAtUtc
            ? [{ key: 'canceled', label: t('canceledAt'), children: stamp(order.canceledAtUtc) }]
            : []),
          ...(order.expiredAtUtc
            ? [{ key: 'expired', label: t('expiredAt'), children: stamp(order.expiredAtUtc) }]
            : [])
        ]}
      />
      <Descriptions
        size='small'
        column={1}
        bordered
        title={t('amountBlock')}
        items={[
          { key: 'price', label: t('price'), children: <Text strong>{vnd(order.priceVnd)}</Text> },
          { key: 'received', label: t('received'), children: vnd(order.receivedAmountVnd) },
          { key: 'eligible', label: t('eligible'), children: vnd(order.eligibleAmountVnd) },
          { key: 'remaining', label: t('remaining'), children: vnd(order.remainingAmountVnd) },
          { key: 'extra', label: t('extraReceived'), children: vnd(order.extraReceivedAmountVnd) },
          { key: 'count', label: t('transactionCount'), children: order.transactionCount }
        ]}
      />
      {order.fulfillment ? (
        <Descriptions
          size='small'
          column={1}
          bordered
          title={t('fulfillmentBlock')}
          items={[
            {
              key: 'disposition',
              label: t('disposition'),
              children: t(`dispositions.${order.fulfillment.disposition}`)
            },
            { key: 'at', label: t('fulfilledAt'), children: stamp(order.fulfillment.completedAtUtc) },
            { key: 'applied', label: t('appliedPaidAt'), children: stamp(order.fulfillment.appliedPaidAtUtc) }
          ]}
        />
      ) : null}

      <div>
        <Text strong style={{ display: 'block', marginBottom: 8 }}>
          {t('transactionsBlock')}
        </Text>
        {transactions.isError ? (
          <QueryError error={transactions.error} />
        ) : (
          <Table<BmtAdminBankTransactionSummary>
            rowKey='id'
            size='small'
            pagination={false}
            loading={transactions.isPending}
            dataSource={transactions.data?.items ?? []}
            scroll={{ x: 'max-content' }}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
            columns={[
              { title: t('occurredAt'), dataIndex: 'occurredAtUtc', render: (value: string) => stamp(value) },
              {
                title: t('amount'),
                dataIndex: 'amountVnd',
                align: 'right' as const,
                render: (value: string) => vnd(value)
              },
              {
                title: t('transferContent'),
                dataIndex: 'content',
                // Nội dung ngân hàng gửi: chỉ in dạng chữ (React tự thoát ký tự).
                render: (value: string) => <Text style={{ whiteSpace: 'pre-wrap' }}>{value}</Text>
              },
              {
                title: t('matchState'),
                dataIndex: 'matchState',
                render: (value: BmtAdminBankTransactionSummary['matchState']) => (
                  <StatusTag tone={MATCH_STATE_TONE[value]}>{t(`matchStates.${value}`)}</StatusTag>
                )
              }
            ]}
          />
        )}
      </div>

      <div>
        <Text strong style={{ display: 'block', marginBottom: 8 }}>
          {t('eventsBlock')}
        </Text>
        {events.isError ? (
          <QueryError error={events.error} />
        ) : (
          <Table<BmtAdminPaymentOrderEvent>
            rowKey='id'
            size='small'
            pagination={false}
            loading={events.isPending}
            dataSource={events.data?.items ?? []}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
            columns={[
              { title: t('eventAt'), dataIndex: 'atUtc', render: (value: string) => stamp(value) },
              {
                title: t('eventKind'),
                dataIndex: 'kind',
                render: (value: BmtAdminPaymentOrderEvent['kind']) => t(`eventKinds.${value}`)
              },
              {
                title: t('actor'),
                dataIndex: 'actorDisplayName',
                render: (value?: string | null) => value || t('system')
              }
            ]}
          />
        )}
      </div>

      {order.fulfillment ? <PurchaseDetail orderId={order.id} /> : null}
    </Space>
  )
}

function PurchaseTable({ switcher }: { switcher: ReactNode }) {
  const t = useTranslations('admin.bmtCommerce')
  const vnd = useVnd()
  const labels = useCommerceLabels()
  const [kind, setKind] = useState<CommerceKind | 'all'>('all')
  const [effectiveState, setEffectiveState] = useState<PurchaseEffectiveState | 'all'>('all')
  const [disposition, setDisposition] = useState<FulfillmentDisposition | 'all'>('all')
  const filters = {
    kind: kind === 'all' ? undefined : kind,
    effectiveState: effectiveState === 'all' ? undefined : effectiveState,
    disposition: disposition === 'all' ? undefined : disposition
  }

  return (
    <ApiResourceManager<BmtAdminPackagePurchaseSummary>
      title={t('purchasesTitle')}
      description={t('purchasesDescription')}
      queryKey={adminKeys.bmt('package-purchases', filters)}
      fetchPage={({ pageIndex, pageSize }) => bmtCommerceApi.listPackagePurchases({ pageIndex, pageSize, ...filters })}
      rowKey={(purchase) => purchase.purchaseId}
      drawerWidth={760}
      banner={
        <Space orientation='vertical' size={12}>
          {switcher}
          <Space wrap>
            <Select<CommerceKind | 'all'>
              value={kind}
              onChange={setKind}
              style={{ minWidth: 170 }}
              options={[
                { value: 'all', label: t('allKinds') },
                { value: 'Design', label: labels.kind('Design') },
                { value: 'Supervision', label: labels.kind('Supervision') }
              ]}
            />
            <Select<PurchaseEffectiveState | 'all'>
              value={effectiveState}
              onChange={setEffectiveState}
              style={{ minWidth: 220 }}
              options={[
                { value: 'all', label: t('allEffectiveStates') },
                ...EFFECTIVE_STATES.map((value) => ({ value, label: t(`effectiveStates.${value}`) }))
              ]}
            />
            <Select<FulfillmentDisposition | 'all'>
              value={disposition}
              onChange={setDisposition}
              style={{ minWidth: 220 }}
              options={[
                { value: 'all', label: t('allDispositions') },
                ...DISPOSITIONS.map((value) => ({ value, label: t(`dispositions.${value}`) }))
              ]}
            />
          </Space>
        </Space>
      }
      columns={[
        {
          title: t('buyer'),
          key: 'buyer',
          render: (_, purchase) => <Buyer name={purchase.buyerDisplayName} email={purchase.buyerEmail} />
        },
        {
          title: t('plan'),
          key: 'plan',
          width: 220,
          render: (_, purchase) => (
            <div>
              <Text strong style={{ display: 'block' }}>
                {purchase.planNameAtPurchase}
              </Text>
              <Space size={4}>
                <Tag color={purchase.kind === 'Design' ? 'green' : 'purple'}>{labels.kind(purchase.kind)}</Tag>
                <Text type='secondary' style={{ fontSize: 12 }}>
                  {labels.offer(purchase.offerKey)}
                </Text>
              </Space>
            </div>
          )
        },
        {
          title: t('price'),
          dataIndex: 'priceVnd',
          width: 140,
          align: 'right' as const,
          render: (value: string) => vnd(value)
        },
        {
          title: t('effectiveState'),
          dataIndex: 'effectiveState',
          width: 180,
          render: (value: PurchaseEffectiveState) => (
            <StatusTag tone={EFFECTIVE_STATE_TONE[value]}>{t(`effectiveStates.${value}`)}</StatusTag>
          )
        },
        {
          title: t('constructionSite'),
          dataIndex: 'constructionSiteName',
          width: 200,
          render: (value?: string | null) => value || '—'
        },
        {
          title: t('fulfilledAt'),
          dataIndex: 'fulfillmentAtUtc',
          width: 150,
          render: (value: string) => stamp(value)
        }
      ]}
      renderView={(purchase) => <PurchaseDetail orderId={purchase.purchaseId} />}
    />
  )
}

/** Chi tiết một lần mua đã được cấp gói + lịch sử + thao tác vòng đời. */
function PurchaseDetail({ orderId }: { orderId: string }) {
  const t = useTranslations('admin.bmtCommerce')
  const vnd = useVnd()
  const labels = useCommerceLabels()
  const detail = useQuery({
    queryKey: adminKeys.bmt('package-purchases', 'detail', orderId),
    queryFn: () => bmtCommerceApi.getPackagePurchase(orderId)
  })
  const history = useQuery({
    queryKey: adminKeys.bmt('package-purchases', 'history', orderId),
    queryFn: () => bmtCommerceApi.listPurchaseHistory(orderId)
  })

  if (detail.isPending) return <Spin />
  if (detail.isError) return <QueryError error={detail.error} />
  const purchase = detail.data
  const period = purchase.designPeriod
  const grant = purchase.supervisionGrant

  return (
    <Space orientation='vertical' size={16} style={{ width: '100%' }}>
      <Descriptions
        size='small'
        column={1}
        bordered
        title={t('purchaseBlock')}
        extra={<LifecycleActions purchase={purchase} />}
        items={[
          {
            key: 'state',
            label: t('effectiveState'),
            children: (
              <StatusTag tone={EFFECTIVE_STATE_TONE[purchase.effectiveState]}>
                {t(`effectiveStates.${purchase.effectiveState}`)}
              </StatusTag>
            )
          },
          { key: 'plan', label: t('plan'), children: purchase.planNameAtPurchase },
          { key: 'kind', label: t('kind'), children: labels.kind(purchase.kind) },
          { key: 'offer', label: t('offer'), children: labels.offer(purchase.offerKey) },
          { key: 'price', label: t('price'), children: vnd(purchase.priceVnd) },
          {
            key: 'buyer',
            label: t('buyer'),
            children: <Buyer name={purchase.buyerDisplayName} email={purchase.buyerEmail} />
          },
          { key: 'disposition', label: t('disposition'), children: t(`dispositions.${purchase.disposition}`) },
          { key: 'paid', label: t('paidAt'), children: stamp(purchase.paidAtUtc) },
          { key: 'fulfilled', label: t('fulfilledAt'), children: stamp(purchase.fulfillmentAtUtc) },
          ...(purchase.kind === 'Supervision'
            ? [{ key: 'site', label: t('constructionSite'), children: purchase.constructionSiteName || '—' }]
            : [])
        ]}
      />
      {period ? (
        <Descriptions
          size='small'
          column={1}
          bordered
          title={t('periodBlock')}
          items={[
            { key: 'state', label: t('lifecycleState'), children: t(`periodStates.${period.lifecycleState}`) },
            { key: 'starts', label: t('startsAt'), children: stamp(period.startsAtUtc) },
            { key: 'ends', label: t('endsAt'), children: stamp(period.scheduledEndsAtUtc) },
            ...(period.closedAtUtc
              ? [{ key: 'closed', label: t('closedAt'), children: stamp(period.closedAtUtc) }]
              : []),
            {
              key: 'quotas',
              label: t('quotas'),
              children: period.quotas.length ? (
                <ul className='m-0 list-disc pl-4'>
                  {period.quotas.map((quota) => (
                    <li key={quota.code}>
                      {quota.label || quota.code}:{' '}
                      {t('quotaUsage', {
                        used: quota.used,
                        reserved: quota.reserved,
                        limit: quota.isUnlimited ? t('unlimited') : String(quota.limit ?? 0)
                      })}
                    </li>
                  ))}
                </ul>
              ) : (
                '—'
              )
            }
          ]}
        />
      ) : null}
      {grant ? (
        <Descriptions
          size='small'
          column={1}
          bordered
          title={t('grantBlock')}
          items={[
            { key: 'state', label: t('lifecycleState'), children: t(`grantStates.${grant.state}`) },
            { key: 'granted', label: t('grantedAt'), children: stamp(grant.grantedAtUtc) },
            { key: 'deadline', label: t('assignmentDeadline'), children: stamp(grant.assignmentDeadlineUtc) },
            { key: 'first', label: t('firstAssignedAt'), children: stamp(grant.firstAssignedAtUtc) },
            { key: 'assigned', label: t('assignedAt'), children: stamp(grant.assignedAtUtc) }
          ]}
        />
      ) : null}
      <div>
        <Text strong style={{ display: 'block', marginBottom: 8 }}>
          {t('historyBlock')}
        </Text>
        {history.isError ? (
          <QueryError error={history.error} />
        ) : (
          <Table<BmtAdminPurchaseHistoryItem>
            rowKey={(row) => `${row.source}-${row.kind}-${row.id}-${row.atUtc}`}
            size='small'
            pagination={false}
            loading={history.isPending}
            dataSource={history.data?.items ?? []}
            scroll={{ x: 'max-content' }}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
            columns={[
              { title: t('eventAt'), dataIndex: 'atUtc', render: (value: string) => stamp(value) },
              {
                title: t('eventKind'),
                dataIndex: 'kind',
                render: (value: BmtAdminPurchaseHistoryItem['kind']) => t(`historyKinds.${value}`)
              },
              {
                title: t('actor'),
                dataIndex: 'actorDisplayName',
                render: (value?: string | null) => value || t('system')
              },
              {
                title: t('reason'),
                dataIndex: 'reason',
                render: (value: string | null | undefined, row) => (
                  <div style={{ maxWidth: 280 }}>
                    {value ? <Text style={{ whiteSpace: 'pre-wrap' }}>{value}</Text> : '—'}
                    {row.constructionSiteName ? (
                      <Text type='secondary' style={{ display: 'block', fontSize: 12 }}>
                        {[row.constructionSiteName, row.constructionSiteAddress].filter(Boolean).join(' · ')}
                      </Text>
                    ) : null}
                  </div>
                )
              }
            ]}
          />
        )}
      </div>
    </Space>
  )
}

type LifecycleAction = 'cancel' | 'complete' | 'reopen' | 'unassign'

/** Lý do tối đa 2.000 ký tự (PackageMutationRequest / UnassignRequest / ReopenRequest). */
const REASON_MAX = 2000

/**
 * Thao tác vòng đời của gói đã cấp. Nút hiện theo trạng thái; quyền thật
 * (`package.cancel`, `supervision.complete`, `supervision.unassign`) và hạn gán do
 * backend kiểm — bị từ chối thì hiện nguyên thông báo của API.
 */
function LifecycleActions({ purchase }: { purchase: BmtAdminPackagePurchaseDetail }) {
  const t = useTranslations('admin.bmtCommerce')
  const tAdmin = useTranslations('admin')
  const { message } = App.useApp()
  const { hasPermission } = useAuth()
  const queryClient = useQueryClient()
  const [form] = Form.useForm<{ reason?: string }>()
  const [action, setAction] = useState<LifecycleAction | null>(null)
  const [busy, setBusy] = useState(false)

  const packageId = purchase.packageId
  const period = purchase.designPeriod
  const grant = purchase.supervisionGrant
  if (!packageId) return null

  const available: LifecycleAction[] = []
  if (purchase.kind === 'Design' && period?.lifecycleState === 'Active') available.push('cancel')
  if (purchase.kind === 'Supervision' && grant) {
    if (grant.state === 'Assigned') available.push('complete', 'unassign')
    if (grant.state === 'Completed') available.push('reopen')
    if (grant.state !== 'CanceledByStaff') available.push('cancel')
  }
  const permitted = available.filter((item) =>
    hasPermission(
      item === 'cancel'
        ? PERMISSIONS.PACKAGE_CANCEL
        : item === 'unassign'
          ? PERMISSIONS.SUPERVISION_UNASSIGN
          : PERMISSIONS.SUPERVISION_COMPLETE
    )
  )
  if (!permitted.length) return null

  const version = (purchase.kind === 'Design' ? period?.version : grant?.version) ?? 0
  const needsReason = action !== null && action !== 'complete'

  async function run() {
    if (!action || !packageId || !permitted.includes(action)) return
    const values = needsReason ? await form.validateFields().catch(() => null) : {}
    if (!values) return
    const reason = values.reason?.trim() ?? ''
    setBusy(true)
    try {
      if (action === 'cancel') {
        await bmtCommerceApi.cancelPackage(purchase.kind, packageId, { expectedVersion: version, reason })
      } else if (action === 'complete') {
        await bmtCommerceApi.completeSupervision(packageId, { expectedVersion: version })
      } else if (action === 'reopen') {
        await bmtCommerceApi.reopenSupervision(packageId, { expectedVersion: version, reason })
      } else {
        await bmtCommerceApi.unassignSupervision(packageId, { expectedVersion: version, reason })
      }
      message.success(t(`lifecycle.${action}Done`))
      setAction(null)
      if (needsReason) form.resetFields()
    } catch (err) {
      message.error(isApiError(err) ? err.message : tAdmin('feedback.apiError'))
    } finally {
      setBusy(false)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.bmt('package-purchases') }),
        queryClient.invalidateQueries({ queryKey: adminKeys.bmt('payment-orders') })
      ])
    }
  }

  return (
    <>
      <Space size={4} wrap>
        {permitted.map((item) => (
          <Button key={item} size='small' danger={item === 'cancel'} onClick={() => setAction(item)}>
            {t(`lifecycle.${item}`)}
          </Button>
        ))}
      </Space>
      <Modal
        open={action !== null}
        title={action ? t(`lifecycle.${action}Title`) : undefined}
        okText={action ? t(`lifecycle.${action}`) : undefined}
        okButtonProps={{ danger: action === 'cancel' || action === 'unassign', loading: busy }}
        cancelText={tAdmin('actions.cancel')}
        onOk={() => void run()}
        onCancel={() => {
          setAction(null)
          if (needsReason) form.resetFields()
        }}
        destroyOnHidden
      >
        {action ? <Text style={{ display: 'block', marginBottom: 12 }}>{t(`lifecycle.${action}Body`)}</Text> : null}
        {needsReason ? (
          <Form form={form} layout='vertical'>
            <Form.Item
              name='reason'
              label={t('reason')}
              rules={[
                { required: true, whitespace: true, message: tAdmin('fields.requiredMessage') },
                { max: REASON_MAX, message: tAdmin('fields.maxLength', { max: REASON_MAX }) }
              ]}
            >
              <Input.TextArea rows={3} maxLength={REASON_MAX} showCount />
            </Form.Item>
          </Form>
        ) : null}
      </Modal>
    </>
  )
}
