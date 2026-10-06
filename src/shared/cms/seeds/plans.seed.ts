import type {
  CmsSupervisionStageDef,
  CmsGift,
  CmsPlanSettings,
  CmsQuotas,
  PlanBenefits,
  SubscriptionPlan,
  SupervisionPackage
} from '../cms.types'

/**
 * Ba gói thiết kế theo S01 — Bảng giá gói thiết kế.
 *
 * Giá, số lượt, quyền lợi và quà tặng là số MINH HỌA; admin sửa được không cần
 * deploy (S01, mục "Lưu ý"). Thanh toán MỘT LẦN: bản mô tả v1.1 ghi rõ lượt
 * không hết hạn, nên `periodDays` là 0 — không có chu kỳ gia hạn.
 */
/* ===========================================================================
 * ẢNH BA THẺ GÓI — theo sheet góp ý BuildX (tab "Hình ảnh website", hình 01–03),
 * đặt ở `public/images/plans/`: basic.webp · plus.webp · pro.webp. Ảnh quà tặng
 * (`gift.imageUrl`): gift-sanitary.png.
 *
 * Tỉ lệ khung ảnh thẻ là 16:10; khung ảnh quà là ô vuông 56px.
 * ======================================================================== */

const ON = { enabled: true }
const OFF = { enabled: false }

/** Bảng quyền lợi đầy đủ của một gói — mặc định bật hết nhóm thiết kế & dự toán. */
function benefits(overrides: Partial<PlanBenefits['toggles']>, levels: Omit<PlanBenefits, 'toggles'>): PlanBenefits {
  return {
    toggles: {
      uploadPhoto: ON,
      siteInfo: ON,
      buildingType: ON,
      style: ON,
      renderImages: ON,
      structureEstimate: ON,
      finishingEstimate: ON,
      materialList: ON,
      boq: ON,
      exportDossier: ON,
      contractorPack: ON,
      compareOptions: OFF,
      compareCost: OFF,
      compareMaterial: OFF,
      optimizeBudget: OFF,
      costDelta: OFF,
      materialAlternatives: OFF,
      render3d: OFF,
      ...overrides
    },
    ...levels
  }
}

export const PLANS_SEED: SubscriptionPlan[] = [
  {
    id: 'basic',
    tier: 'basic',
    code: 'BASIC',
    name: 'BASIC',
    shortLabel: 'Khởi đầu',
    price: 399_000,
    designCredits: 3,
    libraryCredits: 20,
    fitLine: 'Phù hợp khi bạn đã khá rõ nhu cầu và muốn bắt đầu nhanh.',
    imageUrl: '/images/plans/basic.webp',
    ctaLabel: 'Chọn gói BASIC',
    status: 'selling',
    benefits: benefits(
      {},
      {
        layout: { level: 'basic' },
        interiorEstimate: { level: 'rough' },
        advisory: { level: 'online' }
      }
    ),
    highlights: ['designCredits', 'libraryCredits', 'interiorEstimate', 'exportDossier', 'advisory'],
    giftId: null
  },
  {
    id: 'advanced',
    tier: 'advanced',
    code: 'PLUS',
    name: 'PLUS',
    shortLabel: 'Phổ biến',
    popular: true,
    price: 1_490_000,
    designCredits: 10,
    libraryCredits: 50,
    fitLine: 'Phù hợp khi bạn muốn thử và so sánh nhiều phương án trước khi chốt.',
    imageUrl: '/images/plans/plus.webp',
    ctaLabel: 'Chọn gói PLUS',
    status: 'selling',
    benefits: benefits(
      { compareOptions: ON, compareCost: ON, compareMaterial: ON },
      {
        layout: { level: '2d3d' },
        interiorEstimate: { level: 'detailed' },
        advisory: { level: 'priority' }
      }
    ),
    highlights: ['designCredits', 'interiorEstimate', 'layout', 'exportDossier', 'advisory'],
    giftId: null
  },
  {
    id: 'pro',
    tier: 'pro',
    code: 'PRO',
    name: 'PRO',
    shortLabel: 'Toàn diện',
    price: 3_990_000,
    designCredits: 20,
    libraryCredits: 100,
    fitLine: 'Phù hợp khi bạn muốn tối ưu ngân sách và vật liệu trước khi thi công.',
    imageUrl: '/images/plans/pro.webp',
    ctaLabel: 'Chọn gói PRO',
    status: 'selling',
    benefits: benefits(
      {
        compareOptions: ON,
        compareCost: ON,
        compareMaterial: ON,
        optimizeBudget: ON,
        costDelta: ON,
        materialAlternatives: ON,
        render3d: ON
      },
      {
        layout: { level: '2d3dPlus' },
        interiorEstimate: { level: 'optimized' },
        advisory: { level: 'expert' }
      }
    ),
    highlights: ['designCredits', 'interiorEstimate', 'render3d', 'exportDossier', 'advisory'],
    giftId: 'gift-sanitary',
    giftConditions:
      'Áp dụng khi khách hàng ký hợp đồng thi công trọn gói cùng BuildX và đáp ứng điều kiện chương trình.'
  }
]

/** Chu kỳ sử dụng DÙNG CHUNG của mọi gói — hiện tại 90 ngày (§4). */
export const PLAN_SETTINGS_SEED: CmsPlanSettings = { periodDays: 90 }

/** Danh mục quà tặng (epic GiftManagement). */
export const GIFTS_SEED: CmsGift[] = [
  {
    id: 'gift-sanitary',
    title: 'Bộ thiết bị vệ sinh châu Âu',
    description: 'Trọn bộ thiết bị vệ sinh nhập khẩu châu Âu cho một căn nhà.',
    value: 100_000_000,
    imageUrl: '/images/plans/gift-sanitary.png',
    extraOffer: 'Khấu trừ 3.990.000đ vào giá trị hợp đồng khi đáp ứng điều kiện chương trình.',
    status: 'active'
  }
]

/**
 * Ba lựa chọn quản lý thi công theo S19 — Trang Gói giám sát thi công.
 *
 * Quyền lợi diễn đạt theo 6 GIAI ĐOẠN cố định của bảng điều khiển (R5), không
 * theo checklist: bản demo có dòng "checklist theo từng giai đoạn" nhưng R9 nói
 * rõ hoàn thành giai đoạn là tải ảnh/tài liệu kèm tên, không có checklist bắt buộc.
 *
 * Không dòng nào nhắc tới báo giá của nhà thầu (R2).
 */
export const SUPERVISION_PACKAGES_SEED: SupervisionPackage[] = [
  {
    id: 'self',
    tier: 'self',
    imageUrl: '/images/supervision/self.webp',
    name: 'TỰ QUẢN LÝ',
    price: 0,
    durationMonths: 6,
    inspections: null,
    fitLine: 'Phù hợp khi bạn có kinh nghiệm hoặc có người nhà theo sát công trình.',
    benefits: [
      'Lưu toàn bộ hồ sơ dự án trên BuildX',
      'Xem lại thiết kế và dự toán đã lập',
      'Tự cập nhật tiến độ 6 giai đoạn',
      'Nâng cấp lên gói giám sát bất kỳ lúc nào'
    ]
  },
  {
    id: 'check',
    tier: 'check',
    imageUrl: '/images/supervision/check.webp',
    name: 'AN TÂM',
    price: 8_900_000,
    durationMonths: 6,
    inspections: 6,
    fitLine: 'Phù hợp khi bạn tự theo dõi được nhưng cần kỹ sư kiểm tra tại các mốc quan trọng.',
    benefits: [
      'Bảng điều khiển 6 giai đoạn, timeline và % tiến độ',
      'Kỹ sư kiểm tra thực tế tại các mốc chính',
      'Kiểm tra chống ẩm, chống thấm móng và hoàn thiện',
      'Đối chiếu vật liệu theo từng lần kiểm tra',
      'Báo cáo sau mỗi lần kiểm tra',
      'Nghiệm thu và bàn giao theo mốc chính'
    ]
  },
  {
    id: 'control',
    tier: 'control',
    imageUrl: '/images/supervision/control.webp',
    name: 'TOÀN DIỆN',
    price: 18_900_000,
    durationMonths: 6,
    inspections: 12,
    recommended: true,
    fitLine: 'Phù hợp khi bạn ít thời gian hoặc muốn BuildX theo sát cả quá trình thi công.',
    benefits: [
      'Bao gồm toàn bộ quyền lợi gói AN TÂM',
      'Kiểm tra phần thô theo tất cả các mốc',
      'Đối chiếu vật liệu thực tế ở mọi lần kiểm tra',
      'Nghiệm thu theo từng giai đoạn',
      'Theo dõi xử lý lỗi đến khi khắc phục xong',
      'Báo cáo tổng kết công trình'
    ]
  }
]

/**
 * Hạn mức miễn phí & hạn mức theo ngày.
 *
 * Con số lấy đúng từ những chỗ trước đây hardcode: 30/10 tin nhắn chat mỗi ngày
 * (Q&A §2.3.5), 3 lượt tra + 2 lượt xem chi tiết Cẩm nang mỗi ngày. Phần "chưa
 * mua gói" trước không có ở đâu, đặt bằng đúng con số mock đang chạy.
 */
export const QUOTAS_SEED: CmsQuotas = {
  freeDesignCredits: 1,
  freeLibraryCredits: 10,
  chatDailyGuest: 10,
  chatDailyCustomer: 30,
  handbookLookupPerDay: 3,
  handbookDetailPerDay: 3
}

/** Sáu giai đoạn giám sát mặc định (R5) — tên lấy đúng bản dịch hiện hành. */
export const SUPERVISION_STAGES_SEED: CmsSupervisionStageDef[] = [
  {
    id: 'legal',
    name: 'Hồ sơ pháp lý',
    shortName: 'Hồ sơ pháp lý',
    description: 'Giấy phép xây dựng, hồ sơ thiết kế, hợp đồng thi công.',
    order: 1
  },
  {
    id: 'foundation',
    name: 'Móng & khởi công',
    shortName: 'Móng & khởi công',
    description: 'Định vị tim trục, hố móng, cốt thép móng, đổ bê tông móng.',
    order: 2
  },
  {
    id: 'structure',
    name: 'Phần thô – kết cấu',
    shortName: 'Phần thô – kết cấu',
    description: 'Cột, dầm, sàn, tường xây và tô trát.',
    order: 3
  },
  {
    id: 'mep',
    name: 'Hệ thống kỹ thuật & chống thấm',
    shortName: 'Kỹ thuật & chống thấm',
    description: 'Điện nước âm, chống thấm, thử áp lực đường ống.',
    order: 4
  },
  {
    id: 'finishing',
    name: 'Hoàn thiện',
    shortName: 'Hoàn thiện',
    description: 'Trát, ốp lát, trần thạch cao, sơn nước, cửa, thiết bị vệ sinh.',
    order: 5
  },
  {
    id: 'handover',
    name: 'Nghiệm thu & bàn giao',
    shortName: 'Nghiệm thu & bàn giao',
    description: 'Kiểm tra tổng thể, khắc phục lỗi, bàn giao hồ sơ hoàn công.',
    order: 6
  }
]
