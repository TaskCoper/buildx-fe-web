import type {
  CmsConsultPackage,
  CmsPackageReview,
  CmsReport,
  CmsRescheduleRequest,
  CmsSubscription,
  CmsTransaction
} from '../cms.types'

/**
 * Seed cho các bảng vận hành mở rộng. Dữ liệu mẫu bám sát seed sẵn có (cùng tên
 * khách, cùng KTS, cùng mã lịch hẹn BOOK-...) để các màn nhìn khớp nhau.
 */

export const SUBSCRIPTIONS_SEED: CmsSubscription[] = [
  {
    id: 'SUB-2026-0101',
    customerName: 'Nguyễn Văn Hùng',
    customerEmail: 'hung.nguyen@gmail.com',
    tier: 'advanced',
    startedAt: '2026-08-13',
    expiresAt: '2026-09-12',
    status: 'active'
  },
  {
    id: 'SUB-2026-0097',
    customerName: 'Trần Thị Mai',
    customerEmail: 'mai.tran@gmail.com',
    tier: 'basic',
    startedAt: '2026-07-29',
    expiresAt: '2026-08-28',
    status: 'active'
  },
  {
    id: 'SUB-2026-0090',
    customerName: 'Lê Hoàng Nam',
    customerEmail: 'nam.le@savicogroup.vn',
    tier: 'pro',
    startedAt: '2026-08-02',
    expiresAt: '2026-11-01',
    status: 'active',
    note: 'Gia hạn thủ công 3 tháng theo hợp đồng công ty.'
  },
  {
    id: 'SUB-2026-0086',
    customerName: 'Đỗ Minh Khoa',
    customerEmail: 'khoa.do@gmail.com',
    tier: 'advanced',
    startedAt: '2026-07-20',
    expiresAt: '2026-08-19',
    status: 'expired'
  },
  {
    id: 'SUB-2026-0083',
    customerName: 'Hoàng Thị Lan',
    customerEmail: 'lan.hoang@gmail.com',
    tier: 'basic',
    startedAt: '2026-08-06',
    expiresAt: '2026-09-05',
    status: 'active'
  },
  {
    id: 'SUB-2026-0078',
    customerName: 'Bùi Quốc Đạt',
    customerEmail: 'dat.bui@nhathaudat.vn',
    tier: 'pro',
    startedAt: '2026-07-16',
    expiresAt: '2026-10-15',
    status: 'active'
  },
  {
    id: 'SUB-2026-0071',
    customerName: 'Vũ Thanh Bình',
    customerEmail: 'binh.vu@gmail.com',
    tier: 'basic',
    startedAt: '2026-06-10',
    expiresAt: '2026-07-10',
    status: 'cancelled',
    note: 'Khách yêu cầu hủy vì chưa dùng tới.'
  }
]

export const TRANSACTIONS_SEED: CmsTransaction[] = [
  // Hai giao dịch webhook sinh ra cho hai đơn `paid` trong ORDERS_SEED — thiếu
  // chúng thì biểu đồ doanh thu tháng này ra 0 trong khi thẻ KPI (đọc từ đơn) có tiền.
  {
    id: 'TXN-SVC-26010',
    orderId: 'SVC-26010',
    customerName: 'Đỗ Thanh Tâm',
    customerEmail: 'tam.do@gmail.com',
    tier: 'advanced',
    amount: 1_266_500,
    method: 'bank-qr',
    status: 'paid',
    createdAt: '2026-09-19T14:12:00+07:00'
  },
  {
    id: 'TXN-SVC-26009',
    orderId: 'SVC-26009',
    customerName: 'Võ Hoàng Long',
    customerEmail: 'long.vo@gmail.com',
    tier: 'check',
    amount: 8_900_000,
    method: 'bank-qr',
    status: 'paid',
    createdAt: '2026-09-15T10:31:00+07:00'
  },
  {
    id: 'TXN-2026-1042',
    customerName: 'Nguyễn Văn Hùng',
    customerEmail: 'hung.nguyen@gmail.com',
    tier: 'advanced',
    amount: 1_990_000,
    method: 'bank-qr',
    orderId: 'SVC-26003',
    status: 'paid',
    createdAt: '2026-08-13T09:24:00'
  },
  {
    id: 'TXN-2026-1038',
    customerName: 'Lê Hoàng Nam',
    customerEmail: 'nam.le@savicogroup.vn',
    tier: 'pro',
    amount: 14_970_000,
    method: 'bank-qr',
    orderId: 'SVC-26002',
    status: 'paid',
    createdAt: '2026-08-02T14:05:00',
    note: 'Chuyển khoản hợp đồng 3 tháng, kế toán xác nhận.'
  },
  {
    id: 'TXN-2026-1035',
    customerName: 'Hoàng Thị Lan',
    customerEmail: 'lan.hoang@gmail.com',
    tier: 'basic',
    amount: 990_000,
    method: 'bank-qr',
    status: 'paid',
    createdAt: '2026-08-06T10:12:00'
  },
  {
    id: 'TXN-2026-1031',
    customerName: 'Phạm Thu Trang',
    customerEmail: 'trang.pham@outlook.com',
    tier: 'basic',
    amount: 990_000,
    method: 'bank-qr',
    status: 'pending',
    createdAt: '2026-08-19T16:40:00'
  },
  {
    id: 'TXN-2026-1027',
    customerName: 'Đỗ Minh Khoa',
    customerEmail: 'khoa.do@gmail.com',
    tier: 'advanced',
    amount: 1_990_000,
    method: 'bank-qr',
    status: 'failed',
    createdAt: '2026-08-19T08:03:00',
    note: 'Thẻ bị từ chối — khách sẽ thử lại bằng QR.'
  },
  {
    id: 'TXN-2026-1020',
    customerName: 'Trần Thị Mai',
    customerEmail: 'mai.tran@gmail.com',
    tier: 'basic',
    amount: 990_000,
    method: 'bank-qr',
    status: 'paid',
    createdAt: '2026-07-29T11:31:00'
  },
  {
    id: 'TXN-2026-1013',
    customerName: 'Vũ Thanh Bình',
    customerEmail: 'binh.vu@gmail.com',
    tier: 'basic',
    amount: 990_000,
    method: 'bank-qr',
    status: 'refunded',
    createdAt: '2026-06-10T09:15:00',
    note: 'Hoàn tiền theo yêu cầu hủy trong 7 ngày.'
  },
  {
    id: 'TXN-2026-1008',
    customerName: 'Bùi Quốc Đạt',
    customerEmail: 'dat.bui@nhathaudat.vn',
    tier: 'pro',
    amount: 14_970_000,
    method: 'bank-qr',
    status: 'paid',
    createdAt: '2026-07-16T15:47:00'
  }
]

export const RESCHEDULE_REQUESTS_SEED: CmsRescheduleRequest[] = [
  {
    id: 'RSQ-0012',
    bookingId: 'BOOK-0002',
    customerName: 'Trần Thị Mai',
    consultantName: 'KTS. Đặng Thị Lan Hương',
    fromDate: '2026-08-18',
    fromTime: '14:30',
    toDate: '2026-08-22',
    toTime: '09:00',
    reason: 'Bận việc đột xuất, xin dời sang cuối tuần.',
    status: 'pending',
    createdAt: '2026-08-17'
  },
  {
    id: 'RSQ-0011',
    bookingId: 'BOOK-0007',
    customerName: 'Ngô Kim Chi',
    consultantName: 'KTS. Trần Văn Hùng',
    fromDate: '2026-08-21',
    fromTime: '14:00',
    toDate: '2026-08-25',
    toTime: '10:00',
    reason: 'Muốn có thêm thời gian chuẩn bị bảng dự toán so sánh.',
    status: 'pending',
    createdAt: '2026-08-18'
  },
  {
    id: 'RSQ-0009',
    bookingId: 'BOOK-0005',
    customerName: 'Đỗ Minh Khoa',
    consultantName: 'KTS. Vũ Thị Minh Châu',
    fromDate: '2026-08-15',
    fromTime: '10:00',
    toDate: '2026-08-20',
    toTime: '08:30',
    status: 'approved',
    createdAt: '2026-08-13'
  },
  {
    id: 'RSQ-0007',
    bookingId: 'BOOK-0006',
    customerName: 'Hoàng Thị Lan',
    consultantName: 'KTS. Trần Quang Vinh',
    fromDate: '2026-08-13',
    fromTime: '16:00',
    toDate: '2026-08-14',
    toTime: '16:00',
    reason: 'Xin dời một ngày.',
    status: 'rejected',
    createdAt: '2026-08-12'
  }
]

export const CONSULT_PACKAGES_SEED: CmsConsultPackage[] = [
  {
    id: 'cpk-intro',
    name: 'Tư vấn làm quen',
    sessions: 1,
    durationMinutes: 30,
    price: 0,
    description: 'Một buổi gọi ngắn để nghe nhu cầu và định hướng phương án — miễn phí cho mọi khách.',
    enabled: true
  },
  {
    id: 'cpk-basic',
    name: 'Tư vấn phương án',
    sessions: 2,
    durationMinutes: 45,
    price: 990_000,
    description: 'Hai buổi làm việc với KTS: rà phương án AI đề xuất và tinh chỉnh theo lô đất thật.',
    enabled: true
  },
  {
    id: 'cpk-deep',
    name: 'Đồng hành thiết kế',
    sessions: 5,
    durationMinutes: 60,
    price: 3_990_000,
    description: 'Năm buổi theo suốt từ bản vẽ tới hồ sơ thi công, ưu tiên lịch KTS trưởng.',
    enabled: true
  },
  {
    id: 'cpk-site',
    name: 'Khảo sát tận nơi',
    sessions: 1,
    durationMinutes: 120,
    price: 2_490_000,
    description: 'KTS tới lô đất khảo sát trực tiếp — hiện áp dụng khu vực TP. Hồ Chí Minh.',
    enabled: false
  }
]

export const PACKAGE_REVIEWS_SEED: CmsPackageReview[] = [
  {
    id: 'RV-0031',
    packageName: 'Tư vấn phương án',
    customerName: 'Nguyễn Văn Hùng',
    rating: 5,
    content: 'KTS chỉ ra hai lỗi bố trí trong bản AI, sửa xong nhìn hợp lý hơn hẳn. Rất đáng tiền.',
    status: 'approved',
    createdAt: '2026-08-15'
  },
  {
    id: 'RV-0030',
    packageName: 'Đồng hành thiết kế',
    customerName: 'Bùi Quốc Đạt',
    rating: 4,
    content: 'Theo sát và trả lời nhanh. Trừ một sao vì lịch buổi cuối phải dời hai lần.',
    status: 'approved',
    createdAt: '2026-08-12'
  },
  {
    id: 'RV-0029',
    packageName: 'Tư vấn làm quen',
    customerName: 'Phạm Thu Trang',
    rating: 5,
    content: 'Buổi gọi miễn phí nhưng tư vấn rất thật, không chèo kéo mua gói.',
    status: 'pending',
    createdAt: '2026-08-18'
  },
  {
    id: 'RV-0028',
    packageName: 'Tư vấn phương án',
    customerName: 'Khách ẩn danh',
    rating: 1,
    content: 'Liên hệ 0909xxxx để mua bản vẽ giá rẻ hơn nhiều!!!',
    status: 'pending',
    createdAt: '2026-08-17'
  },
  {
    id: 'RV-0026',
    packageName: 'Khảo sát tận nơi',
    customerName: 'Lê Hoàng Nam',
    rating: 2,
    content: 'KTS tới trễ 40 phút, buổi khảo sát bị rút ngắn.',
    status: 'rejected',
    createdAt: '2026-08-10'
  }
]

export const REPORTS_SEED: CmsReport[] = [
  {
    id: 'RPT-0009',
    reporterName: 'Nguyễn Văn Hùng',
    targetType: 'review',
    targetLabel: 'Review RV-0028 — "Tư vấn phương án"',
    reason: 'Review chứa số điện thoại quảng cáo dịch vụ ngoài.',
    status: 'open',
    createdAt: '2026-08-18'
  },
  {
    id: 'RPT-0008',
    reporterName: 'Trần Thị Mai',
    targetType: 'content',
    targetLabel: 'Bài viết "Chi phí làm móng nhà phố cập nhật 08/2026"',
    reason: 'Bảng giá trong bài không khớp với đơn giá đang hiển thị ở Bước 2.',
    status: 'open',
    createdAt: '2026-08-16'
  },
  {
    id: 'RPT-0007',
    reporterName: 'Đỗ Minh Khoa',
    targetType: 'consultant',
    targetLabel: 'KTS. Trần Quang Vinh',
    reason: 'Không nhận được cuộc gọi dù lịch đã xác nhận.',
    status: 'resolved',
    createdAt: '2026-08-11'
  },
  {
    id: 'RPT-0005',
    reporterName: 'Khách ẩn danh',
    targetType: 'review',
    targetLabel: 'Review RV-0026 — "Khảo sát tận nơi"',
    reason: 'Cho rằng review nói sai sự thật.',
    status: 'dismissed',
    createdAt: '2026-08-08'
  }
]
