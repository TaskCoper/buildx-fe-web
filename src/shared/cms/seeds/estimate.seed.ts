import type { CmsCostGroup, CmsCostItem, CmsEstimateAdvice, CmsMaterialPrice } from '../cms.types'

/**
 * Cấu hình dự toán mẫu (spec admin #3) — khớp bảng dự toán mẫu của luồng thiết
 * kế: ba nhóm chi phí, hạng mục lớn và hạng mục con. Giá gốc là giá miền Nam
 * gói Tiêu chuẩn; hai miền còn lại và hai gói còn lại lệch theo hệ số để bảng
 * có số liệu khác nhau thật.
 */
export const COST_GROUPS_SEED: CmsCostGroup[] = [
  { id: 'structure', name: 'Phần thô', order: 1 },
  { id: 'finishing', name: 'Phần hoàn thiện', order: 2 },
  { id: 'interior', name: 'Phần nội thất', order: 3 }
]

export const COST_ITEMS_SEED: CmsCostItem[] = [
  {
    id: 'foundation',
    groupId: 'structure',
    name: 'Móng, cọc',
    order: 1,
    subItems: [
      { id: 'pile', name: 'Ép cọc bê tông ly tâm D300', unit: 'm' },
      { id: 'excavation', name: 'Đào đất hố móng, phá đầu cọc', unit: 'm³' },
      { id: 'footing', name: 'Bê tông, cốt thép đài và giằng móng', unit: 'm³' },
      { id: 'formwork', name: 'Cốp pha, nhân công phần móng', unit: 'm²' }
    ]
  },
  {
    id: 'frame',
    groupId: 'structure',
    name: 'Khung, sàn, mái',
    order: 2,
    subItems: [
      { id: 'column', name: 'Cột, dầm bê tông cốt thép', unit: 'm³' },
      { id: 'slab', name: 'Sàn bê tông cốt thép', unit: 'm²' },
      { id: 'stair', name: 'Cầu thang, mái bê tông', unit: 'm²' },
      { id: 'scaffold', name: 'Giàn giáo, cốp pha phần thân', unit: 'm²' }
    ]
  },
  {
    id: 'masonry',
    groupId: 'structure',
    name: 'Xây tô, chống thấm',
    order: 3,
    subItems: [
      { id: 'wall', name: 'Xây tường gạch ống', unit: 'm²' },
      { id: 'plaster', name: 'Tô trát tường trong và ngoài', unit: 'm²' },
      { id: 'waterproof', name: 'Chống thấm vệ sinh, ban công, mái', unit: 'm²' },
      { id: 'screed', name: 'Cán nền, tạo dốc', unit: 'm²' }
    ]
  },
  {
    id: 'floor',
    groupId: 'finishing',
    name: 'Lát nền, ốp tường, sơn nước',
    order: 1,
    subItems: [
      { id: 'tile-floor', name: 'Gạch lát nền 800×800', unit: 'm²' },
      { id: 'tile-wall', name: 'Ốp tường khu vệ sinh và bếp', unit: 'm²' },
      { id: 'stone', name: 'Đá granite bậc tam cấp, cầu thang', unit: 'm' },
      { id: 'paint', name: 'Sơn nước trong và ngoài nhà', unit: 'm²' }
    ]
  },
  {
    id: 'door-window',
    groupId: 'finishing',
    name: 'Cửa, lan can, trần',
    order: 2,
    subItems: [
      { id: 'main-door', name: 'Cửa chính gỗ tự nhiên', unit: 'bộ' },
      { id: 'room-door', name: 'Cửa phòng, cửa vệ sinh', unit: 'bộ' },
      { id: 'glass', name: 'Cửa nhôm kính, vách kính', unit: 'm²' },
      { id: 'railing', name: 'Lan can, tay vịn cầu thang', unit: 'm' },
      { id: 'ceiling', name: 'Trần thạch cao khung chìm', unit: 'm²' }
    ]
  },
  {
    id: 'mep',
    groupId: 'finishing',
    name: 'Điện, nước, thiết bị vệ sinh',
    order: 3,
    subItems: [
      { id: 'electric', name: 'Hệ thống điện và chiếu sáng', unit: 'hệ' },
      { id: 'plumbing', name: 'Hệ thống cấp thoát nước', unit: 'hệ' },
      { id: 'sanitary', name: 'Thiết bị vệ sinh', unit: 'bộ' },
      { id: 'hvac', name: 'Máy lạnh, quạt thông gió', unit: 'bộ' }
    ]
  },
  {
    id: 'built-in',
    groupId: 'interior',
    name: 'Nội thất gỗ cố định',
    order: 1,
    subItems: [
      { id: 'kitchen', name: 'Tủ bếp trên và dưới', unit: 'm' },
      { id: 'wardrobe', name: 'Tủ quần áo âm tường', unit: 'm²' },
      { id: 'tv-wall', name: 'Kệ tivi, tủ trang trí phòng khách', unit: 'bộ' },
      { id: 'shoe', name: 'Tủ giày, vách trang trí sảnh', unit: 'bộ' }
    ]
  },
  {
    id: 'loose',
    groupId: 'interior',
    name: 'Nội thất rời',
    order: 2,
    subItems: [
      { id: 'sofa', name: 'Sofa, bàn trà phòng khách', unit: 'bộ' },
      { id: 'dining', name: 'Bàn ăn 6 ghế', unit: 'bộ' },
      { id: 'bed', name: 'Giường, nệm, tab đầu giường', unit: 'bộ' },
      { id: 'desk', name: 'Bàn làm việc, ghế', unit: 'bộ' }
    ]
  },
  {
    id: 'lighting',
    groupId: 'interior',
    name: 'Chiếu sáng, rèm, trang trí',
    order: 3,
    subItems: [
      { id: 'lamp', name: 'Đèn trang trí, đèn hắt', unit: 'bộ' },
      { id: 'curtain', name: 'Rèm cửa', unit: 'm²' },
      { id: 'decor', name: 'Tranh, cây xanh, phụ kiện trang trí', unit: 'bộ' }
    ]
  }
]

/** Giá gốc miền Nam, gói Tiêu chuẩn — VND / đơn vị hạng mục con. */
const BASE_PRICES: Record<string, number> = {
  pile: 550000,
  excavation: 350000,
  footing: 2800000,
  formwork: 380000,
  column: 3200000,
  slab: 1150000,
  stair: 1400000,
  scaffold: 200000,
  wall: 285000,
  plaster: 105000,
  waterproof: 220000,
  screed: 50000,
  'tile-floor': 620000,
  'tile-wall': 540000,
  stone: 1250000,
  paint: 95000,
  'main-door': 28000000,
  'room-door': 6500000,
  glass: 3200000,
  railing: 2400000,
  ceiling: 320000,
  electric: 96000000,
  plumbing: 62000000,
  sanitary: 18500000,
  hvac: 14000000,
  kitchen: 9500000,
  wardrobe: 4200000,
  'tv-wall': 42000000,
  shoe: 26000000,
  sofa: 38000000,
  dining: 24000000,
  bed: 22000000,
  desk: 9500000,
  lamp: 46000000,
  curtain: 850000,
  decor: 18000000
}

const REGION_FACTOR = { north: 1.05, central: 0.97, south: 1 } as const

/** Làm tròn tới nghìn đồng. */
const round = (value: number) => Math.round(value / 1000) * 1000

export const MATERIAL_PRICES_SEED: CmsMaterialPrice[] = COST_ITEMS_SEED.flatMap((item) =>
  item.subItems.flatMap((sub) =>
    (Object.keys(REGION_FACTOR) as (keyof typeof REGION_FACTOR)[]).map((region) => {
      const standard = round((BASE_PRICES[sub.id] ?? 0) * REGION_FACTOR[region])
      return {
        id: `mp-${sub.id}-${region}`,
        itemId: item.id,
        subItemId: sub.id,
        region,
        basic: round(standard * 0.85),
        standard,
        vip: round(standard * 1.35)
      }
    })
  )
)

/** Trống = dùng câu mặc định trong bản dịch (`design.estimate.advisory`). */
export const ESTIMATE_ADVICE_SEED: CmsEstimateAdvice = {
  dominant: { structure: '', finishing: '', interior: '' },
  disclaimer: ''
}
