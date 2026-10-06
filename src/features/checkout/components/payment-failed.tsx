'use client'

import { AlertCircle, Headset, RotateCcw } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { useRouter } from '@/i18n/navigation'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { checkoutConfirmRoute } from '@/shared/constants/routes'
import { isApiOrderId, orderDisplayCode, ORDER_HOLD_HOURS } from '../constants/checkout.constants'
import { useOrder, useRegenerateQr } from '../hooks/use-checkout'
import { CheckoutSteps } from './checkout-steps'

interface PaymentFailedProps {
  orderId: string
}

/**
 * S07 — Chưa nhận được thanh toán.
 *
 * Hai thứ bám quy tắc thay vì bám ảnh demo (R10):
 * - không có nút "Đổi hình thức thanh toán" — chỉ còn một hình thức;
 * - danh sách lý do bỏ dòng "giao dịch bị hủy ở cổng thanh toán", vì không còn
 *   cổng thanh toán nào để hủy.
 *
 * Stepper dừng ở nấc "Thanh toán" và ở trạng thái lỗi, không tô xanh cả bốn nấc.
 */
export function PaymentFailed({ orderId }: PaymentFailedProps) {
  const t = useTranslations('checkout.failed')
  const { data: order, isPending } = useOrder(orderId)
  const regenerate = useRegenerateQr(orderId)
  const router = useRouter()

  if (isPending || !order) {
    return (
      <div className='mx-auto w-full max-w-2xl px-4 py-5 lg:px-8'>
        <Skeleton className='h-80 rounded-2xl' />
      </div>
    )
  }

  return (
    // Hình S07: cột nội dung hẹp, canh giữa.
    <div className='mx-auto w-full max-w-[90rem] space-y-5 lg:space-y-6 px-4 py-5 lg:px-8 [&>*:not([data-checkout-stepper])]:mx-auto [&>*:not([data-checkout-stepper])]:max-w-lg'>
      <CheckoutSteps
        current='payment'
        error
        onPreviousStep={() => {
          router.push(checkoutConfirmRoute(order.product.id, order.projectId, order.api?.offerKey))
        }}
      />

      <div className='space-y-3 text-center'>
        <span className='bg-destructive/10 text-destructive mx-auto flex size-20 items-center justify-center rounded-full'>
          <AlertCircle className='size-10' strokeWidth={2.25} />
        </span>
        <h1 className='text-destructive text-3xl font-bold tracking-tight'>{t('title')}</h1>
        <p className='text-muted-foreground text-pretty'>{t('subtitle')}</p>
      </div>

      <section className='border-destructive/30 bg-destructive/5 rounded-2xl border p-5'>
        <h2 className='text-destructive text-sm font-semibold'>{t('reasonsTitle')}</h2>
        <ul className='mt-3 space-y-2'>
          {/* Bản mô tả S07 liệt kê ba lý do: sai nội dung chuyển khoản, giao dịch
              chưa hoàn tất, ngân hàng xử lý chậm (mã QR hết hạn là lý do thứ tư
              app tự thêm vì QR có hạn thật). */}
          {[t('reasonExpired'), t('reasonContent'), t('reasonIncomplete'), t('reasonBank')].map((reason) => (
            <li key={reason} className='flex items-start gap-2.5 border-b pb-2 text-sm last:border-b-0 last:pb-0'>
              <AlertCircle className='text-destructive mt-0.5 size-4 shrink-0' />
              <span className='text-pretty'>{reason}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className='space-y-2'>
        {/* Hình S07: nút thử lại đặc, chữ IN HOA; "Liên hệ hỗ trợ" chỉ là một
            dòng liên kết bên dưới. Nút "Đổi hình thức thanh toán" trong ảnh đã
            bỏ theo R10 — chỉ còn QR chuyển khoản. */}
        <Button
          className='h-13 w-full text-sm font-bold tracking-wide uppercase'
          size='lg'
          onClick={() => {
            // Đơn thật đã hỏng (hết hạn / huỷ) thì BE không tạo lại QR được — "tạo lại" chỉ đọc lại chính đơn đó
            // và trang QR lại đá về đây. Muốn trả tiếp phải tạo đơn MỚI cho cùng gói; BE tự đóng đơn cũ.
            if (isApiOrderId(orderId)) {
              router.push(checkoutConfirmRoute(order.product.id, order.projectId, order.api?.offerKey))
              return
            }
            regenerate.mutate()
          }}
          disabled={regenerate.isPending}
        >
          <RotateCcw className='size-4' />
          {t('retry')}
        </Button>
        <Button variant='ghost' className='w-full' onClick={() => toast.info(t('support'))}>
          <Headset className='size-4' />
          {t('support')}
        </Button>
      </div>

      <p className='text-muted-foreground text-center text-xs'>
        {t('holdNote', { code: orderDisplayCode(order), hours: ORDER_HOLD_HOURS })}
      </p>
    </div>
  )
}
