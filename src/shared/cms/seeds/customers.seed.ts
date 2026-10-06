import type { CmsCustomerPackage, CmsQuotaEvent } from '../cms.types'

/**
 * Gói đã cấp và lịch sử lượt của khách (epic UserAccountManagement §3, §6) —
 * lấy theo snapshot của đơn đã mua. Backend sinh; admin chỉ xem.
 */
export const CUSTOMER_PACKAGES_SEED: CmsCustomerPackage[] = [
  {
    id: 'pkg-0001',
    customerId: 'usr-0001',
    kind: 'design',
    planName: 'PLUS',
    planCode: 'PLUS',
    orderId: 'SVC-26003',
    startsAt: '2026-08-13T09:24:00+07:00',
    endsAt: '2026-11-11T09:24:00+07:00',
    status: 'active',
    benefits: ['5 phương án thiết kế', '5 lượt chỉnh sửa phương án', '30 lượt tra cứu thư viện mẫu'],
    designQuota: { granted: 5, held: 0, used: 1 },
    libraryQuota: { granted: 30, held: 0, used: 4 }
  },
  {
    id: 'pkg-0002',
    customerId: 'usr-0003',
    kind: 'design',
    planName: 'PRO',
    planCode: 'PRO',
    orderId: 'SVC-26002',
    startsAt: '2026-08-01T15:47:00+07:00',
    endsAt: '2026-10-30T15:47:00+07:00',
    status: 'active',
    benefits: ['10 phương án thiết kế', '10 lượt chỉnh sửa phương án', '100 lượt tra cứu thư viện mẫu'],
    designQuota: { granted: 10, held: 1, used: 3 },
    libraryQuota: { granted: 100, held: 0, used: 18 },
    gift: {
      title: 'Bộ thiết bị vệ sinh châu Âu',
      conditions: 'Áp dụng khi ký hợp đồng thi công trọn gói cùng BuildX trong thời hạn gói.'
    }
  },
  {
    id: 'pkg-0003',
    customerId: 'usr-0011',
    kind: 'design',
    planName: 'PLUS',
    planCode: 'PLUS',
    orderId: 'SVC-26010',
    startsAt: '2026-09-19T14:12:00+07:00',
    endsAt: '2026-12-18T14:12:00+07:00',
    status: 'active',
    benefits: ['5 phương án thiết kế', '5 lượt chỉnh sửa phương án', '30 lượt tra cứu thư viện mẫu'],
    designQuota: { granted: 5, held: 0, used: 1 },
    libraryQuota: { granted: 30, held: 0, used: 4 }
  },
  {
    id: 'pkg-0004',
    customerId: 'usr-0012',
    kind: 'supervision',
    planName: 'Gói An Tâm',
    planCode: 'CHECK',
    orderId: 'SVC-26009',
    startsAt: '2026-09-15T10:31:00+07:00',
    endsAt: '2027-03-15T10:31:00+07:00',
    status: 'active',
    benefits: ['Kiểm tra 6 giai đoạn', '4 lượt kiểm tra hiện trường', 'Báo cáo sau mỗi giai đoạn'],
    supervision: {
      projectId: 'SVC-2026-0001',
      projectName: 'Nhà phố 3 tầng Tân Lợi',
      currentStage: 'Phần móng',
      inspectionsTotal: 4,
      inspectionsUsed: 1
    }
  }
]

export const QUOTA_EVENTS_SEED: CmsQuotaEvent[] = [
  {
    id: 'qe-0001',
    customerId: 'usr-0001',
    at: '2026-08-20T10:02:00+07:00',
    quotaType: 'design',
    action: 'hold',
    delta: 1,
    before: 5,
    after: 4,
    result: 'success',
    ref: 'SVC-2026-0118'
  },
  {
    id: 'qe-0002',
    customerId: 'usr-0001',
    at: '2026-08-20T10:06:00+07:00',
    quotaType: 'design',
    action: 'deduct',
    delta: 1,
    before: 4,
    after: 4,
    result: 'success',
    ref: 'SVC-2026-0118'
  },
  {
    id: 'qe-0003',
    customerId: 'usr-0001',
    at: '2026-08-25T21:14:00+07:00',
    quotaType: 'library',
    action: 'deduct',
    delta: 1,
    before: 30,
    after: 29,
    result: 'success'
  },
  {
    id: 'qe-0004',
    customerId: 'usr-0003',
    at: '2026-09-02T08:40:00+07:00',
    quotaType: 'design',
    action: 'hold',
    delta: 1,
    before: 8,
    after: 7,
    result: 'success',
    ref: 'SVC-2026-0131'
  },
  {
    id: 'qe-0005',
    customerId: 'usr-0003',
    at: '2026-09-02T08:52:00+07:00',
    quotaType: 'design',
    action: 'refund',
    delta: 1,
    before: 7,
    after: 8,
    result: 'timeout',
    ref: 'SVC-2026-0131'
  },
  {
    id: 'qe-0006',
    customerId: 'usr-0003',
    at: '2026-09-21T16:05:00+07:00',
    quotaType: 'design',
    action: 'hold',
    delta: 1,
    before: 7,
    after: 6,
    result: 'success',
    ref: 'SVC-2026-0140'
  }
]
