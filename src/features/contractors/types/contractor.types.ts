import type {
  CmsContractor,
  CmsContractorInvitation,
  CmsContractorLegalProfile,
  CmsContractorPartnership,
  CmsContractorPhoto,
  CmsContractorProject,
  CmsInvitationStatus,
  CmsInvitationStep,
  CmsServiceRegion,
  CmsSurveyBooking
} from '@/shared/cms'
import type { AttachmentGroup, SiteDetail, SiteDraft } from './construction-site.types'

/**
 * Kiểu dữ liệu của luồng TÌM NHÀ THẦU (S09–S18).
 *
 * Hai quy tắc chi phối toàn bộ file này, nên chúng được nhắc lại ở từng chỗ
 * dễ vi phạm nhất:
 * - **R1** — mặc định 3 nhà thầu/hồ sơ; API RFQ trả giới hạn hiện hành, không có bước so sánh báo giá.
 * - **R2** — web KHÔNG hiển thị giá / báo giá của nhà thầu. Vì vậy không type
 *   nào ở đây có trường tiền của nhà thầu; `ProjectBrief.budget` là ngân sách
 *   dự kiến của CHỦ NHÀ; RFQ giữ ngân sách trong bản hồ sơ đã gửi theo TDD-RFQ-001.
 */

/** Mã phạm vi cũ, chỉ dành cho dữ liệu lịch sử và mock. */
export type ConstructionScope = 'turnkey' | 'shell' | 'finishing' | 'interior'

/** Hiện trạng khu đất — hàng chọn ở Bước 1 (S10). */
export type SiteCondition = 'empty' | 'demolish' | 'renovate'

/** Quy mô công trình — hàng chọn ở Bước 1 (S10). */
export type ProjectScale = 'ground' | 'ground+1' | 'ground+2' | 'ground+3' | 'ground+4'

/** Mức kinh nghiệm dự án tương tự — bộ lọc ở landing (S09). */
export type ExperienceLevel = 'any' | 'junior' | 'mid' | 'senior'

/** Mức đánh giá tối thiểu — bộ lọc ở landing (S09). */
export type RatingLevel = 'any' | 'good' | 'great'

/** Mốc khởi công dự kiến (S10). */
export type StartWindow = 'asap' | 'in-1-3-months' | 'in-3-6-months' | 'undecided'

/**
 * Trạng thái hồ sơ dự án trong luồng tìm nhà thầu.
 *
 * `draft` đã bỏ cùng nút "Lưu nháp": hồ sơ được ghi lại ngay khi bấm "Tiếp tục"
 * và mức độ điền đủ vốn suy ra từ chính dữ liệu (`isBriefComplete`), nên một cờ
 * riêng cho "đang nháp" không nói thêm được gì. Chỗ đó nhường cho `contracted`
 * — thứ KHÔNG suy ra được từ dữ liệu trên web, vì khảo sát · báo giá · thương
 * thảo · hợp đồng đều diễn ra ngoài web (R3) và chỉ đội vận hành mới biết.
 */
export type BriefStatus = 'ready' | 'inviting' | 'contracted'

/** Chip sắp xếp danh sách nhà thầu (S12) và tab xếp hạng ở landing (S09). */
export type ContractorSort = 'rating' | 'distance' | 'survey'

/** Bán kính tìm kiếm — 4 nấc ở header dự án (S12). */
/** Bán kính tìm kiếm (km) — các nấc do admin cấu hình ở Quy tắc đề xuất nhà thầu. */
export type SearchRadiusKm = number

/** Vùng phục vụ — tab Bắc / Trung / Nam (S12). */
export type ServiceRegion = CmsServiceRegion

/**
 * Thanh 4 nấc trên mỗi thẻ lời mời (S18). Trạng thái do đội hỗ trợ SAVICO cập
 * nhật trong khu quản trị, khách chỉ xem (R4).
 */
/**
 * Bản ghi lời mời báo giá sống ở `shared/cms` chứ không ở feature này: R4 giao
 * việc đẩy bốn nấc trạng thái cho đội vận hành, nên màn admin phải ghi được và
 * trang khách phải đọc được cùng MỘT kho. `features/admin` thì không được import
 * `features/contractors`, vậy kiểu phải nằm ở tầng dùng chung.
 */
export type InvitationStatus = CmsInvitationStatus

/**
 * Đánh giá của khách về một nhà thầu.
 *
 * S09 hứa "chỉ khách đã làm việc qua SAVICO mới được đánh giá" nhưng bản mô tả
 * không vẽ màn nào — nên điều kiện mở form lấy đúng câu đó: chỉ lời mời đã ở
 * nấc cuối (`done`) mới đánh giá được, mỗi lời mời một lần.
 */
export interface ContractorReview {
  /** Trùng mã lời mời: một lời mời chỉ đánh giá được một lần. */
  invitationId: string
  contractorId: string
  projectId: string
  /** 1–5 sao. */
  rating: number
  comment: string
  createdAt: string
}

/** Tệp đính kèm hồ sơ dự án (S10, S11). */
export interface BriefDocument {
  id: string
  name: string
  /** Cỡ tệp tính theo byte — hiển thị "2,4 MB" trên danh sách (S11). */
  sizeBytes: number
  kind: 'image' | 'document'
  attachmentGroup?: AttachmentGroup
  contentPath?: string
}

/**
 * Địa chỉ công trình, giữ rời từng phần để mở lại nháp vẫn chọn đúng ô (S10).
 *
 * Hai cấp tỉnh/phường giống hệt luồng thiết kế — dùng chung danh mục hành chính
 * ở `shared/hooks`, không dựng thêm cấp quận/huyện mà nguồn dữ liệu không có.
 */
export interface BriefAddress {
  provinceCode: number | null
  provinceName: string
  wardCode: number | null
  wardName: string
  street: string
}

/**
 * HỒ SƠ DỰ ÁN của luồng tìm nhà thầu (S10, S11).
 *
 * Luồng B (`selfCreated: true`) là hồ sơ khách tự khai, KHÔNG gồm bản vẽ và dự
 * toán do SAVI phát hành — badge "Hồ sơ tự tạo" theo hồ sơ suốt các màn sau.
 */
export interface ProjectBrief {
  /** Local owner; legacy records need server verification before reuse. */
  userId?: string
  /** Set at creation or after an owned SITE response, never by migrating a storage key. */
  ownershipVersion?: 1
  /** Persisted SITE data; contractor needs stay local until the RFQ integration. */
  constructionSiteId?: string
  constructionSite?: SiteDetail
  siteDraft?: SiteDraft
  /** Mã dự án `SVC-YYYY-NNNN` — cùng quy ước với luồng thiết kế. */
  id: string
  name: string
  buildingType: string
  /** Diện tích đất (m²). */
  landArea: number
  siteCondition: SiteCondition
  scale: ProjectScale
  /** Tum chỉ áp dụng cho các loại nhà; căn hộ khóa một mặt sàn và không tum. */
  hasAttic?: boolean | null
  address: BriefAddress
  /** Ngân sách dự kiến (VND) của chủ nhà; bản lưu RFQ giữ giá trị SITE tại lúc gửi. */
  budget: number
  startWindow: StartWindow
  /** ID phạm vi hệ thống; mã cũ vẫn được đọc để giữ bản nhập liệu trước đây. */
  scope: string
  scopeName?: string
  scopeNote: string
  documents: BriefDocument[]
  /**
   * Ảnh bìa hồ sơ — dòng dự án ở hộp thoại "Chọn dự án để tìm nhà thầu".
   * Hồ sơ từ gói thiết kế lấy phối cảnh đã render; hồ sơ tự tạo lấy ảnh hiện
   * trạng khách tải lên. Bỏ trống thì dòng hiện khung biểu tượng.
   */
  coverUrl?: string | null
  selfCreated: boolean
  status: BriefStatus
  /**
   * Phiên bản hồ sơ (mặc định 1). Sửa hồ sơ SAU khi phiên bản hiện tại đã gửi
   * cho nhà thầu thì tạo bản mới (v2…); lời mời đã gửi vẫn giữ bản cũ.
   */
  version?: number
  createdAt: string
  updatedAt: string
}

/**
 * Một dòng trong hộp thoại "Chọn dự án để tìm nhà thầu".
 *
 * Hồ sơ kèm SỐ LỜI MỜI đã gửi: hộp thoại phải nói ngay mỗi dự án đang ở đâu
 * ("Chưa mời" / "Đã mời 2/3" / "Đã mời 3/3"), mà đếm bằng cách gọi
 * `listInvitations` cho từng dự án thì mở hộp thoại là bắn n truy vấn.
 */
export interface ProjectBriefSummary {
  brief: ProjectBrief
  /** Số lời mời đã gửi cho dự án này — tối đa 3 (R1). */
  invitedCount: number
  invitationLimit?: number
}

/*
 * Danh bạ nhà thầu sống ở `shared/cms`: đội vận hành nhập và xác minh nhà thầu
 * ở /admin/contractors, luồng này chỉ đọc. Tên cũ giữ nguyên cho mọi nơi gọi.
 */

/** Ảnh công trình trong hồ sơ năng lực (S13). */
export type ContractorPhoto = CmsContractorPhoto

/** Dự án tiêu biểu của nhà thầu (S13). */
export type ContractorProject = CmsContractorProject & {
  /** Phân loại do API trả, cùng GUID và tên danh mục hiện hành. */
  buildingTypeName?: string
  scopeId?: string
  scopeName?: string
  /** Tổng số tầng gồm tầng trệt, tum được ghi riêng. */
  floorCount?: number
}

/** Khối "Đối tác hợp tác cùng SAVICO" + bản scan thỏa thuận (S14). */
export type ContractorPartnership = CmsContractorPartnership

/** Hồ sơ pháp lý đã được SAVICO đối chiếu trong tab "Năng lực pháp lý". */
export type ContractorLegalProfile = CmsContractorLegalProfile

/**
 * Một nhà thầu — dùng chung cho thẻ danh sách, bảng so sánh và hồ sơ. Trường
 * `contact` chỉ dành cho vận hành, trang công khai không in ra.
 */
export type Contractor = Omit<CmsContractor, 'featuredProjects'> & {
  featuredProjects: ContractorProject[]
  /** API phân biệt chưa khai báo với giá trị 0/false; mock cũ không có các cờ này. */
  ratingKnown?: boolean
  reviewCountKnown?: boolean
  surveyTimeKnown?: boolean
  acceptingProjectsKnown?: boolean
}

/** Một khung giờ khảo sát (S16). */
export interface SurveySlot {
  id: string
  /** "08:00 – 09:00". */
  label: string
  available: boolean
}

/** Lịch khảo sát khách chọn cho MỘT nhà thầu (S16). */
export type SurveyBooking = CmsSurveyBooking

/** Một nấc trên thanh trạng thái lời mời (S18). */
export type InvitationStep = CmsInvitationStep

/** Một lời mời báo giá đã gửi (S17, S18). */
export type Invitation = CmsContractorInvitation

export interface SurveyRequest {
  id: string
  projectId: string
  createdAt: string
  invitationIds: string[]
}
