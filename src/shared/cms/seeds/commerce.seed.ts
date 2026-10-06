import type { CmsDiscountCode, CmsOrder } from '../cms.types'
import { transferInfoFor } from '../commerce'

/**
 * Mã giảm giá đang chạy. `KHAITRUONG −15%` là mã in trên ảnh S03.
 */
export const DISCOUNT_CODES_SEED: CmsDiscountCode[] = [
  {
    id: 'dc-khaitruong',
    code: 'KHAITRUONG',
    type: 'percent',
    value: 15,
    maxDiscount: null,
    minOrder: null,
    startsAt: '2026-09-01',
    endsAt: '2026-12-31',
    usageLimit: 200,
    perAccountLimit: 1,
    productIds: [],
    enabled: true,
    note: 'Chương trình khai trương — mọi gói.'
  },
  {
    id: 'dc-pro500',
    code: 'PRO500K',
    type: 'amount',
    value: 500_000,
    maxDiscount: null,
    minOrder: 3_000_000,
    startsAt: null,
    endsAt: null,
    usageLimit: 50,
    perAccountLimit: 1,
    productIds: ['pro'],
    enabled: true,
    note: 'Giảm thẳng cho gói PRO.'
  },
  {
    id: 'dc-hethan',
    code: 'THANG8',
    type: 'percent',
    value: 10,
    maxDiscount: 300_000,
    minOrder: null,
    startsAt: '2026-08-01',
    endsAt: '2026-08-31',
    usageLimit: null,
    perAccountLimit: null,
    productIds: [],
    enabled: false,
    note: 'Đã kết thúc — giữ lại để tra đơn cũ.'
  }
]

const EMPTY_INVOICE = { enabled: false, company: '', taxCode: '', address: '', email: '' }

function order(
  id: string,
  fields: Pick<CmsOrder, 'product' | 'buyer' | 'status' | 'createdAt' | 'expiresAt'> &
    Partial<Omit<CmsOrder, 'id' | 'transfer'>>
): CmsOrder {
  const subtotal = fields.subtotal ?? fields.product.price
  const discountAmount = fields.discountAmount ?? 0
  const total = subtotal - discountAmount
  return {
    id,
    invoice: EMPTY_INVOICE,
    discountCode: '',
    subtotal,
    discountAmount,
    total,
    transfer: transferInfoFor(id, total),
    ...fields
  }
}

const PLUS = {
  id: 'advanced',
  kind: 'design' as const,
  name: 'advanced',
  price: 1_490_000,
  benefits: ['5 phương án thiết kế', '5 lượt chỉnh sửa phương án', '30 lượt tra cứu thư viện mẫu']
}
const PRO = {
  id: 'pro',
  kind: 'design' as const,
  name: 'pro',
  price: 3_990_000,
  benefits: ['10 phương án thiết kế', '10 lượt chỉnh sửa phương án', '100 lượt tra cứu thư viện mẫu']
}
const BASIC = {
  id: 'basic',
  kind: 'design' as const,
  name: 'basic',
  price: 399_000,
  benefits: ['1 phương án thiết kế', '1 lượt chỉnh sửa phương án', '10 lượt tra cứu thư viện mẫu']
}
const CHECK = {
  id: 'check',
  kind: 'supervision' as const,
  name: 'check',
  price: 8_900_000,
  benefits: ['Kiểm tra 6 giai đoạn', '4 lượt kiểm tra hiện trường', 'Báo cáo sau mỗi giai đoạn']
}

/**
 * Đơn mẫu cho màn tra cứu `/admin/orders` — đủ mọi trạng thái để thấy bộ lọc
 * chạy. Trạng thái do webhook của backend cập nhật, không ai sửa tay:
 *
 * - 2 đơn `verifying`: khách báo đã chuyển, đang chờ webhook báo có. Một đơn có
 *   mã giảm giá để thấy tổng tiền là số SAU giảm.
 * - 1 đơn `awaiting` còn hạn QR, 1 đơn `failed` (hết 15 phút chưa thấy tiền).
 * - 2 đơn `paid`, một trong đó là gói giám sát gắn với dự án (R8).
 */
export const ORDERS_SEED: CmsOrder[] = [
  order('SVC-26014', {
    product: PRO,
    buyer: { name: 'Trần Minh Khoa', phone: '0903 456 789', email: 'khoa.tran@gmail.com' },
    discountCode: 'KHAITRUONG',
    discountAmount: 598_500,
    status: 'verifying',
    createdAt: '2026-09-21T08:12:00+07:00',
    expiresAt: '2026-09-21T08:27:00+07:00',
    transferredAt: '2026-09-21T08:16:00+07:00'
  }),
  order('SVC-26013', {
    product: CHECK,
    projectId: 'SVC-2026-0004',
    buyer: { name: 'Lê Thu Hà', phone: '0912 888 246', email: 'thuha.le@gmail.com' },
    invoice: {
      enabled: true,
      company: 'Công ty TNHH Hà Lê',
      taxCode: '6001234567',
      address: '12 Lê Duẩn, TP. Buôn Ma Thuột',
      email: 'ketoan@hale.vn'
    },
    status: 'verifying',
    createdAt: '2026-09-21T07:40:00+07:00',
    expiresAt: '2026-09-21T07:55:00+07:00',
    transferredAt: '2026-09-21T07:47:00+07:00'
  }),
  order('SVC-26012', {
    product: PLUS,
    buyer: { name: 'Phạm Quốc Bảo', phone: '0938 112 233', email: 'bao.pham@yahoo.com' },
    status: 'awaiting',
    createdAt: '2026-09-21T09:02:00+07:00',
    expiresAt: '2026-09-21T09:17:00+07:00'
  }),
  order('SVC-26011', {
    product: BASIC,
    buyer: { name: 'Nguyễn Hoài Nam', phone: '0977 654 321', email: 'nam.nguyen@gmail.com' },
    status: 'failed',
    createdAt: '2026-09-20T20:31:00+07:00',
    expiresAt: '2026-09-20T20:46:00+07:00',
    opsNote: 'Khách gọi hỏi, đã hướng dẫn tạo lại mã QR.'
  }),
  order('SVC-26010', {
    product: PLUS,
    buyer: { name: 'Đỗ Thanh Tâm', phone: '0909 222 333', email: 'tam.do@gmail.com' },
    discountCode: 'KHAITRUONG',
    discountAmount: 223_500,
    status: 'paid',
    createdAt: '2026-09-19T14:05:00+07:00',
    expiresAt: '2026-09-19T14:20:00+07:00',
    transferredAt: '2026-09-19T14:09:00+07:00',
    paidAt: '2026-09-19T14:12:00+07:00'
  }),
  order('SVC-26009', {
    product: CHECK,
    projectId: 'SVC-2026-0001',
    buyer: { name: 'Võ Hoàng Long', phone: '0914 777 888', email: 'long.vo@gmail.com' },
    status: 'paid',
    createdAt: '2026-09-15T10:20:00+07:00',
    expiresAt: '2026-09-15T10:35:00+07:00',
    transferredAt: '2026-09-15T10:26:00+07:00',
    paidAt: '2026-09-15T10:31:00+07:00'
  }),
  order('SVC-26003', {
    product: PLUS,
    buyer: { name: 'Nguyễn Văn Hùng', phone: '0901 234 567', email: 'hung.nguyen@gmail.com' },
    status: 'paid',
    createdAt: '2026-08-13T09:10:00+07:00',
    expiresAt: '2026-08-13T09:25:00+07:00',
    transferredAt: '2026-08-13T09:18:00+07:00',
    paidAt: '2026-08-13T09:24:00+07:00'
  }),
  order('SVC-26002', {
    product: PRO,
    buyer: { name: 'Lê Hoàng Nam', phone: '0987 654 321', email: 'nam.le@savicogroup.vn' },
    status: 'paid',
    createdAt: '2026-08-01T15:40:00+07:00',
    expiresAt: '2026-08-01T15:55:00+07:00',
    transferredAt: '2026-08-01T15:44:00+07:00',
    paidAt: '2026-08-01T15:47:00+07:00'
  })
]
