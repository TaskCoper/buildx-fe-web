import { BUILDING_IMAGE } from '@/shared/lib/imagery'
import type {
  CmsContractor,
  CmsContractorContact,
  CmsContractorMatching,
  CmsContractorProject,
  CmsContractorScope,
  CmsSurveySchedule
} from '../cms.types'

/**
 * Danh bạ nhà thầu mẫu cho bản mock (S12–S15).
 *
 * Số liệu là dữ liệu minh họa. Danh bạ do đội vận hành
 * quản lý ở /admin/contractors. Cố ý KHÔNG có trường nào liên quan tới giá: web
 * không hiển thị báo giá của nhà thầu (R2).
 *
 * Khoảng cách trải từ 2 tới 26 km để bộ lọc bán kính ở S12 (5/10/20/50 km)
 * thật sự lọc ra kết quả khác nhau chứ không phải nút bấm cho có.
 */
/**
 * Ảnh nhà thầu gửi qua Google Drive. Link `/file/d/<id>/view` là trang xem chứ
 * không phải ảnh, nên đổi sang host ảnh trực tiếp (file phải chia sẻ công khai).
 */
const driveImage = (fileId: string) => `https://lh3.googleusercontent.com/d/${fileId}`

/** Sheet "Profile nhà thầu": phần năng lực pháp lý giữ nguyên 4 mục như nhau cho mọi nhà thầu. */
const LEGAL_CHECKS = [
  'Giấy phép kinh doanh đã xác minh',
  'Đội ngũ kỹ sư phụ trách',
  'Bảo hiểm công trình',
  'Cam kết bảo hành 24 tháng'
]

/** Sheet ghi "Hợp tác SAVICO: tạm thời để trống" — chờ số hợp đồng thật. */
const NO_PARTNERSHIP = { verified: false, since: '', contractCode: '', signedAt: '', pageCount: 0 }

/**
 * Dự án như trong sheet nhập trước khi có epic Quản lý nhà thầu: nhóm lọc cũ
 * (`category`), phạm vi cũ (`constructionScope`) và thẻ tự do (`tags`). Chỉ là
 * đầu vào — `withCapability` quy về Loại công trình / Phạm vi thi công rồi bỏ đi.
 */
interface SheetProject extends CmsContractorProject {
  category?: 'house' | 'villa' | 'renovation' | 'factory'
  constructionScope?: 'turnkey' | 'structural' | 'finishing'
  tags?: string[]
}

type SheetContractor = Omit<CmsContractor, 'contact' | 'featuredProjects'> & { featuredProjects: SheetProject[] }

const DIRECTORY: readonly SheetContractor[] = [
  {
    id: 'ctr-abc',
    // Nhà thầu mẫu — ẩn khỏi danh sách, giữ lại vì lời mời mẫu còn trỏ tới.
    hidden: true,
    name: 'ABC Construction',
    kind: 'Nhà thầu xây dựng',
    verified: true,
    rating: 4.8,
    reviewCount: 126,
    similarProjects: 18,
    completedProjects: 46,
    distanceKm: 2.3,
    serviceAreas: ['TP. Buôn Ma Thuột', 'Cư M’gar', 'Krông Pắc'],
    region: 'central',
    surveyWithinHours: 24,
    acceptingProjects: true,
    intro:
      'ABC Construction là đơn vị thiết kế và thi công nhà ở dân dụng với hơn 8 năm kinh nghiệm. Công ty sở hữu đội ngũ kiến trúc sư, kỹ sư và giám sát chuyên môn, đồng hành cùng khách hàng từ ý tưởng đến khi hoàn thiện công trình.',
    strengths: ['Nhà phố', 'Thi công trọn gói', 'Phần thô', 'Hoàn thiện'],
    buildingTypeIds: ['townhouse', 'villa', 'roofed'],
    maxUpperFloors: 4,
    photos: [{ caption: 'Trụ sở công ty' }, { caption: 'Văn phòng làm việc' }, { caption: 'Đội ngũ nhân sự' }],
    foundedYear: 2016,
    teamSize: 32,
    officeAddress: 'TP. Buôn Ma Thuột, Đắk Lắk',
    warrantyMonths: 24,
    legalChecks: [
      'Giấy phép kinh doanh đã xác minh',
      'Đội ngũ kỹ sư phụ trách',
      'Bảo hiểm công trình',
      'Cam kết bảo hành 24 tháng'
    ],
    legalProfile: {
      legalName: 'Công ty TNHH Xây dựng ABC Construction',
      taxCodeMasked: '6001•••••3',
      establishedAt: '2016-03-14',
      operationYears: 10,
      representative: 'Ông Nguyễn Văn A',
      representativeTitle: 'Giám đốc',
      registeredAddress: '12 Nguyễn Tất Thành, P. Tân Lợi, TP. Buôn Ma Thuột, Đắk Lắk',
      primaryBusiness: 'Xây dựng nhà để ở (mã 4101) · Hoàn thiện công trình (4330)',
      workforce: '32 kiến trúc sư & kỹ sư · khoảng 120 công nhân',
      registrationNumberMasked: '6001•••••3',
      registrationIssuedAt: '2016-03-14',
      registrationStatus: 'verified',
      verifiedAt: '2026-09-12',
      verifiedUntil: '2026-08-12',
      warrantyMonths: 24,
      usesSavicoContract: true,
      hasConstructionInsurance: true,
      cooperationRank: 24,
      cooperationPercent: 96,
      complaintCount: 0
    },
    verifiedProjects: 12,
    featuredProjects: [
      {
        id: 'p1',
        name: 'Nhà phố Nguyễn Văn Linh',
        year: 2025,
        imageUrl: BUILDING_IMAGE.townhouse,
        verified: true,
        category: 'house',
        areaM2: 100,
        dimensions: '5×20m',
        scale: 'Trệt + 2 lầu',
        location: 'P. Tân An, TP. Buôn Ma Thuột',
        constructionScope: 'turnkey',
        contractorRole: 'general-contractor',
        constructionMonths: 5,
        constructionStartedAt: '2025-03-01',
        constructionEndedAt: '2025-08-01',
        mainItems: 'Móng băng, khung BTCT, hoàn thiện nội thất, hệ thống điện nước',
        verifiedAt: '2026-08-12',
        tags: ['Nhà phố', 'Thi công trọn gói', 'Hoàn thiện']
      },
      {
        id: 'p2',
        name: 'Nhà phố Tân Quy',
        year: 2024,
        imageUrl: BUILDING_IMAGE.roofed,
        verified: true,
        category: 'house',
        areaM2: 81,
        dimensions: '4,5×18m',
        scale: 'Trệt + 1 lầu',
        location: 'P. Tân Lợi, TP. Buôn Ma Thuột',
        tags: ['Nhà phố', 'Phần thô', 'Hoàn thiện']
      },
      {
        id: 'p3',
        name: 'Cải tạo nhà Hòa Bình',
        year: 2023,
        imageUrl: BUILDING_IMAGE.apartment,
        verified: true,
        category: 'renovation',
        areaM2: 120,
        scale: 'Trệt + 1 lầu',
        location: 'P. Thành Công, TP. Buôn Ma Thuột',
        tags: ['Thi công trọn gói', 'Hoàn thiện']
      },
      {
        id: 'p4',
        name: 'Biệt thự vườn Ea Tu',
        year: 2025,
        imageUrl: BUILDING_IMAGE.garden,
        verified: true,
        category: 'villa',
        areaM2: 450,
        scale: '2 tầng',
        location: 'Xã Ea Tu, TP. Buôn Ma Thuột',
        tags: ['Biệt thự', 'Trọn gói']
      },
      {
        id: 'p5',
        name: 'Nhà phố Lê Duẩn',
        year: 2024,
        verified: false,
        category: 'house',
        areaM2: 110,
        dimensions: '5×22m',
        scale: 'Trệt + 3 lầu',
        location: 'P. Tân Thành, TP. Buôn Ma Thuột',
        tags: ['Nhà phố', 'Phần thô']
      },
      {
        id: 'p6',
        name: 'Nhà xưởng Cư M’gar',
        year: 2023,
        verified: true,
        category: 'factory',
        areaM2: 800,
        scale: '1 tầng',
        location: 'Huyện Cư M’gar, Đắk Lắk',
        tags: ['Nhà xưởng', 'Trọn gói']
      },
      {
        id: 'p7',
        name: 'Nhà phố Phan Chu Trinh',
        year: 2025,
        imageUrl: BUILDING_IMAGE.townhouse,
        verified: true,
        category: 'house',
        areaM2: 96,
        dimensions: '4,8×20m',
        scale: 'Trệt + 2 lầu',
        location: 'P. Thắng Lợi, TP. Buôn Ma Thuột',
        tags: ['Nhà phố', 'Trọn gói']
      },
      {
        id: 'p8',
        name: 'Biệt thự Tân An',
        year: 2025,
        imageUrl: BUILDING_IMAGE.villa,
        verified: true,
        category: 'villa',
        areaM2: 320,
        scale: '2 tầng',
        location: 'P. Tân An, TP. Buôn Ma Thuột',
        tags: ['Biệt thự', 'Hoàn thiện']
      },
      {
        id: 'p9',
        name: 'Cải tạo nhà Y Jút',
        year: 2024,
        imageUrl: BUILDING_IMAGE.apartment,
        verified: true,
        category: 'renovation',
        areaM2: 85,
        scale: 'Trệt + 1 lầu',
        location: 'P. Tân Lập, TP. Buôn Ma Thuột',
        tags: ['Cải tạo', 'Hoàn thiện']
      },
      {
        id: 'p10',
        name: 'Nhà phố Ama Khê',
        year: 2024,
        verified: true,
        category: 'house',
        areaM2: 90,
        dimensions: '5×18m',
        scale: 'Trệt + 2 lầu',
        location: 'P. Tự An, TP. Buôn Ma Thuột',
        tags: ['Nhà phố', 'Phần thô']
      },
      {
        id: 'p11',
        name: 'Biệt thự hồ Ea Kao',
        year: 2024,
        imageUrl: BUILDING_IMAGE.garden,
        verified: true,
        category: 'villa',
        areaM2: 380,
        scale: '2 tầng',
        location: 'Xã Ea Kao, TP. Buôn Ma Thuột',
        tags: ['Biệt thự', 'Trọn gói']
      },
      {
        id: 'p12',
        name: 'Nhà phố Lý Thường Kiệt',
        year: 2023,
        imageUrl: BUILDING_IMAGE.roofed,
        verified: true,
        category: 'house',
        areaM2: 105,
        dimensions: '5×21m',
        scale: 'Trệt + 2 lầu',
        location: 'P. Thống Nhất, TP. Buôn Ma Thuột',
        tags: ['Nhà phố', 'Hoàn thiện']
      },
      {
        id: 'p13',
        name: 'Nhà xưởng Hòa Phú',
        year: 2023,
        verified: true,
        category: 'factory',
        areaM2: 1200,
        scale: '1 tầng',
        location: 'KCN Hòa Phú, TP. Buôn Ma Thuột',
        tags: ['Nhà xưởng', 'Phần thô']
      },
      {
        id: 'p14',
        name: 'Nhà phố Hà Huy Tập',
        year: 2023,
        category: 'house',
        areaM2: 100,
        dimensions: '5×20m',
        scale: 'Trệt + 1 lầu',
        location: 'P. Tân Lợi, TP. Buôn Ma Thuột',
        tags: ['Nhà phố', 'Trọn gói']
      },
      {
        id: 'p15',
        name: 'Biệt thự Cư Êbur',
        year: 2022,
        imageUrl: BUILDING_IMAGE.villa,
        category: 'villa',
        areaM2: 410,
        scale: '2 tầng',
        location: 'Xã Cư Êbur, TP. Buôn Ma Thuột',
        tags: ['Biệt thự', 'Phần thô']
      },
      {
        id: 'p16',
        name: 'Cải tạo nhà Lê Thánh Tông',
        year: 2022,
        category: 'renovation',
        areaM2: 72,
        scale: 'Trệt + 1 lầu',
        location: 'P. Tân Lợi, TP. Buôn Ma Thuột',
        tags: ['Cải tạo', 'Hoàn thiện']
      },
      {
        id: 'p17',
        name: 'Nhà phố Trần Nhật Duật',
        year: 2022,
        imageUrl: BUILDING_IMAGE.townhouse,
        category: 'house',
        areaM2: 88,
        dimensions: '4,4×20m',
        scale: 'Trệt + 2 lầu',
        location: 'P. Tân Thành, TP. Buôn Ma Thuột',
        tags: ['Nhà phố', 'Trọn gói']
      },
      {
        id: 'p18',
        name: 'Nhà phố Nguyễn Chí Thanh',
        year: 2021,
        category: 'house',
        areaM2: 95,
        dimensions: '5×19m',
        scale: 'Trệt + 2 lầu',
        location: 'P. Tân An, TP. Buôn Ma Thuột',
        tags: ['Nhà phố', 'Phần thô']
      }
    ],
    partnership: {
      verified: true,
      since: '08/2026',
      contractCode: 'SVC-HT-2026-018',
      signedAt: '2026-08-15',
      pageCount: 4
    }
  },
  {
    id: 'ctr-angia',
    // Nhà thầu mẫu — ẩn khỏi danh sách, giữ lại vì lời mời mẫu còn trỏ tới.
    hidden: true,
    name: 'An Gia Build',
    kind: 'Nhà thầu xây dựng',
    verified: true,
    rating: 4.6,
    reviewCount: 98,
    similarProjects: 15,
    completedProjects: 38,
    distanceKm: 4.1,
    serviceAreas: ['TP. Buôn Ma Thuột', 'Buôn Đôn'],
    region: 'central',
    surveyWithinHours: 24,
    acceptingProjects: true,
    intro:
      'An Gia Build tập trung vào nhà phố và biệt thự trọn gói, có xưởng nội thất riêng nên chủ động được tiến độ phần hoàn thiện.',
    strengths: ['Nhà phố', 'Biệt thự', 'Thi công trọn gói', 'Nội thất'],
    buildingTypeIds: ['townhouse', 'villa', 'apartment'],
    maxUpperFloors: 4,
    photos: [{ caption: 'Trụ sở công ty' }, { caption: 'Văn phòng làm việc' }, { caption: 'Đội ngũ nhân sự' }],
    foundedYear: 2014,
    teamSize: 45,
    officeAddress: 'TP. Buôn Ma Thuột, Đắk Lắk',
    warrantyMonths: 18,
    legalChecks: ['Giấy phép kinh doanh đã xác minh', 'Đội ngũ kỹ sư phụ trách', 'Cam kết bảo hành'],
    verifiedProjects: 9,
    featuredProjects: [
      {
        id: 'p1',
        name: 'Biệt thự Tân An',
        year: 2025,
        imageUrl: BUILDING_IMAGE.villa,
        tags: ['Biệt thự', 'Thi công trọn gói', 'Nội thất']
      },
      {
        id: 'p2',
        name: 'Nhà phố Lê Duẩn',
        year: 2024,
        imageUrl: BUILDING_IMAGE.townhouse,
        tags: ['Nhà phố', 'Thi công trọn gói']
      }
    ],
    partnership: {
      verified: true,
      since: '05/2026',
      contractCode: 'SVC-HT-2026-011',
      signedAt: '2026-05-06',
      pageCount: 4
    }
  },
  {
    id: 'ctr-hungphat',
    // Nhà thầu mẫu — ẩn khỏi danh sách, giữ lại vì lời mời mẫu còn trỏ tới.
    hidden: true,
    name: 'Hưng Phát Home',
    kind: 'Nhà thầu xây dựng',
    verified: true,
    rating: 4.5,
    reviewCount: 76,
    similarProjects: 12,
    completedProjects: 31,
    distanceKm: 3.7,
    serviceAreas: ['TP. Buôn Ma Thuột', 'Krông Ana'],
    region: 'central',
    surveyWithinHours: 48,
    acceptingProjects: true,
    intro:
      'Hưng Phát Home nhận phần thô và hoàn thiện cho nhà phố quy mô vừa, thế mạnh là kiểm soát khối lượng vật tư theo từng hạng mục.',
    strengths: ['Nhà phố', 'Phần thô', 'Hoàn thiện'],
    buildingTypeIds: ['townhouse', 'roofed', 'garden'],
    maxUpperFloors: 3,
    photos: [{ caption: 'Trụ sở công ty' }, { caption: 'Văn phòng làm việc' }, { caption: 'Đội ngũ nhân sự' }],
    foundedYear: 2018,
    teamSize: 24,
    officeAddress: 'TP. Buôn Ma Thuột, Đắk Lắk',
    warrantyMonths: 24,
    legalChecks: ['Giấy phép kinh doanh đã xác minh', 'Đội ngũ kỹ sư phụ trách', 'Bảo hiểm công trình'],
    verifiedProjects: 8,
    featuredProjects: [
      {
        id: 'p1',
        name: 'Nhà phố Y Jút',
        year: 2024,
        imageUrl: BUILDING_IMAGE.townhouse,
        tags: ['Nhà phố', 'Phần thô']
      },
      {
        id: 'p2',
        name: 'Nhà phố Phan Chu Trinh',
        year: 2023,
        imageUrl: BUILDING_IMAGE.roofed,
        tags: ['Nhà phố', 'Hoàn thiện']
      }
    ],
    partnership: {
      verified: true,
      since: '07/2026',
      contractCode: 'SVC-HT-2026-016',
      signedAt: '2026-07-02',
      pageCount: 3
    }
  },
  {
    id: 'ctr-truongthinh',
    // Nhà thầu mẫu — ẩn khỏi danh sách, giữ lại vì lời mời mẫu còn trỏ tới.
    hidden: true,
    name: 'Trường Thịnh E&C',
    kind: 'Nhà thầu xây dựng',
    verified: true,
    rating: 4.4,
    reviewCount: 54,
    similarProjects: 9,
    completedProjects: 24,
    distanceKm: 12.4,
    serviceAreas: ['Cư M’gar', 'TP. Buôn Ma Thuột'],
    region: 'central',
    surveyWithinHours: 48,
    acceptingProjects: true,
    intro:
      'Trường Thịnh E&C thi công biệt thự và công trình có kết cấu phức tạp, có bộ phận quản lý chất lượng độc lập với đội thi công.',
    strengths: ['Biệt thự', 'Thi công trọn gói'],
    buildingTypeIds: ['villa', 'garden'],
    maxUpperFloors: 2,
    photos: [{ caption: 'Trụ sở công ty' }, { caption: 'Văn phòng làm việc' }, { caption: 'Đội ngũ nhân sự' }],
    foundedYear: 2012,
    teamSize: 60,
    officeAddress: 'Cư M’gar, Đắk Lắk',
    warrantyMonths: 36,
    legalChecks: [
      'Giấy phép kinh doanh đã xác minh',
      'Đội ngũ kỹ sư phụ trách',
      'Bảo hiểm công trình',
      'Cam kết bảo hành'
    ],
    verifiedProjects: 6,
    featuredProjects: [
      {
        id: 'p1',
        name: 'Biệt thự vườn Ea Kao',
        year: 2025,
        imageUrl: BUILDING_IMAGE.garden,
        tags: ['Biệt thự', 'Thi công trọn gói']
      }
    ],
    partnership: {
      verified: true,
      since: '03/2026',
      contractCode: 'SVC-HT-2026-004',
      signedAt: '2026-03-18',
      pageCount: 4
    }
  },
  {
    id: 'ctr-daiviet',
    // Nhà thầu mẫu — ẩn khỏi danh sách, giữ lại vì lời mời mẫu còn trỏ tới.
    hidden: true,
    name: 'Đại Việt Group',
    kind: 'Nhà thầu xây dựng',
    verified: true,
    rating: 4.2,
    reviewCount: 41,
    similarProjects: 6,
    completedProjects: 17,
    distanceKm: 25.8,
    serviceAreas: ['Krông Pắc', 'Ea Kar'],
    region: 'central',
    surveyWithinHours: 48,
    acceptingProjects: false,
    intro:
      'Đại Việt Group nhận phần thô và hoàn thiện tại khu vực Krông Pắc – Ea Kar, quy mô đội nhỏ nên nhận số lượng dự án hạn chế.',
    strengths: ['Phần thô', 'Hoàn thiện'],
    buildingTypeIds: ['townhouse', 'garden', 'roofed'],
    maxUpperFloors: 2,
    photos: [{ caption: 'Trụ sở công ty' }, { caption: 'Văn phòng làm việc' }, { caption: 'Đội ngũ nhân sự' }],
    foundedYear: 2019,
    teamSize: 18,
    officeAddress: 'Krông Pắc, Đắk Lắk',
    warrantyMonths: 12,
    legalChecks: ['Giấy phép kinh doanh đã xác minh', 'Cam kết bảo hành'],
    verifiedProjects: 4,
    featuredProjects: [
      {
        id: 'p1',
        name: 'Nhà phố Phước An',
        year: 2024,
        imageUrl: BUILDING_IMAGE.townhouse,
        tags: ['Phần thô', 'Hoàn thiện']
      }
    ],
    partnership: {
      verified: true,
      since: '09/2026',
      contractCode: 'SVC-HT-2026-021',
      signedAt: '2026-09-01',
      pageCount: 3
    }
  },
  /*
   * Từ đây trở xuống: 13 nhà thầu thật từ sheet "Profile nhà thầu". Chữ và ảnh
   * lấy nguyên từ sheet + folder Drive; rating, reviewCount và distanceKm là số
   * minh họa (sheet không có). strengths/tags chờ nhà thầu gửi.
   */
  {
    id: 'ctr-thanglongphat',
    name: 'Công ty CP Xây dựng Thăng Long Phát',
    logoUrl: driveImage('1k2nEzDy4SXby0wy7qPH5KE1ZVPLeVa8v'),
    kind: 'Nhà thầu xây dựng',
    verified: true,
    rating: 4.8,
    reviewCount: 64,
    similarProjects: 3,
    completedProjects: 3,
    distanceKm: 3.2,
    serviceAreas: ['Hà Nội', 'Hưng Yên', 'Bắc Ninh', 'Hà Nam'],
    region: 'north',
    surveyWithinHours: 24,
    acceptingProjects: true,
    intro:
      'Thăng Long Phát là đơn vị thiết kế và thi công nhà ở dân dụng với hơn 12 năm kinh nghiệm. Công ty sở hữu đội ngũ kỹ sư và kiến trúc sư chuyên môn, đồng hành cùng khách hàng từ khâu khảo sát đến khi bàn giao công trình.',
    strengths: [],
    photos: [
      { url: driveImage('1M4wgX5L5bqWc8_lL6IqVS7CLAmuxxgNx'), caption: 'Trụ sở công ty' },
      { url: driveImage('1hi-DnX7QFHnXc_tMN4-fqAaV56z8nHMr'), caption: 'Văn phòng làm việc' },
      { url: driveImage('1BAD1Vg29QdMrofKnlOATzo3WuvhabTmz'), caption: 'Đội ngũ nhân sự' }
    ],
    foundedYear: 2012,
    teamSize: 19,
    officeAddress: 'Quận Hà Đông, Hà Nội',
    warrantyMonths: 24,
    legalChecks: LEGAL_CHECKS,
    verifiedProjects: 3,
    featuredProjects: [
      {
        id: 'p1',
        name: 'DỰ ÁN NHÀ PHỐ',
        year: 2024,
        imageUrl: driveImage('1jDZXRscF-zjjuNKdBtAO9XkhBjyqjt0P'),
        galleryUrls: [
          '1LMKEL-OGtW89V8_zqIR_RzVOmMSzlf0R',
          '1tH1ruQ4FuX_9uofvsX_cUiPPWUrLIR5x',
          '1YT8EYCFs_edZsPJh02vNzrEZx_h7aViN',
          '1XAfNy8VJjI_QOZTBW6eQmbQqBznYx4tk',
          '18SAnGQMExw8xUwLGciwAGL0D6hXgnfcQ',
          '1J1Zw95pSBQoR3R5o2RSMz2lqKG3sqaU6',
          '1_ACuPdbW5oOQVn6ZG2yo51jLmIkfMCR1',
          '1uDHQHxNg2CKCcrMkxE_BQnUu04gNjkFL',
          '1sWF-d7Wke971gKb7kQjVYmX8hXxL7kF6',
          '1d_NAUyfJAdwKaMuoGRx-I7ASbI0nPDQr',
          '1RisI1hJc34grN54-htoDFzdcQWJhocJI'
        ].map(driveImage),
        verified: true,
        areaM2: 140,
        scale: 'Trệt + 2 lầu (3 tầng)',
        location: 'Đường Lê Trọng Tấn, Q. Hà Đông, Hà Nội',
        category: 'renovation',
        constructionScope: 'turnkey',
        contractorRole: 'general-contractor',
        constructionMonths: 4,
        constructionStartedAt: '2024-02-01',
        constructionEndedAt: '2024-05-01',
        mainItems:
          'Cải tạo kết cấu tường, khung xương, cán nền, thi công trần – sàn, hoàn thiện nội thất, hệ thống điện nước',
        verifiedAt: '2026-08-12'
      },
      {
        id: 'p2',
        name: 'DỰ ÁN SHOWROOM SARA',
        year: 2022,
        imageUrl: driveImage('1U6EkCcdQ8VaLbSJ91ngSdCBIEbmYIPEh'),
        galleryUrls: [
          '1yepdmIrQUNFhyKWZpk_kUOx_LdAUa2xJ',
          '1woQWkq8K0Twvnevvc_hFYJkRQ1NWPV0Y',
          '1HxUTZnoxJOEkTsycw8WYCXTwc0nvkLw4',
          '1ir-BKZiqpZoekvGcIGLGomiBtt20erbb',
          '1_eKOXoyFeCKUG384XbjpYDglVDxSb8ga',
          '1HDspXBGb_xdjtpUUMH9Bb6IEKrLWeEHK',
          '184KYjocBxScFk2y4IVs92cg59WO7_E2W',
          '1cy5yY_zBOQGPBE1h3008AkL38jdAxWMm',
          '1VTqKBhkleH1dOY7y7ysRmIqCr2BBauuD',
          '1MWSNbYfU_bfnRBpmFW-pVIAC4rm0kvOS',
          '1zfw_wXIUmiCSX5__1RnxM5Pio4vXdt7Q',
          '1LG9YQGFZfKMvy_i1UTLaE8JCw-FViNyQ',
          '154SpNegk7Whqx7XU7MqE6DdDhsOawBQf',
          '14vUmj_1wx88nkZ2WUjiqRLmlz5xK1LeR'
        ].map(driveImage),
        verified: true,
        // Showroom trưng bày thiết bị nội thất — không thuộc 4 nhóm lọc, chỉ hiện ở "Tất cả".
        areaM2: 1200,
        location: 'Đường Nguyễn Văn Linh, TP. Hưng Yên, tỉnh Hưng Yên',
        constructionScope: 'turnkey',
        contractorRole: 'general-contractor',
        constructionMonths: 5,
        constructionStartedAt: '2022-06-01',
        constructionEndedAt: '2022-11-01',
        mainItems:
          'Thi công phần thô, hệ thống kệ trưng bày, ánh sáng, khu vực reception và các khu trưng bày sản phẩm',
        verifiedAt: '2026-08-19'
      },
      {
        id: 'p3',
        name: 'DỰ ÁN HIÊN SPA',
        year: 2017,
        imageUrl: driveImage('1RUg0o7gNMBY3Gt56jcIislBWU1Ny0pX1'),
        galleryUrls: [
          '1zUuoU8uCDwbSOWmS1yBRPmsf2Q38yurK',
          '1mD0QJ-XVzwsIxZ-8xUjKOl7_E-xZTZc0',
          '1MLyUEw0b7D3yTEdM6FIUZdDiq57OeCo6',
          '1cTke3lUsJi5YagslD6bKm3yRL01fdJJF',
          '15pR4_Jci5BhvRNETzKXrumamrcqIXgk4',
          '1aD0QqqB_tGscyeDXvhkq8ioPf74v2alT',
          '1gEHGtNBQXJTznm9q4NynWEC8guV602K3',
          '1UBcg9O37VvnEDzhmVC3iK42GTKJQJ-YK',
          '1pQqx702_AjHXVKwXIDWF015lkXW03Kqh',
          '1lcwUgYfI9t5WynGkZzvjglJxa6vHOV9l',
          '1gj2s_pSgsSaWyz3BfYZWpTKH0AXG_VCO',
          '1niLPLH4USU2MlbIQg_-zwB7VbUhR8uoJ',
          '1sj3hCql4DHXZpM_FT2-ca48eq7t-01MV',
          '1QVumvlQZMvzNy-1wnMSoTorGnPxrXxaD',
          '14zUCCdF5o_f5-ofejYO6ZU4Tu8L_cQvq',
          '1wC22C-ngqHh985MUI73HvU0sY7FTskI0'
        ].map(driveImage),
        verified: true,
        areaM2: 520,
        scale: '1 trệt + 2 tầng',
        location: 'Đường Nguyễn Trãi, Q. Thanh Xuân, Hà Nội',
        category: 'renovation',
        constructionScope: 'turnkey',
        contractorRole: 'general-contractor',
        constructionMonths: 3,
        constructionStartedAt: '2017-03-01',
        constructionEndedAt: '2017-05-01',
        mainItems: 'Cải tạo kết cấu, sơn hoàn thiện, lắp sàn gỗ, thi công 3 phòng trị liệu và khu lễ tân',
        verifiedAt: '2026-08-07'
      }
    ],
    partnership: NO_PARTNERSHIP
  },
  {
    id: 'ctr-hongha',
    name: 'Công ty TNHH Kiến trúc Xây dựng Hồng Hà',
    logoUrl: driveImage('1g-avQFHE87Iy0kFPeTuxKjpfZc3KTjsO'),
    kind: 'Nhà thầu xây dựng',
    verified: true,
    rating: 4.6,
    reviewCount: 41,
    similarProjects: 3,
    completedProjects: 3,
    distanceKm: 7.8,
    serviceAreas: ['Nội thành Hà Nội'],
    region: 'north',
    surveyWithinHours: 72,
    acceptingProjects: true,
    intro:
      'Hồng Hà là đơn vị thiết kế - thi công nhà phố và cải tạo nội thất, hoạt động theo mô hình trọn gói khép kín. Đội ngũ kiến trúc sư trẻ trực tiếp làm việc cùng khách hàng từ ý tưởng thiết kế đến hoàn thiện công trình.',
    strengths: [],
    photos: [
      { url: driveImage('1aa1qVchaLbmttbVUhIjkoIePrpeLp-gp'), caption: 'Trụ sở công ty' },
      { url: driveImage('1JOFgquMHTpsBDr74XcoPNEv9h9GV7R3W'), caption: 'Văn phòng làm việc' },
      { url: driveImage('19TCVYWDLhsV_nRVxi3FHv3peUrVpvHKI'), caption: 'Đội ngũ nhân sự' }
    ],
    foundedYear: 2017,
    teamSize: 15,
    officeAddress: 'Quận Cầu Giấy, Hà Nội',
    warrantyMonths: 24,
    legalChecks: LEGAL_CHECKS,
    verifiedProjects: 3,
    featuredProjects: [
      {
        id: 'p1',
        name: 'DỰ ÁN KARAOKE',
        year: 2025,
        imageUrl: driveImage('1OEwxg2KdZrgDom1Mv53mTn3-ab2jgd5r'),
        galleryUrls: [
          '1l05eCdND-EfefCMunnZbAmx6zWJZRaxX',
          '191wZzy0rPeDSsVnqVh0tSahP0rQbz7Oj',
          '17RkIxfgVKXA2oslqFhwcYNYdqrJX8QUt',
          '1TaXMICmWbP6n2rLpo-qxk6fSOzARp30Q',
          '1F4P0GlASfRngAn1iMw1eaH9X_VKIAlIm',
          '1g46_a_ySXmgth6IwpawXdtpocl2601YK',
          '1Cs9xe0S-JByeF9JkKwIGQWbww1YsmeZD',
          '1u5DB0kaFVSpwXicx2pqnjaIXylzVEaZk',
          '1QAnz4Qn7hQdyU14QhBundODrg-YD2oB5',
          '1t47_5tcN9OaXKcO4uGzIS-PgbGkurcSm',
          '1vGRbkW2n1h5Ch3SQSNWqlyxr4CiZOW_y',
          '1Nx84VLwsHViG4Vi4jz4frwAgT6XXm0UD',
          '17g9PQa_WWSw-2UOBa7nYjZNnjnSy2XtG'
        ].map(driveImage),
        verified: true,
        // Karaoke — không thuộc 4 nhóm lọc, chỉ hiện ở "Tất cả".
        areaM2: 350,
        location: 'Phố Huế, Q. Hai Bà Trưng, Hà Nội',
        constructionScope: 'turnkey',
        contractorRole: 'general-contractor',
        constructionMonths: 3,
        constructionStartedAt: '2025-01-01',
        constructionEndedAt: '2025-03-01',
        mainItems:
          'Đổ bê tông nền, thi công cầu thang, lắp thang máy, hoàn thiện tường kính đen, hệ thống âm thanh – ánh sáng',
        verifiedAt: '2026-09-08'
      },
      {
        id: 'p2',
        name: 'DỰ ÁN NHÀ PHỐ',
        year: 2025,
        imageUrl: driveImage('168qy45VlXytv2Hb3aX_9w3G6maOPlrVp'),
        galleryUrls: [
          '18OpGODfh8CRTmLWoP0e6-q7_3CK-u8Dd',
          '1CbptyXH2E3yPG9b1dU-0wOcm_mii4B1s',
          '1EAK5Lg77h62sZKTstv28qIwtF_cUUKof',
          '1p78c2zvbSMnvcNYmCKMScngkW7K2e7VP',
          '1pYxVdNQKCilv0h6Y623yeu7F6vFkGvxQ',
          '18CZphUwryHpDME4C_xEZXLSPRjFlK9zL',
          '1kff16ZTustIJmt74YEA0HOgxZPaKal_g',
          '1-wHffkrD77k4vRUCYV7zjTlRuu2x7cOL',
          '12WV9iOYSc3L7u49BuOtc3upNWCQN5wr0',
          '10ca-FE2BVl5tY98x6j8CAVDwKGBm10L5',
          '1GLiEgEw9Hqp1r9QjJWjqAdehDPhBN56Y',
          '1i-4uEePJd_G3XTVqIuxkd8YUuFe4uVdw',
          '1kyp5L_hftAgfQET960K3J7NE5eG8quKn'
        ].map(driveImage),
        verified: true,
        areaM2: 200,
        dimensions: '5×20m',
        scale: '2 tầng',
        location: 'Đường Láng, Q. Đống Đa, Hà Nội',
        category: 'renovation',
        constructionScope: 'turnkey',
        contractorRole: 'general-contractor',
        constructionMonths: 1,
        mainItems: 'Đào móng, đổ bê tông móng – cột – dầm – sàn, xây tường, hoàn thiện phòng khách – bếp – 2 phòng ngủ',
        verifiedAt: '2026-08-25'
      },
      {
        id: 'p3',
        name: 'DỰ ÁN Showroom And Gaming House T1',
        year: 2018,
        imageUrl: driveImage('1oMRTF1j7ceC8U52nx0bXC6t3mySJIZWd'),
        galleryUrls: [
          '1LRfpn5At1_ICT1pICreNMcJkGcB5VDtt',
          '1f1EhpOrsFW-nWMkF9OYB57rYEP8PSkls',
          '1xnqF2yk9EyHc23WhQIfQrbHdSYAffpFQ',
          '1yd9mmGgHimitGzE1mwUnCIlC3WKC-UNX',
          '1Qg8hkNX4vT_-HC9p8MFrgADmgif1s-8q',
          '1nEMlKeZbeoK5bID-Fc_MFOI6c3xQgtPs',
          '1w0UQrHCzahUtGIxABbIGnr-h9E5Mnh2P',
          '1nUH0hU858zrpz8B0zpD00FsAH_R_t8jY',
          '1KKZznxyafiK5fV80prgBiD65znBHAu7x',
          '1nAQX1k90NqbmNiCNIHYtSxyo6J35UNdc',
          '1LAQuAErdA0B5MJ2oQ3WgLQrae6Pjc_lT',
          '1bpVfc6cBjXAOZKGdoOz53PHmvf8Pt8J_',
          '1FOvkHGEt94i00597Bg81IbqiTqUIsaOe',
          '13bKPHZT18ztRWBm4Gtf4ZY9yIh0h0Szc',
          '1zT-36wYG93imD-NVEu-YiNZhBdxzlEeq',
          '1asW2ncBBpeQzy23JhDmJUAcQMn6h80hq',
          '1iCR0rrff3RMZA8e0144m5rkPVSQ_gOzW',
          '15B2_VZhwtcZ4or9I77jM_oCQhBPyjBZk',
          '1E9nTXpjKr7prMaes_DwP2C0ncNuzSyDJ',
          '1aKfMlds-o-x5Op6abEp23TXSzQOf8hK5'
        ].map(driveImage),
        verified: true,
        // Showroom kết hợp Gaming House — không thuộc 4 nhóm lọc, chỉ hiện ở "Tất cả".
        areaM2: 300,
        scale: '1 trệt + 2 tầng',
        location: 'Đường Cầu Giấy, Q. Cầu Giấy, Hà Nội',
        constructionScope: 'turnkey',
        contractorRole: 'general-contractor',
        constructionMonths: 3,
        constructionStartedAt: '2018-04-01',
        constructionEndedAt: '2018-06-01',
        mainItems: 'Thi công phần thô, hệ thống điện chiếu sáng, khu vực trải nghiệm gaming, nội thất trưng bày',
        verifiedAt: '2026-08-18'
      }
    ],
    partnership: NO_PARTNERSHIP
  },
  {
    id: 'ctr-vietbac',
    name: 'Công ty CP Xây dựng Việt Bắc',
    logoUrl: driveImage('1ucIxacM429sZ2kERHRw72zi6M3T393b7'),
    kind: 'Nhà thầu xây dựng',
    verified: true,
    rating: 4.7,
    reviewCount: 88,
    similarProjects: 3,
    completedProjects: 3,
    distanceKm: 9.1,
    serviceAreas: ['Bắc Giang', 'Thái Nguyên', 'Lạng Sơn', 'Hà Nội'],
    region: 'north',
    surveyWithinHours: 24,
    acceptingProjects: true,
    intro:
      'Việt Bắc là nhà thầu thi công công trình dân dụng và nhà xưởng nhỏ, phát triển qua hai thế hệ trong mô hình doanh nghiệp gia đình. Công ty duy trì mối quan hệ lâu dài với khách hàng và đối tác cung ứng vật liệu tại khu vực phía Bắc.',
    strengths: [],
    photos: [
      { url: driveImage('1SLpzDfNY3H86312JX6iHR-B6tJxgJBAn'), caption: 'Trụ sở công ty' },
      { url: driveImage('1crHF4LvNh0FJiPcGX1PiqG7emZcxLtmI'), caption: 'Văn phòng làm việc' },
      { url: driveImage('1ypXzZK7I6-JrZrn_dB4xofTHZghLj-fq'), caption: 'Đội ngũ nhân sự' }
    ],
    foundedYear: 2009,
    teamSize: 22,
    officeAddress: 'TP. Bắc Giang, tỉnh Bắc Giang',
    warrantyMonths: 24,
    legalChecks: LEGAL_CHECKS,
    verifiedProjects: 3,
    featuredProjects: [
      {
        id: 'p1',
        name: 'DỰ ÁN THẨM MỸ VIỆN THE BETTER',
        year: 2022,
        imageUrl: driveImage('1QUVAPe0IcdjPBPKGVOrumW1qRHcwd7f3'),
        galleryUrls: [
          '157qA4OukXLYFakKqOm78xBRBM8RQvvWS',
          '1UKbATq_6Hh3EnCHjbQvv5To6F-ZP78VV',
          '1857PrN6xNyvLkUW8Q_LvvILoAYQ1W3fF',
          '1jkYvWSe1Pyqr32UZqRQNxkHflD6dmdFa',
          '1oGoKLUZMaet8FcEJkQEMJ5OaiVUbYU9P',
          '1HHsLuTw7kwWyPzaIH49gbIKif-DkqygR',
          '10J51XJtN-pwOMtoAAwjuhBmabvIHmzu0',
          '1cutcAfuExP6LDe1oIbprne1AspGmchIO',
          '1ZPoD-VM9s82vUYdq-Sy2-tVODsgpuzFG',
          '1negCHqIV1YSO8p2I2QUuwEDLfPRVlTiW',
          '1J-tNbYX0WC2ZqGVaIe96DnhDqZIMkIHK',
          '183BuKYXZP_f5VuNsWaMmBwsjO7UA9HWV',
          '1ilueGJTLn-kMu8EpOde8x352GKzu1M8l',
          '1JoDoEWJlrYB7rkxyWwSP2x7fi1MeDWns',
          '1FZAzV3OmpVFmMQMZAydLlRYRrLiaRJMJ',
          '1cMXkSGSfo9Iz29KO4_EDf6Dx2JhQNbOc',
          '1BMR-vd2JfpfLjjgW6k2GYXTsOl7Nlt6j',
          '1vlt3i0U4AMIO9Zha6Egu2pkdbsEmHQoF',
          '1C75g9zmXO6rl4gkZxELiVdOO8aDcrSP7',
          '1ACURH5q8bGv1JIP-vf4phBnDs8aoo-qg',
          '1WfkOKxKvI9Z0pRW6aBqc_cCy8z5B8qB2'
        ].map(driveImage),
        verified: true,
        // Thẩm mỹ viện — không thuộc 4 nhóm lọc, chỉ hiện ở "Tất cả".
        areaM2: 300,
        scale: '1 trệt + 1 tầng',
        location: 'Đường Hoàng Văn Thụ, TP. Bắc Giang',
        constructionScope: 'turnkey',
        contractorRole: 'general-contractor',
        constructionMonths: 2.5,
        constructionStartedAt: '2022-03-01',
        constructionEndedAt: '2022-05-01',
        mainItems: 'Thi công phần thô, phòng trị liệu, hệ thống điện nước, quầy lễ tân và nội thất',
        verifiedAt: '2026-09-11'
      },
      {
        id: 'p2',
        name: 'DỰ ÁN NHÀ PHỐ',
        year: 2023,
        imageUrl: driveImage('1ApbbeVLhGCVSKubjy8edvyJanG-A-oNM'),
        galleryUrls: [
          '1OKEcTYksG1Obc4vfgnsj8kohrSy6tj64',
          '1ydcQ6Yc1aj8m_07URrpusAmVtvwnHjjY',
          '1Fg-xqqCHejD8NGvZiyPE_Uj5kRRMjJZ-',
          '1_rIJPj-Wg92S22PnPEIjf3hxGxU1U132',
          '1__sz9bFhkogb8iDuS8zD81APnteKgsiP',
          '1CT-nWITgt7AuVlmShod7HavAs3iOrIbA',
          '16VcV77jfLerNrxwW6oewUr0QSxHpnmXM',
          '1XHYdHjHqfL73g09QxK7TWHZKGeMdz5eK'
        ].map(driveImage),
        verified: true,
        areaM2: 90,
        scale: '1 trệt + 2 lầu',
        location: 'Đường Việt Yên, TP. Bắc Giang',
        category: 'renovation',
        constructionScope: 'turnkey',
        contractorRole: 'general-contractor',
        constructionMonths: 1.7,
        mainItems: 'Xử lý phần thô, trần giật cấp, nội thất gỗ, hoàn thiện phòng khách – bếp – phòng ngủ master',
        verifiedAt: '2026-09-04'
      },
      {
        id: 'p3',
        name: 'DỰ ÁN NHÀ PHỐ',
        year: 2025,
        imageUrl: driveImage('1M_AchknkDVB57YWPntkbOWckIYM_aGuC'),
        galleryUrls: [
          '1gjS_gXEvz8YVMbCky906W3uaRzS8gSy0',
          '11yaoEqYYvu6ADtnR7XH26EqhGrrC0bnD',
          '1xnGzy0O_6F4xrtd-OOBBybABPaO8n4d_',
          '1p6mYlFRNFAl5wxUU38G9uYOkX5wPJrsf',
          '1-oBHyYEScZPLe_ZC5JWB_7Ia_i6JjL7R',
          '1bMmqgXNoORENnXTnhrSKuadeD6YLQ9cZ',
          '15-lwROROrrS4pQEP3nHD8yAhi91XmCXm',
          '14fZwEYXDQjRf_HTdeIhFxT9i9Jzd7_oh',
          '1HYQbd-XVNR_oDrgt-mNrBazAbYAK3p8w',
          '1DeVWaxSGUmAQ5v8EfCECI2WwIcuA5Dfp',
          '1W_pfzrMmloJYhtnXk7PgRxkzaOcEU-Av',
          '1EssdxyYgQq2_3pmrAXU_mcuU1u9lDqEM',
          '1uZXL84VNaIahFdNMgt53UenRr3ynu5LN',
          '1YCozJxZAySXibLp3G5dtaygAz23VWtYM',
          '1U22YZmG56Kuva3YhnJqyJxRC9tz97NVZ'
        ].map(driveImage),
        verified: true,
        areaM2: 150,
        scale: '1 trệt + 2 lầu',
        location: 'Đường Dương Tự Minh, TP. Thái Nguyên',
        category: 'house',
        constructionScope: 'turnkey',
        contractorRole: 'general-contractor',
        constructionMonths: 3,
        mainItems: 'Thi công phần thô, xây tường bao, lắp mái, hoàn thiện nội – ngoại thất',
        verifiedAt: '2026-08-24'
      }
    ],
    partnership: NO_PARTNERSHIP
  },
  {
    id: 'ctr-songhan',
    name: 'Công ty CP Xây dựng Sông Hàn',
    logoUrl: driveImage('1Qa8-hoPLaHC-GIciwtNMISenjR3vx0Np'),
    kind: 'Nhà thầu xây dựng',
    verified: true,
    rating: 4.5,
    reviewCount: 37,
    similarProjects: 3,
    completedProjects: 3,
    distanceKm: 4.6,
    serviceAreas: ['Đà Nẵng', 'Quảng Nam'],
    region: 'central',
    surveyWithinHours: 72,
    acceptingProjects: true,
    intro:
      'Sông Hàn là đơn vị thi công nhà ở và công trình thương mại quy mô nhỏ, am hiểu điều kiện khí hậu ven biển miền Trung. Công ty phục vụ khách hàng cá nhân và hộ kinh doanh tại khu vực Đà Nẵng, Quảng Nam.',
    strengths: [],
    photos: [
      { url: driveImage('1tmr_YKCJOTMEE9n5_EDf4yI6-ygCi6He'), caption: 'Trụ sở công ty' },
      { url: driveImage('13FJT8bw5Tok7A61npo9iAnG8JWjZp__O'), caption: 'Văn phòng làm việc' },
      { url: driveImage('1umlGtWBH61RhDxFkrf8ybLB845dLOkyu'), caption: 'Đội ngũ nhân sự' }
    ],
    foundedYear: 2013,
    teamSize: 22,
    officeAddress: 'Quận Hải Châu, TP. Đà Nẵng',
    warrantyMonths: 24,
    legalChecks: LEGAL_CHECKS,
    verifiedProjects: 3,
    featuredProjects: [
      {
        id: 'p1',
        name: 'DỰ ÁN VĂN PHÒNG LỘC KIM CHI',
        year: 2022,
        imageUrl: driveImage('1whpSylDQOP-LHiiX_eQyKoHRTLZ_DO1Z'),
        galleryUrls: [
          '1y0u0_XGTg2ikGV7L-oGmrsDQcc0NGX08',
          '1J-hzgt774ylVQDTN0XUzunwZNFpAsGZ_',
          '1hHKYFRJZVkkPYhIKKcYZt_EsRKLna1Yb',
          '1Mc86Nv7Maw8zg22IJB8jh773AlG4SaqG',
          '1qO9hL4M6lM_xqSFG2wja8ayxwJ3ah93C',
          '104UbCw0uz7Rxj5VEGxz3f2dzmENMyq9F',
          '1oakBdfjsKe8ylyPvacZ4zI9I0kQo1eau',
          '1AYMBB2_zlzgicF0aZidY6SvtpPXpR5Bw',
          '1FdrCNUhUfO7YvgWKdwzVARdB46eqy-jT',
          '1BU92CcHsKT-gIkKXkQJDli4VReSmFJ_7',
          '1a4SZHJzPIVfzmPDuNJVDiQzzunz5nMjx',
          '1Wce7fT5lMcefoMFzNzoGI7LOblCsVdj7',
          '1-sJ1DFe4HPfaBcV_mmVz4HRQTTZ42XCQ',
          '14ZpUL1ZTBznlJ1WDuzOaBJ3xkSgbygY8'
        ].map(driveImage),
        verified: true,
        // Văn phòng — không thuộc 4 nhóm lọc, chỉ hiện ở "Tất cả".
        areaM2: 500,
        scale: '1 trệt',
        location: 'Đường Điện Biên Phủ, Q. Thanh Khê, Đà Nẵng',
        constructionScope: 'turnkey',
        contractorRole: 'general-contractor',
        constructionMonths: 4,
        mainItems: 'Phá dỡ nhà cũ, thi công kết cấu thép, xây tô trát, hoàn thiện trần – vách và nội thất văn phòng',
        verifiedAt: '2026-09-12'
      },
      {
        id: 'p2',
        name: 'DỰ ÁN RESORT',
        year: 2026,
        imageUrl: driveImage('1ul8KXbdJejXvXSczko4FffvntK0KF85S'),
        galleryUrls: [
          '1KyMdrWMzIQWm3FotDBhjc1NWc9MjuBu1',
          '1TrZLwvziK31gByfoLj-3Hu0-E-7WBIKG',
          '14kCgS8EdZq1FZ2dNkDehu7qAgEOeETw2',
          '15hKGaZKQjdpkGmwkf37Ts7G-aEYQlCC3',
          '19woe-X7P1d-k6FV8bO95j9trBX5DUHTh',
          '18I1ta0nOjbsFEXVw891yp28MFerGWBpr'
        ].map(driveImage),
        verified: true,
        // Resort — không thuộc 4 nhóm lọc, chỉ hiện ở "Tất cả".
        areaM2: 12000,
        scale: '120 phòng lưu trú',
        location: 'Bãi biển Non Nước, Q. Ngũ Hành Sơn, Đà Nẵng',
        constructionScope: 'turnkey',
        contractorRole: 'general-contractor',
        constructionMonths: 8,
        mainItems: 'Thi công đại sảnh, khu lễ tân, khu vực chờ, phòng ngủ và nhà vệ sinh',
        verifiedAt: '2026-09-03'
      },
      {
        id: 'p3',
        name: 'DỰ ÁN NHÀ PHỐ',
        year: 2022,
        imageUrl: driveImage('1NrQw81Qp8oFJ-wL_h97b8nmatNRfOT8_'),
        galleryUrls: [
          '10rQWwzy509qozPb8_EhN8KlwQ2a74lEb',
          '1dMSajHTc_RSwkX__-f1THftOyeOGVdHa',
          '1QGyEuNenXA86-ZlakLPuwF990-Rnl6iF',
          '1XR77Bw46TKhFjvdBHqDWXAzhBcMDL_T6',
          '1fGe47lTP6W1T9zUDq6wU_tZPDkKkJmeX',
          '1wvGgqoNiCQbn_tarlkjT2FXx4byJXY9B',
          '1qCERPRl_s3m0TxOQom4tfZss3t3Vf1Qv',
          '12Skhbzzg-8dEWvWARokABFcO_X7pSlOi',
          '1jSPKVFug2y_wJy6fZax9Xw4NSe0DRXfb',
          '14PlJkiH7RNuPtq4I2MmhU2DH69i8B0lC',
          '12_buzMkjdsy0wKT126heFLjHXVoDtCpA',
          '1xSj_TcOxd_nHg8g-TlT5hO-mUmzEmklY',
          '14jdrhG8EQHPdDHkIcUzmcCqHMfgeDzda',
          '1fWp7ACqLIH8bgJThjjnkY80XcrjHsDlQ'
        ].map(driveImage),
        verified: true,
        areaM2: 70,
        scale: '1 trệt + 1 lầu',
        location: 'Đường Nguyễn Văn Linh, Q. Hải Châu, Đà Nẵng',
        category: 'renovation',
        constructionScope: 'turnkey',
        contractorRole: 'general-contractor',
        constructionMonths: 2,
        mainItems: 'Tháo dỡ tường cũ, xử lý kết cấu, đi điện nước âm tường, hoàn thiện mặt tiền và nội thất',
        verifiedAt: '2026-09-19'
      }
    ],
    partnership: NO_PARTNERSHIP
  },
  {
    id: 'ctr-phatdat',
    name: 'Công ty TNHH Xây dựng Miền Trung Phát Đạt',
    logoUrl: driveImage('1KMYjLPCfc-S7qNT-5UqysD49Q74BvTbQ'),
    kind: 'Nhà thầu xây dựng',
    verified: true,
    rating: 4.3,
    reviewCount: 22,
    similarProjects: 3,
    completedProjects: 3,
    distanceKm: 8.3,
    serviceAreas: ['Thừa Thiên Huế', 'Quảng Trị'],
    region: 'central',
    surveyWithinHours: 72,
    acceptingProjects: true,
    intro:
      'Phát Đạt là nhà thầu thi công nhà ở dân dụng quy mô nhỏ, ưu tiên sử dụng vật liệu và nhân công địa phương. Công ty giữ mức giá cạnh tranh, phù hợp với khách hàng khu vực thị trấn và nông thôn miền Trung.',
    strengths: [],
    photos: [
      { url: driveImage('1VcXmX3WYz0jhbYhS2MLVd3DzKURQPi5_'), caption: 'Trụ sở công ty' },
      { url: driveImage('1J7DzAdmWxLZTwAMlPLNuswytxtire575'), caption: 'Văn phòng làm việc' },
      { url: driveImage('1xzurPOv5lvEZ9Ybehi8F69AIALCq_oND'), caption: 'Đội ngũ nhân sự' }
    ],
    foundedYear: 2018,
    teamSize: 11,
    officeAddress: 'TP. Huế',
    warrantyMonths: 24,
    legalChecks: LEGAL_CHECKS,
    verifiedProjects: 3,
    featuredProjects: [
      {
        id: 'p1',
        name: 'DỰ ÁN NHÀ PHỐ',
        year: 2024,
        imageUrl: driveImage('1PDwJp8OpGkHErhXxGzoRqD6kQ38Js48v'),
        galleryUrls: [
          '1qm47BwKU6mwP6CzU4Rul0Me8Fqn1BYMW',
          '1IK-k_kD1lvo_fBPG1jm2qXV9Y10_EXZG',
          '1nU5sNRVIPEKChqQYWyDrUIrqjSIMyzuH',
          '15_9odBkXeL9PCqAWyfrTNbljXUfri3e0',
          '1acz9WDVet9_kQdgbYQIJnGjXugPG0KPQ',
          '12gJWMVVjYeSNJUCiuY1cYeVlKNDxhwYg',
          '1wGx8IAvMlIQ0kc3mfplcIGC-N878kfzM',
          '1UDSe488YRPcKDJas78-yyT5LG4OOazQN',
          '1U9JL56mtKAXbsiIXIgj5Cqqkaxtsatl8',
          '1gkXZE9BYulZd62GZB_9AlTosOpVrfWc4',
          '1b7ZGD7vbQbNSHjAcNyIYiYGlBCl-SWL2',
          '1n39B6_zeTHZp-4o3FiJ5i5-KMrz24Y0D',
          '1ZJM7ZhQSEk58KXuyRYLUeS22-WlGuV7v',
          '1lTu49HPZagmHBQKyJUlalNN9EzhqZfMg',
          '1gnZFoCeREMms1EZP4-mFA-WvdZadBVk2',
          '1PhJ5Ys-NAqQJCyQV3PO4QMJtUQp1io_R'
        ].map(driveImage),
        verified: true,
        areaM2: 180,
        dimensions: '5×12m',
        scale: '3 tầng',
        location: 'Đường Điện Biên Phủ, TP. Huế',
        category: 'renovation',
        constructionScope: 'turnkey',
        contractorRole: 'general-contractor',
        constructionMonths: 2,
        mainItems: 'Thi công mặt tiền, lan can kính, mái kính khung thép, hoàn thiện phòng khách – bếp – phòng ngủ',
        verifiedAt: '2026-08-22'
      },
      {
        id: 'p2',
        name: 'DỰ ÁN VĂN PHÒNG CAFECONTRONL',
        year: 2026,
        imageUrl: driveImage('1Q2fsq1zlAbKOroNvmmEPJ-HZnkB9kc4D'),
        galleryUrls: [
          '1NhWJRo9aUkAG4toBHoXVvU1VeBqLqvor',
          '1CwszW_5NVZMc074yL_X4OhqGdE2zLFfI',
          '1tw5JWspSEXSYhAMOgROzud398J_X-q29',
          '1d9CN3qcOattj5aO1PxYZ80RF9xspzg0C',
          '1BcGahTP-k8g_WEAF_scU5YGCK-hiwpYO',
          '1cKTI9_6ncF9RcQU85MNAftn-9CaH17uT',
          '1QB6xGcEmUsUALAVG0mkTCx0-NqorOaQ4',
          '1J_hD_gl2E68fpeWWPc5xxWbs5to_X54J',
          '1D76DAkM9uK0iWieuzR0ORzHzxxsRHRAl',
          '1sQ1Fy7qlBsdAlXgCgxR7zm1pxD66FyQZ',
          '15Qiywl233c__pSu9ERG-dO0MCkYQDpXk',
          '1QEcn0R-jJ6f5o-gJc4BRQu5VsXlV_Szl',
          '19OYJ0_XpE9vsHSTJyg32gQ3GK4jqtm0C',
          '1Ts2lI2BVZcfc5o1uYmd5oK_b5vmcKVJv',
          '1TNLpHsw8W_L2uRvSQlyE3ynS52kUI00_',
          '1WHDmAVNO3Ip7d3Wz2KgoY7IRNwyv9Dse',
          '10JpDXxfFW4iCqwgP76Xt-0frKxgaPz0H',
          '1u8K9NMj30qZRLGM6oITQmaw0WDdINJKh',
          '1YDsK0Mg0I43sNVLRWqFeD3uPUggx_sxs',
          '1SuQbsZxCUcUvsF0FsZaLLeBu6-V3DkHH',
          '164SyDvQ5qKjH6uGSyzbrtUJWR2sL7fP8',
          '1GkUBgt3fTiLHDNhtvJCYnA4Qi7Fmm3GZ',
          '1YeAvpP9yurHrQOHNfPNHalJ8NQ3iutCS',
          '1cVIPdIRPEphbTOJ8bFGhfZci2nQC8RNo',
          '1Ic7Kyb2bUlQpSpIsG3P0sZJT-XI7M9WN',
          '1wQrfv888h7jQXRuBBWutz793Sahsy6Zt',
          '1AzqxX-HjtfCKnLPk-h__H9yojV293dC5',
          '1cAJzIKVZ9cLy3igcv4J5SnD1iGEmJWAG',
          '1asCrD35eaPILTvli7oi_cC9kH2qFxmzu'
        ].map(driveImage),
        verified: true,
        areaM2: 216,
        scale: '1 hầm, 1 sảnh, 3 tầng + sân thượng',
        location: 'Đường Lý Thường Kiệt, TP. Huế',
        category: 'renovation',
        constructionScope: 'turnkey',
        contractorRole: 'general-contractor',
        constructionMonths: 3,
        mainItems: 'Lắp khung nhôm kính mặt tiền, ốp lát nền, ốp gỗ vách tường, lắp trần gỗ trang trí',
        verifiedAt: '2026-08-28'
      },
      {
        id: 'p3',
        name: 'DỰ ÁN NHÀ HÀNG THÁI ISAAN',
        year: 2016,
        imageUrl: driveImage('1jFNCYcjXARSIgSzV0MoBr0Gw-6Rk-eEn'),
        galleryUrls: [
          '16qaP9W9JoG3YmJFkJOtOgRswVztDiBDM',
          '1Dn-7MChS5ZLdZmyFvxJZy7Z8ej9B2AZ4',
          '1GNl9pUyhGSKkHeEA8ARBF5c3EoznIIsk',
          '1C4vsI00OiSy-IiMvw1M44hBCDqAJ915G',
          '1NqHIjUTnSmeal_5ZeaooMwsEJxdHByAP',
          '120jecG6woAnfnZ6MB9PgWkfF2yNRSPpo',
          '1INplgRinboYfZrhf7HtVr10l9eATpd1M',
          '12E9ny5PfjOkPdaiEyxVBM5O1QnaZo5SX',
          '1wVlUuy5azi0RTJ1j1sTKazCMpaK9xs4s',
          '1zhsSraH-OYyDSrTDJBbwirMBFgQd96BV',
          '1YyH2O2_LVDZFxj9yBNY4fJdUTfeMEfzc'
        ].map(driveImage),
        verified: true,
        // Nhà hàng — không thuộc 4 nhóm lọc, chỉ hiện ở "Tất cả".
        areaM2: 90,
        dimensions: '6×15m',
        scale: 'Tầng trệt + Tầng 1',
        location: 'Đường Hùng Vương, TP. Đông Hà, Quảng Trị',
        constructionScope: 'turnkey',
        contractorRole: 'general-contractor',
        constructionMonths: 2,
        mainItems: 'Lắp hệ thống ống nước ngầm, bảng hiệu, nội thất tầng trệt và tầng 1',
        verifiedAt: '2026-09-09'
      }
    ],
    partnership: NO_PARTNERSHIP
  },
  {
    id: 'ctr-cattrang',
    name: 'Công ty CP Xây dựng Cát Trắng',
    logoUrl: driveImage('1YxJX-YFRWfu76J0-QBMXvgGs2e7YxKnZ'),
    kind: 'Nhà thầu xây dựng',
    verified: true,
    rating: 4.9,
    reviewCount: 112,
    similarProjects: 3,
    completedProjects: 3,
    distanceKm: 6.9,
    serviceAreas: ['Khánh Hòa', 'Ninh Thuận', 'Bình Định'],
    region: 'central',
    surveyWithinHours: 24,
    acceptingProjects: true,
    intro:
      'Cát Trắng là đơn vị thi công villa và công trình nghỉ dưỡng quy mô nhỏ, xây dựng danh tiếng nhờ chất lượng hoàn thiện chi tiết. Công ty đồng hành cùng khách hàng qua từng giai đoạn từ thiết kế đến bàn giao.',
    strengths: [],
    photos: [
      { url: driveImage('1qIobuTBuyuYoeWNzZxI6b8TG-zaYBn9d'), caption: 'Trụ sở công ty' },
      { url: driveImage('1NKmgoaJNz2MsNSbbMl7wB8FPrMTrw0w1'), caption: 'Văn phòng làm việc' },
      { url: driveImage('18hClLPu4LIjbMWWxq_18GYeIUlQmPjVR'), caption: 'Đội ngũ nhân sự' }
    ],
    foundedYear: 2013,
    teamSize: 28,
    officeAddress: 'TP. Nha Trang, tỉnh Khánh Hòa',
    warrantyMonths: 24,
    legalChecks: LEGAL_CHECKS,
    verifiedProjects: 3,
    featuredProjects: [
      {
        id: 'p1',
        name: 'DỰ ÁN NHÀ PHỐ',
        year: 2023,
        imageUrl: driveImage('1mdsFmky7Nt6o8RtUIRzdF2wofm4kmUik'),
        galleryUrls: [
          '1WsFiRxvH6X4FPrARKmT7WpHmfBe97uru',
          '16pMHZc2iZqAMC65VryzOHH76MKC45354',
          '1XaZf9MNEFfNrMRuw1hAoKdBpLYyT7nSv',
          '1FaNpo2SDU3AAupJSDdwpjqGrlYg2iA7x',
          '1GQryhkJoB0Bx0LjLp85f94npm7W7C6mN',
          '1GgLWro8-qQxpU04voI-1ErTtf4kV6-ZC',
          '1gnyNsDq9rCyknn_yH2ULl7rqkPLi9okg',
          '17vfKxCL-fIJeKbMIBOSj9mghkum5KNOF',
          '1mXtRT8ngOAE8uEMrxLKt57kxIhsZZ0Fm',
          '1W2jxs8AbotwAUTLyIc6evVmldaF4w8IY',
          '1pp8hNx4KUH0csHkOogFy2ZVt2j5p7fAE',
          '1sTtaSJhTIzZmw2Up3hY2beJ1W7jQmspU'
        ].map(driveImage),
        verified: true,
        areaM2: 180,
        location: 'Đường Trần Phú, TP. Nha Trang, Khánh Hòa',
        category: 'house',
        constructionScope: 'turnkey',
        contractorRole: 'general-contractor',
        constructionMonths: 2,
        mainItems: 'Đổ bê tông, trát tường, lắp sàn, hoàn thiện nội thất phòng khách – bếp – phòng ngủ',
        verifiedAt: '2026-09-06'
      },
      {
        id: 'p2',
        name: 'DỰ ÁN THẨM MỸ VIỆN FACEMAX',
        year: 2023,
        imageUrl: driveImage('1PzhfAxttJo4xxmgBHCrXYEIfA1gQRnLX'),
        galleryUrls: [
          '16RfTupfTQ3OtRpsAOIi83Qg21r_R4eX3',
          '1evr7J-wWK1fqiDR5cixNfqPpH_UVM4vE',
          '1DRn6Tzj4pX1AhT-0AVphdkWz9vik5CBq',
          '1mfuoKiiFzCRGzj_zhjU29kLCwy-88aoh',
          '1I5Idq_NX3psEaCXDvg9a7bej4lXLF6Yu',
          '15V-Jk_a_HuzOu-CIFsxeLjAp-bOxsyB-',
          '1Avmp91WB_VVZGYYiIzs2YCAvKPNxEoN8',
          '1-N3G8ObNeerEYZ7SLlF3CBFOT0OWd0vZ',
          '1swT4XMHWj7ldIZly9mcwxLvOde0kXPWL',
          '1VL2iyrLn_j1HLVDbCu_Us2kaYlHJRF5Q',
          '1rvlu3jz9d_UD38d2l17tJKAPqrSHqcld',
          '14XUP3mGzL-Loln-OSch-IreEALVNExXe',
          '1hvgrGgtRj62Ory6iuY2xsEUq-VOAocgJ',
          '1h7v0-UsANm6DiNzDD8sHYtUo4OXdlD0B',
          '1fLhsYZjVyjizmu1LrtONJXZUSSHOwG-W',
          '1Brlteo-eOnrWcRnMs6QOTuU9ECdzpKsD',
          '1u8IXY9n7uIvMZjMgPzDSoMpyimV5Czoq',
          '1djxf2b9PCTngNrt0e1wcL7dbJkUgDZuD',
          '1x5B6B7xACj6KgwWFKn7zagMKERg0OM4G',
          '1UW7i0cOuo_MtKB4zUVqTk0nJYJsurGb-',
          '1HWNhb1OnPJ3i0f02DoT61amXQJWaFB3X',
          '1PBJRyKGep0zASoRaL8C9wNwjDLdma9Xp',
          '1dG5Ts4bNgCpvGKXhyHMiyzftjvVEge7g',
          '10Tjns9gK7wIJVrNdyrJ_u_vttYCFEKJ7',
          '1V2ssFl5TaBsIWFji_Otme1uE1ZAGM6fZ',
          '1FlllqZxtdZ4NdicF594rUOJK92CksZb0'
        ].map(driveImage),
        verified: true,
        // Thẩm mỹ viện — không thuộc 4 nhóm lọc, chỉ hiện ở "Tất cả".
        areaM2: 250,
        scale: '3 tầng',
        location: 'Đường 16 Tháng 4, TP. Phan Rang - Tháp Chàm, Ninh Thuận',
        constructionScope: 'turnkey',
        contractorRole: 'general-contractor',
        constructionMonths: 2.5,
        mainItems: 'Thi công phần thô, phòng trị liệu, quầy lễ tân, hệ thống điện nước và nội thất',
        verifiedAt: '2026-09-22'
      },
      {
        id: 'p3',
        name: 'DỰ ÁN NHÀ HÀNG SAKURA SUSHI',
        year: 2023,
        imageUrl: driveImage('1HSRUpAvDbnMHDyST2TdQVAZlJTEVnmMf'),
        galleryUrls: [
          '19H7msiq48Vdx4hWiTzV73ycsKtECdzE9',
          '1-kNcBp2yUdQLJXsvA1eQwUw0Xqy_6gmK',
          '1SWhT6yT0EgdWPC8QXZzdrnyfw8OemcDD',
          '1NLKLaugvRnl97jNchgHkQFxQPqNwpiLR',
          '1N2NagsbsFlhBkpyxjHMimunfdNmDKiH9',
          '1VXqggZAZqm_1w4uXwJWtv-5O2mVlPHAM',
          '1kcw7-yfzKndrsBA9mNHOLcrDHnV52fjB',
          '1ff_8Oec3o_UJ89kCrQ_FplHh59-0S2P0',
          '1NeUPsi0X7Lan79nDZxvUP8b0zqwtZ7bU',
          '1P0SbFacDgi1QBalZmZ1ygXdnlsFmGcts',
          '1sf86DTfdpyew_cy3Wz_7Zdz-rEVaaFPm',
          '1jUuwIAP15YnJMMNr9aydEGN7-n1N5m87'
        ].map(driveImage),
        verified: true,
        // Nhà hàng — không thuộc 4 nhóm lọc, chỉ hiện ở "Tất cả".
        areaM2: 40,
        dimensions: '4×10m',
        scale: '1 trệt + 1 lầu',
        location: 'Đường Nguyễn Thị Minh Khai, TP. Quy Nhơn, Bình Định',
        constructionScope: 'turnkey',
        contractorRole: 'general-contractor',
        constructionMonths: 2,
        mainItems: 'Tháo dỡ, nội thất gỗ, mặt tiền phong cách Nhật, khu VIP tầng 2',
        verifiedAt: '2026-08-18'
      }
    ],
    partnership: NO_PARTNERSHIP
  },
  {
    id: 'ctr-binhdinhan',
    name: 'Công ty TNHH Kỹ thuật Xây dựng Bình Định An',
    logoUrl: driveImage('1LS5GDEgPUJsE1ytIbn9AuOMiCq6h2GXs'),
    kind: 'Nhà thầu xây dựng',
    verified: true,
    rating: 4.4,
    reviewCount: 29,
    similarProjects: 3,
    completedProjects: 3,
    distanceKm: 2.8,
    serviceAreas: ['Bình Định', 'Phú Yên'],
    region: 'central',
    surveyWithinHours: 24,
    acceptingProjects: true,
    intro:
      'Bình Định An là nhà thầu thi công nhà xưởng quy mô nhỏ và sửa chữa công trình công nghiệp, chú trọng an toàn lao động trong từng dự án. Công ty phục vụ chủ yếu các cơ sở sản xuất tại khu vực miền Trung.',
    strengths: [],
    photos: [
      { url: driveImage('15pmTdPiuMpUL_zHheG6KaIcfpOlN94NY'), caption: 'Trụ sở công ty' },
      { url: driveImage('1grLJ3fzXC6KgrbEKOSl7h1a8bNwqUtZN'), caption: 'Văn phòng làm việc' },
      { url: driveImage('1GHJhe2W9vaT_YkJqcx7aY82DNVNfrJQq'), caption: 'Đội ngũ nhân sự' }
    ],
    foundedYear: 2015,
    teamSize: 14,
    officeAddress: 'TP. Quy Nhơn, tỉnh Bình Định',
    warrantyMonths: 24,
    legalChecks: LEGAL_CHECKS,
    verifiedProjects: 3,
    featuredProjects: [
      {
        id: 'p1',
        name: 'DỰ ÁN NHÀ HÀNG THÁI YUMYUM',
        year: 2025,
        imageUrl: driveImage('111Zc-RXNP6A2GwvTEruDU6GiefDMa111'),
        galleryUrls: [
          '13l_IPGzbeVQz78f-Y4B7R9-8KLB8RJv6',
          '1wMyS_fmSVbH01DHUMfhhDtFjd7_OkuH8',
          '1C1XomTBsr_vUId8Q7OIKe-xnpFVwQHsz',
          '1J2QNnxQ5x8v9hU9t1A7u4M32tNyb34ay',
          '1d1dQRAGcF-WPCmcWAfUPJWu66uY7DUlk',
          '1iQzoiw7LTUJQYqkDV1Z7jQwJ7J2kWQF5',
          '1VpK0sIVdNFWrdlQMgUcCnrPXmm4NComi',
          '1HvClHTro5nzacLwTK_P1o5P6KfAvlmw5',
          '14z_OVIp44nBRdW8ykzoIIkRasLl9FY97',
          '1UHzFM73k4gw2_basdoeiNFcYjJdbtzis',
          '1UdtxvX4dko-bOdKPQaEzcemY8YnakDXd',
          '1sCfUrD2CQHaJcR_mqQbbHMzO0S4XhjR1',
          '1gkrMjyWKBDCITpMzxTp_wqQP47ywcBTo',
          '1dg7psX6IOrOHGopipva1x0TKzuBieWi_',
          '1A-2uScqRVjd6g8SWeD1NZCwFRL6MPtP5',
          '1dEMhj7g9H08rM-5vGpYkyELO87XiTrW4',
          '1bhnsBKIX-PtTsnq6w4JLUy8439LalEFC'
        ].map(driveImage),
        verified: true,
        areaM2: 400,
        location: 'Đường Nguyễn Tất Thành, TP. Quy Nhơn, Bình Định',
        category: 'renovation',
        constructionScope: 'turnkey',
        contractorRole: 'general-contractor',
        constructionMonths: 3,
        mainItems: 'Xây mái chóp Thái, cải tạo mặt tiền, khu ăn uống ~20 bàn, bếp và kho',
        verifiedAt: '2026-09-13'
      },
      {
        id: 'p2',
        name: 'DỰ ÁN NHÀ PHỐ',
        year: 2022,
        imageUrl: driveImage('10d207BPILdSMY_O3YNLEsgt8Et943Clh'),
        galleryUrls: [
          '1WHhEQ6WVKe3dNN9gyWurlf1D9s0u_tRk',
          '1U3cCsMpjze6NdzhecVJNi9kbJjLU2mK8',
          '1Dosj-azVwvHX9L-rMEYqxp5JnloOFiw-',
          '1aInhjialNDt0AsOE2ZQE_cAe6IMLMLPF',
          '1eILIi5sfLIaxNC2EVoLank-SLEduBv4G',
          '1MY-CLqVfCejc8IW0BVLkTQpX2gISnteT',
          '14Ai_J2E-xuzlr9fMFtXRVg1yzTFv-7Sw',
          '1l4zGJIdlcsIcVUKL9klSLiOqRuiAQbpN',
          '1vVi8nQr0Qzr_0XAbB6EQW83FTUl23OUS',
          '1_7-LWBHdiHph-dfQXKlyMa3pBmNsYuyX',
          '1o_ryPRRbYL7T1NhZda0EFz13_vEuaZvP',
          '1J5zIlLqsYR-WOQoI_yKkTD7NI8YfqzwV',
          '1bU0O6yL26pt4TI75dWbWp1Qx9Pok8BQK',
          '1v7wLHGvlghU2gjuJD6raJLcZtsqrFrUw',
          '1gllvXcVyumwtkCsO6DYS1ct7orgMJled'
        ].map(driveImage),
        verified: true,
        areaM2: 72,
        scale: '1 trệt + 1 lầu',
        location: 'Đường Lê Lợi, TP. Quy Nhơn, Bình Định',
        category: 'renovation',
        constructionScope: 'turnkey',
        contractorRole: 'general-contractor',
        constructionMonths: 1.5,
        mainItems: 'Gia cố kết cấu, thi công cầu thang mới, điện nước âm tường, hoàn thiện nội thất',
        verifiedAt: '2026-08-22'
      },
      {
        id: 'p3',
        name: 'DỰ ÁN TRUNG TÂM THƯƠNG MAI VINCOM',
        year: 2020,
        imageUrl: driveImage('1vn0LAwKwdXC6ihmDk0tY-IfYomIpNEhB'),
        galleryUrls: [
          '1eaww5Ej3Cr7EehkpSIStIhOcYCQzQ2M5',
          '1Kz3Te6Zoa0T274jCIsjUEbPMdOVoIwcZ',
          '1CMs5vgrSn2EysBBznsYJqG9tX-kLMn84',
          '1djTpXDS93EDic8w417Vrvi19enIBzgbH',
          '1mH5DopDGZrhHWUvJMfPTLHDvfGIL2Pbu',
          '18SFWmfkkQ9rTp8dRSQIJ_SQPFOAF8i5s',
          '1UJwQAprC4O65JaBU3JALDxwo9jLHuzxx',
          '1A1YtRcgO7uxmQEGZOKeaSsy5UiNnIYYB',
          '1SJLi04HNfkVWh2DUsHfFIhTyl-3T5CM1',
          '1TSaeeC18vFgr0I79189S7-bpBAUiF0pn',
          '1wnK0moAm2gshjtUb6M1smZnT5aafpS0a',
          '19UT1k9qmUkGasNpqfQ6jRFNRuLoody1X',
          '15YxTqeMPRrNZvp8-IpagYFM4mbLnqMVP',
          '1D9NwvHWZz5LkPrFVzR2EW25psASLWG5p',
          '1lZupN88TCUNWmcK6bs38sFQOc3q9_0aq',
          '1Whiuo7YVdVwjQid-nCQpXmrc7MFb8vJK',
          '1YvJfcgQ7KrrGhTY54cB_u5wEs_9yB0mh'
        ].map(driveImage),
        verified: true,
        // Trung tâm thương mại — không thuộc 4 nhóm lọc, chỉ hiện ở "Tất cả".
        areaM2: 2600,
        location: 'Đường Nguyễn Tất Thành, TP. Tuy Hòa, Phú Yên',
        constructionScope: 'finishing',
        contractorRole: 'contractor',
        constructionMonths: 3,
        mainItems: 'Khu vui chơi trẻ em, khu trải nghiệm VR, hệ thống chiếu sáng, khu vực gian hàng',
        verifiedAt: '2026-08-27'
      }
    ],
    partnership: NO_PARTNERSHIP
  },
  {
    id: 'ctr-dainam',
    name: 'Công ty TNHH Xây dựng Đại Nam Phát Triển',
    logoUrl: driveImage('1xzKJt8xMQT_ft8WcMmRQLm_gZJylwQ45'),
    kind: 'Nhà thầu xây dựng',
    verified: true,
    rating: 4.6,
    reviewCount: 73,
    similarProjects: 3,
    completedProjects: 3,
    distanceKm: 5.4,
    serviceAreas: ['Nội thành TP. Hồ Chí Minh'],
    region: 'south',
    surveyWithinHours: 72,
    acceptingProjects: true,
    intro:
      'Đại Nam Phát Triển là đơn vị thi công nhà phố và sửa chữa cải tạo văn phòng nhỏ, phục vụ chủ yếu khách hàng cá nhân và doanh nghiệp nhỏ tại khu vực nội thành. Công ty chú trọng tiến độ và chi phí hợp lý cho từng công trình.',
    strengths: [],
    photos: [
      { url: driveImage('1jI2a0ze1VuJSd1f8T8hdGjWvTvEhaskS'), caption: 'Trụ sở công ty' },
      { url: driveImage('1pedm_4xvrNe_2qtEpbGadccxAETFcNwe'), caption: 'Văn phòng làm việc' },
      { url: driveImage('1U5y7T8qNhE2kladkqY7YCWgnIR592mDQ'), caption: 'Đội ngũ nhân sự' }
    ],
    foundedYear: 2011,
    teamSize: 32,
    officeAddress: 'Quận Tân Bình, TP. Hồ Chí Minh',
    warrantyMonths: 24,
    legalChecks: LEGAL_CHECKS,
    verifiedProjects: 3,
    featuredProjects: [
      {
        id: 'p1',
        name: 'DỰ ÁN NHÀ PHỐ',
        year: 2022,
        imageUrl: driveImage('1kJc4fP7MTV0XO29T1HYPRR2rTc-eLcne'),
        galleryUrls: [
          '1wpG-uSFMrRdNGHexl_iIO2NzBIRW5hf-',
          '1e-Bu973BMOx1wyc7YQWcg7W14vNI8_7b',
          '1HsEFX1olZrj9KrBqd08K-nP0opDelcra',
          '1w9UX1VDmBFa4Z_KQME7x9ygKzuLc1lLL',
          '1we6d8WP6qWLZYiynkdWIaujeuFuXD3on',
          '1Gbyi5YTcDSqpu_ZWXr4kpmHXCrtdApdm',
          '1Syz8Y5SOODvBc_T1QVTGeql15yueWoug',
          '1vcszhEhdvfX1uBOkO0_bOJ5VlO5JlSNt',
          '1WqdW-29Bj55owifIBuz951GSrVGafBgA',
          '1eXsFvOMva10dS09T7M5HIStzcXYAl8TE',
          '1DQi7Fe-YGFUFijm7oPa0wehV4MnE71vv',
          '1rBciWQDMg4c1A3mgbLcFQiUATKGL_cD1',
          '11xyrBHC5WtOesqUvOwXXzITWNZFaLnj1'
        ].map(driveImage),
        verified: true,
        areaM2: 190,
        scale: '3 tầng + lửng + sân thượng',
        location: 'Đường Phạm Văn Đồng, Q. Gò Vấp, TP. Hồ Chí Minh',
        category: 'renovation',
        constructionScope: 'turnkey',
        contractorRole: 'general-contractor',
        constructionMonths: 4,
        mainItems: 'Cải tạo kết cấu, lắp sàn gỗ, tủ bếp, hoàn thiện nội thất phòng khách và phòng ngủ',
        verifiedAt: '2026-09-09'
      },
      {
        id: 'p2',
        name: 'DỰ ÁN SIÊU THỊ GO',
        year: 2023,
        imageUrl: driveImage('1FyVJvOektyOKMCJ5OuS6UPZP4p0WQcLJ'),
        galleryUrls: [
          '1j6B0IOh9Fzd2GAu6EmJ7eYgJ88i7wL4j',
          '1WIozh_k5ZwtRiwEwXpcOWb0npW5WqGBE',
          '1zpeCeZEwHyT5v9gUCntDfE0D_GatnwwU',
          '1Dm594v59ZyV_lxTXIjC4cKGFiJQWkbMk',
          '1YJowCigAN1ywyGjpEMOf6qSeHTmjuoBg',
          '16np-Zy_xGPxR8w9OF96FnF_vQecvtxOT',
          '1e_UTQYPxnvnxls0434YJOZtw0esL-mI3',
          '1bn5YkWqzQ3qd_UCrrGYPxiiEzjDDRVvM',
          '1e9MD64W3ol2SR8MhXw0EpFljNx0Kqqq0',
          '1FQAXOFq0ve495JkrStkf1YmrHeLOg3mT',
          '1JTTQnjvKUIixuc-5y8L5IR8Ul3rvu0UW',
          '1gUMAbZsK2_3F1RPMEeMd7fqzemqs-tfa',
          '1APQ7kKZOdHGu9HvmJUAZ7pbQUzsq1GgA',
          '1knt3WQmE-HKGB63t43Dtw3V2TSwDuotX',
          '1HHjLwe9MinhwoYA4SAPbZEgoXV6qirRj',
          '17J-nuL-tW1xcYq6KlSLXeidSLvVwgfdH',
          '1SacCxfwuxXyh9H0vK0UrmZhdCRfpXFVk'
        ].map(driveImage),
        verified: true,
        // Siêu thị — không thuộc 4 nhóm lọc, chỉ hiện ở "Tất cả".
        areaM2: 3000,
        location: 'Đường Tô Ký, Q.12, TP. Hồ Chí Minh',
        constructionScope: 'finishing',
        contractorRole: 'contractor',
        constructionMonths: 4,
        mainItems: 'Thi công quầy kệ, hệ thống chiếu sáng, khu vực thu ngân và lối đi',
        verifiedAt: '2026-09-07'
      },
      {
        id: 'p3',
        name: 'DỰ ÁN NHÀ HÀNG Ý TUSCAN',
        year: 2020,
        imageUrl: driveImage('1brwTD1eNPUyxy8VG5C32hq690vHEpQ6K'),
        galleryUrls: [
          '1rYZP_WrENPIzbqVhkbQZTb7tzn5S0g71',
          '1kCE3enI1zv-dUJooo0UIkpUkfDzXCm4L',
          '1eDamx_YK_ef2m4k-PgP_J29t2Mg66VsT',
          '1fnb_lgTfRQPL-RdoFxesFKItYMe1yRhb',
          '1aIQ3Wo0g4CushDi5i4pu25gS9ZGYv6rr',
          '1V4EYSFa75pBGVrc0J68kwvaRTPb2e3_T',
          '1Rd_RnDQTm4K92HHC1oUX91l_jgH3hWvw',
          '1Mn3CGXyCG8RFyjGU_upjkGLIk32L6tGH',
          '1a2SRfKwvFtVP13gmx_AbtYel2BubIp7X',
          '1Z0YhrChv11iTWTWu3zD0oi0b5GWyODNS',
          '1k19cMccTxrbO28TP9G1ATGkHqPSqfiJk'
        ].map(driveImage),
        verified: true,
        // Nhà hàng — không thuộc 4 nhóm lọc, chỉ hiện ở "Tất cả".
        areaM2: 320,
        location: 'Đường Nguyễn Văn Trỗi, Q. Phú Nhuận, TP. Hồ Chí Minh',
        constructionScope: 'turnkey',
        contractorRole: 'general-contractor',
        constructionMonths: 3,
        mainItems: 'Nội thất khu bàn ăn, quầy bếp mở, hành lang trang trí, khu vực thu ngân',
        verifiedAt: '2026-09-05'
      }
    ],
    partnership: NO_PARTNERSHIP
  },
  {
    id: 'ctr-phuongnam',
    name: 'Công ty TNHH Kiến trúc Xây dựng Phương Nam',
    logoUrl: driveImage('1LKX3Dv9EzerB-ixOAeLbOS2xgsr3fQVA'),
    kind: 'Nhà thầu xây dựng',
    verified: true,
    rating: 4.7,
    reviewCount: 46,
    similarProjects: 3,
    completedProjects: 3,
    distanceKm: 8.7,
    serviceAreas: ['TP. Hồ Chí Minh', 'Bình Dương'],
    region: 'south',
    surveyWithinHours: 72,
    acceptingProjects: true,
    intro:
      'Phương Nam là studio thiết kế - thi công nhà phố và cải tạo căn hộ, vận hành theo mô hình linh hoạt với đội ngũ kiến trúc sư trẻ. Công ty theo đuổi phong cách thiết kế hiện đại, tối giản, phù hợp thị hiếu đô thị.',
    strengths: [],
    photos: [
      { url: driveImage('1sp0ft2OiJT48W48zU2TSLIf-c3NSbMyM'), caption: 'Trụ sở công ty' },
      { url: driveImage('1m-bGdLIp_dSn9Af-0cbjCiSBvWWi0RNv'), caption: 'Văn phòng làm việc' },
      { url: driveImage('1yzVXB9CtpkHRftDFIVkuUsrziHVhnBes'), caption: 'Đội ngũ nhân sự' }
    ],
    foundedYear: 2019,
    teamSize: 16,
    officeAddress: 'Quận Bình Thạnh, TP. Hồ Chí Minh',
    warrantyMonths: 24,
    legalChecks: LEGAL_CHECKS,
    verifiedProjects: 3,
    featuredProjects: [
      {
        id: 'p1',
        name: 'DỰ ÁN NHÀ HÀNG HẢI SẢN GIANG GHẸ',
        year: 2022,
        imageUrl: driveImage('1s7qcdSQzO-FEFaijjQiWDuDYfGf3bwVB'),
        galleryUrls: [
          '1ZeU-1u3cYtJUgXCWH6PZd5B_FG4CJvfa',
          '14MMk36Ap5oDfPUi0wSV1H2-I9b4ClPtJ',
          '1bn8VY45sOhOdAqS61Mjnagf8Xo0ANQJK',
          '1L6WMPu7ZZUA0cHkq4N7GB58xGp94SHpU',
          '1wU1oLEF4zxs0nR4GyDv0QRPv1GwfKb_h',
          '1BDvQbWq9vFFJuahdrqG9ahkOYG0uC_nr',
          '1gRyV5zLA-JPzj5Brse_78HLqb9ml-ZLg',
          '17SHkTO8d3NIH0KEU1T1SXLusFFSC_4jw',
          '1qExDEugmqBOGZPZFlCJsY2FfJ0jsHFgc',
          '1N5kUX68gXmaR4KiFphPaigYo4QmeF7aP',
          '1kQhgY2_1hqEdnRMc445HXYn31NdUeoL-',
          '1SJGVi6CHaChgBJ2VAD36fQcukPlcW29s',
          '1yttA9KzhZd95j_6125knvKwp_XU9WY3F',
          '1kDzBijpouS4K8bGDxG_huyRTswmsPzYp',
          '1N2SVqGsUsCGDsuF0n0UE_0vNWSihqeg5'
        ].map(driveImage),
        verified: true,
        // Nhà hàng — không thuộc 4 nhóm lọc, chỉ hiện ở "Tất cả".
        areaM2: 2000,
        scale: '16 phòng VIP, 3 cổng chính',
        location: 'Giao lộ Trường Chinh - Cộng Hòa, Q. Tân Bình, TP. Hồ Chí Minh',
        constructionScope: 'turnkey',
        contractorRole: 'general-contractor',
        constructionMonths: 5,
        mainItems: 'San lấp mặt bằng, đổ bê tông sảnh chính, hồ thủy sinh, hoàn thiện 16 phòng VIP',
        verifiedAt: '2026-09-19'
      },
      {
        id: 'p2',
        name: 'DỰ ÁN NHÀ PHỐ',
        year: 2026,
        imageUrl: driveImage('1IEew4R9EdYlFS-o3PUJv1f42hOXNdW0J'),
        galleryUrls: [
          '1DxcgynoBtE0FjmC0HU8R8d409s8SPpm3',
          '1uaMIpmqSzDDi-mE0vxTY11oyHpfjCK2K',
          '1fSbLsr7tDL0njEOXKdOdtBgTWBlffO49',
          '1xO_oy5muRcz6NgwneziB6Jns0Xy4KH54',
          '1uvEmdRtk2SeJJHQshFWMyghB2eAyuoiS',
          '1fEwQA7nvoc2IDLOYISfLgDJpFdKhex4i',
          '15oi2Tl7Mgn232ud27hof8a1zxf5C0Y6w',
          '1sJUSy4he9L0xWdFNqQ1copsjHuDsHCns',
          '1P0SzSOUMwujguuZOXdwd2S2a1ooC66N1',
          '12p0zj0Vb5nKUHO__YoUzqf9xpPrxzc51',
          '1IF5yVyHtm-jKe8X_rjvee4yFEQGdc5Oj',
          '1bKKaFEKhdVBxJCrXuAF9V-wlL7_6PNLu',
          '1DIbN0VXdFlAIFYPe5KOXKUPOVp5jb9Th',
          '1To-URM5xU55C2h1kpsa6bE0pjDGTGWr6',
          '12noIeBOLsKXqJIUU4x5_3JJ8zT0IxUkl',
          '1MGBH9JDAnVgS9zm64GPWl3dU1vOMjQIg',
          '18_qScoq7wvJT1h6ZtttiorCU8EHO-UOY'
        ].map(driveImage),
        verified: true,
        areaM2: 210,
        scale: '2 tầng + tum',
        location: 'Đại lộ Bình Dương, TP. Thủ Dầu Một, Bình Dương',
        category: 'renovation',
        constructionScope: 'turnkey',
        contractorRole: 'general-contractor',
        constructionMonths: 3,
        mainItems: 'Cải tạo mặt tiền theo phong cách Wabi Sabi, phòng khách, thi công tủ bếp',
        verifiedAt: '2026-09-12'
      },
      {
        id: 'p3',
        name: 'DỰ ÁN NHÀ PHỐ',
        year: 2023,
        imageUrl: driveImage('1AmhPdzwQdIa9C97Yys30ptprP84R1BJr'),
        galleryUrls: [
          '1RXCpMfd95HCiafaEExrjmEvmv-NyiFBZ',
          '18kR_lXqMIdlbuB_xogsfryurg5A_8BUg',
          '1CmMG8HC4WJ7IAe_DupV9QqDSMfHs8vVI',
          '1eKZklIvaCPCtu8cuOFxB8tFJwPsZCCou',
          '1i3adoZ7JJpR7yKW6PuIZFWl4_8xRZBU5',
          '14B8JybgMag4BjnMRz7GcKNTZ_tH2X0H5',
          '1JhcDpNiATZp65FTo4T-fCfekAUC_3p4q',
          '1554cMFQoQb0mDhhNQbxWyeAhKJw8pnwe',
          '1EZRgjIFgcM0iodu0hPsXGoD0TISK6_30',
          '1RYiBezqucSJ05BShypSua17zUCRScnkM',
          '1jNBbMBPBkLvrvvTUjH1vVCmJrZbPZjRL',
          '1qp0JUya9YwNYDKWz91ZHEhD6MOGtg6Kp',
          '1a-bHN8lrh0ogzzeuVZVZqC5QJ6doDhFY',
          '14y2v_NEd4aQG19wdIC9Vy_oRUMutTnxt',
          '1b4voYzmIHIk_50SdcUWzX7Io7TwKfIGR',
          '1n5NFOWnnbzljjOhsuIqzeZT4G0UzBWl9'
        ].map(driveImage),
        verified: true,
        areaM2: 220,
        scale: '1 trệt + 2 lầu + sân thượng thông tầng',
        location: 'Đường Cách Mạng Tháng Tám, Q.3, TP. Hồ Chí Minh',
        category: 'renovation',
        constructionScope: 'turnkey',
        contractorRole: 'general-contractor',
        constructionMonths: 2.3,
        mainItems: 'Thi công trần thạch cao, phòng khách thông tầng, khu bếp, phòng làm việc, phòng phim',
        verifiedAt: '2026-09-03'
      }
    ],
    partnership: NO_PARTNERSHIP
  },
  {
    id: 'ctr-miennamunited',
    name: 'Công ty CP Xây dựng Miền Nam United',
    logoUrl: driveImage('12o7glq98Iuv46x3tyByEUny_h2CfmNE7'),
    kind: 'Nhà thầu xây dựng',
    verified: true,
    rating: 4.5,
    reviewCount: 58,
    similarProjects: 3,
    completedProjects: 3,
    distanceKm: 9.6,
    serviceAreas: ['Khu vực miền Nam'],
    region: 'south',
    surveyWithinHours: 72,
    acceptingProjects: true,
    intro:
      'Miền Nam United là nhà thầu thi công nhà xưởng nhỏ và công trình phụ trợ cho cơ sở sản xuất, có kinh nghiệm triển khai dự án cho khách hàng doanh nghiệp vừa và nhỏ tại khu vực phía Nam.',
    strengths: [],
    photos: [
      { url: driveImage('1MwL-8gF-7v5KJyYKqSTeZq55TTWMVAxu'), caption: 'Trụ sở công ty' },
      { url: driveImage('1El0XYF-YfunZ4Zqk7iHuKlFNftYyQgc-'), caption: 'Văn phòng làm việc' },
      { url: driveImage('16jHFYSwuwldc88HZTFQntnlkLs7mw3t8'), caption: 'Đội ngũ nhân sự' }
    ],
    foundedYear: 2010,
    teamSize: 30,
    officeAddress: 'TP. Thủ Dầu Một, tỉnh Bình Dương',
    warrantyMonths: 24,
    legalChecks: LEGAL_CHECKS,
    verifiedProjects: 3,
    featuredProjects: [
      {
        id: 'p1',
        name: 'DỰ ÁN NHÀ HÀNG XÔ SEAFOOD',
        year: 2020,
        imageUrl: driveImage('1VJr2jhKvHgC19z3Kv0T3G6kDLxQQ8qby'),
        galleryUrls: [
          '1mFiqH7vzAc4f9w_EQWyqAd8JgL-7G1DJ',
          '1LS6QcxNvfzqlkR-x0OIfY6qCbvCd1W6o',
          '1lJgHtKxn8EZSy3DMJu3PLAXSFF8kHGGJ',
          '1YiY5I7qMeVgTmW4zUqgq2Dwk-l1zWilk',
          '1_IRA8QOGn9igP5gXHr6dfkw6LBbjQMxs',
          '10U-XRpf4Z5EPizwEsYnkZ8sGiCDE2204',
          '1n2bbHZCQTS9C35c_HKI7Gl0DYzeqtqxX',
          '17rXdZB-2xWKcjdjmGWLA9iQ7Fa3g_B78',
          '1etJcC-GXOoOQNmmjdt_pcoeZk6sEzdQL',
          '1hHJH3cQTBBC1SjW0ZWdnLZet3s8j5-mw',
          '13FijPs7GKtuNObs7UywhFQlBAKWvHQgy',
          '1UItEh4Q8OjY2B7TavCmD5pHsPpVu-8cH',
          '1-XODOgtJ4vL8-T7Dt-1Z4Y_Pg4oC6Ez0',
          '1ULLw1UHfcIUJYePwtiUTxqGFy_9o8g8l',
          '1Z6QtSutwUhU_M9hernzDc082Ot-9orlz',
          '1bC4uXLPy7xASyGuM5N_3nCXhxIwN2vxi'
        ].map(driveImage),
        verified: true,
        // Nhà hàng — không thuộc 4 nhóm lọc, chỉ hiện ở "Tất cả".
        areaM2: 120,
        dimensions: '8×15m',
        location: 'Đường Nguyễn Oanh, Q. Gò Vấp, TP. Hồ Chí Minh',
        constructionScope: 'turnkey',
        contractorRole: 'general-contractor',
        constructionMonths: 2.5,
        mainItems: 'Nội thất gỗ, lắp sàn gỗ, lắp máy lạnh công nghiệp, hoàn thiện trang trí',
        verifiedAt: '2026-08-05'
      },
      {
        id: 'p2',
        name: 'DỰ ÁN NHÀ PHỐ',
        year: 2023,
        imageUrl: driveImage('1h-EaWDAOqtaaLJGEyJiN_fQJdW3cFrtm'),
        galleryUrls: [
          '1uVaPct9ugB8Gjz5XZ1pMbeHc6TvykMoq',
          '1GSIQn1ikeJHmsiyD33U9AbFmsp9_vDs6',
          '1ZjwUJkZOGZ5d8uvhuwMAAcDCqd_Kpb6s',
          '11q--3aztCd0JA9mgCuITzLbuNYczADir',
          '1h5AuuGc8pGaWCubR75k-a4zWF75IVD5S',
          '1JcqGdM0VAqCYbWypGc4z8QplB6VrZIA1',
          '1rRGtOWi803MJCrd4y9caqMt1bbqNvSsA',
          '1uVp70LavrTwlIlJQH5V2P3eb1oRM2DbJ',
          '1rDRVY9X5lEWHTzFza90oY3sjNjX5uBW5',
          '1PApBQdF5hVAzIq9GK0zXoZHokHh1wm84',
          '1hokbVelEoOUAbv01v5Fv6Y-sACcIfUSu',
          '1n-Xk9ppJIYpIQSXEhNGkdyz70zqjGsZg',
          '1HL_6ZxA52xw2mFpa1EiodC3VTPpRPIAU',
          '1GbMDz2CKasLK8zN2_W2Un2hn9A-lUGJy',
          '1rIBfegWrqd6CBUbyGl3t3xUp0UIpA2LQ',
          '1jeUD1zbNWtIPbMfCywoWCbAmARc6YBRF',
          '1KqKpqpoXvHydRT0G0ft_U4udmFEfHFfX',
          '1uOnjCgSh7oyg2_TOAExt1cfHOaPD23Io'
        ].map(driveImage),
        verified: true,
        areaM2: 90,
        dimensions: '5×18m',
        scale: '1 trệt + 3 lầu',
        location: 'Đường Lê Văn Việt, TP. Thủ Đức, TP. Hồ Chí Minh',
        category: 'renovation',
        constructionScope: 'turnkey',
        contractorRole: 'general-contractor',
        constructionMonths: 2,
        mainItems: 'Điện nước âm tường, ốp tường gỗ, tủ bếp chữ L, hoàn thiện phòng ngủ',
        verifiedAt: '2026-09-20'
      },
      {
        id: 'p3',
        name: 'DỰ ÁN NHÀ PHỐ',
        year: 2023,
        imageUrl: driveImage('1GqVa2DGwV2aJGJYaeE-KQfxNOaRnu9K6'),
        galleryUrls: [
          '1nqkcEZIwv7IA-GFOBtbTl06kOJ2NnJtm',
          '1LvfCaUepk3MKi-us8_QjzaB8yklkiy84',
          '1USMjNOpf53veyla8mFCfk1dS6CF9LRrx',
          '10BZu_3YIoKkqiWv6kqELcS5Tos-c1JCF'
        ].map(driveImage),
        verified: true,
        areaM2: 32,
        scale: '1 trệt + 3 lầu',
        location: 'Hẻm đường Lê Đức Thọ, Q. Gò Vấp, TP. Hồ Chí Minh',
        category: 'renovation',
        constructionScope: 'turnkey',
        contractorRole: 'general-contractor',
        constructionMonths: 2,
        mainItems: 'Đi dây điện âm trần, hoàn thiện phòng khách, khu bếp, khu thư giãn tầng lửng',
        verifiedAt: '2026-09-17'
      }
    ],
    partnership: NO_PARTNERSHIP
  },
  {
    id: 'ctr-cuulongxanh',
    name: 'Công ty TNHH Xây dựng Cửu Long Xanh',
    logoUrl: driveImage('19bDemro3tfEequtDTVe8xS-Q-gRyahZ4'),
    kind: 'Nhà thầu xây dựng',
    verified: true,
    rating: 4.4,
    reviewCount: 19,
    similarProjects: 3,
    completedProjects: 3,
    distanceKm: 6.1,
    serviceAreas: ['Cần Thơ', 'Đồng bằng sông Cửu Long'],
    region: 'south',
    surveyWithinHours: 72,
    acceptingProjects: true,
    intro:
      'Cửu Long Xanh là nhà thầu thi công nhà dân dụng và công trình hạ tầng nông thôn quy mô nhỏ, gắn bó với cộng đồng địa phương khu vực Đồng bằng sông Cửu Long qua nhiều năm hoạt động.',
    strengths: [],
    photos: [
      { url: driveImage('1pYfUxeA2xS3yAkOC2pOHagSU4iZWW2jj'), caption: 'Trụ sở công ty' },
      { url: driveImage('190v6UcZ1nfoXRIpYRvUyvHiPQgwcXO6-'), caption: 'Văn phòng làm việc' },
      { url: driveImage('1sPvY4uU0t8VWEcIpOpI65CQFMhQXPgNC'), caption: 'Đội ngũ nhân sự' }
    ],
    foundedYear: 2016,
    teamSize: 12,
    officeAddress: 'TP. Cần Thơ',
    warrantyMonths: 24,
    legalChecks: LEGAL_CHECKS,
    verifiedProjects: 3,
    featuredProjects: [
      {
        id: 'p1',
        name: 'DỰ ÁN NHÀ HÀNG ROOFTOP BISTRO',
        year: 2018,
        imageUrl: driveImage('1ro3uFyneYoEpMClo6foNY4Y0ICxJGz1d'),
        galleryUrls: [
          '151M4rwX9OAyDmC-CTi7hRZCWVTMs-s7L',
          '1ZlKqg6LHZvDlqdWfXPWb3OKZtV5wIJi0',
          '1kP9bH1rg9Sk7ZvbxXWPO8qH1eKR55yWO',
          '1Cj2WH6IsYHCxfdOhHJvAyl0M90616iST',
          '1xZeMGkUCJO88AUqPtZ4vab3j5hhJpBp7',
          '1hZccfrbEhUNj3CQNOn2iX84Bh0LJ3s8U',
          '1eRLatV5_y4KXJbvN7c7wqeYh_967wLT7',
          '1edWNBM0uEg3HZKAhhZSZnG3vb_3v_HDu',
          '1QjIc5vmu2ESeN9AIiEL3CzRaXoDFOYqI',
          '1BiKWGR9llahNx8I9Cg0N0yPnJk-BCJQu',
          '1iWfN6TMkVyzCqkgwJ5XmJiw0C8V9PSTv',
          '1-79ywhOj47jS8dC-ieD7vpI5g4VvXz44',
          '10Q9yBJJVNvE3SeC-j9NUakTMUoXBHJFG',
          '1OfathgqvFEJ5YOovuzjTUiBz5jzbHxZM',
          '1DjpPqePOfFAv4k0rqxI1dETBLO000vpX',
          '1gVTzHmTGPfHFmGOQiEynYxxC5NOAfWUq',
          '1Qm4RDBpt2GQ1QSFyPHNVlxEZk7M9RYWy',
          '19MH6ilPhRI1515kJazAu9eOD1NBfIhRY',
          '1qeuWmaAEmjBTU1pNDjmJwdIPE_rRADAN'
        ].map(driveImage),
        verified: true,
        // Nhà hàng (rooftop) — không thuộc 4 nhóm lọc, chỉ hiện ở "Tất cả".
        areaM2: 120,
        dimensions: '8×15m',
        scale: '1 trệt + 1 lầu',
        location: 'Đường 30 Tháng 4, Q. Ninh Kiều, TP. Cần Thơ',
        constructionScope: 'turnkey',
        contractorRole: 'general-contractor',
        constructionMonths: 2.5,
        mainItems: 'Cải tạo kết cấu, lắp sàn gỗ, hệ đèn trang trí, khu rooftop ngoài trời',
        verifiedAt: '2026-08-22'
      },
      {
        id: 'p2',
        name: 'DỰ ÁN NHÀ PHỐ',
        year: 2024,
        imageUrl: driveImage('158F4suQd9eFHafUhJOlxqEUAfmyb3FYm'),
        galleryUrls: [
          '1HjQ5Hcvdh54sZCZXHrg8ZUv75Esjx952',
          '17rnonqjv4X74MWGid0fWjtNxX8tjgTcc',
          '1CaOQm951FvZqk9ggTdBwNlu76W3V3I7w',
          '1ZdHOdxllZZeEZC6FuZFQhDOizXZMpcqT',
          '1Q2UfG344Z9NrWRUPGAe5dATxbdHpriMJ',
          '1YHl3V4yp_Ie8COvfuNpHAhg2vNssOxZg',
          '1CyIAd-N-ILPMbNKN039FYlkWHBE56lzw',
          '1Zawklmn3sFd_FsNc0aJ0Ztu8vISFZIT0',
          '1wbHRI5_Pwueht5_PubRmp6GcgKdZNJ2a',
          '1ZGkAHg88uEnp5gt03RLby8N9PMaPHY44',
          '1sdXaUpJ1zZfPGgHNM41kKO0yioLGzFlz'
        ].map(driveImage),
        verified: true,
        areaM2: 105,
        scale: '3 tầng',
        location: 'Đường Nguyễn Văn Cừ, Q. Ninh Kiều, TP. Cần Thơ',
        category: 'house',
        constructionScope: 'turnkey',
        contractorRole: 'general-contractor',
        constructionMonths: 3.5,
        mainItems: 'Thi công khung trần thạch cao, lát sàn gỗ, hệ điện âm trần, hoàn thiện nội thất',
        verifiedAt: '2026-09-21'
      },
      {
        id: 'p3',
        name: 'DỰ ÁN NHÀ PHỐ',
        year: 2024,
        imageUrl: driveImage('1NqlSweAOVkrCv4FzakO10ScLNoGR4mZt'),
        galleryUrls: [
          '1r9pUJu5PCvA5faOpFaggq7MvQB1eZTa3',
          '1f09O5RXF3UluRRHMVnyxuXT8-bf7tZgq',
          '1LXQR5-wvQ3T9qZpEZWErKglCqpMRUx7i',
          '1XmZvPFvTbwhkswY6FbDgqxZzu43df8o4',
          '1BUt4ItLSW0uExZgtFSLwC3iLSXJFQ1rp',
          '1awJro_-Uq-m8q2WMIF9Q_8794AET_AHv',
          '1yj7UMdawrmglRBWUiaQQJrjy7Kj3fV3z',
          '1qZhjBuLAbWy3zrgQyByLzpFWL33ad86D',
          '1nuJN3STevokQakm0LQDIRMidY0GD46bx',
          '1galdVdIn1xd_9xN_wxaZlao78t2Vt9By',
          '1IBcKvHHbJw3kkpamkdn5TUVvg76IEfjp',
          '1pJF_OIPXOGt0lcK2ZjzJ1nzZtUkVqF3i'
        ].map(driveImage),
        verified: true,
        areaM2: 60,
        scale: '1 trệt + 2 lầu',
        location: 'Đường Trần Hưng Đạo, Q. Ninh Kiều, TP. Cần Thơ',
        category: 'renovation',
        constructionScope: 'turnkey',
        contractorRole: 'general-contractor',
        constructionMonths: 1.8,
        mainItems: 'Gia cố móng, chống thấm, trần thạch cao, hoàn thiện phòng khách – bếp – 3 phòng ngủ',
        verifiedAt: '2026-09-06'
      }
    ],
    partnership: NO_PARTNERSHIP
  },
  {
    id: 'ctr-haiau',
    // Tạm ẩn: sheet chưa có đoạn giới thiệu, năm thành lập, quy mô đội ngũ, văn phòng.
    hidden: true,
    name: 'Công ty TNHH Xây dựng Hải Âu',
    logoUrl: driveImage('1_DZDjB1rLk1Tsh5DP1OeTfRwb6oTQ0Qf'),
    kind: 'Nhà thầu xây dựng',
    verified: true,
    rating: 4.6,
    reviewCount: 34,
    similarProjects: 3,
    completedProjects: 3,
    distanceKm: 16.4,
    serviceAreas: ['Bà Rịa - Vũng Tàu', 'Đồng Nai'],
    region: 'south',
    surveyWithinHours: 72,
    acceptingProjects: true,
    // Sheet chưa có đoạn giới thiệu (ô cột C chỉ lặp lại tên) — tạm tóm từ phạm vi và dự án.
    intro:
      'Hải Âu là nhà thầu xây dựng phục vụ khu vực Bà Rịa - Vũng Tàu và Đồng Nai, thi công cải tạo nhà phố và nhà hàng.',
    strengths: [],
    photos: [
      { url: driveImage('1hOHnJYuVeSCQ2FBdCOyZMIgeF2el8FKx'), caption: 'Trụ sở công ty' },
      { url: driveImage('1UEm0rhX7xmyZFQl8SRMRBOBu6Ti-3-HF'), caption: 'Văn phòng làm việc' },
      { url: driveImage('1wPn9tjNtwg-beGMBXFdryp2iEhEEg5eR'), caption: 'Đội ngũ nhân sự' }
    ],
    // Chưa có trong sheet — số tạm, chờ Hải Âu bổ sung.
    foundedYear: 2015,
    teamSize: 20,
    officeAddress: 'TP. Vũng Tàu',
    warrantyMonths: 24,
    legalChecks: LEGAL_CHECKS,
    verifiedProjects: 3,
    featuredProjects: [
      {
        id: 'p1',
        name: 'DỰ ÁN NHÀ PHỐ',
        year: 2023,
        imageUrl: driveImage('1flxACKGcW7YVxvA-bX6gspRslxpWiYFx'),
        galleryUrls: [
          '1P5nHs2DFAUwAuTnF89rKF1IWWluQgbm4',
          '17XLm9JPcXYONXi6JVdW95Ps-dpUfCagc',
          '1VUHzG3cisYTQ-FiQGuB1XBfUhBgiVTU2',
          '1QFCQ6QPKsNtS9RXhTanWLoqURsormVD0',
          '1F-bf1wk4WsH3hewmfDUYFOTsj-Pf1_dS',
          '1SLd_F_yyr_nxKg4Wgx-NRH1aOIicVGm0',
          '1ncRr7WlHYprBJk6mrfaxRbgIOLCdvHI7',
          '10I4MouCGGrtc75HwFxZr5EEPZTdRkWWd',
          '1GHYNVvcaS0GMIWrOkItgwJGSVr_ut_vk',
          '14GrjO0RhRCyl5pmcXEx2YZ-8VUafp-ta',
          '1-EQUjpagi3Y7zRlx87vGNITG0RREbxem',
          '1-4EcZYEHHzEcuryJ1HO1mdGJ5JkP9Q0n',
          '1Awv7iiykgHPGBER5qgBIJUivpTkGjIzT',
          '1ikd_uQ4bcbYwesX02KOgQq8wR6gMK5Sn',
          '1bXfi5kZkhOHxqOZk8qsO3UY02g_Fx-tw',
          '1misd3W31C_vPCAXi30n4I9UpmtQhTILu'
        ].map(driveImage),
        verified: true,
        areaM2: 160,
        scale: '1 trệt + 1 lầu',
        location: 'Đường Nguyễn An Ninh, TP. Vũng Tàu',
        category: 'renovation',
        constructionScope: 'turnkey',
        contractorRole: 'general-contractor',
        constructionMonths: 2,
        mainItems: 'Thi công móng – dầm – sàn, điện nước ngầm, ốp lát, mặt tiền lam gỗ – kính',
        verifiedAt: '2026-09-17'
      },
      {
        id: 'p2',
        name: 'DỰ ÁN NHÀ HÀNG ĐÔNG DƯƠNG',
        year: 2022,
        imageUrl: driveImage('1lfz32OGFno3DWdkcHM00WecHqjvjTJEq'),
        galleryUrls: [
          '1fGSz5VVfQ9ayhx6cIbdq3Xcdd_z8VmKj',
          '1Dtp7Yci6RdT-ZVK2mFtgWkhMdwPlMmtu',
          '1JXb-tpQLReRL7EYAkiAlPqhYWyymL6yS',
          '17NnmRW6vYaMSi-Gwd5bLpfvxMj9KJ7MQ',
          '1p-2WCve6NOECgattpDEjdm4pIZz63ExX',
          '1BrcygD5vlywrDt_t8kcbWk53C8GDiWGe',
          '1x_xGSXL_MciTK4AATgerIeM1mO-7pk7G',
          '1CokL_BUdKturCRdvhu4qEWWVch8Y6FBL',
          '1z0iCt-o22YvWgPb_r3wM6U3Zg5_hQYUW',
          '1OpJyPmrXWglavfKguah5Y6mBcwyFKhGd',
          '1ckecYWJxPvWvfz4yQUutvq0rDZpHDQtY',
          '12lkWqwaAI8pNs5wKSoAY9lpw2tMEvB8K',
          '1e1T9UesQIueNjYM0UD0rEU4dHZWkk3DT',
          '1KNgnP2kJrG-aW20N9vLyuJLN7kAGNrnT',
          '1SeoTZiaABKjaH-w_GcCDEx6MGCSrSGcX',
          '1F6yZBTqpkciA0uEX4Uz7HjpTiTD7xB9h',
          '1FEvIJ5eeS6t9gyJhDH7ywMCTKKAlDJKb',
          '1hZTZlKiVJ0cgXsKfvlXztZpmmWlj5c7i',
          '1lyAzrw6ayOiZ7XUWmNG-0zna2G2AqIrQ',
          '1wNzaaeGzuxfiwFnYjrP4QrVjd3DjSF8b',
          '1f4ZFh1HduQhUmm44LPktOG_EJClF-xxx',
          '12DFpHCyjtunadR3xDxw7xuvwHHSd3zoc',
          '1sdhnEaHBbnV4qMEV3OctC5cwotEYNLgT',
          '1nm5jZ1SIknKVUzlShDj7uOMApWv4uw5R',
          '1pwI2Ulk13b2yGov43qHQHIAPnoi9W9JC',
          '1mTk1pbLRgeD40Pol1SbKKFhdWl_Bgh27',
          '1EzecZqTgPTkJagSybBxh4NcY4p8Vove4',
          '1a06gtPF2uk8JN7kdqo-n_zHE3qtV-34e',
          '1U7kjAg8X1SWy1Hh6Kj7O_Q226HfaEI_W'
        ].map(driveImage),
        verified: true,
        // Nhà hàng (phong cách Indochine) — không thuộc 4 nhóm lọc, chỉ hiện ở "Tất cả".
        areaM2: 320,
        location: 'Đường 30 Tháng 4, TP. Vũng Tàu',
        constructionScope: 'turnkey',
        contractorRole: 'general-contractor',
        constructionMonths: 3,
        mainItems: 'Phá dỡ mặt tiền cũ, lắp ống nước ngầm, nội thất cổ điển kiểu Đông Dương',
        verifiedAt: '2026-08-28'
      },
      {
        id: 'p3',
        name: 'DỰ ÁN NHÀ PHỐ',
        year: 2024,
        imageUrl: driveImage('1WHVJ0ZJepQ2ndT_Tv01oWlnNQpen3AeH'),
        galleryUrls: [
          '1o_zHVlwBCvLoywBu9zwgjeZNfbeSlEU_',
          '18Rs0LUbovkJPqLLh7M0UlSvnC9qbJ4ub',
          '1VN4ehoLIjcs_0a5bY_8ZHGCv7V65gAx5',
          '1JkyxT_pWMMRIiog0nD-vClPkc9FxKjUQ',
          '1DxvEY0vxSHDxwAEJlizBxl6lVDbgCW4F',
          '1vDwI46xSgSSsNstFqtHCjwHHIzaS0Wxq',
          '1SIUQ5vp78msU5qObi8T8hp9kDRLx3uXE',
          '1t_czAQa1QnoAuabNPGWOM46k3rSqPuLP',
          '1MwvsMG7NFovFdfjNG1izUb7nW5PBPblU',
          '1ZoaHNMPwajaHKUboZ7qA_ye47c_a3zhs',
          '1BqIE5bZlHyps35ZpYrgdqNp3LN3IgDaX',
          '1RvIeNWEbZ9HvcTJRGbW5GuafHML7nqVF',
          '1XUwW6ULy7FPcPV6E1_mDewlHV7ALAdnV',
          '1UpXhzYat9D7sUKvvF4wKjhW2og8MDVNJ',
          '1wO1Rh6gFOCHE6SncD9T27VSHyVVUkisP',
          '1KUWumTQfyK6QDUKDAOFJtXPVaSmCPQD-',
          '1-heKb0Ce1pw21LQMsVLbFocvNOPiL_qD',
          '1BaF7hGNfZ9NNxLA2at-Z31cc5vI8PV-d',
          '1ItS0FyCX6Knbv01OpDwOytizqOcm98KW',
          '1fcwx_qnlokc1wyFB9rwjS9gFPPqQN87f'
        ].map(driveImage),
        verified: true,
        areaM2: 250,
        scale: '1 trệt + 2 lầu',
        location: 'Đường Cách Mạng Tháng Tám, TP. Biên Hòa, Đồng Nai',
        category: 'renovation',
        constructionScope: 'turnkey',
        contractorRole: 'general-contractor',
        constructionMonths: 3,
        mainItems: 'Phá mặt tiền cũ, đổ móng sân thượng, cầu thang gỗ, hoàn thiện nội thất',
        verifiedAt: '2026-08-05'
      }
    ],
    partnership: NO_PARTNERSHIP
  },
  {
    id: 'ctr-bmt-decor',
    name: 'Công ty TNHH TMDV BMT Decor',
    logoUrl: driveImage('1HYtiaj6RRqG0jcf1rjcT-wio_wSkfuz1'),
    kind: 'Nhà thầu xây dựng',
    verified: true,
    rating: 4.7,
    reviewCount: 52,
    similarProjects: 3,
    completedProjects: 3,
    distanceKm: 6.5,
    serviceAreas: ['Miền Nam', 'Miền Trung'],
    region: 'south',
    surveyWithinHours: 24,
    acceptingProjects: true,
    intro:
      'BMT Decor là đơn vị thiết kế và thi công nội thất, chuyên thực hiện các công trình nhà ở, văn phòng, showroom, nhà hàng và không gian kinh doanh. Công ty chú trọng tối ưu công năng, bảo đảm chất lượng và thể hiện dấu ấn riêng của từng khách hàng trong mỗi công trình.',
    strengths: [],
    photos: [
      { url: driveImage('1QWU9qkdIucuHDriizkk1OSJdgP8Tjilv'), caption: 'Trụ sở công ty' },
      { url: driveImage('147bOo7K1-CKcOlw-Q84ly4ZEwOkZrqtM'), caption: 'Văn phòng làm việc' },
      { url: driveImage('1Pyu2B65JQAyhRqQqMizweVojx_66yUBR'), caption: 'Đội ngũ nhân sự' }
    ],
    foundedYear: 2011,
    teamSize: 160,
    officeAddress: 'TP. Hồ Chí Minh',
    warrantyMonths: 24,
    legalChecks: LEGAL_CHECKS,
    verifiedProjects: 3,
    featuredProjects: [
      {
        id: 'p1',
        name: 'Dự án Karaoke Golden',
        year: 2025,
        imageUrl: driveImage('1WGIhH3UTNi0N46S_xqYetAxeAEWdCvMy'),
        galleryUrls: [
          '1d_VKPO7AkIVHXKiNT-UfXflJdY7Rz_Hp',
          '1D0UGxQ2csYh-pgy1BDxIcQP78XoF2mL9',
          '1xzZmYY7BkqYjFsZAL3XBP0FuidN_y9Fx',
          '16t0Dghobsg1iExvPOklW3r1LMJ9GPlz-',
          '1d7f4yO7CK-MWU0qLkWvTN1Py9ue6bNZQ',
          '1di5pSBu1Ez6JlcNrRcTIAXy6jpkEnbhD',
          '1QFfe2PqMtMJPtg_Vk2HMhVYMUbOcPJeF',
          '1z5bfGOPxCIsmvOpizKkpJnKN_XtHq0En',
          '1T5vREF7ineDByyIX7jBwa3M8pSiOGOjo',
          '1WSsxpd8pB8f4MMDZbuNDRnNpOk35TId_',
          '1Wg3fs75VQJMlc1GOaj8sOElpMbzZcfn7',
          '1INHs-4zaVH8oFONXRq_8aC632Sb5Jexx'
        ].map(driveImage),
        verified: true,
        // Karaoke không thuộc 4 nhóm lọc của web — chỉ hiện ở "Tất cả".
        areaM2: 400,
        location: 'Đường Nguyễn Tất Thành, TP. Buôn Ma Thuột, Đắk Lắk',
        constructionScope: 'turnkey',
        contractorRole: 'general-contractor',
        constructionMonths: 4,
        mainItems: 'Thi công phần thô, hệ thống cách âm, nội thất phòng hát, quầy bar',
        verifiedAt: '2026-08-20'
      },
      {
        id: 'p2',
        name: 'Dự án spa - Laboho spa',
        year: 2023,
        imageUrl: driveImage('1b-pAbK5WVo2OQGyFjmLZRBwD7yqZXerr'),
        galleryUrls: [
          '1CERjx7LQSDkEOjjQPm_KSzn8j0ickdtb',
          '1NtO_-9DDAcr4OazvGXEylIRZE0BgH4L9',
          '1URRSTCzJAH9H7u38ZNYFG5MRFfrxeG3H',
          '1vn85Rt2O_OrsgOM5Bomw_Ep7XB8BgdHT',
          '1l2i3CBzAlsc-xqB7KXPaUlJa3rlz2ZLh',
          '1fAl4MYNB6L2JjXHISWGroQ6Fkyxqoq5C',
          '1ZVj6Iaj5x4dnWZQ9TnezcpEpz-WLMzjh',
          '10u0cpAiDgXGbkzeOAX90TOLpDSfrtIQ9',
          '1vuZd_V2HvN9ZFFXpB1NT0fK0dEXPCpWV',
          '16O2fkPMRNR8HkPVdsDQ_yMeGTeQdAw-w',
          '1bMogy3EFzu86ydInyTBfd11FzpCwWFNh',
          '13ewZ1DsYiNlMed2ajLFBWEnY-Wa6MxCZ',
          '1Rn43qJYtB_Ny36WHnG-RIiJnvgUcLq_T',
          '16b9RF2M7FJZRvxq9AIHq6CgWgrO9byoM'
        ].map(driveImage),
        verified: true,
        category: 'renovation',
        areaM2: 200,
        location: 'Đường Lê Duẩn, TP. Buôn Ma Thuột, Đắk Lắk',
        constructionScope: 'turnkey',
        contractorRole: 'general-contractor',
        constructionMonths: 2.5,
        mainItems: 'Cải tạo kết cấu, phòng trị liệu, khu lễ tân, hệ thống điện nước',
        verifiedAt: '2026-08-30'
      },
      {
        id: 'p3',
        name: 'Dự án shophouse',
        year: 2026,
        imageUrl: driveImage('1U16JX_LA38RiIu7B6dKcIJBlJPwEqwUS'),
        galleryUrls: [
          '1HXujGPFdIOrd86lDNopblWlVI8bCPUn8',
          '1URbcueaqJ8351OL9RrYH_YfzwQDeoEaO',
          '1QH51p2GlNTPD4QgJrUYxBLCeykMZS_Ul',
          '1O1f8ZxGLylQaFoq83-C0CFQzjmIaoAKy',
          '1spVvelx-mvkYHJZrWu49-8zqxemG3ALw',
          '10sBQu1bs7D7ehVBfTJxXGCQNtVUEQGRj',
          '1rsnJWZfnlDZWdg5Y8VLxP6r8DJo08TYq',
          '1u0jA8zSsW1-_J93x0HNxx1hhnpBliOnN',
          '1RSo6oGrUeLXG-W71EKmLViye6kQMpPVC',
          '1wJdJjQN9ebX8_4HDYUuAkkVcL6HEcjxq',
          '1JxkVhG63zhgN6asCv30MP9HoGUXQjhlT',
          '1zgaGzkjfCgZYH7SpF4rCI8uTW_hLyFGm',
          '1YvOpDg40UkrGoeBZte9dUfBMfrEmmDFe'
        ].map(driveImage),
        verified: true,
        category: 'house',
        areaM2: 300,
        scale: '1 trệt + 2 lầu',
        location: 'Đường Phan Chu Trinh, TP. Buôn Ma Thuột, Đắk Lắk',
        constructionScope: 'turnkey',
        contractorRole: 'general-contractor',
        constructionMonths: 5,
        mainItems: 'Thi công kết cấu, mặt tiền khu kinh doanh, hoàn thiện khu ở phía trên',
        verifiedAt: '2026-08-02'
      }
    ],
    partnership: NO_PARTNERSHIP
  }
]

/**
 * Đầu mối liên hệ của từng nhà thầu — chỉ vận hành thấy (S13: liên hệ chỉ mở
 * sau khi lịch khảo sát được xác nhận, và người mở là đội hỗ trợ SAVICO).
 */
const CONTACTS: Record<string, CmsContractorContact> = {
  'ctr-abc': { person: 'Nguyễn Văn An', phone: '0905 123 456', email: 'lienhe@abc-construction.vn' },
  'ctr-angia': { person: 'Trần Thị Gia', phone: '0912 345 678', email: 'hotro@angiabuild.vn' },
  'ctr-hungphat': { person: 'Lê Hưng', phone: '0935 222 111', email: 'kinhdoanh@hungphathome.vn' },
  'ctr-truongthinh': { person: 'Phạm Trường', phone: '0978 456 789', email: 'contact@truongthinh-ec.vn' },
  'ctr-daiviet': { person: 'Võ Đại', phone: '0903 987 654', email: 'info@daivietgroup.vn' }
}

/** Nhóm lọc cũ / thẻ tự do của dự án → Loại công trình / Phạm vi thi công theo danh mục mới. */
const TYPE_OF_CATEGORY: Partial<Record<NonNullable<SheetProject['category']>, string>> = {
  house: 'townhouse',
  villa: 'villa',
  renovation: 'townhouse'
}
const SCOPE_OF_CONSTRUCTION: Record<NonNullable<SheetProject['constructionScope']>, CmsContractorScope> = {
  turnkey: 'turnkey',
  structural: 'shell',
  finishing: 'finishing'
}
const TYPE_OF_TAG: Record<string, string> = { 'Nhà phố': 'townhouse', 'Biệt thự': 'villa' }
const SCOPE_OF_TAG: Record<string, CmsContractorScope> = {
  'Thi công trọn gói': 'turnkey',
  'Phần thô': 'shell',
  'Hoàn thiện': 'finishing',
  'Nội thất': 'interior'
}

function typeOfSheet(project: SheetProject): string | undefined {
  if (project.category) return TYPE_OF_CATEGORY[project.category]
  return project.tags?.map((tag) => TYPE_OF_TAG[tag]).find(Boolean)
}

function scopeOfSheet(project: SheetProject): CmsContractorScope | undefined {
  if (project.category === 'renovation') return 'finishing'
  if (project.constructionScope) return SCOPE_OF_CONSTRUCTION[project.constructionScope]
  return project.tags?.map((tag) => SCOPE_OF_TAG[tag]).find(Boolean)
}

/**
 * Điền các trường năng lực của epic Quản lý nhà thầu cho dữ liệu mẫu nhập từ
 * sheet trước khi có epic: Loại công trình và Phạm vi thi công suy từ dự án đã
 * làm, số năm kinh nghiệm từ năm thành lập. Dự án nào đã có giá trị thì giữ;
 * các trường cũ của sheet không đi vào dữ liệu.
 */
function withCapability(contractor: SheetContractor): Omit<CmsContractor, 'contact'> {
  const projects = contractor.featuredProjects.map((sheet): CmsContractorProject => {
    const { category: _category, constructionScope: _constructionScope, tags: _tags, ...project } = sheet
    return {
      ...project,
      buildingTypeId: project.buildingTypeId ?? typeOfSheet(sheet),
      scope: project.scope ?? scopeOfSheet(sheet),
      featured: project.featured ?? false,
      hidden: project.hidden ?? false
    }
  })
  const types = [...new Set(projects.map((project) => project.buildingTypeId).filter((id) => id !== undefined))]
  const scopes = [...new Set(projects.map((project) => project.scope).filter((scope) => scope !== undefined))]
  return {
    ...contractor,
    featuredProjects: projects,
    // Nhà thầu xây dựng dân dụng trong danh bạ mẫu đều nhận nhà phố / biệt thự và
    // ba phạm vi xây dựng; dự án đã làm bổ sung thêm loại, phạm vi thực tế khác.
    buildingTypeIds: contractor.buildingTypeIds ?? [...new Set(['townhouse', 'villa', ...types])],
    scopes: contractor.scopes ?? [...new Set<CmsContractorScope>(['turnkey', 'shell', 'finishing', ...scopes])],
    experienceYears: contractor.experienceYears ?? Math.max(0, 2026 - contractor.foundedYear),
    surveyCapable: contractor.surveyCapable ?? contractor.surveyWithinHours > 0
  }
}

export const CONTRACTORS_SEED: CmsContractor[] = DIRECTORY.map((raw) => {
  const contractor = withCapability(raw)
  const contact = CONTACTS[contractor.id]
  return contact ? { ...contractor, contact } : { ...contractor }
})

/**
 * Quy tắc đề xuất mặc định: cả ba miền, 4 nấc bán kính của S12 (mặc định 10 km),
 * mọi loại công trình nhà ở, và chỉ đề xuất nhà thầu Đang nhận dự án có năng lực
 * khớp hồ sơ (ContractorManagement §1, §12).
 */
export const CONTRACTOR_MATCHING_SEED: CmsContractorMatching = {
  supportedRegions: ['north', 'central', 'south'],
  radiusOptions: [5, 10, 20, 50],
  defaultRadiusKm: 10,
  buildingTypeIds: ['townhouse', 'villa', 'roofed', 'garden', 'apartment'],
  criteria: {
    acceptingOnly: true,
    verifiedOnly: false,
    legalVerifiedOnly: false,
    surveyCapableOnly: false,
    capabilityMatch: true,
    minRating: 0
  }
}

/**
 * Lịch khảo sát mặc định (STORY-029): Thứ 2 – Thứ 7, 7 ngày làm việc kế tiếp,
 * khung 1 tiếng 08:00–17:00 nghỉ trưa 12:00–13:00. Mã `slot-0…7` giữ đúng thứ tự
 * cũ vì lời mời đã gửi trỏ tới các mã này.
 */
export const SURVEY_SCHEDULE_SEED: CmsSurveySchedule = {
  workingDays: [1, 2, 3, 4, 5, 6],
  windowDays: 7,
  slots: [
    ['08:00', '09:00'],
    ['09:00', '10:00'],
    ['10:00', '11:00'],
    ['11:00', '12:00'],
    ['13:00', '14:00'],
    ['14:00', '15:00'],
    ['15:00', '16:00'],
    ['16:00', '17:00']
  ].map(([start = '', end = ''], index) => ({ id: `slot-${index}`, start, end, active: true })),
  closures: []
}
