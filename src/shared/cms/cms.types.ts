import type { PlanVariant } from '@/shared/components/common'

/**
 * Kiểu dữ liệu của KHO NỘI DUNG (CMS).
 *
 * Đây là những gì admin biên soạn trong trang quản trị và người dùng cuối đọc
 * trên site (mục VI: "dữ liệu tĩnh do admin biên soạn"; mục X liệt kê từng danh
 * mục admin cấu hình được). Types nằm ở `shared/` vì CẢ HAI phía đều cần:
 * `features/admin` ghi, `features/handbook|guide|plans|consultation|landing` đọc —
 * mà hai feature thì không được import lẫn nhau (xem docs/ARCHITECTURE.md §2).
 *
 * Các feature công khai re-export lại type của mình từ đây nên barrel của chúng
 * không đổi: `import type { HandbookTemplate } from '@/features/handbook'` vẫn chạy.
 */

/* ===========================================================================
 * Cẩm nang — mục VI
 * ======================================================================== */

/**
 * Tag set gắn trên mỗi mẫu / bài viết trong cẩm nang (mục VI).
 * Cùng vocabulary với các trường Bước 1 nhưng khai báo độc lập.
 */
export interface HandbookTags {
  buildingType?: string
  floorCount?: string
  hasAttic?: boolean
  architectureStyle?: string
  interiorStyle?: string
}

/**
 * Hai loại nội dung của thư viện mẫu (Phần 2):
 * `2d` — mẫu bản vẽ mặt bằng, người dùng tìm CÔNG NĂNG;
 * `3d` — mẫu nội thất phối cảnh, người dùng tìm CẢM HỨNG THẨM MỸ.
 */
export type HandbookTemplateKind = '2d' | '3d'

/**
 * Một tầng trong bộ ảnh của mẫu — nút chuyển tầng và dải ảnh xem trước đều
 * chạy trên mảng này (Hình 2, Hình 7, Hình 8).
 */
export interface HandbookFloor {
  id: string
  /** Nhãn nút chuyển tầng: "Tầng trệt", "Tầng 2", "Tum", "Mặt mái". */
  label: string
  /** Ảnh thật của tầng. Mẫu 3D luôn có; mẫu 2D bỏ trống cho tới khi admin tải bản vẽ lên. */
  imageUrl?: string
  /** Khi chưa có ảnh: dựng bản vẽ SVG theo preset này (mẫu 2D). */
  planVariant?: PlanVariant
  /**
   * Mục (section) chứa ảnh này khi một mục có NHIỀU ảnh: tab chuyển theo mục, dải ảnh nhỏ hiện các ảnh của mục đang
   * chọn. Bỏ trống thì mỗi ảnh là một "tầng" riêng như mẫu mock.
   */
  groupId?: string
  /** Nhãn tab của mục (tên mục). */
  groupLabel?: string
}

/** Dòng thông số hiện dưới tên mẫu trên thẻ và trong khung "Thông tin bản vẽ". */
export interface HandbookTemplateSpecs {
  buildingTypeLabel: string
  /** "2 tầng", "2 tầng + tum" — nhãn quy mô đã gộp sẵn thông tin tum. */
  floorLabel: string
  /** Kích thước lô, ví dụ "5 × 20 m" (chỉ mẫu 2D). */
  lotSize?: string
  /** Diện tích sàn, ví dụ "100 m²" (chỉ mẫu 2D). */
  floorArea?: string
  /** Số ảnh 3D có trong bộ (chỉ mẫu 3D). */
  imageCount?: number
}

/** Một mẫu trong thư viện — dùng chung cho lưới, popup xem nhanh và trang chi tiết. */
export interface HandbookTemplate {
  id: string
  name: string
  kind: HandbookTemplateKind
  /** Ảnh bìa trên thẻ lưới. Bỏ trống thì thẻ vẽ bản vẽ SVG của tầng đầu tiên. */
  imageUrl?: string
  /** Nhãn tag chính: phong cách (mẫu 3D) hoặc loại công trình (mẫu 2D). */
  styleLabel: string
  specs: HandbookTemplateSpecs
  /**
   * Mô tả bố trí công năng từng tầng (mẫu 2D) hoặc vật liệu / tông màu / cảm
   * giác không gian (mẫu 3D) — mỗi phần tử một đoạn.
   */
  description: string[]
  floors: HandbookFloor[]
  tags: HandbookTags
  /**
   * Active / Inactive (epic 2DTemplateManagement §5) — chỉ mẫu Active hiện ở thư
   * viện phía người dùng; mẫu mới mặc định Inactive. Thiếu = Active (dữ liệu cũ).
   */
  status?: 'active' | 'inactive'
  /** Mẫu 2D: loại công trình theo danh mục dùng chung (Nhà phố / Nhà vườn). */
  buildingTypeId?: string
  /** Mẫu 2D: quy mô 1–3 tầng — số ảnh tầng phải khớp đúng số này. */
  floorCount?: number
  /** Mẫu 2D: kích thước lô (m) và diện tích (m²), số thực > 0. */
  lotWidth?: number
  lotLength?: number
  area?: number
  /** Mẫu 3D: phong cách nội thất theo danh mục dùng chung. */
  interiorStyleId?: string
  /** Mẫu 3D: tên phòng / không gian — một mẫu 3D là một phòng với nhiều ảnh. */
  room?: string
  /**
   * Phiên bản thư viện (`library-versions/{versionId}`) khi mẫu đến từ BMT API —
   * dùng để mở phiên bản và tải bộ ảnh/tài nguyên. Bỏ trống với mẫu mock.
   */
  versionId?: string
  /**
   * Nguồn dữ liệu của mẫu. `'bmt'` = lấy từ API (chi tiết cần đăng nhập, đọc từ
   * `getTemplate` chứ không lấy floors/description từ pool). Bỏ trống = mẫu mock,
   * xem công khai như cũ.
   */
  source?: 'bmt'
}

/** Ba giai đoạn xây nhà — khung cố định của cẩm nang nền tảng (Phần 3). */
export type HandbookStageId = 'structure' | 'finishing' | 'interior'

/** Một chủ đề trong giai đoạn, ví dụ "Móng", "Cọc - ép cọc". */
export interface HandbookTopic {
  id: string
  stage: HandbookStageId
  title: string
  /** Khóa icon trong bộ `HANDBOOK_TOPIC_ICONS` (epic HandbookStepManagement §4). */
  icon?: string
}

export interface HandbookStage {
  id: HandbookStageId
  /** Số thứ tự hiển thị trên thẻ ("Bước 1"). */
  order: number
  title: string
  description: string
  imageUrl: string
  topics: HandbookTopic[]
}

/**
 * Nhãn của bài viết — mã một bản ghi trong bảng `articleLabels` (BR-136), bộ lọc
 * ở khối "Tất cả bài viết" (Hình 11). Bốn nhãn gốc: experience / material /
 * interior / legal.
 */
export type HandbookCategory = string

/** Nhãn bài viết (BR-136) — không xóa cứng, chỉ chuyển Inactive. */
export interface CmsArticleLabel {
  id: string
  name: string
  status: 'active' | 'inactive'
  /** Thứ tự trong bộ lọc phía khách hàng. */
  order: number
}

/**
 * Một lời nhận xét ở dải "Khách hàng nói về BuildX" (trang chủ). Ba trường chữ để TRỐNG nghĩa là
 * chưa sửa: site dùng bản dịch trong `messages/*.json` (`landing.testimonials.items.<id>`), nên
 * cả hai ngôn ngữ vẫn có chữ. Ảnh đại diện để trống thì thẻ hiện chữ cái đầu của tên.
 */
export interface CmsTestimonial {
  /** Mã bản ghi. Sáu mã gốc (tuan, hang, bao, ngocanh, nam, vy) khớp khóa bản dịch dự phòng. */
  id: string
  name: string
  /** Dòng phụ dưới tên — loại công trình · diện tích · nơi ở. */
  meta: string
  quote: string
  avatarUrl: string
  status: 'active' | 'inactive'
  /** Thứ tự hiện trên trang chủ (nhỏ trước). */
  order: number
}

/** Một mục trong thân bài: tiêu đề đánh số + các đoạn văn, có thể kèm ảnh. */
export interface HandbookArticleSection {
  heading?: string
  paragraphs: string[]
  imageUrl?: string
}

export interface HandbookArticle {
  id: string
  /** Dùng làm đường dẫn: `/handbook/bai-viet/{slug}`. */
  slug: string
  title: string
  excerpt: string
  imageUrl: string
  category: HandbookCategory
  /**
   * Vị trí trong cẩm nang nền tảng. Bỏ trống nghĩa là bài tin tức thuần — chỉ
   * xuất hiện ở Bản tin và danh sách bài viết, không nằm trong cây giai đoạn.
   */
  stage?: HandbookStageId
  topicId?: string
  /** ISO date — "ngày cập nhật" trên trang bài viết. */
  publishedAt: string
  readingMinutes: number
  /** Thứ tự trong Bản tin: 1 = bài nổi bật lớn, 2–4 = ba bài phụ (Hình 11). */
  featuredRank?: number
  /**
   * Nội dung rich text đã làm sạch (allowlist p/h2–h6/ul/ol/li/a/img…) khi bài
   * đến từ BMT API. Có `contentHtml` thì trang bài viết render HTML trực tiếp;
   * bỏ trống thì render `body` theo từng section như mock cũ.
   */
  contentHtml?: string
  body: HandbookArticleSection[]
  tags: HandbookTags
  /** Bài tư vấn trong panel màn chờ: kiến trúc (Bước 2) / nội thất (Bước 3). */
  panelTopic?: 'architecture' | 'interior'
  /** Active / Inactive (BR-134) — bài mới mặc định Inactive; thiếu = Active (dữ liệu cũ). */
  status?: 'active' | 'inactive'
  /** Thời gian tạo do hệ thống ghi — quyết định "bài liên quan" mới nhất (ArticleManagement §8). */
  createdAt?: string
}

/* ===========================================================================
 * Hướng dẫn — mục VI (video ngắn 20–60s)
 * ======================================================================== */

/** Các thao tác chính mà video hướng dẫn bám theo, sắp theo bước (mục II.4). */
export type GuideTopic = 'land-photo' | 'input' | 'read-estimate' | 'dossier' | 'share'

/** Video hướng dẫn ngắn 20–60 giây cho từng thao tác chính. */
export interface GuideVideo {
  id: string
  topic: GuideTopic
  title: string
  description: string
  thumbnailUrl: string
  videoUrl: string
  /** Thời lượng tính bằng giây — hệ thống lấy từ YouTube, admin không nhập. */
  durationSeconds: number
  /**
   * Video nổi bật hiện lớn ở đầu trang Hướng dẫn (mục VI). Admin chọn video nào
   * là nổi bật (mục X, #3); chỉ MỘT video mang cờ này.
   */
  featured?: boolean
  /** Mã video YouTube đã chuẩn hóa (epic GuideStepManagement §3). */
  youtubeId?: string
  /** Hiển thị / Ẩn — bước mới mặc định Ẩn; thiếu = Hiển thị (dữ liệu cũ). */
  status?: 'visible' | 'hidden'
  /** Thời gian tạo — quyết định thứ tự và số bước. */
  createdAt?: string
  /** Hệ thống phát hiện video bị xóa / riêng tư / chặn phát nhúng — không lên trang công khai. */
  unavailable?: boolean
}

/** Bài hướng dẫn dạng chữ kèm ảnh. */
export interface GuideArticle {
  id: string
  topic: GuideTopic
  title: string
  excerpt: string
  imageUrl: string
}

/* ===========================================================================
 * Gói đăng ký — mục VII
 * ======================================================================== */

/**
 * Mã gói đăng ký (mục VII).
 *
 * Nhãn hiển thị (BASIC / PLUS / PRO theo S01) nằm ở `messages/*.json`, không
 * phải ở đây: đổi tên thương mại là việc của nội dung, đổi mã gói là việc của dữ
 * liệu — gộp hai thứ lại thì mỗi lần marketing đổi tên gói là phải chạy migration.
 */
export type PlanTier = 'basic' | 'advanced' | 'pro'

/**
 * Khối "Quà tặng đặc biệt" của gói cao nhất (S01 thẻ PRO, S02 popup).
 * Vắng mặt ở các gói khác — không phải gói nào cũng có quà.
 */
export interface PlanGift {
  /** "Bộ thiết bị vệ sinh châu Âu". */
  title: string
  description?: string
  /** Giá trị quy đổi, VND — hiển thị "trị giá 100 triệu đồng". */
  value: number
  /** Khối "+ Ưu đãi thêm": phí gói được khấu trừ vào giá trị hợp đồng thi công. */
  extraBody: string
  /** Dòng điều kiện ĐẦY ĐỦ ở đáy popup S02. */
  conditions: string
  /** Bản in trong khối quà ở thẻ gói (S01). */
  conditionsShort: string
  /** Ảnh hộp quà / bộ sản phẩm — Hình S01 (khối quà thẻ PRO) và Hình S02 (popup). */
  imageUrl?: string
}

/**
 * Quyền lợi dạng bật/tắt của gói (epic DesignPackageManagement §5) — khóa trùng
 * dòng của bảng "So sánh chi tiết 3 gói" ngoài trang Bảng giá.
 */
export type PlanToggleBenefitKey =
  | 'uploadPhoto'
  | 'siteInfo'
  | 'buildingType'
  | 'style'
  | 'renderImages'
  | 'structureEstimate'
  | 'finishingEstimate'
  | 'materialList'
  | 'boq'
  | 'exportDossier'
  | 'contractorPack'
  | 'compareOptions'
  | 'compareCost'
  | 'compareMaterial'
  | 'optimizeBudget'
  | 'costDelta'
  | 'materialAlternatives'
  | 'render3d'

/**
 * Một quyền lợi bật/tắt. Tắt → gạch ngang trên bảng công khai; bật không nội
 * dung → dấu tích; bật có nội dung (≤ 200 ký tự) → hiện nội dung. Tắt đi không
 * xóa nội dung cũ — bật lại là khôi phục để sửa tiếp.
 */
export interface PlanToggleBenefit {
  enabled: boolean
  text?: string
}

export type PlanLayoutLevel = 'none' | 'basic' | '2d3d' | '2d3dPlus' | 'custom'
export type PlanEstimateLevel = 'none' | 'rough' | 'detailed' | 'optimized' | 'custom'
export type PlanAdvisoryLevel = 'none' | 'online' | 'priority' | 'expert' | 'custom'

/** Toàn bộ quyền lợi và nội dung so sánh của một gói — một nguồn cho thẻ gói lẫn bảng so sánh. */
export interface PlanBenefits {
  toggles: Record<PlanToggleBenefitKey, PlanToggleBenefit>
  /** Bố trí công năng: Không có / Cơ bản / 2D & 3D / 2D & 3D nâng cao / nội dung khác. */
  layout: { level: PlanLayoutLevel; text?: string }
  /** Dự toán nội thất: Không có / Sơ bộ / Chi tiết / Chi tiết & tối ưu / nội dung khác. */
  interiorEstimate: { level: PlanEstimateLevel; text?: string }
  /** Hình thức hỗ trợ tư vấn: Không có / Online / Ưu tiên / 1:1 cùng chuyên gia / nội dung khác. */
  advisory: { level: PlanAdvisoryLevel; text?: string }
}

/** Quyền lợi chọn làm "nổi bật" trên thẻ gói — chỉ chọn được quyền lợi đang bật. */
export type PlanHighlightKey =
  | PlanToggleBenefitKey
  | 'layout'
  | 'interiorEstimate'
  | 'advisory'
  | 'designCredits'
  | 'libraryCredits'

/**
 * Gói thiết kế (epic DesignPackageManagement) — ba gói CỐ ĐỊNH BASIC / PLUS /
 * PRO, admin chỉ cập nhật, không thêm hay xóa. Chu kỳ sử dụng là cấu hình DÙNG
 * CHUNG (`planSettings.periodDays`), không nằm ở từng gói.
 */
/** Chu kỳ mua của gói thiết kế — trùng `offerKey` của BMT API. */
export type PlanCycle = 'Month' | 'Year'

/** Giá và hạn mức của MỘT chu kỳ, lấy từ offer tương ứng của BMT API. */
export interface PlanCycleOffer {
  price: number
  designCredits?: number
  libraryCredits?: number
}

export interface SubscriptionPlan {
  /** Khóa bản ghi; trùng `tier` với ba gói gốc. */
  id: string
  tier: PlanTier
  /** Mã gói: chữ in hoa, số, `-`, `_`; không trùng; khóa sửa khi gói đã phát sinh đơn. */
  code: string
  /** Tên gói, 1–100 ký tự. */
  name: string
  /** Nhãn ngắn, tối đa 50 ký tự. */
  shortLabel?: string
  /** Tối đa MỘT gói phổ biến tại một thời điểm. */
  popular?: boolean
  /** Giá bán, số nguyên VND ≥ 1.000. */
  price: number
  /** Mô tả đối tượng phù hợp, tối đa 200 ký tự. */
  fitLine: string
  /** Ảnh gói (JPG/PNG/WebP ≤ 5 MB). */
  imageUrl: string
  /** Nội dung nút đăng ký, tối đa 50 ký tự. */
  ctaLabel: string
  /** Chỉ gói Đang bán hiện ở trang Bảng giá và được tạo đơn mới. */
  status: 'selling' | 'hidden'
  /** Số phương án thiết kế (> 0). */
  designCredits: number
  /** Số lượt tra cứu thư viện mẫu (> 0). */
  libraryCredits: number
  benefits: PlanBenefits
  /** Quyền lợi nổi bật in trên thẻ gói. */
  highlights: PlanHighlightKey[]
  /** Quà tặng từ Danh mục quà tặng; `null` = Không có quà tặng. */
  giftId: string | null
  /** Điều kiện nhận quà — bắt buộc khi có quà, tối đa 500 ký tự. */
  giftConditions?: string
  /**
   * Giá + hạn mức theo từng chu kỳ, CHỈ có với gói đã bán trên BMT API (mock không có).
   * `price` / `designCredits` / `libraryCredits` ở trên là của chu kỳ tháng.
   */
  cycles?: Partial<Record<PlanCycle, PlanCycleOffer>>
}

/** Cấu hình chung của gói thiết kế — mọi gói dùng chung một chu kỳ (§4). */
export interface CmsPlanSettings {
  /** Số ngày sử dụng, snapshot khi tạo đơn. Mặc định 90. */
  periodDays: number
}

/**
 * Quà tặng trong Danh mục quà tặng (epic GiftManagement). Gói chọn một quà Đang
 * hoạt động; quà được snapshot vào đơn nên sửa / ẩn sau đó không đổi đơn cũ.
 */
export interface CmsGift {
  id: string
  /** Tối đa 150 ký tự. */
  title: string
  /** Tối đa 500 ký tự. */
  description?: string
  /** Giá trị quà, số nguyên VND > 0. */
  value: number
  imageUrl: string
  /** Nội dung "Ưu đãi thêm" trong popup quà tặng, tối đa 500 ký tự. */
  extraOffer?: string
  status: 'active' | 'hidden'
}

/* ===========================================================================
 * Gói giám sát thi công — S19
 * ======================================================================== */

/** Ba lựa chọn quản lý thi công (S19). */
export type SupervisionTier = 'self' | 'check' | 'control'

/**
 * Một lựa chọn trên trang Gói giám sát thi công (S19).
 *
 * `self` là gói 0đ (khách tự theo dõi) nên vẫn nằm chung bảng: nó là một lựa
 * chọn thật trong luồng "Chọn cách quản lý thi công" (R8), không phải chỗ trống.
 */
export interface SupervisionPackage {
  id: string
  tier: SupervisionTier
  /** Tên gói hiển thị trên thẻ và bảng so sánh (spec admin #15). */
  name: string
  /** Giá cho MỘT dự án, đơn vị VND. Gói tự quản lý là 0. */
  price: number
  /** Thời hạn áp dụng, tính theo tháng; hết hạn thì gia hạn qua add-on. */
  durationMonths: number
  /** Số lượt kỹ sư kiểm tra thực tế trong gói; `null` với gói tự quản lý. */
  inspections: number | null
  /** Câu "Phù hợp khi bạn..." trên thẻ. */
  fitLine: string
  /** Các dòng lợi ích in trên thẻ. */
  benefits: string[]
  /** Thẻ được khuyến nghị — gắn badge trên đầu thẻ. */
  recommended?: boolean
  imageUrl?: string
}

/* ===========================================================================
 * Tư vấn 1:1 — mục VIII
 * ======================================================================== */

/**
 * Chuyên môn của kiến trúc sư — danh mục do admin cấu hình (mục X, #5).
 */
/** Miền Bắc / miền Nam — cột "Miền" trong sheet hồ sơ KTS. */
export type ConsultantRegion = 'north' | 'south'

export interface ConsultantSpecialty {
  id: string
  label: string
}

/** Một ảnh trong dải "công trình tiêu biểu" của hồ sơ KTS (Hình 15). */
export interface ConsultantWork {
  imageUrl: string
  label: string
}

/**
 * Một kiến trúc sư trong trang Tư vấn 1:1 (mục VIII.1, Hình 14).
 * Cùng một object phục vụ cả thẻ lưới, danh sách thu gọn bên trái và hồ sơ
 * chi tiết — thẻ chỉ đọc phần nó cần.
 */
export interface Consultant {
  id: string
  /** Đã gồm tiền tố học hàm, ví dụ "KTS. Nguyễn Minh Trí". */
  name: string
  /** Chức danh dưới tên: "Kiến trúc sư SAVICO", "Kiến trúc sư trưởng SAVICO". */
  title: string
  /** Nơi công tác — dòng phụ nhỏ "tại {company}" dưới chức danh ở thẻ và hồ sơ. */
  company?: string
  /** Khu vực nhận tư vấn theo hồ sơ khách gửi — chưa lọc/hiển thị ở đâu. */
  region?: ConsultantRegion
  avatarUrl: string
  /** Hai chip chuyên môn trên thẻ; phần tử đầu là chuyên môn chính. */
  specialties: ConsultantSpecialty[]
  yearsExperience: number
  /** Số công trình đã thực hiện — hiển thị dạng "{n}+ công trình". */
  projectCount: number
  /** Mô tả 1-2 dòng trên thẻ lưới. */
  headline: string
  /** Giới thiệu 2-3 dòng ở hồ sơ chi tiết, mỗi phần tử một dòng. */
  bio: string[]
  rating: number
  reviewCount: number
  /** 4 ảnh công trình tiêu biểu (Hình 15). */
  works: ConsultantWork[]
  /** Chỉ kiến trúc sư Đang hiển thị xuất hiện ở màn đặt lịch. KTS mới mặc định Ẩn. */
  visible: boolean
  /** Các phạm vi Không tư vấn admin đánh dấu (ArchitectManagement §5). */
  closures?: CmsConsultClosure[]
}

/** Buổi tư vấn: sáng / chiều. */
export type ConsultSession = 'morning' | 'afternoon'

/**
 * Một phạm vi Không tư vấn: cả ngày (chỉ `date`), cả buổi (`date` + `session`)
 * hoặc một khung giờ (`date` + `time`). Không tự hủy lịch đã đặt.
 */
export interface CmsConsultClosure {
  date: string
  session?: ConsultSession
  time?: string
}

/* ===========================================================================
 * Vận hành — dữ liệu admin theo dõi, không phải nội dung site
 * ======================================================================== */

/**
 * `rejected` là admin từ chối (bắt buộc có lý do); `cancelled` là lịch cũ bị hủy
 * trước khi có luồng từ chối — giữ lại để bản ghi cũ vẫn đọc được.
 */
export type CmsBookingStatus = 'pending' | 'confirmed' | 'rejected' | 'done' | 'cancelled'

/**
 * Lịch hẹn tư vấn. Khách đặt ở màn Tư vấn 1:1 (mục VIII.3), admin xác nhận /
 * hủy tại trang quản trị — spec ghi rõ SAVICO gọi lại trong 24h làm việc.
 */
export interface CmsBooking {
  id: string
  consultantId: string
  consultantName: string
  customerName: string
  phone: string
  /** ISO date `yyyy-mm-dd`. */
  date: string
  /** Giờ bắt đầu 24h, ví dụ "09:00". */
  time: string
  /** Ghi chú khách để lại khi đặt. */
  note?: string
  email?: string
  status: CmsBookingStatus
  createdAt: string
  /** Ghi chú nội bộ của vận hành — đã gọi ai, lý do hủy… Khách không thấy. */
  opsNote?: string
  /** Lý do từ chối — bắt buộc khi `status === 'rejected'`. */
  rejectReason?: string
  confirmedAt?: string
  rejectedAt?: string
  completedAt?: string
}

/** `suspended` = "Đã ban": không đăng nhập được, dữ liệu gói/đơn giữ nguyên. */
export type CmsCustomerStatus = 'active' | 'suspended'

/** Một tài khoản người dùng trong trang Người dùng của admin. */
export interface CmsCustomer {
  id: string
  name: string
  email: string
  phone?: string
  /** Vai trò khớp `shared/auth` ROLES. */
  role: 'customer' | 'admin'
  /** Gói đang dùng; `null` = chưa mua gói, đang dùng lượt miễn phí. */
  planTier: PlanTier | null
  /** Ngày hết hạn gói (ISO), bỏ trống khi chưa mua gói. */
  planExpiresAt?: string
  /** Lượt thiết kế - dự toán còn lại trong kỳ. */
  designCreditsLeft: number
  /** Lượt tra thư viện mẫu còn lại trong kỳ. */
  libraryCreditsLeft: number
  status: CmsCustomerStatus
  /** Lý do ban (không bắt buộc) — hiện lại khi mở ban. */
  banReason?: string
  bannedAt?: string
  createdAt: string
  avatarUrl?: string
  emailVerified: boolean
  /** Phương thức đăng nhập — chỉ đọc; không lưu mật khẩu hay token ở đây. */
  loginMethod: 'password' | 'google' | 'other'
}

/** Trạng thái kích hoạt gói — chỉ theo dõi, admin không kích hoạt / kích hoạt lại. */
export type CmsPackageActivation = 'pending' | 'active' | 'failed' | 'ended'

/** Quota của một loại lượt, theo snapshot của đơn đã mua. Còn lại = cấp − giữ − dùng (≥ 0). */
export interface CmsQuotaBalance {
  granted: number
  held: number
  used: number
}

/**
 * Gói khách đã mua (epic UserAccountManagement §3) — lấy theo SNAPSHOT của đơn,
 * không theo cấu hình gói đang bán. Chỉ đọc trong admin.
 */
export interface CmsCustomerPackage {
  id: string
  customerId: string
  kind: 'design' | 'supervision'
  planName: string
  planCode: string
  orderId: string
  startsAt: string
  endsAt: string
  status: CmsPackageActivation
  /** Lý do kết thúc — hết thời hạn hoặc đã dùng hết mọi hạn mức hữu hạn. */
  endReason?: 'expired' | 'exhausted'
  /** Danh sách quyền lợi theo snapshot của đơn. */
  benefits: string[]
  /** Gói thiết kế. */
  designQuota?: CmsQuotaBalance
  libraryQuota?: CmsQuotaBalance
  gift?: { title: string; conditions: string }
  /** Gói giám sát. */
  supervision?: {
    projectId: string
    projectName: string
    currentStage: string
    inspectionsTotal: number
    inspectionsUsed: number
  }
}

/**
 * Một bản ghi giữ / trừ / hoàn lượt (epic UserAccountManagement §6) — chỉ đọc,
 * admin không thêm, sửa, xóa hay hoàn lượt thủ công.
 */
export interface CmsQuotaEvent {
  id: string
  customerId: string
  at: string
  quotaType: 'design' | 'library'
  action: 'hold' | 'deduct' | 'refund'
  delta: number
  before: number
  after: number
  result: 'success' | 'failed' | 'timeout'
  /** Mã dự án / mã yêu cầu với lượt thiết kế; lượt thư viện không ghi mẫu nào. */
  ref?: string
}

export type CmsProjectStatus = 'input' | 'designing' | 'review' | 'completed'

/** Dự án khách hàng — admin theo dõi tiến độ render / duyệt hồ sơ. */
export interface CmsDesignProject {
  /** Mã dự án `SVC-YYYY-NNNN`. */
  id: string
  name: string
  customerName: string
  customerEmail: string
  address: string
  buildingTypeLabel: string
  /**
   * Phương án Số tầng hồ sơ đã lưu (`CmsFloorOption.id`); bỏ trống khi loại
   * công trình không áp dụng Số tầng. Dùng để đếm hồ sơ bị ảnh hưởng khi admin
   * bỏ một phương án khỏi loại công trình (epic ConstructionTypeManagement §5).
   */
  floorOptionId?: string
  styleLabel: string
  /** Bước đang dừng: 1 Nhập liệu · 2 Dự toán · 3 Hồ sơ. */
  currentStep: 1 | 2 | 3
  status: CmsProjectStatus
  /** Tổng dự toán, VND. `null` khi chưa chạy Bước 2. */
  estimateTotal: number | null
  createdAt: string
  updatedAt: string
}

/* ===========================================================================
 * Danh mục cấu hình — mục X, #6
 * ======================================================================== */

/** Loại công trình của Bước 1 (Phụ lục A, trường 3). */
/** Trạng thái dùng chung của các danh mục cấu hình (epic ConstructionTypeManagement). */
export type CmsCatalogStatus = 'active' | 'inactive'

/**
 * Phương án Số tầng dùng chung (Trệt, Trệt + 1 lầu…) — admin thêm, đổi tên, bật
 * tắt; mỗi loại công trình chọn ra những phương án nó cho phép. Phương án đã
 * được dùng không xóa cứng, chỉ Ngừng hoạt động.
 */
export interface CmsFloorOption {
  id: string
  label: string
  status: CmsCatalogStatus
  order: number
}

/**
 * Cấu hình Tum của một loại công trình:
 * - `none`      — form không hiện trường Tum, hồ sơ không lưu giá trị.
 * - `choice`    — form hiện Có tum / Không tum.
 * - `fixed-yes` — mặc định Có tum, không hỏi người dùng.
 * - `fixed-no`  — mặc định Không tum, không hỏi người dùng.
 */
export type CmsAtticMode = 'none' | 'choice' | 'fixed-yes' | 'fixed-no'

/**
 * Loại công trình dùng chung (epic ConstructionTypeManagement) — form hồ sơ dự
 * án, dự án nhà thầu và mẫu 2D cùng đọc một danh mục. Cấu hình Số tầng và Tum
 * quyết định form người dùng hiện trường nào, phương án nào, bắt buộc hay không.
 */
export interface CmsBuildingTypeOption {
  id: string
  label: string
  description?: string
  /** Chỉ `active` mới xuất hiện ở form tạo / sửa hồ sơ mới. Loại mới mặc định `inactive`. */
  status: CmsCatalogStatus
  order: number
  floors: {
    applies: boolean
    required: boolean
    /** Phương án Số tầng được phép cho loại này — chỉ chọn phương án `active`. */
    optionIds: string[]
    /** Phương án chọn sẵn, phải thuộc `optionIds`. */
    defaultOptionId?: string
  }
  attic: {
    mode: CmsAtticMode
    /** Chỉ có nghĩa với `choice`. */
    required: boolean
  }
}

/**
 * Phong cách kiến trúc / phong cách nội thất (spec admin #1: hai danh mục CRUD
 * riêng) — danh mục hiển thị đổi theo loại công trình.
 */
export interface CmsStyleOption {
  id: string
  /** Danh mục phong cách kiến trúc hay phong cách nội thất. */
  kind: 'architecture' | 'interior'
  label: string
  imageUrl: string
  /** Id các loại công trình mà phong cách này xuất hiện. */
  buildingTypeIds: string[]
  enabled: boolean
  order: number
}

/** Hệ số / đơn giá dùng cho công thức dự toán (mục III.3). */
/* ===========================================================================
 * Cấu hình dự toán (spec admin #3, STORY-005, BR-026): Nhóm chi phí → Hạng mục
 * → Hạng mục con; giá vật tư theo khu vực gắn vào từng hạng mục con.
 * ======================================================================== */

/** Nhóm chi phí — kết quả dự toán trình bày theo các nhóm này (BR-026). */
export interface CmsCostGroup {
  id: string
  name: string
  order: number
}

/** Hạng mục con — đơn vị tính cố định; khối lượng do hệ thống ước tính theo dự án. */
export interface CmsCostSubItem {
  id: string
  name: string
  unit: string
}

/** Hạng mục lớn của một nhóm chi phí, gồm các hạng mục con. */
export interface CmsCostItem {
  id: string
  groupId: string
  name: string
  order: number
  /** Không đặt tên `children` — bảng antd sẽ hiểu nhầm thành cây con. */
  subItems: CmsCostSubItem[]
}

/** Giá vật tư của một hạng mục con tại một khu vực — ba mức theo gói hoàn thiện ở Bước 1. */
export interface CmsMaterialPrice {
  id: string
  itemId: string
  subItemId: string
  region: CmsServiceRegion
  /** VND / đơn vị của hạng mục con. */
  basic: number
  standard: number
  vip: number
}

/**
 * Nội dung tư vấn SAVICO dưới bảng dự toán (spec admin #3) — các đoạn cố định
 * của khối tư vấn. Trống thì dùng câu mặc định trong bản dịch.
 */
export interface CmsEstimateAdvice {
  /** Nhận xét khi một nhóm chiếm tỷ trọng lớn nhất. */
  dominant: { structure: string; finishing: string; interior: string }
  /** Lưu ý cuối khối tư vấn. */
  disclaimer: string
}

/* ===========================================================================
 * Tài liệu (singleton) — mỗi thứ chỉ có MỘT bản
 * ======================================================================== */

/** Một mục đánh số của trang tĩnh (Điều khoản, Bảo mật). */
export interface CmsStaticSection {
  heading: string
  body: string
}

/**
 * Trang nội dung tĩnh — chân trang mục II.2: Điều khoản sử dụng, Chính sách bảo
 * mật. Bên A cung cấp nội dung chính thức trước go-live (Q&A §8.2) nên đây là
 * thứ admin phải sửa được ngay, không chờ deploy.
 */
export interface CmsStaticPage {
  title: string
  /** Dòng ghi chú cập nhật hiển thị dưới tiêu đề. */
  updatedNote: string
  /** Đoạn mở đầu. */
  intro: string
  sections: CmsStaticSection[]
}

/**
 * HẠN MỨC dùng thử & hạn mức theo ngày — mọi con số không gắn với gói trả tiền.
 *
 * Trước đây ba nhóm số này nằm rải rác và cứng trong code: hạn mức chat ở
 * `features/chatbot/constants`, hạn mức tra Cẩm nang ở `handbook.mock`, còn lượt
 * cho người chưa mua gói thì không tồn tại ở đâu — muốn đổi phải sửa code rồi
 * deploy. Gom về một tài liệu để vận hành tự chỉnh.
 *
 * Hạn mức của các gói TRẢ TIỀN vẫn nằm trong bảng `plans` (mỗi gói một dòng);
 * đây chỉ là phần miễn phí và phần tính theo ngày.
 *
 * Không có bản dịch riêng — con số thì ngôn ngữ nào cũng như nhau.
 */
export interface CmsQuotas {
  /** Lượt thiết kế - dự toán cho tài khoản CHƯA mua gói. */
  freeDesignCredits: number
  /** Lượt tra thư viện mẫu cho tài khoản chưa mua gói. */
  freeLibraryCredits: number
  /** Tin nhắn AI mỗi ngày — khách vãng lai chưa đăng nhập (Q&A §2.3.5). */
  chatDailyGuest: number
  /** Tin nhắn AI mỗi ngày — tài khoản đã đăng nhập. */
  chatDailyCustomer: number
  /** Lượt TRA thư viện mẫu mỗi ngày (mục VI). */
  handbookLookupPerDay: number
  /** Lượt XEM CHI TIẾT một mẫu mỗi ngày. */
  handbookDetailPerDay: number
}

/* ===========================================================================
 * Ghi đè chữ & ảnh của giao diện — phủ nốt phần site không nằm trong các bảng
 * nội dung ở trên (tiêu đề trang, nhãn nút, chữ trạng thái rỗng, ảnh minh họa).
 * ======================================================================== */

/**
 * Chữ giao diện admin soạn lại: KHÓA DỊCH PHẲNG → chữ mới.
 *
 * Chỉ chứa những khóa admin ĐÃ sửa; khóa vắng mặt thì site dùng nguyên bản trong
 * `messages/{locale}.json`. Nhờ vậy CMS chỉ GHI ĐÈ chứ không nhân bản toàn bộ
 * catalog dịch — thêm chuỗi mới trong code vẫn chạy ngay, không cần đụng kho.
 *
 * Tài liệu này lưu theo ngôn ngữ như mọi tài liệu khác, nên bản tiếng Việt và
 * tiếng Anh sửa độc lập.
 */
export type CmsUiStrings = Record<string, string>

/**
 * Ảnh minh họa admin thay: KHÓA TRONG SỔ ẢNH (`shared/lib/imagery`) → URL mới.
 *
 * Cùng nguyên tắc với {@link CmsUiStrings}: khóa vắng mặt thì dùng ảnh seed.
 * Ảnh nằm TRONG các bảng nội dung (mẫu, bài viết, KTS, phong cách) đã sửa được
 * ngay trên bảng của chúng — ở đây chỉ là các ảnh dùng chung của giao diện.
 */
export type CmsUiAssets = Record<string, string>

/** Thông tin liên hệ + mạng xã hội + pháp lý ở footer (mục II.2). */
export interface CmsSiteSettings {
  brandName: string
  tagline: string
  hotline: string
  email: string
  address: string
  zaloUrl: string
  messengerUrl: string
  facebookUrl: string
  youtubeUrl: string
  tiktokUrl: string
  companyName: string
  taxCode: string
  /** Thẻ meta mặc định. */
  seoTitle: string
  seoDescription: string
  /** Tắt toàn site để bảo trì — banner cảnh báo, không chặn truy cập. */
  maintenanceNotice: string
}

/* ===========================================================================
 * Vận hành mở rộng — subscription, giao dịch, đổi lịch, gói tư vấn, review,
 * báo cáo. Toàn bộ là dữ liệu backend sinh / khách gửi; admin theo dõi và đổi
 * trạng thái, không sáng tác hộ.
 * ======================================================================== */

export type CmsSubscriptionStatus = 'active' | 'cancelled' | 'expired'

/** Một kỳ đăng ký gói của một người dùng. */
export interface CmsSubscription {
  id: string
  customerName: string
  customerEmail: string
  tier: PlanTier
  /** ISO date — ngày bắt đầu kỳ. */
  startedAt: string
  /** ISO date — ngày hết hạn kỳ. */
  expiresAt: string
  status: CmsSubscriptionStatus
  /** Ghi chú vận hành: lý do hủy, lần gia hạn thủ công… */
  note?: string
}

export type CmsTransactionStatus = 'paid' | 'pending' | 'failed' | 'refunded'
/** Phương thức thanh toán — hiện chỉ có QR chuyển khoản. */
export type CmsTransactionMethod = 'bank-qr'

/** Một giao dịch thanh toán trong hệ thống. */
export interface CmsTransaction {
  /** Mã giao dịch `TXN-...`. */
  id: string
  customerName: string
  customerEmail: string
  /** Gói được mua / gia hạn — gói thiết kế hoặc gói giám sát. */
  tier: PlanTier | SupervisionTier
  /**
   * Tên gói hiển thị lấy thẳng từ đơn hàng thật (`GET /payment-orders`). Ưu tiên
   * hiện tên này thay cho nhãn theo `tier` khi có, vì đơn thật không kèm hạng gói
   * cố định. Bản mock để trống → vẫn hiện theo `tier` như cũ.
   */
  planName?: string
  /** Số tiền, VND. */
  amount: number
  method: CmsTransactionMethod
  /** Đơn hàng sinh ra giao dịch này (`SVC-YYNNN`), nếu có. */
  orderId?: string
  status: CmsTransactionStatus
  /** ISO datetime. */
  createdAt: string
  note?: string
}

export type CmsRescheduleStatus = 'pending' | 'approved' | 'rejected'

/** Yêu cầu đổi lịch tư vấn — khách gửi, admin duyệt hoặc từ chối. */
export interface CmsRescheduleRequest {
  id: string
  /** Mã lịch hẹn gốc (`BOOK-...`). */
  bookingId: string
  customerName: string
  consultantName: string
  /** Khung giờ cũ. */
  fromDate: string
  fromTime: string
  /** Khung giờ khách muốn chuyển sang. */
  toDate: string
  toTime: string
  reason?: string
  status: CmsRescheduleStatus
  createdAt: string
}

/** Gói tư vấn 1:1 bán kèm (số buổi, thời lượng, giá). */
export interface CmsConsultPackage {
  id: string
  name: string
  /** Số buổi tư vấn trong gói. */
  sessions: number
  /** Thời lượng một buổi, phút. */
  durationMinutes: number
  /** Giá gói, VND. 0 = miễn phí. */
  price: number
  description: string
  enabled: boolean
}

export type CmsReviewStatus = 'pending' | 'approved' | 'rejected'

/** Review của khách về một gói tư vấn — duyệt xong mới hiện công khai. */
export interface CmsPackageReview {
  id: string
  packageName: string
  customerName: string
  /** 1–5 sao. */
  rating: number
  content: string
  status: CmsReviewStatus
  createdAt: string
}

export type CmsReportStatus = 'open' | 'resolved' | 'dismissed'

/**
 * Trạng thái của một lời mời (S18, R4, spec admin #14): bốn nấc tiến trình +
 * `rejected` (Đã từ chối) — nhánh kết thúc rẽ ra từ một nấc bất kỳ chưa Hoàn tất.
 */
export type CmsInvitationStatus = 'sent' | 'received' | 'accepted' | 'done' | 'rejected'

/**
 * Bản chụp hồ sơ dự án tại thời điểm gửi lời mời — admin xem đúng hồ sơ nhà thầu
 * nhận được dù khách sửa hồ sơ về sau. Không gồm ngân sách (không gửi nhà thầu, S18).
 */
export interface CmsInvitationDossier {
  buildingType: string
  landArea: number
  /** Mã quy mô (`ground+1`…) — giao diện dịch. */
  scale: string
  hasAttic?: boolean | null
  address: string
  /** Mã phạm vi thi công. */
  scope: string
  scopeNote: string
  /** Mã mốc khởi công. */
  startWindow: string
  documents: { name: string; sizeBytes: number }[]
}

/** Một nấc đã đi qua trên thanh trạng thái lời mời. */
export interface CmsInvitationStep {
  status: CmsInvitationStatus
  at: string
}

/**
 * Trạng thái xử lý một lịch khảo sát — vận hành cập nhật sau khi đã gọi cho CẢ
 * khách lẫn nhà thầu (R3: buổi khảo sát diễn ra ngoài web).
 *
 * Bản ghi cũ không có trường này được coi là `requested`: khách vừa chọn giờ ở
 * S16, chưa ai gọi xác nhận.
 */
export type CmsSurveyStatus = 'requested' | 'confirmed' | 'rescheduled' | 'cancelled'

/** Một khung giờ khảo sát — mã `slot-<n>` cố định vì lịch đã đặt trỏ tới nó. */
export interface CmsSurveySlot {
  id: string
  /** `HH:mm`. */
  start: string
  end: string
  /** Tắt = không nhận lịch mới ở khung này; lịch đã đặt giữ nguyên. */
  active: boolean
}

/** Một lần khóa: cả ngày (`slotId: null`) hoặc một khung giờ của ngày đó. */
export interface CmsSurveyClosure {
  id: string
  /** `YYYY-MM-DD`. */
  date: string
  slotId: string | null
  reason?: string
}

/**
 * Lịch khảo sát nhà thầu (spec admin #13, STORY-029) — cấu hình chung mà màn
 * chọn thời gian khảo sát của khách đọc: ngày làm việc trong tuần, số ngày làm
 * việc kế tiếp được phép chọn, danh sách khung giờ và các ngày / khung bị khóa.
 */
export interface CmsSurveySchedule {
  /** Thứ trong tuần theo `Date.getDay()` (0 = Chủ nhật … 6 = Thứ 7). */
  workingDays: number[]
  /** Khách được chọn trong bao nhiêu ngày làm việc kế tiếp. */
  windowDays: number
  slots: CmsSurveySlot[]
  closures: CmsSurveyClosure[]
}

/** Lịch khảo sát khách chọn khi gửi lời mời (S16). */
export interface CmsSurveyBooking {
  contractorId: string
  /** ISO date `YYYY-MM-DD`. */
  date: string
  slotId: string
  note: string
  phone: string
  email: string
  /** Thiếu = `requested`. */
  status?: CmsSurveyStatus
  /** Lần vận hành đổi trạng thái gần nhất (ISO). */
  handledAt?: string
  /** Ghi chú nội bộ — lý do đổi lịch / hủy, đã gọi ai lúc nào. Khách không thấy. */
  opsNote?: string
}

/**
 * Một lời mời báo giá đã gửi (S17, S18).
 *
 * Nằm ở `shared/cms` chứ không ở `features/contractors` vì R4 giao việc đẩy bốn
 * nấc trạng thái cho ĐỘI VẬN HÀNH: màn admin phải ghi được, trang khách phải
 * đọc được, mà `features/admin` thì không được import `features/contractors`.
 * Để mỗi bên giữ một kho riêng thì admin sửa một nơi khách xem một nẻo.
 *
 * `contractorName` / `projectName` là dữ liệu lặp lại có chủ đích: bảng admin
 * cần tên để hiển thị và tìm kiếm, mà danh bạ nhà thầu nằm trong feature —
 * backend thật cũng trả kèm tên chứ không bắt admin join tay.
 *
 * R2/R3: không có trường tiền, không có "báo giá đã nhận" — sau khi nhà thầu
 * nhận lời mời, hai bên làm việc trực tiếp ngoài web.
 */
export interface CmsContractorInvitation {
  /** Mã lời mời `INV-YYYY-NNNN`. */
  id: string
  projectId: string
  projectName: string
  contractorId: string
  contractorName: string
  sentAt: string
  status: CmsInvitationStatus
  /** Lần cập nhật gần nhất, do đội hỗ trợ SAVICO thực hiện (R4). */
  updatedAt: string
  steps: CmsInvitationStep[]
  /** Phiên bản hồ sơ đã gửi kèm — "Hồ sơ v1 · 2 tệp". */
  dossierVersion: string
  fileCount: number
  survey: CmsSurveyBooking
  /** Tên khách gửi lời mời — để tìm kiếm ở màn quản trị. */
  customerName?: string
  dossier?: CmsInvitationDossier
  /** Lý do từ chối — bắt buộc khi chuyển sang Đã từ chối. */
  rejectReason?: string
}

/* ---------------------------------------------------------------------------
 * GIÁM SÁT THI CÔNG (S19–S24).
 *
 * Cả cây dữ liệu này nằm ở `shared/cms` chứ không ở `features/supervision` vì
 * R5 giao việc XÁC NHẬN GIAI ĐOẠN cho kỹ sư Giám sát của SAVICO: màn quản trị
 * phải ghi được kết quả kiểm tra mà bảng điều khiển của khách đang đọc, mà
 * `features/admin` thì không được import `features/supervision`.
 * ------------------------------------------------------------------------ */

/** 6 giai đoạn cố định (R5). Thứ tự mảng cũng là thứ tự thi công. */
export type CmsStageKey = 'legal' | 'foundation' | 'structure' | 'mep' | 'finishing' | 'handover'

/**
 * Danh mục giai đoạn giám sát (spec admin #15) — admin sửa tên, tên ngắn, mô tả
 * và thứ tự. Mã giai đoạn cố định vì tiến độ từng dự án và kết quả kiểm tra của
 * kỹ sư gắn theo mã, nên danh mục chỉ Xem / Cập nhật, không thêm / xóa. Thứ tự
 * áp dụng cho dự án giám sát mới; dự án đang chạy giữ thứ tự lúc khởi tạo.
 */
export interface CmsSupervisionStageDef {
  id: CmsStageKey
  name: string
  /** Tên rút gọn ở thanh tiến độ hẹp. */
  shortName: string
  description: string
  order: number
}

/** Trạng thái một giai đoạn — quyết định luôn màn S20 / S21 / S22 / S23. */
export type CmsStageStatus = 'confirmed' | 'inProgress' | 'upcoming'

/** Vai trò trong lịch sử và trên nhãn tệp. */
export type CmsActor = 'GS' | 'KH' | 'SYS'

/** Phiên bản hồ sơ giai đoạn. Khóa ở v1, duyệt sửa đổi thì lên v2, v3... */
export type CmsStageVersion = string

/** Một tệp trong khối "Ảnh & tài liệu" của giai đoạn. */
export interface CmsStageFile {
  id: string
  name: string
  kind: 'photo' | 'document'
  /** Ai tải lên — nhãn KH / GS trên góc ảnh. */
  by: CmsActor
  /** Thời gian chụp lấy từ EXIF; tài liệu thì trống. */
  capturedAt?: string
  uploadedAt: string
  /** Ảnh do Giám sát chụp khi kiểm tra hiện trường. */
  fromInspection?: boolean
  /** Ảnh được thêm ở phiên bản nào — hiện nhãn "thêm ở v2". */
  addedInVersion?: CmsStageVersion
}

/** Một nhận xét trong khối "Nhận xét & trao đổi". */
export interface CmsStageComment {
  id: string
  author: string
  role: CmsActor
  at: string
  text: string
  /** Nhận xét gắn với một yêu cầu sửa đổi. */
  changeRequestId?: string
}

/** Kết quả kiểm tra thực tế của Giám sát — có thì giai đoạn mới khóa được. */
export interface CmsStageInspection {
  confirmedAt: string
  engineer: string
  /** Kỹ sư có tới công trình hay chỉ xét hồ sơ. */
  onSite: boolean
  note: string
}

/** Trạng thái một yêu cầu sửa đổi (CR). */
export type CmsChangeRequestStatus = 'pending' | 'applied' | 'rejected'

/**
 * Yêu cầu sửa đổi hồ sơ đã khóa.
 *
 * `by` quyết định AI DUYỆT: Giám sát đề xuất thì khách duyệt (S22), khách đề
 * xuất thì Giám sát duyệt (S23). Không có đường nào tự sửa hồ sơ đã khóa.
 */
export interface CmsChangeRequest {
  /** Mã hiển thị `CR-01`. */
  id: string
  by: CmsActor
  proposedAt: string
  status: CmsChangeRequestStatus
  /** Hạn bên kia phải trả lời (chỉ CR đang chờ). */
  dueAt?: string
  /** Thời điểm bên kia duyệt / từ chối — mốc của phiên bản hồ sơ sinh ra. */
  decidedAt?: string
  reason: string
  /** Phản hồi của bên duyệt. */
  response?: string
  /** Phiên bản sinh ra khi CR được duyệt. */
  resultVersion?: CmsStageVersion
}

/** Một sự kiện trong "Lịch sử & phiên bản" — không bao giờ bị xóa (R5). */
export interface CmsStageEvent {
  id: string
  at: string
  actor: CmsActor
  text: string
  /** Sự kiện mốc (hoàn thành, xác nhận, duyệt CR) — tô đậm trên dòng thời gian. */
  milestone?: boolean
}

/** Một giai đoạn trong bảng điều khiển. */
export interface CmsSupervisionStage {
  key: CmsStageKey
  /** 1..6 — hiện trong "Giai đoạn 4/6". */
  index: number
  plannedStart: string
  plannedEnd: string
  actualStart?: string
  actualEnd?: string
  status: CmsStageStatus
  version: CmsStageVersion
  files: CmsStageFile[]
  comments: CmsStageComment[]
  inspection?: CmsStageInspection
  changeRequests: CmsChangeRequest[]
  history: CmsStageEvent[]
  /** Gợi ý chuẩn bị cho giai đoạn sắp tới (S21) — admin sửa được. */
  prepHint?: string
}

/** Chủ dự án — người vận hành gọi khi cần hẹn kỹ sư hay nhắc tải hồ sơ. */
export interface CmsProjectOwner {
  name: string
  phone: string
  email: string
}

/** Toàn bộ dữ liệu một dự án đang được giám sát. */
export interface CmsSupervisionProject {
  /** Mã dự án `SVC-YYYY-NNNN` — cũng là khóa của bản ghi trong kho. */
  id: string
  projectName: string
  /**
   * Chủ dự án. Backend trả kèm theo dự án; bản ghi cũ trong kho mock có thể
   * thiếu — màn quản trị khi đó tra người mua trong đơn gói giám sát.
   */
  customer?: CmsProjectOwner
  /** Gói đang dùng: `check` hoặc `control`. */
  packageTier: 'check' | 'control'
  /** Mã gói hiển thị trên thẻ dự án, ví dụ `SVC-2026-0001-AT`. */
  packageCode: string
  engineer: string
  /** Ngày kích hoạt gói — mốc tính lịch chuẩn. */
  activatedAt: string
  /** Hạn sử dụng gói (ISO) — hết hạn thì gia hạn qua add-on. */
  expiresAt: string
  /** Ngày bàn giao dự kiến, cập nhật theo tiến độ thực tế. */
  handoverDate: string
  /** Ngày bàn giao theo kế hoạch ban đầu — để nói "sớm/chậm hơn kế hoạch". */
  plannedHandoverDate: string
  inspectionsUsed: number
  inspectionsTotal: number
  stages: CmsSupervisionStage[]
}

/** Báo cáo vi phạm do người dùng gửi (review sai sự thật, nội dung xấu…). */
export interface CmsReport {
  id: string
  reporterName: string
  /** Đối tượng bị báo cáo. */
  targetType: 'review' | 'consultant' | 'content'
  /** Mô tả ngắn đối tượng, ví dụ tên review / tên KTS. */
  targetLabel: string
  reason: string
  status: CmsReportStatus
  createdAt: string
}

/* ===========================================================================
 * NHÀ THẦU (S12–S15).
 *
 * Danh bạ nằm ở `shared/cms` vì vận hành là bên nhập và xác minh nhà thầu:
 * màn quản trị ghi, luồng Tìm nhà thầu đọc — mà `features/admin` không được
 * import `features/contractors`. Không trường nào liên quan tới giá (R2).
 * ======================================================================== */

/** Vùng phục vụ — tab Bắc / Trung / Nam (S12). */
export type CmsServiceRegion = 'north' | 'central' | 'south'

/** Ảnh công trình trong hồ sơ năng lực (S13). */
export interface CmsContractorPhoto {
  url?: string
  caption: string
}

/** Dự án tiêu biểu của nhà thầu (S13). */
export interface CmsContractorProject {
  id: string
  name: string
  year: number
  /** Loại công trình lấy từ danh mục dùng chung (epic ContractorManagement §7). */
  buildingTypeId?: string
  /** Phương án Số tầng — chỉ khi loại công trình áp dụng Số tầng. */
  floorOptionId?: string
  /** Tum — chỉ khi loại công trình áp dụng Tum. */
  hasAttic?: boolean
  /** Phạm vi thi công của dự án — chọn đúng một (ContractorManagement §7). */
  scope?: CmsContractorScope
  /** Nổi bật — chỉ dự án Đang hiển thị mới được nổi bật; ẩn dự án là tự bỏ nổi bật. */
  featured?: boolean
  /** Ẩn khỏi hồ sơ người dùng mà không xóa tệp hay lịch sử xác minh. */
  hidden?: boolean
  order?: number
  /** Liên kết thư mục ảnh và bài viết / hồ sơ chi tiết của dự án. */
  photoFolderUrl?: string
  articleUrl?: string
  /** Bằng chứng xác minh: ảnh thực tế + biên bản nghiệm thu có chữ ký chủ nhà. */
  evidence?: { sitePhotoUrls: string[]; acceptanceDocUrl?: string }
  /** Admin thực hiện xác minh gần nhất. */
  verifiedBy?: string
  /** Lịch sử hủy xác minh — không ghi đè. */
  unverifications?: { at: string; by: string; reason: string }[]
  imageUrl?: string
  /** Dữ liệu tóm tắt trên thẻ ở tab "Dự án đã thực hiện" (Hình S13 mở rộng). */
  verified?: boolean
  areaM2?: number
  dimensions?: string
  /** Dòng quy mô dạng chữ của dự án nhập trước khi có Số tầng / Tum theo danh mục — chỉ đọc. */
  scale?: string
  location?: string
  contractorRole?: 'general-contractor' | 'contractor'
  constructionMonths?: number
  constructionStartedAt?: string
  constructionEndedAt?: string
  mainItems?: string
  verifiedAt?: string
  galleryUrls?: string[]
}

/**
 * Khối "Đối tác hợp tác cùng SAVICO" + bản scan thỏa thuận (S14).
 *
 * `pageCount` để dựng dải thumbnail bên trái viewer; bản scan thật do đội vận
 * hành tải lên, ở mock chỉ có siêu dữ liệu.
 */
export interface CmsContractorPartnership {
  /** Chỉ `true` khi quan hệ hợp tác VÀ tài liệu đã được SAVICO xác minh. */
  verified: boolean
  /** Trạng thái đối tác (ContractorManagement §10). */
  status?: 'none' | 'pending' | 'verified' | 'paused' | 'ended'
  endedAt?: string
  /** Trạng thái xác minh tài liệu hợp tác. */
  docStatus?: 'pending' | 'verified'
  /** Bản scan được phép công khai ở tab Hợp tác SAVICO của người dùng. */
  scanPublic?: boolean
  /** Tỷ lệ phản hồi lời mời (%), nếu có dữ liệu. */
  responseRate?: number
  /** Ghi chú nội bộ — không hiện cho người dùng hay nhà thầu. */
  internalNote?: string
  /** Hợp tác từ tháng/năm — hiển thị "08/2026". */
  since: string
  contractCode: string
  signedAt: string
  pageCount: number
  scanUrl?: string
}

/** Hồ sơ pháp lý đã được SAVICO đối chiếu trong tab "Năng lực pháp lý". */
export interface CmsContractorLegalProfile {
  /** Mã số thuế / mã số doanh nghiệp đầy đủ — chỉ admin thấy; người dùng xem bản che. */
  taxCode?: string
  /** Số hiệu giấy chứng nhận đăng ký doanh nghiệp đầy đủ. */
  registrationNumber?: string
  licenseIssuer?: string
  /** Hiệu lực tới ngày (ISO) — bỏ trống là không thời hạn. */
  licenseValidUntil?: string
  licenseScanUrl?: string
  /** Trạng thái kiểm duyệt giấy phép (ContractorManagement §8). */
  licenseStatus?: 'pending' | 'verified' | 'rejected' | 'expired'
  licenseRejectReason?: string
  licenseReviewedAt?: string
  licenseReviewedBy?: string
  /** Lịch sử kiểm duyệt — không ghi đè người duyệt, thời điểm, kết quả trước đó. */
  licenseHistory?: { at: string; by: string; status: string; reason?: string }[]
  legalName: string
  taxCodeMasked: string
  establishedAt: string
  operationYears: number
  representative: string
  representativeTitle: string
  registeredAddress: string
  primaryBusiness: string
  workforce: string
  registrationNumberMasked: string
  registrationIssuedAt: string
  registrationStatus: 'verified' | 'pending'
  verifiedAt: string
  verifiedUntil: string
  warrantyMonths: number
  usesSavicoContract: boolean
  hasConstructionInsurance: boolean
  cooperationRank: number
  cooperationPercent: number
  complaintCount: number
}

/**
 * Thông tin liên hệ THẬT của nhà thầu — chỉ vận hành thấy.
 *
 * S13: "Thông tin liên hệ được mở sau khi lịch khảo sát được xác nhận". Vận hành
 * là bên gọi nhà thầu để chốt lịch, nên số này nằm ở hồ sơ quản trị chứ không
 * nằm trên trang công khai.
 */
export interface CmsContractorContact {
  person: string
  phone: string
  email: string
}

/**
 * Quy tắc đề xuất nhà thầu (spec admin #12, STORY-027, BR-074 → BR-076) — một
 * tài liệu cấu hình: khu vực được hỗ trợ, các nấc bán kính, loại công trình
 * được đề xuất và tiêu chí để một nhà thầu đủ điều kiện vào danh sách.
 * Nhà thầu Ẩn không bao giờ được đề xuất, bất kể cấu hình (BR-075).
 */
export interface CmsContractorMatching {
  /** Khu vực được hỗ trợ — tab vùng ở trang đề xuất chỉ hiện các khu vực này. */
  supportedRegions: CmsServiceRegion[]
  /** Các nấc bán kính (km) người dùng được chọn, tăng dần. */
  radiusOptions: number[]
  /** Nấc mặc định khi mở trang — phải thuộc `radiusOptions`. */
  defaultRadiusKm: number
  /** Loại công trình được đề xuất nhà thầu — hồ sơ thuộc loại khác không có đề xuất. */
  buildingTypeIds: string[]
  criteria: {
    /** Chỉ nhà thầu Đang nhận dự án. */
    acceptingOnly: boolean
    /** Chỉ nhà thầu có hồ sơ Đã xác minh. */
    verifiedOnly: boolean
    /** Chỉ nhà thầu có hồ sơ pháp lý Đã xác minh. */
    legalVerifiedOnly: boolean
    /** Chỉ nhà thầu có thể khảo sát. */
    surveyCapableOnly: boolean
    /** Loại công trình VÀ Phạm vi thi công của hồ sơ phải nằm trong năng lực nhà thầu. */
    capabilityMatch: boolean
    /** Điểm đánh giá tối thiểu (0 = không xét); nhà thầu chưa có đánh giá không bị loại. */
    minRating: number
  }
}

/** Phạm vi thi công: Thi công trọn gói / Phần thô / Hoàn thiện / Nội thất. */
export type CmsContractorScope = 'turnkey' | 'shell' | 'finishing' | 'interior'

/** Địa điểm của nhà thầu — mã hành chính + tên để dữ liệu cũ vẫn đọc được khi danh mục đổi. */
export interface CmsContractorLocation {
  provinceCode: number | null
  provinceName: string
  wardCode: number | null
  wardName: string
  /** Số nhà, tên đường — tối đa 255 ký tự. */
  street: string
  lat: number | null
  lng: number | null
  /** Bán kính hoạt động (km) quanh địa điểm này. */
  radiusKm: number | null
}

export interface CmsContractorBranch extends CmsContractorLocation {
  id: string
  name: string
  /** Chi nhánh ngừng hoạt động không dùng để xác định phạm vi phục vụ. */
  active: boolean
}

/** Một dòng lịch sử quản trị của nhà thầu. */
export interface CmsContractorHistoryEntry {
  id: string
  at: string
  by: string
  /** Nhóm dữ liệu: hồ sơ, dự án, pháp lý, hợp tác, hiển thị… */
  group: 'profile' | 'project' | 'legal' | 'partnership' | 'visibility' | 'verification'
  action: string
  before?: string
  after?: string
  reason?: string
}

/** Một nhà thầu — dùng chung cho thẻ danh sách, bảng so sánh và hồ sơ. */
export interface CmsContractor {
  id: string
  name: string
  logoUrl?: string
  /** Dòng phụ dưới tên: "Nhà thầu xây dựng". */
  kind: string
  verified: boolean
  rating: number
  reviewCount: number
  /** Số dự án tương tự dự án đang xét — cơ sở của xếp hạng "Phù hợp nhất". */
  similarProjects: number
  /**
   * Tổng số dự án đã hoàn thành — Hình S09 in nó ngay trên `similarProjects`
   * trong thẻ nhà thầu ở hero ("46 dự án" / "18 dự án tương tự"). Hai con số
   * khác nhau: một cái là bề dày, một cái là mức phù hợp với dự án đang xét.
   */
  completedProjects: number
  distanceKm: number
  distanceKnown?: boolean
  provinceCode?: string | null
  serviceAreas: string[]
  region: CmsServiceRegion | null
  /** Có thể khảo sát trong bao nhiêu giờ — 24 hoặc 48 (S12, S15). */
  surveyWithinHours: number
  acceptingProjects: boolean
  intro: string
  strengths: string[]
  /**
   * Số lầu cao nhất nhà thầu nhận thi công, không tính trệt (0 = chỉ nhà trệt).
   * Bộ lọc "Quy mô công trình" ở S09 đọc trường này; bỏ trống thì không bị loại.
   * Epic Quản lý nhà thầu không có trường này nên form quản trị không nhập — chỉ
   * còn giá trị trong dữ liệu mẫu.
   */
  maxUpperFloors?: number
  photos: CmsContractorPhoto[]
  /** Các Loại công trình nhận thực hiện — lấy từ danh mục dùng chung. */
  buildingTypeIds?: string[]
  /** Các Phạm vi thi công nhận thực hiện. */
  scopes?: CmsContractorScope[]
  /** Mô tả ngắn dưới tên. */
  shortDescription?: string
  /** Số năm kinh nghiệm — nhập tay, không tự tính từ năm thành lập. */
  experienceYears?: number
  /** Có thể khảo sát hay không — có thì `surveyWithinHours` bắt buộc > 0. */
  surveyCapable?: boolean
  /** Trụ sở chính — địa chỉ theo danh mục hành chính + tọa độ + bán kính phục vụ. */
  headquarters?: CmsContractorLocation
  branches?: CmsContractorBranch[]
  /** Lý do hủy xác minh gần nhất. */
  unverifyReason?: string
  /** Lịch sử thay đổi quản trị — chỉ đọc (ContractorManagement §13). */
  history?: CmsContractorHistoryEntry[]
  foundedYear: number
  /** Số kiến trúc sư & kỹ sư — lưu số, giao diện ghép chữ. */
  teamSize: number
  officeAddress: string
  warrantyMonths: number
  legalChecks: string[]
  featuredProjects: CmsContractorProject[]
  /** Số dự án SAVICO đã đối chiếu ảnh thực tế và biên bản nghiệm thu. */
  verifiedProjects: number
  legalProfile?: CmsContractorLegalProfile
  partnership: CmsContractorPartnership
  /** Chỉ vận hành thấy — xem `CmsContractorContact`. */
  contact?: CmsContractorContact
  /**
   * Ẩn khỏi mọi danh sách đề xuất (S09, S12) mà KHÔNG xóa hồ sơ: lời mời cũ vẫn
   * trỏ tới nhà thầu này, xóa đi thì thẻ lời mời của khách mất tên.
   */
  hidden?: boolean
}

/* ===========================================================================
 * ĐƠN HÀNG — mua gói thiết kế (S01) và gói giám sát (S19), S03–S08.
 *
 * Nằm ở `shared/cms` vì R10 chỉ cho QR chuyển khoản: tới khi có đối soát tự
 * động với ngân hàng, NGƯỜI là bên xác nhận tiền đã về. Trang khách (S06) phải
 * đọc đúng bản ghi mà màn quản trị vừa đổi trạng thái — `features/admin` không
 * được import `features/checkout`, nên kiểu phải ở tầng dùng chung.
 * ======================================================================== */

/** Thứ được bán: gói thiết kế (S01) hoặc gói giám sát thi công (S19). */
export type CmsOrderKind = 'design' | 'supervision'

/**
 * Trạng thái đơn — cũng là thứ quyết định màn nào của khách được mở:
 * `awaiting` → S04 (QR), `verifying` → S06, `failed` → S07, `paid` → S08.
 */
/**
 * Trạng thái thanh toán của đơn (epic OrderManagement): `awaiting` / `verifying`
 * đều là "Chờ thanh toán" (verifying = khách đã báo chuyển khoản); còn lại là
 * Đã thanh toán, Thất bại, Hết hạn, Đã hủy, Đã hoàn tiền. Do backend cập nhật.
 */
export type CmsOrderStatus = 'awaiting' | 'verifying' | 'failed' | 'paid' | 'expired' | 'cancelled' | 'refunded'

/** Thông tin người mua, sửa được ngay trên màn xác nhận đơn (S03). */
export interface CmsOrderBuyer {
  name: string
  phone: string
  email: string
}

/** Khối "Xuất hóa đơn" (S03) — tắt mặc định, bật thì cần đủ thông tin công ty. */
export interface CmsOrderInvoice {
  enabled: boolean
  company: string
  taxCode: string
  address: string
  email: string
}

/** Bản chụp sản phẩm tại thời điểm đặt — giá đổi sau đó không làm đơn cũ đổi theo. */
export interface CmsOrderProduct {
  id: string
  kind: CmsOrderKind
  /** Nhãn hiển thị, ví dụ "PLUS" hoặc "Gói An Tâm". */
  name: string
  price: number
  /** Vài dòng quyền lợi in trong khối "Đơn hàng của bạn". */
  benefits: string[]
  /** Snapshot lúc tạo đơn — chu kỳ sử dụng (ngày) hoặc thời hạn gói giám sát (tháng). */
  periodDays?: number
  designCredits?: number
  libraryCredits?: number
  gift?: { title: string; conditions: string }
}

/** Thông tin chuyển khoản hiện ở S04 và nhắc lại ở S06. */
export interface CmsTransferInfo {
  bankName: string
  accountNumber: string
  accountName: string
  /** Nội dung chuyển khoản — sai nội dung là đơn phải xác nhận thủ công. */
  content: string
  /** Chuỗi mã QR (bản mock dựng từ chính thông tin trên). */
  qrPayload: string
}

/** Một đơn mua gói. */
export interface CmsOrder {
  /** Mã đơn hàng `SVC-YYNNN`, hiện ở S04, S06, S07. */
  id: string
  product: CmsOrderProduct
  /** Dự án gắn với đơn — chỉ có với gói giám sát (R8). */
  projectId?: string
  buyer: CmsOrderBuyer
  invoice: CmsOrderInvoice
  /** Mã giảm giá đã áp dụng, rỗng nếu chưa áp. */
  discountCode: string
  /** Snapshot cấu hình mã lúc tạo đơn — hình thức và giá trị cấu hình. */
  discountType?: CmsDiscountType
  discountValue?: number
  subtotal: number
  discountAmount: number
  total: number
  status: CmsOrderStatus
  createdAt: string
  /** Hạn của mã QR hiện tại (ISO) — hết hạn thì tạo lại mã (S04). */
  expiresAt: string
  transfer: CmsTransferInfo
  /** Lúc khách bấm "Tôi đã chuyển khoản" (S04 → S06). */
  transferredAt?: string
  /** Lúc vận hành xác nhận tiền đã về. */
  paidAt?: string
  /** Ghi chú nội bộ — số tham chiếu sao kê, lý do báo chưa nhận… Khách không thấy. */
  opsNote?: string
  /**
   * Chỉ có với đơn từ BMT API (TDD-PAY-001) — mock không có. Giữ những thứ màn thanh
   * toán cần mà `CmsOrder` không có chỗ: phiên bản để huỷ đơn, số đã nhận / còn thiếu
   * cho trạng thái thanh toán một phần, và độ lệch đồng hồ để đếm ngược đúng.
   */
  api?: CmsOrderApiExtras
}

export interface CmsOrderApiExtras {
  /** `expectedVersion` của `POST /payment-orders/{id}/cancel`. */
  version: number
  /** Trạng thái gốc của BE — `CmsOrderStatus` gộp Pending và PartiallyPaid làm một. */
  state: 'Pending' | 'PartiallyPaid' | 'Paid' | 'Expired' | 'Canceled'
  /** VND. BE trả chuỗi số nguyên; đã đổi sang số. */
  receivedAmount: number
  remainingAmount: number
  extraReceivedAmount: number
  /** `serverNowUtc − giờ máy khách` lúc nhận đơn (ms). Cộng vào giờ máy khi so với hạn. */
  serverOffsetMs: number
  /** Nội dung chuyển khoản; QR giữ nguyên mã này khi cập nhật số tiền. */
  paymentCode: string
  /** Lựa chọn giá của đơn — cần để tạo đơn MỚI cùng gói khi đơn này hết hạn. */
  offerKey?: 'Month' | 'Year' | 'ConstructionSite'
}

/* ===========================================================================
 * MÃ GIẢM GIÁ (S03).
 * ======================================================================== */

export type CmsDiscountType = 'percent' | 'amount'

/**
 * Một mã giảm giá.
 *
 * Số lượt đã dùng KHÔNG lưu ở đây mà đếm từ đơn đã thanh toán: một con số lưu
 * riêng sẽ lệch ngay lần đầu có đơn bị xác nhận lại hay báo chưa nhận tiền.
 */
export interface CmsDiscountCode {
  id: string
  /** Mã khách gõ — luôn lưu chữ in hoa. */
  code: string
  type: CmsDiscountType
  /** Phần trăm (1–100) hoặc số tiền VND, tùy `type`. */
  value: number
  /** Trần số tiền giảm cho mã phần trăm, VND. Trống = không giới hạn. */
  maxDiscount?: number | null
  /** Đơn tối thiểu để dùng mã, VND. Trống = không yêu cầu. */
  minOrder?: number | null
  /** ISO date `YYYY-MM-DD`, tính cả ngày đó. Trống = không giới hạn. */
  startsAt?: string | null
  endsAt?: string | null
  /** Tổng số lượt dùng tối đa. Trống = không giới hạn. */
  usageLimit?: number | null
  /** Số lần một email được dùng. Trống = không giới hạn. */
  perAccountLimit?: number | null
  /** Mã sản phẩm (gói) áp dụng. Rỗng = mọi gói. */
  productIds: string[]
  enabled: boolean
  /** Ghi chú nội bộ — chương trình nào, ai tạo. */
  note?: string
}
