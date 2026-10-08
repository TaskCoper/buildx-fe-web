/** Query-key factory cho feature `checkout` (S03–S08). */
export const checkoutKeys = {
  all: ['checkout'] as const,
  orders: () => [...checkoutKeys.all, 'order'] as const,
  /** Một đơn hàng — mọi màn từ S04 tới S08 đều đọc key này. */
  order: (orderId: string) => [...checkoutKeys.orders(), orderId] as const,
  /** Đơn thiết kế đang chờ thanh toán của khách (màn xác nhận đơn). */
  pendingDesign: () => [...checkoutKeys.all, 'pending-design'] as const
} as const
