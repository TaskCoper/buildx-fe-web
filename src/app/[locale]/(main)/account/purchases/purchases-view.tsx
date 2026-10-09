'use client'

import { PurchaseHistory } from '@/features/account'
import { useCancelOrderInPlace } from '@/features/checkout'

/**
 * Lịch sử mua gói + thao tác "Hủy đơn". Hủy đơn là việc của feature `checkout`, còn lịch sử thuộc `account` —
 * hai feature không import nhau nên tầng app nối chúng lại (cùng cách với các khối ghép khác của dự án).
 */
export function PurchasesView() {
  const cancelOrder = useCancelOrderInPlace()
  return <PurchaseHistory onCancelOrder={cancelOrder} />
}
