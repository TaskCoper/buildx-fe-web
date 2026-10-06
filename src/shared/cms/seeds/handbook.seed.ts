import {
  BUILDING_IMAGE,
  CONSTRUCTION_IMAGE,
  INTERIOR_IMAGE,
  INTERIOR_RENDER,
  PLAN_IMAGE,
  STAGE_IMAGE,
  STYLE_IMAGE,
  TOPIC_IMAGE
} from '@/shared/lib/imagery'
import type { CmsArticleLabel, HandbookArticle, HandbookFloor, HandbookStage, HandbookTemplate } from '../cms.types'

/**
 * Seed catalogue của Cẩm nang (mục VI) — nội dung khởi điểm admin biên soạn
 * tiếp trong trang quản trị. Chuyển ra `shared/cms` để cả trang Cẩm nang lẫn
 * trang quản trị cùng đọc một nguồn (xem `cms.db.ts`).
 *
 * Sáu mẫu 2D đầu tiên đã có BẢN VẼ THẬT của tầng trệt (`PLAN_IMAGE`), thông số
 * ghi đúng con số in trên bản vẽ. Các tầng trên và những mẫu còn lại vẫn chỉ khai
 * `planVariant` — thẻ và trang chi tiết tự dựng bản vẽ bằng SVG
 * (`shared/components/common/plan-drawing`). Có thêm file thật thì chỉ việc điền
 * `imageUrl`, phần còn lại không phải sửa gì.
 */

/** Dựng danh sách tầng của một mẫu bản vẽ 2D: trệt → các lầu → tum → mặt mái. */
function buildPlanFloors(levels: number, attic: boolean, groundImageUrl?: string): HandbookFloor[] {
  const floors: HandbookFloor[] = [
    { id: 'ground', label: 'Tầng trệt', planVariant: 'ground', ...(groundImageUrl ? { imageUrl: groundImageUrl } : {}) }
  ]
  for (let level = 2; level <= levels; level++) {
    floors.push({ id: `floor-${level}`, label: `Tầng ${level}`, planVariant: 'upper' })
  }
  if (attic) floors.push({ id: 'attic', label: 'Tum', planVariant: 'attic' })
  floors.push({ id: 'roof', label: 'Mặt mái', planVariant: 'roof' })
  return floors
}

interface PlanSeed {
  id: string
  /** Bề ngang lô, mét. */
  width: number
  /** Chiều sâu lô, mét. */
  depth: number
  levels: number
  attic: boolean
  /** Diện tích sàn in trên bản vẽ, m². Bỏ trống khi bản vẽ không ghi con số nào. */
  area?: number
  /** Bản vẽ THẬT của tầng trệt. Bỏ trống thì mọi tầng đều dựng bằng SVG. */
  imageUrl?: string
  buildingType: 'townhouse' | 'garden' | 'apartment'
  buildingTypeLabel: string
  architectureStyle: string
  interiorStyle: string
  description: string[]
}

const PLAN_SEEDS: PlanSeed[] = [
  {
    id: '2d-01',
    width: 9,
    depth: 20,
    levels: 2,
    attic: false,
    area: 91,
    imageUrl: PLAN_IMAGE.garden9x20,
    buildingType: 'garden',
    buildingTypeLabel: 'Nhà vườn',
    architectureStyle: 'modern',
    interiorStyle: 'modern',
    description: [
      'Lô 9×20m chia dọc làm hai: nửa trái là khối nhà 91m² sàn, nửa phải dành cho lối xe, sân phơi và mảng cây — nhờ vậy phòng nào cũng có một mặt thoáng.',
      'Tầng trệt đã có sẵn phòng ngủ 12,3m² kèm WC riêng cho người lớn tuổi; bếp – ăn 15,4m² mở ra tiểu cảnh giữa nhà, phòng khách 21,4m² quay ra mặt tiền.'
    ]
  },
  {
    id: '2d-02',
    width: 4,
    depth: 9.8,
    levels: 3,
    attic: false,
    area: 35.2,
    imageUrl: PLAN_IMAGE.townhouse4x10,
    buildingType: 'townhouse',
    buildingTypeLabel: 'Nhà phố',
    architectureStyle: 'modern',
    interiorStyle: 'minimal',
    description: [
      'Mặt bằng trệt 35,2m² cho lô 4m mặt tiền: gara xe máy ngay sau cửa, phòng khách và bàn ăn nối liền một mạch, bếp lùi sát tường sau.',
      'Cầu thang bám tường phải, WC giấu cạnh chiếu nghỉ — cách bố trí này giữ lối đi thẳng suốt từ cửa vào tới bếp, không phải vòng qua bàn ăn.'
    ]
  },
  {
    id: '2d-03',
    width: 5,
    depth: 10,
    levels: 3,
    attic: false,
    area: 25.25,
    imageUrl: PLAN_IMAGE.townhouse5x10,
    buildingType: 'townhouse',
    buildingTypeLabel: 'Nhà phố',
    architectureStyle: 'modern',
    interiorStyle: 'modern',
    description: [
      'Lô 5×10m với gara ô tô chiếm trọn nửa phải mặt tiền; phần ở chỉ 25,25m² nên khách và ăn gộp vào một phòng, bếp kê dọc tường sau.',
      'Khoảng sân thượng nhỏ bên trái lấy sáng cho khối bếp và làm chỗ trồng cây; thang đặt cạnh WC để đường ống kỹ thuật gom về một trục.'
    ]
  },
  {
    id: '2d-04',
    width: 5,
    depth: 12,
    levels: 2,
    attic: false,
    imageUrl: PLAN_IMAGE.townhouse5x12,
    buildingType: 'townhouse',
    buildingTypeLabel: 'Nhà phố',
    architectureStyle: 'modern',
    interiorStyle: 'modern',
    description: [
      'Lô 5×12m có gara ô tô nằm trong nhà: xe đỗ sát mép phải, người đi men theo mảng cây bên trái nên không phải lách qua đầu xe.',
      'Phòng ngủ 1 đặt ngay tầng trệt cạnh phòng ăn; bếp và WC dồn về tường trái để hai tầng trên dùng chung một trục ống nước.'
    ]
  },
  {
    id: '2d-05',
    width: 6.75,
    depth: 10.02,
    levels: 2,
    attic: false,
    imageUrl: PLAN_IMAGE.garden675x10,
    buildingType: 'garden',
    buildingTypeLabel: 'Nhà vườn',
    architectureStyle: 'thai-roof',
    interiorStyle: 'minimal',
    description: [
      'Bản vẽ tỷ lệ 1:100 cho lô 6,75×10,02m: phòng ngủ chính và phòng vệ sinh nằm trọn bên trái, bếp – ăn bên phải, phòng khách ở giữa mở ra chỗ ngồi chờ phía trước.',
      'Mái che xe kéo từ hông nhà ra sân nên không tốn thêm diện tích xây; cầu thang đặt cạnh phòng ăn, ăn theo trục giữa nhà.'
    ]
  },
  {
    id: '2d-06',
    width: 6.75,
    depth: 13,
    levels: 2,
    attic: true,
    imageUrl: PLAN_IMAGE.garden675x13,
    buildingType: 'garden',
    buildingTypeLabel: 'Nhà vườn',
    architectureStyle: 'thai-roof',
    interiorStyle: 'modern',
    description: [
      'Lô 6,75×13m tách bạch hai chỗ để xe: gara ô tô phía trước, gara xe máy chạy dọc hông phải, hiên nhà nằm giữa hai lối này.',
      'Bên trong chia hai lớp — phòng khách chính trước, phòng sinh hoạt chung sau; phòng ngủ khách và kho đặt bên trái, bếp cùng khu vực ăn quay ra mảng cây phía sau.'
    ]
  },
  {
    id: '2d-07',
    width: 6,
    depth: 15,
    levels: 2,
    attic: false,
    area: 90,
    buildingType: 'townhouse',
    buildingTypeLabel: 'Nhà phố',
    architectureStyle: 'modern',
    interiorStyle: 'neoclassical',
    description: [
      'Mặt tiền 6m cho phép đặt cầu thang sát tường bên, phần còn lại thông suốt từ khách tới bếp.',
      'Tầng 2 đủ chỗ cho 3 phòng ngủ nhỏ hoặc 2 phòng ngủ + phòng làm việc.'
    ]
  },
  {
    id: '2d-08',
    width: 5,
    depth: 19,
    levels: 3,
    attic: false,
    area: 95,
    buildingType: 'townhouse',
    buildingTypeLabel: 'Nhà phố',
    architectureStyle: 'modern',
    interiorStyle: 'modern',
    description: [
      'Phương án 3 tầng cho hộ nhiều thế hệ: trệt có một phòng ngủ cho người lớn tuổi, không phải leo thang.',
      'Hai tầng trên dành cho các phòng ngủ còn lại và một phòng sinh hoạt chung nhỏ.'
    ]
  },
  {
    id: '2d-09',
    width: 8,
    depth: 16,
    levels: 1,
    attic: true,
    area: 128,
    buildingType: 'garden',
    buildingTypeLabel: 'Nhà vườn',
    architectureStyle: 'thai-roof',
    interiorStyle: 'minimal',
    description: [
      'Nhà cấp 4 mái Thái có gác lửng làm phòng thờ và kho, phù hợp lô đất vuông vắn ở ngoại thành.',
      'Ba phòng ngủ nằm cùng một dãy, hành lang chạy dọc giúp phòng nào cũng có cửa sổ thoáng.'
    ]
  },
  {
    id: '2d-10',
    width: 10,
    depth: 18,
    levels: 2,
    attic: false,
    area: 180,
    buildingType: 'garden',
    buildingTypeLabel: 'Nhà vườn',
    architectureStyle: 'garden-villa',
    interiorStyle: 'neoclassical',
    description: [
      'Biệt thự vườn 2 tầng, lùi 3m mỗi bên để có sân và lối đi quanh nhà.',
      'Tầng trệt gồm khách, bếp, phòng ăn lớn và một phòng ngủ khách; tầng 2 gồm 3 phòng ngủ đều có WC riêng.'
    ]
  },
  {
    id: '2d-11',
    width: 7,
    depth: 12,
    levels: 1,
    attic: false,
    area: 84,
    buildingType: 'garden',
    buildingTypeLabel: 'Nhà vườn',
    architectureStyle: 'level4-modern',
    interiorStyle: 'minimal',
    description: [
      'Nhà cấp 4 hiện đại mái bằng, chi phí thấp nhất trong bộ mẫu, thi công nhanh.',
      'Hai phòng ngủ, một WC chung, khu bếp mở nối thẳng ra sân sau.'
    ]
  },
  {
    id: '2d-12',
    width: 9,
    depth: 14,
    levels: 1,
    attic: true,
    area: 126,
    buildingType: 'garden',
    buildingTypeLabel: 'Nhà vườn',
    architectureStyle: 'japanese-roof',
    interiorStyle: 'minimal',
    description: [
      'Mái Nhật dốc thấp, hiên rộng che nắng xiên buổi chiều — hợp hướng Tây.',
      'Gác lửng nhỏ dùng làm góc đọc sách, nhìn xuống phòng khách thông tầng.'
    ]
  },
  {
    id: '2d-13',
    width: 5,
    depth: 20,
    levels: 2,
    attic: true,
    area: 100,
    buildingType: 'townhouse',
    buildingTypeLabel: 'Nhà phố',
    architectureStyle: 'neoclassical',
    interiorStyle: 'neoclassical',
    description: [
      'Bản tân cổ điển tiết chế: phào chỉ chỉ chạy ở mặt tiền và sảnh khách, các khu vực còn lại giữ đường nét đơn giản để kiểm soát chi phí hoàn thiện.',
      'Tum gồm phòng thờ và sân phơi rộng rãi.'
    ]
  },
  {
    id: '2d-14',
    width: 4,
    depth: 16,
    levels: 3,
    attic: false,
    area: 64,
    buildingType: 'townhouse',
    buildingTypeLabel: 'Nhà phố',
    architectureStyle: 'modern',
    interiorStyle: 'minimal',
    description: [
      'Lô nhỏ 4×16m, dồn công năng theo chiều cao. Mỗi tầng một phòng ngủ + WC, riêng trệt để khách và bếp.',
      'Thang bố trí sát tường sau để mặt tiền nhận trọn ánh sáng.'
    ]
  },
  {
    id: '2d-15',
    width: 6,
    depth: 20,
    levels: 2,
    attic: false,
    area: 120,
    buildingType: 'townhouse',
    buildingTypeLabel: 'Nhà phố',
    architectureStyle: 'modern',
    interiorStyle: 'indochine',
    description: [
      'Lô rộng cho phép chừa chỗ đậu ô tô trong nhà mà vẫn còn phòng khách đủ lớn.',
      'Điểm nhấn Indochine ở gạch bông sảnh và hệ cửa lá sách phía sau.'
    ]
  },
  {
    id: '2d-16',
    width: 5,
    depth: 15,
    levels: 2,
    attic: false,
    area: 75,
    buildingType: 'townhouse',
    buildingTypeLabel: 'Nhà phố',
    architectureStyle: 'modern',
    interiorStyle: 'modern',
    description: [
      'Phương án gọn cho lô 5×15m: bỏ sân sau, thay bằng giếng trời hẹp sát bếp để giữ diện tích sử dụng.',
      'Tầng 2 hai phòng ngủ, WC đặt giữa để đường ống ngắn, giảm chi phí điện nước.'
    ]
  }
]

const TEMPLATES_2D: HandbookTemplate[] = PLAN_SEEDS.map((seed) => {
  const floorLabel = `${seed.levels} tầng${seed.attic ? ' + tum' : ''}`
  const size = `${formatMeters(seed.width)}×${formatMeters(seed.depth)}m`
  return {
    id: seed.id,
    name: `${seed.buildingTypeLabel} ${size} – ${floorLabel}`,
    kind: '2d',
    imageUrl: seed.imageUrl,
    styleLabel: seed.buildingTypeLabel,
    specs: {
      buildingTypeLabel: seed.buildingTypeLabel,
      floorLabel,
      lotSize: `${formatMeters(seed.width)} × ${formatMeters(seed.depth)} m`,
      floorArea: seed.area === undefined ? undefined : `${formatMeters(seed.area)} m²`
    },
    description: seed.description,
    floors: buildPlanFloors(seed.levels, seed.attic, seed.imageUrl),
    tags: {
      buildingType: seed.buildingType,
      floorCount: floorCountTag(seed.levels),
      hasAttic: seed.attic,
      architectureStyle: seed.architectureStyle,
      interiorStyle: seed.interiorStyle
    }
  }
})

/** "5" hoặc "4,5" — số đo lô đất viết theo dấu phẩy thập phân của tiếng Việt. */
function formatMeters(value: number): string {
  return Number.isInteger(value) ? String(value) : String(value).replace('.', ',')
}

/** Nhãn tag số tầng dùng chung với Bước 1: `ground`, `ground+1`, `ground+2`… */
function floorCountTag(levels: number): string {
  return levels <= 1 ? 'ground' : `ground+${levels - 1}`
}

interface InteriorSeed {
  id: string
  name: string
  imageUrl: string
  styleLabel: string
  interiorStyle: string
  buildingType: 'townhouse' | 'garden' | 'apartment'
  buildingTypeLabel: string
  floorLabel: string
  floorCount: string
  hasAttic: boolean
  architectureStyle: string
  gallery: { label: string; imageUrl: string }[]
  description: string[]
}

const INTERIOR_SEEDS: InteriorSeed[] = [
  {
    id: '3d-01',
    name: 'Nhà phố Hiện đại 5×20m – gỗ sáng',
    imageUrl: INTERIOR_RENDER.stoneTvWall,
    styleLabel: 'Hiện đại',
    interiorStyle: 'modern',
    buildingType: 'townhouse',
    buildingTypeLabel: 'Nhà phố',
    floorLabel: '2 tầng',
    floorCount: 'ground+1',
    hasAttic: false,
    architectureStyle: 'modern',
    gallery: [
      { label: 'Phòng khách', imageUrl: INTERIOR_RENDER.stoneTvWall },
      { label: 'Góc sofa', imageUrl: INTERIOR_RENDER.walnutLiving }
    ],
    description: [
      'Vách TV ốp đá vân mây kết hợp lam gỗ sáng chạy suốt chiều ngang phòng khách; đèn hắt giấu sau lam làm mảng đá nổi khối mà không chói khi xem TV buổi tối.',
      'Tủ kính khung nhôm đen bên phải vừa để trưng bày vừa ngăn nhẹ với hành lang — phòng khách gọn lại mà không phải xây thêm vách.'
    ]
  },
  {
    id: '3d-02',
    name: 'Nhà phố Tối giản 4×18m – trắng ấm',
    imageUrl: INTERIOR_RENDER.balconyLiving,
    styleLabel: 'Tối giản',
    interiorStyle: 'minimal',
    buildingType: 'townhouse',
    buildingTypeLabel: 'Nhà phố',
    floorLabel: '2 tầng + tum',
    floorCount: 'ground+1',
    hasAttic: true,
    architectureStyle: 'modern',
    gallery: [
      { label: 'Phòng khách', imageUrl: INTERIOR_RENDER.balconyLiving },
      { label: 'Góc ban công', imageUrl: INTERIOR_RENDER.softMinimal }
    ],
    description: [
      'Bảng màu chỉ ba tông: trắng ấm, kem và xám nhạt. Ít chi tiết nên nhà mặt tiền 4m vẫn thấy rộng.',
      'Sofa bông lùi khỏi cửa ban công để lối ra vào thông suốt; đèn trụ và bức tranh khổ đứng là hai điểm nhấn duy nhất trên mảng tường trơn.'
    ]
  },
  {
    id: '3d-03',
    name: 'Nhà phố Hiện đại 5×16m – giếng trời',
    imageUrl: INTERIOR_RENDER.walnutLiving,
    styleLabel: 'Hiện đại',
    interiorStyle: 'modern',
    buildingType: 'townhouse',
    buildingTypeLabel: 'Nhà phố',
    floorLabel: '3 tầng',
    floorCount: 'ground+2',
    hasAttic: false,
    architectureStyle: 'modern',
    gallery: [
      { label: 'Phòng khách', imageUrl: INTERIOR_RENDER.walnutLiving },
      { label: 'Vách TV', imageUrl: INTERIOR_RENDER.stoneTvWall }
    ],
    description: [
      'Tủ TV kịch trần tông gỗ óc chó chạy hết mảng tường, xen kệ mở có đèn hắt để khối tối không bị nặng.',
      'Đèn cần câu vươn qua bàn trà thay cho đèn thả trần — nhà có giếng trời nên trần bị chia ô, treo đèn giữa phòng sẽ vướng.'
    ]
  },
  {
    id: '3d-04',
    name: 'Nhà phố Hiện đại 5×18m – không gian mở',
    imageUrl: INTERIOR_RENDER.openDining,
    styleLabel: 'Hiện đại',
    interiorStyle: 'modern',
    buildingType: 'townhouse',
    buildingTypeLabel: 'Nhà phố',
    floorLabel: '2 tầng',
    floorCount: 'ground+1',
    hasAttic: false,
    architectureStyle: 'modern',
    gallery: [
      { label: 'Khách – ăn liên thông', imageUrl: INTERIOR_RENDER.openDining },
      { label: 'Phòng khách', imageUrl: INTERIOR_RENDER.creamLiving }
    ],
    description: [
      'Bỏ hết vách ngăn giữa khách – ăn – bếp, chỉ phân vùng bằng thảm và mảng trần hạ.',
      'Cửa vòm ra ban công làm mềm dãy đường thẳng của khối tủ bếp; bàn ăn đặt ngay lối chuyển giữa hai khu nên không chắn đường đi.'
    ]
  },
  {
    id: '3d-05',
    name: 'Nhà phố Tân cổ điển 6×20m – phào chỉ tiết chế',
    imageUrl: INTERIOR_IMAGE.neoclassical,
    styleLabel: 'Tân cổ điển',
    interiorStyle: 'neoclassical',
    buildingType: 'townhouse',
    buildingTypeLabel: 'Nhà phố',
    floorLabel: '2 tầng + tum',
    floorCount: 'ground+1',
    hasAttic: true,
    architectureStyle: 'neoclassical',
    gallery: [
      { label: 'Tầng trệt', imageUrl: INTERIOR_IMAGE.neoclassical },
      { label: 'Tầng 2', imageUrl: TOPIC_IMAGE.gallery }
    ],
    description: [
      'Phào chỉ mảnh, tường sơn màu kem và sofa nỉ tông trung tính — tân cổ điển ở mức tiết chế nên vẫn hợp trần cao 3,2m.',
      'Điểm nhấn nằm ở đèn chùm sảnh và mặt đá tự nhiên của bàn trà.'
    ]
  },
  {
    id: '3d-06',
    name: 'Nhà phố Indochine 6×20m – gạch bông',
    imageUrl: INTERIOR_IMAGE.indochine,
    styleLabel: 'Indochine',
    interiorStyle: 'indochine',
    buildingType: 'townhouse',
    buildingTypeLabel: 'Nhà phố',
    floorLabel: '2 tầng',
    floorCount: 'ground+1',
    hasAttic: false,
    architectureStyle: 'modern',
    gallery: [
      { label: 'Tầng trệt', imageUrl: INTERIOR_IMAGE.indochine },
      { label: 'Tầng 2', imageUrl: TOPIC_IMAGE.gallery }
    ],
    description: [
      'Gạch bông, gỗ tự nhiên màu nâu trầm và quạt trần cánh gỗ tạo nhịp Đông Dương rõ mà không nặng nề.',
      'Cửa lá sách vừa che nắng vừa giữ gió xuyên phòng — hợp khí hậu miền Trung.'
    ]
  },
  {
    id: '3d-07',
    name: 'Căn hộ Tối giản 68m² – 2 phòng ngủ',
    imageUrl: INTERIOR_RENDER.softMinimal,
    styleLabel: 'Tối giản',
    interiorStyle: 'minimal',
    buildingType: 'apartment',
    buildingTypeLabel: 'Căn hộ',
    floorLabel: '1 mặt sàn',
    floorCount: 'ground',
    hasAttic: false,
    architectureStyle: 'modern',
    gallery: [
      { label: 'Phòng khách', imageUrl: INTERIOR_RENDER.softMinimal },
      { label: 'Góc ban công', imageUrl: INTERIOR_RENDER.balconyLiving }
    ],
    description: [
      'Căn hộ 68m² được nới cảm giác rộng bằng cách bỏ vách ngăn bếp và dùng tủ âm tường kịch trần.',
      'Sofa module và ghế bệt thay cho bộ bàn ghế truyền thống: chân thấp, khối mềm, dễ đổi cách kê khi nhà có khách.'
    ]
  },
  {
    id: '3d-08',
    name: 'Căn hộ Hiện đại 82m² – tông ấm',
    imageUrl: INTERIOR_RENDER.creamLiving,
    styleLabel: 'Hiện đại',
    interiorStyle: 'modern',
    buildingType: 'apartment',
    buildingTypeLabel: 'Căn hộ',
    floorLabel: '1 mặt sàn',
    floorCount: 'ground',
    hasAttic: false,
    architectureStyle: 'modern',
    gallery: [
      { label: 'Phòng khách', imageUrl: INTERIOR_RENDER.creamLiving },
      { label: 'Khu bàn ăn', imageUrl: INTERIOR_RENDER.openDining }
    ],
    description: [
      'Tông kem phủ toàn bộ tường và rèm, điểm nâu trầm ở kệ TV để phòng khách nhiều ánh sáng không bị phẳng.',
      'Đèn chùm bi và đèn cây đứng chia hai lớp sáng — sinh hoạt chung dùng đèn chùm, đọc sách bật riêng đèn cây.'
    ]
  },
  {
    id: '3d-09',
    name: 'Nhà vườn mái Thái – nội thất gỗ tự nhiên',
    imageUrl: STYLE_IMAGE['thai-roof'],
    styleLabel: 'Tối giản',
    interiorStyle: 'minimal',
    buildingType: 'garden',
    buildingTypeLabel: 'Nhà vườn',
    floorLabel: '1 tầng + gác lửng',
    floorCount: 'ground',
    hasAttic: true,
    architectureStyle: 'thai-roof',
    gallery: [
      { label: 'Phòng khách', imageUrl: STYLE_IMAGE['thai-roof'] },
      { label: 'Gác lửng', imageUrl: INTERIOR_IMAGE.minimal }
    ],
    description: [
      'Trần cao theo dốc mái để lộ hệ kèo gỗ, tạo chiều sâu mà không cần trang trí thêm.',
      'Đồ gỗ tự nhiên màu mật ong, sàn gạch giả gỗ chịu ẩm tốt cho nhà có sân vườn.'
    ]
  },
  {
    id: '3d-10',
    name: 'Biệt thự vườn Tân cổ điển – sảnh đôi',
    imageUrl: STYLE_IMAGE['garden-villa'],
    styleLabel: 'Tân cổ điển',
    interiorStyle: 'neoclassical',
    buildingType: 'garden',
    buildingTypeLabel: 'Nhà vườn',
    floorLabel: '2 tầng',
    floorCount: 'ground+1',
    hasAttic: false,
    architectureStyle: 'garden-villa',
    gallery: [
      { label: 'Sảnh', imageUrl: STYLE_IMAGE['garden-villa'] },
      { label: 'Phòng khách', imageUrl: INTERIOR_IMAGE.neoclassical },
      { label: 'Phòng ăn', imageUrl: TOPIC_IMAGE.kitchen }
    ],
    description: [
      'Sảnh thông tầng với cầu thang cong là trung tâm của phương án, các phòng xoay quanh trục này.',
      'Đá tự nhiên ở sàn sảnh và phào thạch cao ở trần giữ đúng tinh thần tân cổ điển nhưng vẫn dễ vệ sinh.'
    ]
  }
]

const TEMPLATES_3D: HandbookTemplate[] = INTERIOR_SEEDS.map((seed) => ({
  id: seed.id,
  name: seed.name,
  kind: '3d',
  imageUrl: seed.imageUrl,
  styleLabel: seed.styleLabel,
  specs: {
    buildingTypeLabel: seed.buildingTypeLabel,
    floorLabel: seed.floorLabel,
    imageCount: seed.gallery.length
  },
  description: seed.description,
  floors: seed.gallery.map((item, index) => ({
    id: `view-${index + 1}`,
    label: item.label,
    imageUrl: item.imageUrl
  })),
  tags: {
    buildingType: seed.buildingType,
    floorCount: seed.floorCount,
    hasAttic: seed.hasAttic,
    architectureStyle: seed.architectureStyle,
    interiorStyle: seed.interiorStyle
  }
}))

const TEMPLATES: HandbookTemplate[] = [...TEMPLATES_2D, ...TEMPLATES_3D]

/**
 * Cẩm nang nền tảng — ba giai đoạn xây nhà, mỗi giai đoạn một bộ chủ đề cố định
 * (Phần 3.1). Số bài của từng chủ đề KHÔNG khai ở đây mà đếm từ danh sách bài
 * viết, nên con số trên giao diện luôn khớp với nội dung mở ra bên dưới.
 */
const STAGES: HandbookStage[] = [
  {
    id: 'structure',
    order: 1,
    title: 'Phần thô',
    description: 'Kết cấu chịu lực, tường, mái và hệ thống kỹ thuật âm.',
    imageUrl: STAGE_IMAGE.structure,
    topics: [
      { id: 'foundation', stage: 'structure', title: 'Móng', icon: 'layers' },
      { id: 'piling', stage: 'structure', title: 'Cọc - ép cọc', icon: 'anchor' },
      { id: 'frame', stage: 'structure', title: 'Cột - dầm - sàn', icon: 'blocks' },
      { id: 'masonry', stage: 'structure', title: 'Tường xây - tô trát', icon: 'brick' },
      { id: 'roofing', stage: 'structure', title: 'Mái & chống thấm', icon: 'home' },
      { id: 'stairs', stage: 'structure', title: 'Cầu thang', icon: 'footprints' },
      { id: 'mep', stage: 'structure', title: 'Điện nước âm', icon: 'plug' },
      { id: 'structure-handover', stage: 'structure', title: 'Nghiệm thu phần thô', icon: 'check' }
    ]
  },
  {
    id: 'finishing',
    order: 2,
    title: 'Phần hoàn thiện',
    description: 'Trát, ốp lát, sơn bả, cửa và thiết bị.',
    imageUrl: STAGE_IMAGE.finishing,
    topics: [
      { id: 'tiling', stage: 'finishing', title: 'Ốp lát', icon: 'grid' },
      { id: 'painting', stage: 'finishing', title: 'Sơn bả', icon: 'brush' },
      { id: 'doors', stage: 'finishing', title: 'Cửa & vách', icon: 'door' },
      { id: 'sanitary', stage: 'finishing', title: 'Thiết bị vệ sinh', icon: 'shower' },
      { id: 'lighting', stage: 'finishing', title: 'Điện chiếu sáng', icon: 'light' },
      { id: 'finishing-handover', stage: 'finishing', title: 'Nghiệm thu hoàn thiện', icon: 'check' }
    ]
  },
  {
    id: 'interior',
    order: 3,
    title: 'Trang trí nội thất',
    description: 'Thiết kế nội thất, đồ gỗ, đồ rời và trang trí không gian.',
    imageUrl: STAGE_IMAGE.interior,
    topics: [
      { id: 'interior-design', stage: 'interior', title: 'Thiết kế nội thất', icon: 'ruler' },
      { id: 'joinery', stage: 'interior', title: 'Đồ gỗ', icon: 'hammer' },
      { id: 'loose-furniture', stage: 'interior', title: 'Đồ rời & trang trí', icon: 'sofa' },
      { id: 'interior-budget', stage: 'interior', title: 'Ngân sách nội thất', icon: 'wallet' }
    ]
  }
]

const ARTICLES: HandbookArticle[] = [
  {
    id: 'art-01',
    slug: 'cac-loai-mong-nha-pho-va-cach-chon',
    title: 'Các loại móng nhà phố và cách chọn',
    excerpt: 'Móng đơn, móng băng hay móng cọc — mỗi loại hợp với nền đất và quy mô nào.',
    imageUrl: TOPIC_IMAGE.blueprint,
    category: 'experience',
    stage: 'structure',
    topicId: 'foundation',
    publishedAt: '2026-08-06T08:30:00+07:00',
    readingMinutes: 6,
    body: [
      {
        heading: 'Móng đơn',
        paragraphs: [
          'Móng đơn đặt dưới từng cột, chịu tải trọng của một cột hoặc một nhóm cột gần nhau. Ưu điểm là thi công đơn giản, tiết kiệm vật liệu và thời gian.',
          'Loại móng này phù hợp với nhà phố có tải trọng nhỏ đến trung bình và nền đất tốt.'
        ]
      },
      {
        heading: 'Móng băng',
        paragraphs: [
          'Móng băng là dải móng chạy liên tục dưới tường hoặc hàng cột, giúp phân bố tải trọng đều hơn xuống nền đất.',
          'Phù hợp nhà phố có tường chịu lực, nền đất trung bình đến yếu. Thi công đơn giản hơn móng cọc và chi phí hợp lý.'
        ],
        imageUrl: CONSTRUCTION_IMAGE.rebar
      },
      {
        heading: 'Móng cọc',
        paragraphs: [
          'Móng cọc dùng cọc bê tông hoặc cọc khoan nhồi để truyền tải trọng công trình xuống lớp đất sâu, chắc.',
          'Phù hợp nhà phố cao tầng, nền đất yếu hoặc khu vực có tải trọng lớn. Chi phí cao hơn nhưng bảo đảm độ ổn định và an toàn lâu dài.'
        ]
      }
    ],
    tags: { buildingType: 'townhouse' },
    panelTopic: 'architecture'
  },
  {
    id: 'art-02',
    slug: 'quy-trinh-thi-cong-mong-dung-ky-thuat',
    title: 'Quy trình thi công móng đúng kỹ thuật',
    excerpt: 'Từ định vị tim cốt tới đổ bê tông và bảo dưỡng — các bước không được bỏ.',
    imageUrl: CONSTRUCTION_IMAGE.rebar,
    category: 'experience',
    stage: 'structure',
    topicId: 'foundation',
    publishedAt: '2026-08-04T14:15:00+07:00',
    readingMinutes: 5,
    body: [
      {
        heading: 'Định vị và đào đất',
        paragraphs: [
          'Định vị tim cốt theo bản vẽ, căng dây và đóng cọc mốc trước khi đào. Sai số ở bước này sẽ kéo theo lệch toàn bộ hệ cột phía trên.'
        ]
      },
      {
        heading: 'Đổ bê tông và bảo dưỡng',
        paragraphs: [
          'Bê tông móng cần đổ liên tục, đầm kỹ để không rỗ. Sau khi đổ phải giữ ẩm tối thiểu 7 ngày, đây là bước hay bị bỏ qua nhất khi thi công gấp.'
        ]
      }
    ],
    tags: {}
  },
  {
    id: 'art-03',
    slug: 'cach-tinh-khoi-luong-be-tong-mong',
    title: 'Cách tính khối lượng bê tông móng chi tiết',
    excerpt: 'Công thức tính và những phần khối lượng hay bị bỏ sót khi bóc tách.',
    imageUrl: BUILDING_IMAGE.townhouse,
    category: 'experience',
    stage: 'structure',
    topicId: 'foundation',
    publishedAt: '2026-08-02T09:45:00+07:00',
    readingMinutes: 6,
    body: [
      {
        heading: 'Bóc tách theo cấu kiện',
        paragraphs: [
          'Tách riêng bê tông lót, đài móng, giằng móng và cổ cột. Gộp chung là nguyên nhân phổ biến làm lệch dự toán 5–10%.'
        ]
      },
      {
        heading: 'Hao hụt thực tế',
        paragraphs: [
          'Bê tông thương phẩm nên cộng thêm 2–3% hao hụt; bê tông trộn tại chỗ nên cộng 5% vì thất thoát trong quá trình vận chuyển thủ công.'
        ]
      }
    ],
    tags: {}
  },
  {
    id: 'art-15',
    slug: 'sai-lam-thuong-gap-khi-lam-mong-nha-pho',
    title: 'Sai lầm thường gặp khi làm móng nhà phố',
    excerpt: 'Bỏ khảo sát địa chất, cắt thép chờ, đổ bê tông khi trời mưa — ba lỗi tốn tiền nhất.',
    imageUrl: CONSTRUCTION_IMAGE.rebar,
    category: 'experience',
    stage: 'structure',
    topicId: 'foundation',
    publishedAt: '2026-08-01T16:00:00+07:00',
    readingMinutes: 5,
    body: [
      {
        heading: 'Bỏ qua khảo sát địa chất',
        paragraphs: [
          'Chọn loại móng theo nhà hàng xóm là cách làm phổ biến nhưng rủi ro: hai lô cạnh nhau vẫn có thể khác lớp đất yếu bên dưới. Một mũi khoan khảo sát rẻ hơn nhiều so với chi phí xử lý lún sau này.'
        ]
      },
      {
        heading: 'Cắt bớt thép chờ cổ cột',
        paragraphs: [
          'Thép chờ ngắn hơn thiết kế làm mối nối cổ cột yếu đi, đây là lỗi khó phát hiện sau khi đổ bê tông. Nghiệm thu thép trước khi đổ là bước không được bỏ.'
        ]
      }
    ],
    tags: { buildingType: 'townhouse' }
  },
  {
    id: 'art-16',
    slug: 'chi-phi-lam-mong-nha-pho-08-2026',
    title: 'Chi phí làm móng nhà phố cập nhật 08/2026',
    excerpt: 'Khoảng giá móng đơn, móng băng và móng cọc theo đơn giá vật tư tháng 8/2026.',
    imageUrl: BUILDING_IMAGE.townhouse,
    category: 'material',
    stage: 'structure',
    topicId: 'foundation',
    publishedAt: '2026-07-30T10:20:00+07:00',
    readingMinutes: 5,
    body: [
      {
        heading: 'Khoảng giá theo loại móng',
        paragraphs: [
          'Móng đơn thường chiếm 2–3% tổng chi phí phần thô, móng băng 4–6%, móng cọc có thể lên 8–12% tuỳ chiều sâu cọc và địa chất khu vực.'
        ]
      },
      {
        heading: 'Phần hay phát sinh',
        paragraphs: [
          'Đào đất, vận chuyển đất thừa và ép cọc thử là ba khoản hay nằm ngoài báo giá ban đầu. Nên hỏi rõ nhà thầu ba mục này trước khi ký.'
        ]
      }
    ],
    tags: { buildingType: 'townhouse' }
  },
  {
    id: 'art-17',
    slug: 'kinh-nghiem-chon-mong-theo-dia-chat',
    title: 'Kinh nghiệm chọn móng theo địa chất',
    excerpt: 'Đất pha cát, đất sét yếu hay đất ruộng san lấp — mỗi nền đất hợp một phương án móng.',
    imageUrl: TOPIC_IMAGE.blueprint,
    category: 'experience',
    stage: 'structure',
    topicId: 'foundation',
    publishedAt: '2026-07-28T19:30:00+07:00',
    readingMinutes: 4,
    body: [
      {
        heading: 'Đọc kết quả khảo sát',
        paragraphs: [
          'Chỉ số quan trọng nhất là độ sâu lớp đất tốt. Lớp đất tốt nông thì móng băng đủ dùng; nằm sâu quá 6–8 m thì gần như bắt buộc dùng cọc.'
        ]
      },
      {
        heading: 'Đất ruộng san lấp',
        paragraphs: [
          'Nền mới san lấp còn lún theo thời gian, nên ưu tiên cọc ép tới lớp đất chịu lực thay vì móng băng, kể cả khi nhà chỉ 2–3 tầng.'
        ]
      }
    ],
    tags: { buildingType: 'townhouse' }
  },
  {
    id: 'art-04',
    slug: 'khi-nao-can-ep-coc',
    title: 'Khi nào nhà phố cần ép cọc',
    excerpt: 'Dấu hiệu nền đất yếu và cách chọn giữa cọc ép, cọc khoan nhồi.',
    imageUrl: BUILDING_IMAGE.townhouse,
    category: 'experience',
    stage: 'structure',
    topicId: 'piling',
    publishedAt: '2026-07-30T07:50:00+07:00',
    readingMinutes: 5,
    body: [
      {
        heading: 'Dấu hiệu phải ép cọc',
        paragraphs: [
          'Đất ruộng, đất ao lấp, khu vực ven sông hoặc nhà bên cạnh đã từng lún nứt — đều là dấu hiệu nên khảo sát địa chất trước khi quyết định.'
        ]
      },
      {
        heading: 'Cọc ép hay khoan nhồi',
        paragraphs: [
          'Cọc ép rẻ hơn nhưng gây rung, khó dùng trong hẻm nhỏ có nhà liền kề cũ. Cọc khoan nhồi đắt hơn nhưng ít ảnh hưởng công trình lân cận.'
        ]
      }
    ],
    tags: {}
  },
  {
    id: 'art-05',
    slug: 'cot-dam-san-nhung-loi-thuong-gap',
    title: 'Cột - dầm - sàn: những lỗi thường gặp',
    excerpt: 'Sai lệch cốt thép, tháo cốp pha sớm và hậu quả về sau.',
    imageUrl: STYLE_IMAGE['level4-modern'],
    category: 'experience',
    stage: 'structure',
    topicId: 'frame',
    publishedAt: '2026-07-28T11:10:00+07:00',
    readingMinutes: 6,
    body: [
      {
        heading: 'Cốt thép sai chủng loại',
        paragraphs: [
          'Thay thép đúng đường kính nhưng khác mác là lỗi khó phát hiện bằng mắt. Nên yêu cầu chứng chỉ lô thép trước khi nhập về công trình.'
        ]
      },
      {
        heading: 'Tháo cốp pha sớm',
        paragraphs: [
          'Sàn nhịp lớn cần đủ 21–28 ngày mới tháo chống. Tháo sớm để quay vòng cốp pha là nguyên nhân số một gây võng sàn.'
        ]
      }
    ],
    tags: {}
  },
  {
    id: 'art-06',
    slug: 'tuong-xay-to-trat-dung-ky-thuat',
    title: 'Tường xây - tô trát đúng kỹ thuật',
    excerpt: 'Chọn gạch, mạch vữa và cách hạn chế nứt chân chim.',
    imageUrl: STYLE_IMAGE.modern,
    category: 'experience',
    stage: 'structure',
    topicId: 'masonry',
    publishedAt: '2026-07-25T15:40:00+07:00',
    readingMinutes: 4,
    body: [
      {
        heading: 'Mạch vữa và độ ẩm gạch',
        paragraphs: [
          'Gạch phải tưới ẩm trước khi xây, mạch vữa dày đều 10–12mm. Gạch khô hút nước của vữa làm giảm cường độ liên kết.'
        ]
      },
      {
        heading: 'Chống nứt chân chim',
        paragraphs: [
          'Đóng lưới thép ở vị trí tiếp giáp tường – cột và quanh ô cửa; tô trát chia lớp, không tô dày một lần quá 15mm.'
        ]
      }
    ],
    tags: {}
  },
  {
    id: 'art-07',
    slug: '5-loi-thuong-gap-khi-chong-tham-mai',
    title: '5 lỗi thường gặp khi chống thấm mái',
    excerpt: 'Thấm mái hầu hết đến từ thi công, không phải từ vật liệu.',
    imageUrl: STYLE_IMAGE['thai-roof'],
    category: 'experience',
    stage: 'structure',
    topicId: 'roofing',
    publishedAt: '2026-08-05T08:30:00+07:00',
    readingMinutes: 5,
    featuredRank: 3,
    body: [
      {
        heading: 'Không tạo dốc đủ',
        paragraphs: [
          'Sàn mái cần độ dốc tối thiểu 1–2% về phễu thu. Đọng nước là điều kiện đủ để mọi lớp chống thấm hỏng sớm.'
        ]
      },
      {
        heading: 'Bỏ qua vị trí cổ ống',
        paragraphs: [
          'Hơn nửa số ca thấm bắt đầu từ cổ ống thoát và chân tường thu hồi — hai vị trí bắt buộc phải quét thêm lớp gia cường.'
        ]
      }
    ],
    tags: {}
  },
  {
    id: 'art-08',
    slug: 'cau-thang-kich-thuoc-chuan',
    title: 'Cầu thang nhà phố: kích thước chuẩn',
    excerpt: 'Bậc cao bao nhiêu là dễ đi, chiếu nghỉ đặt ở đâu cho hợp lý.',
    imageUrl: BUILDING_IMAGE.villa,
    category: 'experience',
    stage: 'structure',
    topicId: 'stairs',
    publishedAt: '2026-07-22T14:15:00+07:00',
    readingMinutes: 4,
    body: [
      {
        heading: 'Chiều cao và bề rộng bậc',
        paragraphs: [
          'Bậc cao 16–18cm, rộng 25–30cm là dải dễ đi nhất cho nhà ở. Bậc cao hơn 19cm gây mỏi rõ rệt với người lớn tuổi.'
        ]
      },
      {
        heading: 'Chiếu nghỉ',
        paragraphs: [
          'Cứ tối đa 18 bậc nên có một chiếu nghỉ. Với nhà phố hẹp, chiếu nghỉ còn là chỗ xoay đồ đạc khi chuyển nhà.'
        ]
      }
    ],
    tags: {}
  },
  {
    id: 'art-09',
    slug: 'di-dien-nuoc-am-tuong-can-luu-y-gi',
    title: 'Đi điện nước âm tường cần lưu ý gì',
    excerpt: 'Bản vẽ hoàn công đường ống là thứ bạn sẽ cần trong 10 năm tới.',
    imageUrl: CONSTRUCTION_IMAGE.electrician,
    category: 'experience',
    stage: 'structure',
    topicId: 'mep',
    publishedAt: '2026-07-20T09:45:00+07:00',
    readingMinutes: 5,
    body: [
      {
        heading: 'Chụp ảnh trước khi tô',
        paragraphs: [
          'Chụp toàn bộ tuyến ống sau khi lắp và trước khi tô trát, kèm thước đo trong khung hình. Đây là tài liệu rẻ nhất và hữu dụng nhất về sau.'
        ]
      },
      {
        heading: 'Không cắt ngang cột dầm',
        paragraphs: [
          'Tuyệt đối không đục ngang cột, dầm để luồn ống. Nếu buộc phải đi qua, phải chừa sẵn ống chờ từ lúc đổ bê tông.'
        ]
      }
    ],
    tags: {}
  },
  {
    id: 'art-10',
    slug: '7-luu-y-khi-nghiem-thu-phan-tho',
    title: '7 lưu ý khi nghiệm thu phần thô',
    excerpt: 'Danh sách kiểm tra trước khi ký biên bản chuyển sang hoàn thiện.',
    imageUrl: CONSTRUCTION_IMAGE.crane,
    category: 'experience',
    stage: 'structure',
    topicId: 'structure-handover',
    publishedAt: '2026-08-07T16:00:00+07:00',
    readingMinutes: 5,
    featuredRank: 2,
    body: [
      {
        heading: 'Kiểm tra kích thước thông thủy',
        paragraphs: [
          'Đo lại thông thủy từng phòng và đối chiếu bản vẽ. Sai lệch quá 2cm nên yêu cầu giải trình trước khi tô trát phủ đi.'
        ]
      },
      {
        heading: 'Thử nước sàn vệ sinh',
        paragraphs: [
          'Ngâm nước sàn WC tối thiểu 24 giờ và kiểm tra trần tầng dưới. Đây là phép thử duy nhất phát hiện thấm sớm mà không tốn chi phí.'
        ]
      }
    ],
    tags: {},
    panelTopic: 'architecture'
  },
  {
    id: 'art-11',
    slug: 'so-sanh-gach-porcelain-va-ceramic',
    title: 'So sánh gạch porcelain và ceramic',
    excerpt: 'Khác nhau ở độ hút nước, độ bền và giá — chọn theo khu vực sử dụng.',
    imageUrl: TOPIC_IMAGE.kitchen,
    category: 'material',
    stage: 'finishing',
    topicId: 'tiling',
    publishedAt: '2026-08-03T10:20:00+07:00',
    readingMinutes: 4,
    body: [
      {
        heading: 'Độ hút nước',
        paragraphs: [
          'Porcelain hút nước dưới 0,5% nên hợp khu ẩm và ngoài trời; ceramic hút 3–6%, chỉ nên dùng ốp tường trong nhà.'
        ]
      },
      {
        heading: 'Chọn theo khu vực',
        paragraphs: [
          'Sàn khách và bếp nên dùng porcelain vì chịu mài mòn; tường WC dùng ceramic để tiết kiệm mà vẫn đủ bền.'
        ]
      }
    ],
    tags: {}
  },
  {
    id: 'art-12',
    slug: 'son-ba-quy-trinh-va-dinh-muc',
    title: 'Sơn bả: quy trình và định mức',
    excerpt: 'Bao nhiêu lớp bả, bao nhiêu lớp sơn và một mét vuông tốn bao nhiêu.',
    imageUrl: STYLE_IMAGE.neoclassical,
    category: 'material',
    stage: 'finishing',
    topicId: 'painting',
    publishedAt: '2026-07-27T19:30:00+07:00',
    readingMinutes: 4,
    body: [
      {
        heading: 'Số lớp tiêu chuẩn',
        paragraphs: [
          'Quy trình đủ gồm 2 lớp bả, 1 lớp lót chống kiềm và 2 lớp sơn phủ. Bỏ lớp lót là lý do phổ biến khiến tường loang màu sau 1–2 mùa mưa.'
        ]
      },
      {
        heading: 'Định mức tham khảo',
        paragraphs: [
          'Trung bình 1 lít sơn phủ đi được 8–10m² một lớp trên tường đã bả phẳng. Tường chưa bả tốn thêm khoảng 20%.'
        ]
      }
    ],
    tags: {}
  },
  {
    id: 'art-13',
    slug: 'chon-cua-nhom-hay-cua-go',
    title: 'Chọn cửa nhôm hay cửa gỗ',
    excerpt: 'So sánh chi phí, độ bền và khả năng cách âm cho nhà phố.',
    imageUrl: INTERIOR_IMAGE.modern,
    category: 'material',
    stage: 'finishing',
    topicId: 'doors',
    publishedAt: '2026-07-24T07:50:00+07:00',
    readingMinutes: 5,
    body: [
      {
        heading: 'Chi phí và tuổi thọ',
        paragraphs: [
          'Nhôm hệ tốt bền hơn gỗ công nghiệp trong điều kiện ẩm, giá tương đương. Gỗ tự nhiên đẹp và ấm hơn nhưng cần bảo dưỡng định kỳ.'
        ]
      },
      {
        heading: 'Cách âm',
        paragraphs: [
          'Muốn cách âm mặt tiền đường lớn thì phải dùng kính hộp, khung nhôm hệ có gioăng kép — cửa gỗ đặc chỉ hơn kính đơn không đáng kể.'
        ]
      }
    ],
    tags: {}
  },
  {
    id: 'art-14',
    slug: 'bo-tri-anh-sang-cho-phong-khach',
    title: 'Bố trí ánh sáng cho phòng khách',
    excerpt: 'Ba lớp ánh sáng và cách tránh phòng khách vừa chói vừa tối.',
    imageUrl: TOPIC_IMAGE.livingRoom,
    category: 'interior',
    stage: 'finishing',
    topicId: 'lighting',
    publishedAt: '2026-08-01T11:10:00+07:00',
    readingMinutes: 5,
    featuredRank: 4,
    body: [
      {
        heading: 'Ba lớp ánh sáng',
        paragraphs: [
          'Ánh sáng nền (đèn trần), ánh sáng chức năng (đèn đọc, đèn bàn) và ánh sáng điểm nhấn (rọi tranh, hắt kệ). Thiếu một lớp là phòng mất chiều sâu.'
        ]
      },
      {
        heading: 'Nhiệt độ màu',
        paragraphs: [
          'Phòng khách nên dùng 3000–4000K. Trên 5000K cho cảm giác văn phòng, dưới 2700K làm màu nội thất bị ngả vàng.'
        ]
      }
    ],
    tags: {},
    panelTopic: 'interior'
  },
  {
    id: 'art-15',
    slug: 'thiet-bi-ve-sinh-chon-sao-cho-ben',
    title: 'Thiết bị vệ sinh: chọn sao cho bền',
    excerpt: 'Những chi tiết nhỏ quyết định việc WC có phải sửa lại sau 2 năm.',
    imageUrl: CONSTRUCTION_IMAGE.faucet,
    category: 'material',
    stage: 'finishing',
    topicId: 'sanitary',
    publishedAt: '2026-07-18T15:40:00+07:00',
    readingMinutes: 4,
    body: [
      {
        heading: 'Van và ruột sen',
        paragraphs: [
          'Phần hay hỏng trước nhất không phải bồn hay chậu mà là van, ruột sen và dây cấp. Ưu tiên hãng có sẵn linh kiện thay thế tại địa phương.'
        ]
      },
      {
        heading: 'Chiều cao lắp đặt',
        paragraphs: ['Chốt chiều cao sen và chậu theo người dùng thực tế trước khi ốp gạch — sửa sau là phải đục.']
      }
    ],
    tags: {}
  },
  {
    id: 'art-16',
    slug: 'nghiem-thu-hoan-thien-truoc-khi-nhan-nha',
    title: 'Nghiệm thu hoàn thiện trước khi nhận nhà',
    excerpt: 'Danh mục kiểm tra cuối cùng và cách giữ lại phần bảo hành.',
    imageUrl: BUILDING_IMAGE.apartment,
    category: 'experience',
    stage: 'finishing',
    topicId: 'finishing-handover',
    publishedAt: '2026-07-15T08:30:00+07:00',
    readingMinutes: 5,
    body: [
      {
        heading: 'Kiểm tra theo phòng',
        paragraphs: [
          'Đi từng phòng, thử toàn bộ ổ cắm, công tắc, vòi nước và bản lề cửa. Ghi lại thành danh sách kèm ảnh thay vì nhắc miệng.'
        ]
      },
      {
        heading: 'Giữ lại phần bảo hành',
        paragraphs: [
          'Thông lệ giữ 5% giá trị hợp đồng trong 12 tháng bảo hành. Điều khoản này phải có từ lúc ký, không thể thêm khi bàn giao.'
        ]
      }
    ],
    tags: {}
  },
  {
    id: 'art-17',
    slug: 'xu-huong-noi-that-nha-pho-2026',
    title: 'Xu hướng nội thất nhà phố 2026',
    excerpt: 'Tông màu, vật liệu và cách bố trí đang được ưa chuộng năm nay.',
    imageUrl: TOPIC_IMAGE.warmLiving,
    category: 'interior',
    stage: 'interior',
    topicId: 'interior-design',
    publishedAt: '2026-08-05T14:15:00+07:00',
    readingMinutes: 6,
    body: [
      {
        heading: 'Tông ấm và vật liệu tự nhiên',
        paragraphs: [
          'Gỗ sáng, vải bố và đá mài quay lại thay cho bảng màu xám lạnh của vài năm trước. Không gian nhìn mộc hơn nhưng ấm hơn.'
        ]
      },
      {
        heading: 'Công năng linh hoạt',
        paragraphs: [
          'Phòng làm việc tại nhà không còn là phòng riêng mà là một góc tích hợp trong phòng ngủ hoặc khu sinh hoạt chung.'
        ]
      }
    ],
    tags: {},
    panelTopic: 'interior'
  },
  {
    id: 'art-18',
    slug: 'do-go-cong-nghiep-hay-tu-nhien',
    title: 'Đồ gỗ công nghiệp hay tự nhiên',
    excerpt: 'MDF, HDF, plywood và gỗ tự nhiên — dùng ở đâu là hợp lý.',
    imageUrl: TOPIC_IMAGE.kitchen,
    category: 'interior',
    stage: 'interior',
    topicId: 'joinery',
    publishedAt: '2026-07-29T09:45:00+07:00',
    readingMinutes: 5,
    body: [
      {
        heading: 'Khu vực ẩm',
        paragraphs: [
          'Tủ bếp dưới và tủ lavabo nên dùng plywood chống ẩm hoặc nhựa; MDF thường nở chỉ sau vài lần tràn nước.'
        ]
      },
      {
        heading: 'Khu vực khô',
        paragraphs: ['Tủ áo, kệ trang trí dùng MDF phủ melamine là đủ bền và rẻ hơn gỗ tự nhiên khoảng một nửa.']
      }
    ],
    tags: {},
    panelTopic: 'interior'
  },
  {
    id: 'art-19',
    slug: 'chon-do-roi-cho-nha-nho',
    title: 'Chọn đồ rời cho nhà nhỏ',
    excerpt: 'Nguyên tắc kích thước và cách sắp để phòng nhỏ không thấy chật.',
    imageUrl: TOPIC_IMAGE.gallery,
    category: 'interior',
    stage: 'interior',
    topicId: 'loose-furniture',
    publishedAt: '2026-07-26T16:00:00+07:00',
    readingMinutes: 4,
    body: [
      {
        heading: 'Kích thước theo lối đi',
        paragraphs: [
          'Chừa tối thiểu 70cm cho lối đi chính. Sofa lớn kê sát tường vẫn tốt hơn sofa nhỏ đặt giữa phòng chắn lối.'
        ]
      },
      {
        heading: 'Chân cao, mặt thoáng',
        paragraphs: ['Đồ có chân cao để lộ sàn giúp mắt thấy diện tích liên tục, phòng nhỏ nhìn rộng hơn rõ rệt.']
      }
    ],
    tags: {},
    panelTopic: 'interior'
  },
  {
    id: 'art-20',
    slug: 'ngan-sach-noi-that-chia-the-nao',
    title: 'Ngân sách nội thất chia thế nào',
    excerpt: 'Tỷ lệ phân bổ hợp lý giữa đồ gỗ, đồ rời và thiết bị.',
    imageUrl: INTERIOR_IMAGE.indochine,
    category: 'interior',
    stage: 'interior',
    topicId: 'interior-budget',
    publishedAt: '2026-07-21T10:20:00+07:00',
    readingMinutes: 5,
    body: [
      {
        heading: 'Tỷ lệ tham khảo',
        paragraphs: [
          'Đồ gỗ cố định thường chiếm 45–55% ngân sách nội thất, đồ rời 25–30%, thiết bị và trang trí phần còn lại.'
        ]
      },
      {
        heading: 'Chi trước, chi sau',
        paragraphs: [
          'Ưu tiên phần khó thay đổi sau này (đồ gỗ, thiết bị âm). Rèm, tranh và cây có thể bổ sung dần mà không phá vỡ tổng thể.'
        ]
      }
    ],
    tags: {},
    panelTopic: 'interior'
  },
  {
    id: 'art-21',
    slug: 'gia-vat-lieu-xay-dung-thang-8-2026',
    title: 'Giá vật liệu xây dựng mới nhất tháng 8/2026',
    excerpt: 'Cập nhật bảng giá xi măng, thép, gạch, cát, đá và dự báo xu hướng biến động thời gian tới.',
    imageUrl: TOPIC_IMAGE.site,
    category: 'material',
    publishedAt: '2026-08-07T19:30:00+07:00',
    readingMinutes: 5,
    featuredRank: 1,
    body: [
      {
        heading: 'Thép và xi măng',
        paragraphs: [
          'Giá thép xây dựng đi ngang so với tháng trước; xi măng tăng nhẹ ở khu vực miền Trung do chi phí vận chuyển.'
        ]
      },
      {
        heading: 'Dự báo',
        paragraphs: [
          'Mùa mưa thường kéo giá cát và đá lên 5–8%. Chủ nhà chuẩn bị khởi công quý IV nên chốt khối lượng sớm.'
        ]
      }
    ],
    tags: {}
  },
  {
    id: 'art-22',
    slug: 'kinh-nghiem-chon-nha-thau-uy-tin',
    title: 'Kinh nghiệm chọn nhà thầu uy tín',
    excerpt: 'Tiêu chí đánh giá, cách kiểm tra năng lực và kinh nghiệm để chọn được nhà thầu chất lượng.',
    imageUrl: STYLE_IMAGE['japanese-roof'],
    category: 'experience',
    publishedAt: '2026-08-07T07:50:00+07:00',
    readingMinutes: 6,
    body: [
      {
        heading: 'Xem công trình đã làm',
        paragraphs: ['Yêu cầu đi xem ít nhất hai công trình đã bàn giao trên 1 năm — đủ lâu để lộ ra lỗi thi công.']
      },
      {
        heading: 'Đọc kỹ phụ lục vật tư',
        paragraphs: [
          'Phần lớn tranh chấp đến từ chủng loại vật tư ghi chung chung. Phụ lục phải ghi rõ hãng, mã và quy cách.'
        ]
      }
    ],
    tags: {}
  },
  {
    id: 'art-23',
    slug: 'quy-trinh-xin-phep-xay-dung',
    title: 'Quy trình xin phép xây dựng mới nhất',
    excerpt: 'Hướng dẫn chi tiết hồ sơ, thủ tục và thời gian xin giấy phép xây dựng theo quy định hiện hành.',
    imageUrl: BUILDING_IMAGE.roofed,
    category: 'legal',
    publishedAt: '2026-08-06T11:10:00+07:00',
    readingMinutes: 5,
    body: [
      {
        heading: 'Hồ sơ cần chuẩn bị',
        paragraphs: ['Đơn đề nghị, giấy tờ đất, hai bộ bản vẽ thiết kế và giấy cam kết an toàn với công trình liền kề.']
      },
      {
        heading: 'Thời gian giải quyết',
        paragraphs: [
          'Thông thường 15–20 ngày làm việc với nhà ở riêng lẻ. Hồ sơ thiếu bản vẽ kết cấu là lý do bị trả lại nhiều nhất.'
        ]
      }
    ],
    tags: {}
  },
  {
    id: 'art-24',
    slug: 'cach-du-toan-chi-phi-xay-nha-2-tang',
    title: 'Cách dự toán chi phí xây nhà 2 tầng',
    excerpt: 'Bóc tách theo ba phần thô - hoàn thiện - nội thất và những khoản hay bị quên.',
    imageUrl: STYLE_IMAGE['garden-villa'],
    category: 'experience',
    publishedAt: '2026-08-04T15:40:00+07:00',
    readingMinutes: 6,
    body: [
      {
        heading: 'Ba phần chi phí',
        paragraphs: [
          'Tách rõ phần thô, phần hoàn thiện và phần nội thất. Báo giá gộp một con số trên mét vuông luôn giấu phần chênh ở hoàn thiện.'
        ]
      },
      {
        heading: 'Khoản hay bị quên',
        paragraphs: [
          'Chi phí phá dỡ, thuê chỗ ở tạm, điện nước thi công và hoàn công thường không nằm trong báo giá nhà thầu.'
        ]
      }
    ],
    tags: {},
    panelTopic: 'architecture'
  }
]

/** Mẫu có sẵn đều đang phát hành; mẫu 2D mang thêm các trường có cấu trúc của epic 2D. */
export const HANDBOOK_TEMPLATES_SEED: HandbookTemplate[] = TEMPLATES.map((template) => {
  if (template.kind === '3d') {
    const style = template.tags.interiorStyle
    return {
      ...template,
      status: 'active',
      buildingTypeId: template.tags.buildingType,
      room: template.specs.floorLabel,
      interiorStyleId: style === 'minimal' ? 'in-minimalism' : style ? `in-${style}` : undefined
    }
  }
  const seed = PLAN_SEEDS.find((item) => item.id === template.id)
  return {
    ...template,
    status: 'active',
    buildingTypeId: seed?.buildingType,
    floorCount: seed?.levels,
    lotWidth: seed?.width,
    lotLength: seed?.depth,
    area: seed?.area
  }
})
export const HANDBOOK_STAGES_SEED: HandbookStage[] = STAGES
/** Bài có sẵn đều Active; thời gian tạo lấy theo ngày phát hành. */
export const HANDBOOK_ARTICLES_SEED: HandbookArticle[] = ARTICLES.map((article) => ({
  ...article,
  status: 'active',
  createdAt: `${article.publishedAt}T02:00:00.000Z`
}))

/** Bốn nhãn gốc của bài viết (ArticleManagement §1). */
export const ARTICLE_LABELS_SEED: CmsArticleLabel[] = [
  { id: 'experience', name: 'Kinh nghiệm xây nhà', status: 'active', order: 1 },
  { id: 'material', name: 'Vật liệu', status: 'active', order: 2 },
  { id: 'interior', name: 'Nội thất', status: 'active', order: 3 },
  { id: 'legal', name: 'Pháp lý', status: 'active', order: 4 }
]
