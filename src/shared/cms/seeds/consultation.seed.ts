import { BUILDING_IMAGE, INTERIOR_IMAGE, PORTRAIT_IMAGE, STYLE_IMAGE, TOPIC_IMAGE } from '@/shared/lib/imagery'
import type { Consultant, ConsultantRegion, ConsultantWork } from '../cms.types'

/**
 * 28 kiến trúc sư khách gửi để demo khi chưa có CMS (góp ý TV10, sheet "08. Tư
 * vấn 1:1" — mục "Hồ sơ KTS"). Tên, khu vực, số năm kinh nghiệm, chức danh +
 * công ty, chuyên môn (→ `headline`), giới thiệu (→ `bio`) và ảnh chân dung lấy
 * nguyên từ sheet. Ảnh đã tải về `public/images/consultants/<slug>.webp`.
 *
 * Sheet KHÔNG có: chip chuyên môn ngắn (rút từ câu chuyên môn), số công trình,
 * đánh giá và ảnh công trình tiêu biểu — phần này suy ra theo công thức ở
 * `toConsultant` và dùng ảnh minh họa chung, admin sẽ thay khi có CMS.
 */

/**
 * Chip chuyên môn — dùng chung cho bộ lọc "Chuyên môn" nên id phải ổn định.
 * `townhouse` / `villa` trùng id `BuildingType` để trang chủ đưa KTS đúng loại
 * nhà của dự án gần nhất lên đầu — đừng dùng lại id loại công trình khác
 * (`garden`, `roofed`...) cho nghĩa khác.
 */
const SPECIALTY = {
  townhouse: 'Nhà phố',
  villa: 'Biệt thự',
  resort: 'Nghỉ dưỡng',
  commercial: 'Thương mại',
  office: 'Văn phòng',
  planning: 'Quy hoạch',
  interior: 'Nội thất',
  renovation: 'Cải tạo nhà cổ',
  neoclassical: 'Tân cổ điển',
  traditional: 'Truyền thống',
  indochine: 'Đông Dương',
  minimal: 'Tối giản',
  industrial: 'Công nghiệp',
  green: 'Kiến trúc xanh',
  courtyard: 'Sân vườn',
  compact: 'Tối ưu diện tích',
  luxury: 'Cao cấp',
  family: 'Gia đình trẻ'
} as const

type SpecialtyId = keyof typeof SPECIALTY

/** 4 ảnh "công trình tiêu biểu" minh họa theo nhóm chuyên môn (sheet chưa gửi ảnh công trình). */
const WORKS = {
  neoclassical: [
    { imageUrl: STYLE_IMAGE.neoclassical, label: 'Biệt thự tân cổ điển' },
    { imageUrl: BUILDING_IMAGE.villa, label: 'Biệt thự 2 tầng' },
    { imageUrl: INTERIOR_IMAGE.neoclassical, label: 'Nội thất tân cổ điển' },
    { imageUrl: TOPIC_IMAGE.gallery, label: 'Phòng khách lớn' }
  ],
  traditional: [
    { imageUrl: STYLE_IMAGE['garden-thai-roof'], label: 'Nhà mái dốc sân trong' },
    { imageUrl: BUILDING_IMAGE.roofed, label: 'Nhà mái ngói' },
    { imageUrl: INTERIOR_IMAGE.indochine, label: 'Nội thất gỗ' },
    { imageUrl: TOPIC_IMAGE.warmLiving, label: 'Góc sinh hoạt chung' }
  ],
  resort: [
    { imageUrl: STYLE_IMAGE['thai-roof'], label: 'Biệt thự mái dốc' },
    { imageUrl: STYLE_IMAGE['garden-villa'], label: 'Biệt thự sân vườn' },
    { imageUrl: STYLE_IMAGE['japanese-roof'], label: 'Nhà nghỉ dưỡng mái Nhật' },
    { imageUrl: BUILDING_IMAGE.garden, label: 'Nhà vườn' }
  ],
  compact: [
    { imageUrl: BUILDING_IMAGE.townhouse, label: 'Nhà phố mặt tiền hẹp' },
    { imageUrl: INTERIOR_IMAGE.minimal, label: 'Nội thất gọn' },
    { imageUrl: TOPIC_IMAGE.kitchen, label: 'Bếp mở' },
    { imageUrl: TOPIC_IMAGE.blueprint, label: 'Hồ sơ kỹ thuật' }
  ],
  commercial: [
    { imageUrl: BUILDING_IMAGE.townhouse, label: 'Nhà phố kết hợp kinh doanh' },
    { imageUrl: STYLE_IMAGE.modern, label: 'Mặt tiền hiện đại' },
    { imageUrl: INTERIOR_IMAGE.modern, label: 'Không gian làm việc' },
    { imageUrl: TOPIC_IMAGE.blueprint, label: 'Hồ sơ kỹ thuật' }
  ],
  minimal: [
    { imageUrl: STYLE_IMAGE.minimal, label: 'Nhà phố tối giản' },
    { imageUrl: INTERIOR_IMAGE.minimal, label: 'Nội thất tối giản' },
    { imageUrl: TOPIC_IMAGE.warmLiving, label: 'Phòng khách ấm' },
    { imageUrl: STYLE_IMAGE.modern, label: 'Mặt tiền hiện đại' }
  ],
  green: [
    { imageUrl: BUILDING_IMAGE.garden, label: 'Nhà có sân vườn' },
    { imageUrl: STYLE_IMAGE['garden-villa'], label: 'Biệt thự sân vườn' },
    { imageUrl: TOPIC_IMAGE.livingRoom, label: 'Phòng khách sáng' },
    { imageUrl: STYLE_IMAGE.modern, label: 'Nhà phố hiện đại' }
  ],
  interior: [
    { imageUrl: INTERIOR_IMAGE.indochine, label: 'Nội thất gỗ' },
    { imageUrl: INTERIOR_IMAGE.neoclassical, label: 'Nội thất cổ điển' },
    { imageUrl: TOPIC_IMAGE.warmLiving, label: 'Góc sinh hoạt chung' },
    { imageUrl: TOPIC_IMAGE.gallery, label: 'Phòng khách lớn' }
  ],
  industrial: [
    { imageUrl: STYLE_IMAGE.modern, label: 'Nhà phố hiện đại' },
    { imageUrl: INTERIOR_IMAGE.modern, label: 'Nội thất hiện đại' },
    { imageUrl: TOPIC_IMAGE.kitchen, label: 'Bếp mở' },
    { imageUrl: BUILDING_IMAGE.townhouse, label: 'Nhà phố' }
  ],
  indochine: [
    { imageUrl: STYLE_IMAGE.indochine, label: 'Biệt thự Đông Dương' },
    { imageUrl: INTERIOR_IMAGE.indochine, label: 'Nội thất Đông Dương' },
    { imageUrl: BUILDING_IMAGE.villa, label: 'Biệt thự 2 tầng' },
    { imageUrl: TOPIC_IMAGE.gallery, label: 'Phòng khách lớn' }
  ],
  planning: [
    { imageUrl: BUILDING_IMAGE.villa, label: 'Khu biệt thự' },
    { imageUrl: STYLE_IMAGE['garden-villa'], label: 'Biệt thự sân vườn' },
    { imageUrl: TOPIC_IMAGE.site, label: 'Hiện trường thi công' },
    { imageUrl: TOPIC_IMAGE.blueprint, label: 'Hồ sơ kỹ thuật' }
  ]
} satisfies Record<string, ConsultantWork[]>

interface ArchitectRow {
  id: string
  /** Họ tên như sheet — tiền tố "KTS." thêm ở `toConsultant`. */
  name: string
  region: ConsultantRegion
  years: number
  /** Phần trước "tại" của cột "Công ty" trong sheet. */
  role: string
  /** Phần sau "tại" của cột "Công ty" trong sheet. */
  company: string
  avatarUrl: string
  /** Phần tử đầu là chuyên môn chính (nhóm sắp xếp). */
  specialties: [SpecialtyId, SpecialtyId]
  works: keyof typeof WORKS
  /** Cột "chuyên môn" của sheet. */
  headline: string
  /** Cột "Thông tin kiến trúc" của sheet, tách theo câu. */
  bio: string[]
}

/**
 * Giữ id `ktsvc-01..06` cho 6 KTS đầu vì lịch hẹn seed (`ops.seed.ts`) và lịch
 * sử mock của khách trỏ vào đó.
 */
const ROWS: ArchitectRow[] = [
  {
    id: 'ktsvc-01',
    name: 'Nguyễn Văn Tùng',
    region: 'north',
    years: 21,
    role: 'Kiến trúc sư trưởng',
    company: 'Công ty CP Kiến trúc Thăng Long',
    avatarUrl: '/images/consultants/nguyen-van-tung.webp',
    specialties: ['villa', 'neoclassical'],
    works: 'neoclassical',
    headline: 'Thiết kế biệt thự phong cách tân cổ điển',
    bio: [
      'Tôi có nhiều năm kinh nghiệm trong thiết kế biệt thự mang phong cách tân cổ điển châu Âu, chú trọng sự đối xứng và các chi tiết phào chỉ tinh xảo.',
      'Nhiều công trình của tôi đã trở thành điểm nhấn kiến trúc tại các khu đô thị phía Bắc.'
    ]
  },
  {
    id: 'ktsvc-02',
    name: 'Đặng Thị Lan Hương',
    region: 'north',
    years: 12,
    role: 'Kiến trúc sư',
    company: 'Công ty TNHH Kiến trúc Sông Hồng',
    avatarUrl: '/images/consultants/dang-thi-lan-huong.webp',
    specialties: ['townhouse', 'traditional'],
    works: 'traditional',
    headline: 'Thiết kế nhà phố truyền thống Bắc Bộ kết hợp hiện đại',
    bio: [
      'Tôi lấy cảm hứng từ kiến trúc nhà truyền thống vùng đồng bằng Bắc Bộ để đưa vào các thiết kế nhà phố hiện đại, giữ lại nét mái dốc và sân trong đặc trưng.',
      'Tôi mong muốn mang lại sự ấm cúng cho không gian sống của các gia đình Hà Nội.'
    ]
  },
  {
    id: 'ktsvc-03',
    name: 'Phạm Đức Anh',
    region: 'north',
    years: 16,
    role: 'Kiến trúc sư chính',
    company: 'Công ty CP Kiến trúc Tây Bắc',
    avatarUrl: '/images/consultants/pham-duc-anh.webp',
    specialties: ['villa', 'resort'],
    works: 'resort',
    headline: 'Thiết kế biệt thự nghỉ dưỡng vùng núi phía Bắc',
    bio: [
      'Tôi có kinh nghiệm thiết kế các công trình nghỉ dưỡng tại khu vực miền núi phía Bắc, tận dụng địa hình đồi dốc và khí hậu se lạnh đặc trưng.',
      'Vật liệu gỗ, đá và mái dốc thường xuất hiện xuyên suốt trong các thiết kế của tôi.'
    ]
  },
  {
    id: 'ktsvc-04',
    name: 'Vũ Thị Minh Châu',
    region: 'north',
    years: 8,
    role: 'Kiến trúc sư',
    company: 'Công ty TNHH Không Gian Hà Thành',
    avatarUrl: '/images/consultants/vu-thi-minh-chau.webp',
    specialties: ['townhouse', 'compact'],
    works: 'compact',
    headline: 'Thiết kế nhà phố nhỏ tối ưu diện tích tại nội đô Hà Nội',
    bio: [
      'Tôi chuyên về giải pháp thiết kế cho những căn nhà phố có mặt tiền hẹp tại khu vực nội đô Hà Nội, tận dụng giếng trời và cầu thang để tối ưu ánh sáng.',
      'Tôi luôn cân nhắc kỹ yếu tố khí hậu bốn mùa khi lên phương án thiết kế.'
    ]
  },
  {
    id: 'ktsvc-05',
    name: 'Trần Quang Vinh',
    region: 'north',
    years: 14,
    role: 'Giám đốc thiết kế',
    company: 'Công ty CP Kiến trúc Bắc Việt',
    avatarUrl: '/images/consultants/tran-quang-vinh.webp',
    specialties: ['commercial', 'office'],
    works: 'commercial',
    headline: 'Thiết kế công trình thương mại và văn phòng kết hợp nhà ở',
    bio: [
      'Tôi có nhiều dự án thiết kế công trình đa chức năng tại các quận trung tâm Hà Nội, kết hợp hài hòa giữa không gian kinh doanh và nơi ở.',
      'Tôi luôn chú trọng đến hiệu quả khai thác mặt bằng trong từng bản thiết kế.'
    ]
  },
  {
    id: 'ktsvc-06',
    name: 'Trần Văn Hùng',
    region: 'north',
    years: 17,
    role: 'Kiến trúc sư chính',
    company: 'Công ty CP Kiến trúc Tây Bắc',
    avatarUrl: '/images/consultants/tran-van-hung.webp',
    specialties: ['villa', 'resort'],
    works: 'resort',
    headline: 'Thiết kế biệt thự nghỉ dưỡng vùng núi phía Bắc',
    bio: [
      'Tôi chuyên nghiên cứu và ứng dụng các họa tiết, bố cục kiến trúc cung đình Huế vào những công trình biệt thự hiện đại.',
      'Đây là hướng đi tôi theo đuổi nhằm tôn vinh giá trị văn hóa lịch sử của vùng đất Cố đô.'
    ]
  },
  {
    id: 'ktsvc-07',
    name: 'Lê Thị Ngọc Diễm',
    region: 'north',
    years: 6,
    role: 'Kiến trúc sư',
    company: 'Công ty TNHH Không Gian Hà Thành',
    avatarUrl: '/images/consultants/le-thi-ngoc-diem.webp',
    specialties: ['townhouse', 'compact'],
    works: 'compact',
    headline: 'Thiết kế nhà phố nhỏ tối ưu diện tích tại nội đô Hà Nội',
    bio: [
      'Tôi tập trung nghiên cứu các giải pháp kiến trúc thụ động giúp giảm nhiệt cho nhà ở tại khu vực có khí hậu nắng nóng khắc nghiệt như miền Trung.',
      'Vật liệu cách nhiệt và hướng nhà luôn là ưu tiên hàng đầu trong thiết kế của tôi.'
    ]
  },
  {
    id: 'ktsvc-08',
    name: 'Phan Đình Khoa',
    region: 'north',
    years: 14,
    role: 'Giám đốc thiết kế',
    company: 'Công ty CP Kiến trúc Bắc Việt',
    avatarUrl: '/images/consultants/phan-dinh-khoa.webp',
    specialties: ['commercial', 'office'],
    works: 'commercial',
    headline: 'Thiết kế công trình thương mại và văn phòng kết hợp nhà ở',
    bio: [
      'Tôi có nhiều dự án thiết kế công trình đa chức năng tại các quận trung tâm Hà Nội, kết hợp hài hòa giữa không gian kinh doanh và nơi ở.',
      'Tôi luôn chú trọng đến hiệu quả khai thác mặt bằng trong từng bản thiết kế.'
    ]
  },
  {
    id: 'ktsvc-09',
    name: 'Đinh Thị Hải Yến',
    region: 'north',
    years: 8,
    role: 'Kiến trúc sư',
    company: 'Công ty TNHH Kiến trúc Hương Giang',
    avatarUrl: '/images/consultants/dinh-thi-hai-yen.webp',
    specialties: ['townhouse', 'compact'],
    works: 'compact',
    headline: 'Thiết kế nhà phố nhỏ cho khu vực đô thị Huế',
    bio: [
      'Tôi chuyên về các giải pháp thiết kế cho những căn nhà phố có diện tích hạn chế tại khu vực trung tâm thành phố Huế, vẫn đảm bảo đầy đủ công năng và ánh sáng tự nhiên.',
      'Tôi rất chú trọng đến yếu tố phong thủy trong từng bản vẽ.'
    ]
  },
  {
    id: 'ktsvc-10',
    name: 'Nguyễn Hữu Phước',
    region: 'north',
    years: 19,
    role: 'Giám đốc thiết kế',
    company: 'Công ty CP Kiến trúc Miền Trung Việt',
    avatarUrl: '/images/consultants/nguyen-huu-phuoc.webp',
    specialties: ['commercial', 'townhouse'],
    works: 'commercial',
    headline: 'Thiết kế công trình thương mại kết hợp nhà ở miền Trung',
    bio: [
      'Tôi có nhiều kinh nghiệm trong việc thiết kế các công trình đa chức năng phù hợp với đặc thù kinh doanh tại các đô thị miền Trung.',
      'Tôi luôn đặt hiệu quả kinh tế và thẩm mỹ lên hàng đầu khi tư vấn cho khách hàng.'
    ]
  },
  {
    id: 'ktsvc-11',
    name: 'Trương Thị Kim Oanh',
    region: 'north',
    years: 7,
    role: 'Kiến trúc sư',
    company: 'Công ty TNHH Kiến trúc Đại Ngàn',
    avatarUrl: '/images/consultants/truong-thi-kim-oanh.webp',
    specialties: ['villa', 'resort'],
    works: 'resort',
    headline: 'Thiết kế biệt thự nghỉ dưỡng núi rừng Tây Nguyên',
    bio: [
      'Tôi tập trung vào các dự án nghỉ dưỡng tại khu vực cao nguyên, khai thác tối đa lợi thế khí hậu mát mẻ và cảnh quan núi rừng.',
      'Vật liệu gỗ và đá tự nhiên thường được tôi ưu tiên sử dụng trong các thiết kế này.'
    ]
  },
  {
    id: 'ktsvc-12',
    name: 'Võ Minh Đức',
    region: 'north',
    years: 13,
    role: 'Kiến trúc sư',
    company: 'Công ty TNHH Kiến trúc Hương Giang',
    avatarUrl: '/images/consultants/vo-minh-duc.webp',
    specialties: ['townhouse', 'traditional'],
    works: 'traditional',
    headline: 'Thiết kế nhà phố phong cách hiện đại kết hợp mái ngói truyền thống',
    bio: [
      'Tôi theo đuổi hướng thiết kế giao thoa giữa nét hiện đại và truyền thống, đặc biệt trong cách xử lý mái ngói đặc trưng của khu vực miền Trung.',
      'Tôi mong muốn tạo ra những công trình vừa mới mẻ vừa gần gũi với văn hóa vùng miền.'
    ]
  },
  {
    id: 'ktsvc-13',
    name: 'Lý Thị Thanh Thảo',
    region: 'north',
    years: 10,
    role: 'Kiến trúc sư',
    company: 'Studio Trùng Tu Huế',
    avatarUrl: '/images/consultants/ly-thi-thanh-thao.webp',
    specialties: ['interior', 'renovation'],
    works: 'interior',
    headline: 'Thiết kế nội thất kết hợp cải tạo nhà cổ',
    bio: [
      'Tôi chuyên về lĩnh vực cải tạo và phục dựng những căn nhà cổ tại khu vực Huế, giữ lại giá trị kiến trúc gốc trong khi vẫn nâng cấp tiện nghi sống hiện đại.',
      'Đây là công việc đòi hỏi sự tỉ mỉ và am hiểu sâu về lịch sử kiến trúc.'
    ]
  },
  {
    id: 'ktsvc-14',
    name: 'Trần Bảo Long',
    region: 'south',
    years: 15,
    role: 'Chủ trì thiết kế',
    company: 'Công ty TNHH Kiến trúc Khang Minh',
    avatarUrl: '/images/consultants/tran-bao-long.webp',
    specialties: ['townhouse', 'minimal'],
    works: 'minimal',
    headline: 'Thiết kế nhà phố và biệt thự theo phong cách bền vững, tối giản',
    bio: [
      'Tôi từng tham gia và chủ trì nhiều dự án nhà ở, biệt thự và công trình thương mại quy mô vừa, được đánh giá cao nhờ khả năng tối ưu ánh sáng tự nhiên và vật liệu địa phương.',
      'Ngoài công việc thiết kế, tôi cũng thường xuyên chia sẻ kiến thức chuyên môn qua các buổi hội thảo trong ngành.'
    ]
  },
  {
    id: 'ktsvc-15',
    name: 'Lê Thành Đạt',
    region: 'south',
    years: 12,
    role: 'Trưởng phòng thiết kế',
    company: 'Công ty CP Kiến trúc Sài Gòn Xanh',
    avatarUrl: '/images/consultants/le-thanh-dat.webp',
    specialties: ['townhouse', 'green'],
    works: 'green',
    headline: 'Thiết kế nhà phố hiện đại kết hợp không gian xanh',
    bio: [
      'Tôi tập trung phát triển các giải pháp kiến trúc thân thiện với môi trường, ưu tiên thông gió tự nhiên và cây xanh trong từng công trình.',
      'Tôi đã tham gia thiết kế hơn 50 căn nhà phố tại khu vực TP.',
      'HCM và các tỉnh lân cận.'
    ]
  },
  {
    id: 'ktsvc-16',
    name: 'Nguyễn Ngọc Bích',
    region: 'south',
    years: 9,
    role: 'Kiến trúc sư chính',
    company: 'Công ty TNHH Thiết kế AN NHIÊN',
    avatarUrl: '/images/consultants/nguyen-ngoc-bich.webp',
    specialties: ['villa', 'interior'],
    works: 'resort',
    headline: 'Thiết kế nội thất kết hợp kiến trúc biệt thự nghỉ dưỡng',
    bio: [
      'Tôi chuyên về các dự án biệt thự nghỉ dưỡng ven biển và ven sông, chú trọng sự kết nối giữa không gian sống và cảnh quan thiên nhiên xung quanh.',
      'Tôi luôn đặt trải nghiệm người dùng làm trọng tâm trong mỗi thiết kế.'
    ]
  },
  {
    id: 'ktsvc-17',
    name: 'Phạm Quốc Huy',
    region: 'south',
    years: 18,
    role: 'Giám đốc thiết kế',
    company: 'Công ty CP Kiến trúc Phương Nam',
    avatarUrl: '/images/consultants/pham-quoc-huy.webp',
    specialties: ['commercial', 'townhouse'],
    works: 'commercial',
    headline: 'Kiến trúc công trình thương mại và nhà phố kết hợp kinh doanh',
    bio: [
      'Tôi có nhiều năm kinh nghiệm trong việc thiết kế các công trình đa chức năng, kết hợp không gian ở và kinh doanh một cách hài hòa.',
      'Các dự án của tôi thường được đánh giá cao về tính thực tiễn và hiệu quả sử dụng.'
    ]
  },
  {
    id: 'ktsvc-18',
    name: 'Võ Thị Thanh Mai',
    region: 'south',
    years: 7,
    role: 'Kiến trúc sư',
    company: 'Công ty TNHH Không Gian Việt',
    avatarUrl: '/images/consultants/vo-thi-thanh-mai.webp',
    specialties: ['townhouse', 'compact'],
    works: 'compact',
    headline: 'Thiết kế nhà phố nhỏ, tối ưu diện tích cho đô thị',
    bio: [
      'Tôi đam mê giải quyết bài toán không gian cho những căn nhà phố diện tích khiêm tốn, mang lại sự thoải mái và công năng tối đa cho gia chủ.',
      'Tôi thường xuyên cập nhật xu hướng thiết kế nhà ống hiện đại.'
    ]
  },
  {
    id: 'ktsvc-19',
    name: 'Đặng Minh Tuấn',
    region: 'south',
    years: 20,
    role: 'Chủ tịch kiêm Kiến trúc sư trưởng',
    company: 'Tập đoàn Kiến trúc Minh Tuấn',
    avatarUrl: '/images/consultants/dang-minh-tuan.webp',
    specialties: ['villa', 'luxury'],
    works: 'neoclassical',
    headline: 'Thiết kế biệt thự cao cấp và dinh thự',
    bio: [
      'Tôi có thâm niên lâu năm trong lĩnh vực thiết kế biệt thự cao cấp cho giới thượng lưu, chú trọng từng chi tiết từ vật liệu đến bố cục phong thủy.',
      'Nhiều công trình của tôi đã được giới thiệu trên các tạp chí kiến trúc trong nước.'
    ]
  },
  {
    id: 'ktsvc-20',
    name: 'Huỳnh Gia Bảo',
    region: 'south',
    years: 6,
    role: 'Kiến trúc sư',
    company: 'Studio Kiến trúc M.O.E',
    avatarUrl: '/images/consultants/huynh-gia-bao.webp',
    specialties: ['townhouse', 'industrial'],
    works: 'industrial',
    headline: 'Thiết kế nhà phố phong cách công nghiệp (industrial)',
    bio: [
      'Tôi theo đuổi phong cách thiết kế công nghiệp mộc mạc, sử dụng vật liệu thô như bê tông, thép và gỗ tái chế.',
      'Phong cách này đang được nhiều khách hàng trẻ tại TP.',
      'HCM ưa chuộng trong những năm gần đây.'
    ]
  },
  {
    id: 'ktsvc-21',
    name: 'Trịnh Hoàng Yến',
    region: 'south',
    years: 14,
    role: 'Trưởng nhóm thiết kế',
    company: 'Công ty TNHH Eco Home Việt Nam',
    avatarUrl: '/images/consultants/trinh-hoang-yen.webp',
    specialties: ['villa', 'green'],
    works: 'green',
    headline: 'Thiết kế biệt thự sinh thái, tiết kiệm năng lượng',
    bio: [
      'Tôi tập trung nghiên cứu và ứng dụng các giải pháp tiết kiệm năng lượng vào thiết kế biệt thự, như điện mặt trời và hệ thống tái sử dụng nước mưa.',
      'Mục tiêu của tôi là mang đến những công trình bền vững cho tương lai.'
    ]
  },
  {
    id: 'ktsvc-22',
    name: 'Bùi Thị Kim Ngân',
    region: 'south',
    years: 11,
    role: 'Kiến trúc sư chính',
    company: 'Công ty CP Thiết kế Nhiệt Đới Xanh',
    avatarUrl: '/images/consultants/bui-thi-kim-ngan.webp',
    specialties: ['townhouse', 'courtyard'],
    works: 'green',
    headline: 'Thiết kế nhà phố kết hợp sân vườn nhiệt đới',
    bio: [
      'Tôi yêu thích việc đưa thiên nhiên vào từng ngóc ngách của công trình, từ giếng trời cho đến sân vườn nhỏ trong nhà.',
      'Các dự án của tôi thường mang lại cảm giác mát mẻ và gần gũi dù nằm giữa lòng đô thị.'
    ]
  },
  {
    id: 'ktsvc-23',
    name: 'Ngô Đức Thịnh',
    region: 'south',
    years: 16,
    role: 'Kiến trúc sư trưởng',
    company: 'Công ty TNHH Kiến trúc Đông Dương',
    avatarUrl: '/images/consultants/ngo-duc-thinh.webp',
    specialties: ['villa', 'indochine'],
    works: 'indochine',
    headline: 'Thiết kế biệt thự phong cách Đông Dương (Indochine)',
    bio: [
      'Tôi dành nhiều tâm huyết cho việc khôi phục và tái hiện phong cách kiến trúc Đông Dương trong các công trình biệt thự hiện đại.',
      'Sự pha trộn giữa nét cổ điển Pháp và văn hóa bản địa là điểm nhấn trong các thiết kế của tôi.'
    ]
  },
  {
    id: 'ktsvc-24',
    name: 'Lâm Thị Hồng Anh',
    region: 'south',
    years: 8,
    role: 'Kiến trúc sư',
    company: 'Công ty TNHH Tổ Ấm Việt',
    avatarUrl: '/images/consultants/lam-thi-hong-anh.webp',
    specialties: ['townhouse', 'family'],
    works: 'compact',
    headline: 'Thiết kế nhà phố cho gia đình trẻ, không gian linh hoạt',
    bio: [
      'Tôi chuyên thiết kế những căn nhà phố phù hợp với gia đình trẻ, ưu tiên không gian mở và có thể thay đổi công năng theo từng giai đoạn cuộc sống.',
      'Tôi luôn lắng nghe kỹ nhu cầu của khách hàng trước khi bắt tay vào thiết kế.'
    ]
  },
  {
    id: 'ktsvc-25',
    name: 'Phan Anh Khoa',
    region: 'south',
    years: 22,
    role: 'Giám đốc kỹ thuật',
    company: 'Tập đoàn Bất động sản An Khang',
    avatarUrl: '/images/consultants/phan-anh-khoa.webp',
    specialties: ['planning', 'villa'],
    works: 'planning',
    headline: 'Quy hoạch khu biệt thự và khu đô thị sinh thái',
    bio: [
      'Tôi có kinh nghiệm dày dặn trong việc quy hoạch tổng thể các khu biệt thự và khu đô thị quy mô lớn, đảm bảo sự đồng bộ về cảnh quan và hạ tầng.',
      'Tôi từng chủ trì nhiều dự án khu đô thị sinh thái tại các tỉnh phía Nam.'
    ]
  },
  {
    // Ảnh sheet gửi (Drive 13syf…) là chân dung NAM, trùng ảnh KTS. Võ Minh Đức — tạm dùng ảnh minh họa.
    id: 'ktsvc-26',
    name: 'Đỗ Thị Mỹ Duyên',
    region: 'south',
    years: 5,
    role: 'Kiến trúc sư',
    company: 'Studio Mộc Lan',
    avatarUrl: PORTRAIT_IMAGE.woman2,
    specialties: ['townhouse', 'minimal'],
    works: 'minimal',
    headline: 'Thiết kế nhà phố phong cách tối giản Nhật Bản (Muji style)',
    bio: [
      'Tôi theo đuổi triết lý thiết kế tối giản, lấy cảm hứng từ phong cách Nhật Bản với sự tinh gọn trong từng đường nét.',
      'Tôi tin rằng một không gian sống nhẹ nhàng sẽ giúp cải thiện chất lượng cuộc sống của gia chủ.'
    ]
  },
  {
    id: 'ktsvc-27',
    name: 'Vũ Trọng Nghĩa',
    region: 'south',
    years: 13,
    role: 'Kiến trúc sư chính',
    company: 'Công ty CP Kiến trúc Biển Xanh',
    avatarUrl: '/images/consultants/vu-trong-nghia.webp',
    specialties: ['villa', 'resort'],
    works: 'resort',
    headline: 'Thiết kế biệt thự nghỉ dưỡng ven biển',
    bio: [
      'Tôi có nhiều dự án biệt thự nghỉ dưỡng tại các khu vực ven biển miền Nam, chú trọng khả năng chống chịu thời tiết và tối ưu tầm nhìn ra biển.',
      'Mỗi công trình đều được tôi nghiên cứu kỹ về địa hình trước khi thiết kế.'
    ]
  },
  {
    id: 'ktsvc-28',
    name: 'Trương Thị Bảo Trâm',
    region: 'south',
    years: 10,
    role: 'Kiến trúc sư',
    company: 'Công ty TNHH Thiết kế Đa Năng',
    avatarUrl: '/images/consultants/truong-thi-bao-tram.webp',
    specialties: ['townhouse', 'office'],
    works: 'commercial',
    headline: 'Thiết kế nhà phố kết hợp văn phòng làm việc tại nhà',
    bio: [
      'Tôi tập trung vào xu hướng thiết kế nhà ở kết hợp không gian làm việc, phù hợp với nhu cầu làm việc từ xa ngày càng phổ biến.',
      'Các thiết kế của tôi luôn đảm bảo sự tách biệt hợp lý giữa không gian sống và làm việc.'
    ]
  }
]

/**
 * Số công trình, điểm và lượt đánh giá sheet không có — suy từ số năm kinh
 * nghiệm để các thẻ vẫn so sánh được, thay bằng số thật khi có CMS.
 */
function toConsultant(row: ArchitectRow): Consultant {
  return {
    id: row.id,
    name: `KTS. ${row.name}`,
    title: row.role,
    company: row.company,
    region: row.region,
    avatarUrl: row.avatarUrl,
    specialties: row.specialties.map((id) => ({ id, label: SPECIALTY[id] })),
    yearsExperience: row.years,
    projectCount: row.years * 5,
    headline: row.headline,
    bio: row.bio,
    rating: row.years >= 15 ? 4.9 : row.years >= 10 ? 4.8 : 4.7,
    reviewCount: row.years * 8,
    visible: true,
    works: WORKS[row.works]
  }
}

export const CONSULTANTS_SEED: Consultant[] = ROWS.map(toConsultant)
