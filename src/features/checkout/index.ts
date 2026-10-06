/**
 * Public API của feature `checkout` — MUA GÓI (S03–S08).
 *
 * R10: chỉ QR chuyển khoản. Không có màn nào, hàm nào hay type nào cho thẻ /
 * cổng thanh toán.
 */
export { CheckoutDone } from './components/checkout-done'
export { CheckoutSteps } from './components/checkout-steps'
export { OrderConfirm } from './components/order-confirm'
export { PaymentFailed } from './components/payment-failed'
export { QrPayment } from './components/qr-payment'
export { VerifyingTransfer } from './components/verifying-transfer'

export { useOrder } from './hooks/use-checkout'
export { isApiOrderId } from './constants/checkout.constants'
export type { OfferKey, Order, OrderKind, OrderStatus } from './types/checkout.types'
