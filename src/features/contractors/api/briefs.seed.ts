import { BUILDING_IMAGE } from '@/shared/lib/imagery'
import type { ProjectBrief } from '../types/contractor.types'

/**
 * Bốn hồ sơ dự án mẫu của bản mock — dựng theo Hình 4 của hộp thoại "Chọn dự án
 * để tìm nhà thầu", mỗi hồ sơ một trạng thái khác nhau để demo đủ bốn kiểu dòng:
 *
 * | Dự án | Nguồn hồ sơ | Lời mời |
 * |---|---|---|
 * | SVC-2026-0001 Nhà phố Tân Lợi 2 tầng | từ gói thiết kế | 2/3 |
 * | SVC-2026-0002 Nhà phố Nguyễn Văn Linh | tự tạo | chưa mời |
 * | SVC-2026-0003 Cải tạo nhà Q.4 | từ gói thiết kế | 3/3 — hết chỗ mời |
 * | SVC-2026-0004 Nhà vườn Hòa Thắng | tự tạo | đã chốt thầu |
 *
 * Số lời mời KHÔNG nằm ở đây mà ở `contractorInvitations` của `shared/cms` —
 * đó mới là nguồn thật, và cũng là bảng đội vận hành sửa ở khu quản trị (R4).
 * Seed này chỉ nạp khi kho còn rỗng, nên hồ sơ khách tự tạo không bị đè.
 *
 * Mã phường / tỉnh lấy ĐÚNG danh mục hành chính đang chạy (provinces.open-api.vn
 * v2, sau sáp nhập 2025). Ảnh mẫu ghi "P. Tân Lợi" và "Xã Hòa Thắng" — hai đơn
 * vị đó không còn, mà để tên không khớp mã thì ô Phường/Xã ở Bước 1 hiện một
 * phường khác hẳn với chỗ đang lưu.
 */
export const BRIEFS_SEED: ProjectBrief[] = [
  {
    id: 'SVC-2026-0001',
    name: 'Nhà phố Tân Lợi 2 tầng',
    buildingType: 'Nhà phố',
    landArea: 120,
    siteCondition: 'empty',
    scale: 'ground+1',
    address: {
      provinceCode: 66,
      provinceName: 'Tỉnh Đắk Lắk',
      wardCode: 24163,
      wardName: 'Phường Tân An',
      street: '12 Đội Cấn'
    },
    budget: 1_850_000_000,
    startWindow: 'in-1-3-months',
    scope: 'turnkey',
    scopeNote: 'Thi công trọn gói, hoàn thiện cơ bản, nội thất tự lo phần rời.',
    documents: [],
    coverUrl: BUILDING_IMAGE.townhouse,
    selfCreated: false,
    status: 'inviting',
    createdAt: '2026-06-12T02:00:00.000Z',
    updatedAt: '2026-09-04T04:30:00.000Z'
  },
  {
    id: 'SVC-2026-0002',
    name: 'Nhà phố Nguyễn Văn Linh',
    buildingType: 'Nhà phố',
    landArea: 96,
    siteCondition: 'demolish',
    scale: 'ground+2',
    address: {
      provinceCode: 66,
      provinceName: 'Tỉnh Đắk Lắk',
      wardCode: 24133,
      wardName: 'Phường Buôn Ma Thuột',
      street: '215 Nguyễn Văn Linh'
    },
    budget: 2_400_000_000,
    startWindow: 'in-3-6-months',
    scope: 'shell',
    scopeNote: 'Cần nhà thầu làm phần thô, hoàn thiện tính sau.',
    documents: [],
    coverUrl: BUILDING_IMAGE.villa,
    selfCreated: true,
    status: 'ready',
    createdAt: '2026-05-20T03:15:00.000Z',
    updatedAt: '2026-09-03T09:10:00.000Z'
  },
  {
    id: 'SVC-2026-0003',
    name: 'Cải tạo nhà Q.4',
    buildingType: 'Cải tạo',
    landArea: 64,
    siteCondition: 'renovate',
    scale: 'ground+1',
    address: {
      provinceCode: 79,
      provinceName: 'Thành phố Hồ Chí Minh',
      wardCode: 27265,
      wardName: 'Phường Khánh Hội',
      street: '48 Đoàn Văn Bơ'
    },
    budget: 1_200_000_000,
    startWindow: 'asap',
    scope: 'finishing',
    scopeNote: 'Cải tạo mặt tiền, chống thấm và hoàn thiện lại toàn bộ.',
    documents: [],
    coverUrl: BUILDING_IMAGE.roofed,
    selfCreated: false,
    status: 'inviting',
    createdAt: '2026-04-08T01:40:00.000Z',
    updatedAt: '2026-09-02T07:00:00.000Z'
  },
  {
    id: 'SVC-2026-0004',
    name: 'Nhà vườn Hòa Thắng',
    buildingType: 'Nhà vườn',
    landArea: 320,
    siteCondition: 'empty',
    scale: 'ground',
    address: {
      provinceCode: 66,
      provinceName: 'Tỉnh Đắk Lắk',
      wardCode: 24154,
      wardName: 'Phường Thành Nhất',
      street: 'Thôn 3, Hòa Thắng'
    },
    budget: 2_900_000_000,
    startWindow: 'undecided',
    scope: 'turnkey',
    scopeNote: 'Nhà vườn một tầng, ưu tiên nhà thầu có kinh nghiệm sân vườn.',
    documents: [],
    coverUrl: BUILDING_IMAGE.garden,
    selfCreated: true,
    // Trạng thái này bản mock SUY RA từ lời mời ở nấc cuối, không đọc từ đây —
    // để `contracted` sẵn cho khớp, nhưng nguồn quyết định vẫn là bảng lời mời.
    status: 'contracted',
    createdAt: '2026-03-02T06:20:00.000Z',
    updatedAt: '2026-09-01T02:45:00.000Z'
  }
]
