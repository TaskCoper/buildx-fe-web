import { http } from '@/shared/lib/api'
import type { PagedResult } from '@/shared/types'

/**
 * Tra cứu thương mại (CommerceAdmin, quyền `commerce.read`) và vòng đời gói đã
 * bán (PackageLifecycle, SupervisionCompletion, SupervisionUnassign).
 *
 * Đơn, giao dịch ngân hàng và gói đã cấp đều CHỈ ĐỌC: trạng thái thanh toán do
 * backend khớp từ webhook SePay, không có thao tác xác nhận hay gán tay. Số tiền
 * là chuỗi số nguyên VND. Thời điểm là ISO 8601 UTC; lọc `fromUtc` tính cả mốc,
 * `toUtc` không tính mốc. Trang tối đa 100 dòng.
 */

export type CommerceKind = 'Design' | 'Supervision'
export type CommerceOfferKey = 'Month' | 'Year' | 'ConstructionSite'
export type PaymentOrderState = 'Pending' | 'PartiallyPaid' | 'Paid' | 'Expired' | 'Canceled'
export type FulfillmentDisposition = 'Activated' | 'SupersededBeforeActivation'
export type BankMatchState = 'Pending' | 'Matched' | 'Unmatched' | 'IgnoredDirection' | 'ConnectionMismatch'
export type BankProcessingState = 'Pending' | 'Retry' | 'Completed'
export type PurchaseEffectiveState =
  | 'Active'
  | 'Expired'
  | 'CanceledByStaff'
  | 'Superseded'
  | 'SupersededBeforeActivation'
  | 'Unassigned'
  | 'ExpiredUnassigned'
  | 'Assigned'
  | 'Completed'
export type SupervisionGrantState = 'Unassigned' | 'Assigned' | 'CanceledByStaff' | 'Completed'

export interface BmtAdminPaymentOrderSummary {
  id: string
  buyerId: string
  buyerDisplayName: string
  buyerEmail: string
  planId: string
  revisionId: string
  planNameAtPurchase: string
  kind: CommerceKind
  offerKey: CommerceOfferKey
  state: PaymentOrderState
  priceVnd: string
  receivedAmountVnd: string
  eligibleAmountVnd: string
  paymentCode: string
  createdAtUtc: string
  expiresAtUtc: string
  paidAtUtc?: string | null
  orderingDiscrepancy: boolean
  fulfillmentDisposition?: FulfillmentDisposition | null
}

export interface BmtAdminFulfillmentView {
  disposition: FulfillmentDisposition
  packageId?: string | null
  completedAtUtc: string
  appliedPaidAtUtc: string
}

export interface BmtAdminPaymentOrderDetail extends BmtAdminPaymentOrderSummary {
  currency: string
  remainingAmountVnd: string
  extraReceivedAmountVnd: string
  connectionId: string
  canceledAtUtc?: string | null
  expiredAtUtc?: string | null
  version: number
  transactionCount: number
  fulfillment?: BmtAdminFulfillmentView | null
  transactionsPath: string
  eventsPath: string
  purchasePath?: string | null
  historyPath?: string | null
}

export interface BmtAdminPaymentOrderEvent {
  id: string
  atUtc: string
  kind: 'Created' | 'Canceled' | 'Expired' | 'Paid' | 'Fulfilled' | 'OrderingDiscrepancy'
  actorId?: string | null
  actorDisplayName?: string | null
  transactionId?: string | null
  detail?: unknown
}

export interface BmtAdminBankTransactionSummary {
  id: string
  providerTransactionId: number
  occurredAtUtc: string
  receivedAtUtc: string
  amountVnd: string
  direction: 'in' | 'out'
  code?: string | null
  /** Nội dung chuyển khoản như ngân hàng gửi — CHỈ hiển thị dạng chữ, không render HTML. */
  content: string
  referenceCode?: string | null
  matchState: BankMatchState
  matchLabel?: string | null
  processingState: BankProcessingState
  orderId?: string | null
  buyerId?: string | null
  buyerDisplayName?: string | null
  buyerEmail?: string | null
  packageId?: string | null
}

export interface BmtAdminBankTransactionDetail extends BmtAdminBankTransactionSummary {
  connectionId: string
  receivedAccountNumber: string
  receivedGateway: string
  receivedSubAccount?: string | null
  attempts: number
  orderPaymentCode?: string | null
  orderPath?: string | null
}

export interface BmtAdminPackagePurchaseSummary {
  purchaseId: string
  kind: CommerceKind
  buyerId: string
  buyerDisplayName: string
  buyerEmail: string
  planId: string
  revisionId: string
  planNameAtPurchase: string
  offerKey: CommerceOfferKey
  priceVnd: string
  paidAtUtc?: string | null
  fulfillmentAtUtc: string
  disposition: FulfillmentDisposition
  packageId?: string | null
  effectiveState: PurchaseEffectiveState
  constructionSiteId?: string | null
  constructionSiteName?: string | null
}

export interface BmtAdminQuotaView {
  code: string
  label: string
  isUnlimited: boolean
  limit?: number | null
  used: number
  reserved: number
}

export interface BmtAdminDesignPeriodView {
  cycle: CommerceOfferKey
  lifecycleState: 'Active' | 'CanceledByStaff' | 'Superseded'
  startsAtUtc: string
  scheduledEndsAtUtc: string
  closedAtUtc?: string | null
  version: number
  quotas: BmtAdminQuotaView[]
}

export interface BmtAdminSupervisionGrantView {
  state: SupervisionGrantState
  grantedAtUtc: string
  assignmentDeadlineUtc: string
  firstAssignedAtUtc?: string | null
  assignedAtUtc?: string | null
  version: number
}

export interface BmtAdminPackagePurchaseDetail extends BmtAdminPackagePurchaseSummary {
  appliedPaidAtUtc: string
  orderingDiscrepancy: boolean
  designPeriod?: BmtAdminDesignPeriodView | null
  supervisionGrant?: BmtAdminSupervisionGrantView | null
  orderPath: string
  historyPath: string
}

export interface BmtAdminPurchaseHistoryItem {
  id: string
  atUtc: string
  source: 'Payment' | 'PackageLifecycle' | 'Assignment'
  kind:
    | 'Created'
    | 'Canceled'
    | 'Expired'
    | 'Paid'
    | 'Fulfilled'
    | 'OrderingDiscrepancy'
    | 'Cancel'
    | 'Restore'
    | 'Complete'
    | 'Reopen'
    | 'Unassign'
    | 'FirstAssigned'
    | 'CurrentAssigned'
  actorId?: string | null
  actorDisplayName?: string | null
  reason?: string | null
  fromState?: string | null
  toState?: string | null
  transactionId?: string | null
  constructionSiteId?: string | null
  constructionSiteName?: string | null
  constructionSiteAddress?: string | null
  detail?: unknown
}

export interface BmtPackageMutated {
  packageId: string
  packageKind: CommerceKind
  lifecycleState: string
  version: number
  eventId: string
  wasAlreadyApplied: boolean
}

interface PageQuery {
  pageIndex: number
  pageSize: number
}

export interface PaymentOrderQuery extends PageQuery {
  customerId?: string
  planId?: string
  kind?: CommerceKind
  state?: PaymentOrderState
  paymentCode?: string
  fromUtc?: string
  toUtc?: string
}

export interface BankTransactionQuery extends PageQuery {
  orderId?: string
  customerId?: string
  matchState?: BankMatchState
  providerTransactionId?: string
  fromUtc?: string
  toUtc?: string
}

export interface PackagePurchaseQuery extends PageQuery {
  customerId?: string
  planId?: string
  kind?: CommerceKind
  disposition?: FulfillmentDisposition
  effectiveState?: PurchaseEffectiveState
}

/** Thao tác vòng đời cần `Idempotency-Key` — mỗi lần bấm một khóa mới. */
const idempotent = () => ({ headers: { 'Idempotency-Key': crypto.randomUUID() } })

export const bmtCommerceApi = {
  listPaymentOrders: (params: PaymentOrderQuery) =>
    http.get<PagedResult<BmtAdminPaymentOrderSummary>>('/admin/payment-orders', { params }),
  getPaymentOrder: (orderId: string) => http.get<BmtAdminPaymentOrderDetail>(`/admin/payment-orders/${orderId}`),
  listPaymentOrderEvents: (orderId: string, params: PageQuery = { pageIndex: 1, pageSize: 100 }) =>
    http.get<PagedResult<BmtAdminPaymentOrderEvent>>(`/admin/payment-orders/${orderId}/events`, { params }),

  listBankTransactions: (params: BankTransactionQuery) =>
    http.get<PagedResult<BmtAdminBankTransactionSummary>>('/admin/bank-transactions', { params }),
  getBankTransaction: (transactionId: string) =>
    http.get<BmtAdminBankTransactionDetail>(`/admin/bank-transactions/${transactionId}`),

  listPackagePurchases: (params: PackagePurchaseQuery) =>
    http.get<PagedResult<BmtAdminPackagePurchaseSummary>>('/admin/package-purchases', { params }),
  /** `orderId` là mã đơn của lần mua; đơn chưa được cấp gói trả 404. */
  getPackagePurchase: (orderId: string) =>
    http.get<BmtAdminPackagePurchaseDetail>(`/admin/package-purchases/${orderId}`),
  listPurchaseHistory: (orderId: string, params: PageQuery = { pageIndex: 1, pageSize: 100 }) =>
    http.get<PagedResult<BmtAdminPurchaseHistoryItem>>(`/admin/package-purchases/${orderId}/history`, { params }),

  /** Hủy hiệu lực gói đã bán — không khôi phục, không hoàn tiền. Quyền `package.cancel`. */
  cancelPackage: (kind: CommerceKind, packageId: string, body: { expectedVersion: number; reason: string }) =>
    http.post<BmtPackageMutated>(`/admin/packages/${kind}/${packageId}/cancel`, body, idempotent()),
  completeSupervision: (grantId: string, body: { expectedVersion: number }) =>
    http.post<BmtPackageMutated>(`/admin/supervision-grants/${grantId}/complete`, body, idempotent()),
  reopenSupervision: (grantId: string, body: { expectedVersion: number; reason: string }) =>
    http.post<BmtPackageMutated>(`/admin/supervision-grants/${grantId}/reopen`, body, idempotent()),
  unassignSupervision: (grantId: string, body: { expectedVersion: number; reason: string }) =>
    http.post<BmtPackageMutated>(`/admin/supervision-grants/${grantId}/unassign`, body, idempotent())
}
