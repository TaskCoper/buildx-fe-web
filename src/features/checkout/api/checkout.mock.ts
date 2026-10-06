import { cmsDb, evaluateDiscount, transferInfoFor, type CmsTransaction, resolvePlanGift } from '@/shared/cms'
import { mockDelay } from '@/shared/lib/mock'
import { QR_TTL_MINUTES } from '../constants/checkout.constants'
import type { CreateOrderPayload, Order, OrderProduct } from '../types/checkout.types'

/**
 * Mock trong trình duyệt của luồng mua gói (S03–S08), bật bằng
 * `NEXT_PUBLIC_USE_MOCK_API=true`.
 *
 * Đơn nằm ở bảng `orders` của `shared/cms` (localStorage): luồng đi qua nhiều
 * lần tải trang và người dùng hoàn toàn có thể F5 giữa chừng, và màn tra cứu
 * `/admin/orders` đọc cùng bảng đó.
 *
 * Bản thật: ngân hàng / cổng QR bắn WEBHOOK về backend khi tiền về, backend đổi
 * đơn sang `paid` — không ai xác nhận bằng tay. Mock giả lập đúng việc đó: đơn
 * đã báo chuyển khoản đủ `WEBHOOK_DELAY_MS` thì tự sang `paid` và ghi một dòng
 * vào sổ giao dịch, như backend sẽ làm khi nhận webhook.
 */

/** Sau khi khách bấm "Tôi đã chuyển khoản", mock coi như webhook báo có sau ngần này. */
const WEBHOOK_DELAY_MS = 8_000

type TransactionTier = CmsTransaction['tier']

function findOrder(orderId: string): Order {
  const order = cmsDb.find('orders', orderId)
  if (!order) throw new Error(`Mock: không tìm thấy đơn hàng ${orderId}`)
  return order
}

/**
 * Mã đơn `SVC-YYNNN` như trên bản mô tả (#SVC-24001) — số kế tiếp sau mã lớn
 * nhất của năm nay, để đơn mới không đè lên đơn mẫu.
 */
function nextOrderId(): string {
  const year = String(new Date().getFullYear()).slice(-2)
  const prefix = `SVC-${year}`
  const highest = cmsDb
    .list('orders')
    .map((order) => (order.id.startsWith(prefix) ? Number(order.id.slice(prefix.length)) : 0))
    .reduce((max, value) => (Number.isFinite(value) && value > max ? value : max), 0)
  return `${prefix}${String(highest + 1).padStart(3, '0')}`
}

/** Bản chụp sản phẩm từ kho nội dung — giá đổi sau đó không làm đơn cũ đổi theo. */
function productSnapshot(payload: CreateOrderPayload): OrderProduct {
  if (payload.kind === 'design') {
    const plan = cmsDb.list('plans').find((item) => item.id === payload.productId)
    // Gói Ẩn không được tạo đơn mới (DesignPackageManagement §1).
    if (!plan || plan.status !== 'selling') throw new Error(`Mock: gói thiết kế ${payload.productId} không mở bán`)
    const gift = resolvePlanGift(plan, cmsDb.list('gifts'))
    return {
      id: plan.id,
      kind: 'design',
      name: plan.name,
      price: plan.price,
      // Hình S03: ba dòng quyền lợi trong thẻ đơn hàng là SỐ LƯỢT của gói
      // (phương án · lượt chỉnh sửa · lượt tra thư viện), không phải ba tính
      // năng đầu tiên — cắt `features` thì dòng thứ ba ra "Dự toán nội thất".
      benefits: [`${plan.designCredits} phương án thiết kế`, `${plan.libraryCredits} lượt tra cứu thư viện mẫu`],
      // Snapshot lúc tạo đơn: đổi cấu hình gói sau này không làm đơn cũ đổi theo.
      // Chu kỳ dùng chung, snapshot vào đơn (§4).
      periodDays: cmsDb.getDocument('planSettings').periodDays,
      designCredits: plan.designCredits,
      libraryCredits: plan.libraryCredits,
      ...(gift ? { gift: { title: gift.title, conditions: gift.conditions } } : {})
    }
  }

  const supervision = cmsDb.list('supervisionPackages').find((item) => item.id === payload.productId)
  if (!supervision) throw new Error(`Mock: không tìm thấy gói giám sát ${payload.productId}`)
  return {
    id: supervision.id,
    kind: 'supervision',
    name: supervision.tier,
    price: supervision.price,
    benefits: supervision.benefits.slice(0, 3),
    periodDays: supervision.durationMonths * 30
  }
}

/** Snapshot hình thức + giá trị cấu hình của mã lúc tạo đơn. */
function snapshotOfCode(code: string): Pick<Order, 'discountType' | 'discountValue'> {
  const config = cmsDb.list('discountCodes').find((item) => item.code === code)
  return config ? { discountType: config.type, discountValue: config.value } : {}
}

function expiryFromNow(): string {
  return new Date(Date.now() + QR_TTL_MINUTES * 60_000).toISOString()
}

export const mockCheckoutApi = {
  createOrder: async (payload: CreateOrderPayload): Promise<Order> => {
    await mockDelay(350)
    const product = productSnapshot(payload)
    // Kiểm lại mã ở "máy chủ": ô nhập mã ở S03 đã báo hợp lệ không có nghĩa là
    // tới lúc bấm thanh toán mã vẫn còn lượt.
    const discount = payload.discountCode
      ? evaluateDiscount(
          payload.discountCode,
          { productId: product.id, subtotal: product.price, email: payload.buyer.email },
          cmsDb.list('discountCodes'),
          cmsDb.list('orders')
        )
      : null
    const discountAmount = discount?.ok ? discount.amount : 0
    const total = product.price - discountAmount
    const id = nextOrderId()

    const order: Order = {
      id,
      product,
      ...(payload.projectId ? { projectId: payload.projectId } : {}),
      buyer: payload.buyer,
      invoice: payload.invoice,
      discountCode: discount?.ok ? discount.code : '',
      ...(discount?.ok ? snapshotOfCode(discount.code) : {}),
      subtotal: product.price,
      discountAmount,
      total,
      status: 'awaiting',
      createdAt: new Date().toISOString(),
      expiresAt: expiryFromNow(),
      transfer: transferInfoFor(id, total)
    }

    return cmsDb.upsert('orders', order)
  },

  getOrder: async (orderId: string): Promise<Order> => {
    await mockDelay(150)
    const order = findOrder(orderId)

    // Giả lập webhook tiền về.
    const transferredAt = order.transferredAt ? new Date(order.transferredAt).getTime() : null
    if (order.status === 'verifying' && transferredAt && Date.now() - transferredAt >= WEBHOOK_DELAY_MS) {
      const paidAt = new Date().toISOString()
      cmsDb.upsert('transactions', {
        id: `TXN-${order.id}`,
        orderId: order.id,
        customerName: order.buyer.name,
        customerEmail: order.buyer.email,
        tier: order.product.id as TransactionTier,
        amount: order.total,
        method: 'bank-qr',
        status: 'paid',
        createdAt: paidAt
      })
      return cmsDb.upsert('orders', { ...order, status: 'paid', paidAt })
    }

    // Hết hạn mã QR mà chưa báo chuyển khoản → màn "Chưa nhận được thanh toán" (S07).
    if (order.status === 'awaiting' && new Date(order.expiresAt).getTime() < Date.now()) {
      return cmsDb.upsert('orders', { ...order, status: 'failed' })
    }

    return order
  },

  markTransferred: async (orderId: string): Promise<Order> => {
    await mockDelay(250)
    const order = findOrder(orderId)
    return cmsDb.upsert('orders', { ...order, status: 'verifying', transferredAt: new Date().toISOString() })
  },

  regenerateQr: async (orderId: string): Promise<Order> => {
    await mockDelay(250)
    const { transferredAt: _dropped, ...order } = findOrder(orderId)
    return cmsDb.upsert('orders', {
      ...order,
      status: 'awaiting',
      expiresAt: expiryFromNow(),
      transfer: transferInfoFor(order.id, order.total)
    })
  },

  cancelOrder: async (orderId: string): Promise<Order> => {
    await mockDelay(250)
    const order = findOrder(orderId)
    return cmsDb.upsert('orders', { ...order, status: 'cancelled' })
  }
}
