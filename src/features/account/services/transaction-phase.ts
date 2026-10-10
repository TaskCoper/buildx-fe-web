import type { CmsTransaction } from '@/shared/cms'

/**
 * Giai đoạn của một giao dịch trong lịch sử mua gói, đủ rõ để khách không nhầm "chưa chuyển tiền" với "đã nhận
 * tiền" (góp ý case 5):
 * - `awaiting` — đơn mở, CHƯA nhận tiền: hiện "Chờ thanh toán", cho tiếp tục thanh toán hoặc hủy.
 * - `partial` — đơn mở, đã nhận MỘT PHẦN tiền: chỉ tiếp tục thanh toán; BR-PAY-003 không cho khách tự hủy.
 * - `paid` — đã đủ tiền: duy nhất giai đoạn này có biên nhận.
 * - `expired` / `canceled` — đơn đóng, kèm lý do cụ thể. `failed` / `refunded` là hai trạng thái của dữ liệu mock.
 */
export type TransactionPhase = 'awaiting' | 'partial' | 'paid' | 'expired' | 'canceled' | 'failed' | 'refunded'

export function transactionPhase(transaction: Pick<CmsTransaction, 'orderState' | 'status'>): TransactionPhase {
  switch (transaction.orderState) {
    case 'Pending':
      return 'awaiting'
    case 'PartiallyPaid':
      return 'partial'
    case 'Paid':
      return 'paid'
    case 'Expired':
      return 'expired'
    case 'Canceled':
      return 'canceled'
    default:
      return transaction.status === 'pending' ? 'awaiting' : transaction.status
  }
}

/** Đơn còn mở: khách còn đường thanh toán tiếp. */
export const isOpenPhase = (phase: TransactionPhase): boolean => phase === 'awaiting' || phase === 'partial'

/** Khách tự hủy được khi chưa ghi nhận đồng nào (BR-PAY-003). */
export const canCancelPhase = (phase: TransactionPhase): boolean => phase === 'awaiting'

/** Mã đơn gọn để đọc: đơn thật lấy 8 ký tự đầu của GUID, mã mock (`TXN-…`) giữ nguyên. */
export function orderCodeOf(transaction: Pick<CmsTransaction, 'id'>): string {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(transaction.id) ? transaction.id.slice(0, 8).toUpperCase() : transaction.id
}
