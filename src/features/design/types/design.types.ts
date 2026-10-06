/**
 * Loại công trình — 5 nhóm theo Phụ lục A, trường 3. Quyết định các trường hiển
 * thị phía sau và danh mục "Kiểu kiến trúc & phong cách".
 */
export type BuildingType = 'townhouse' | 'villa' | 'roofed' | 'garden' | 'apartment'

/** Năm phương án Số tầng có sẵn bản dịch (Trệt … Trệt + 4 lầu). */
export type KnownFloorCount = 'ground' | 'ground+1' | 'ground+2' | 'ground+3' | 'ground+4'

/**
 * Số tầng (mục III.2, trường 4) — id một phương án trong danh mục `floorOptions`
 * admin quản lý (epic ConstructionTypeManagement §3). Admin thêm được phương án
 * mới nên đây là chuỗi mở, không phải union cố định; nhãn đọc qua
 * `useFloorCountLabel`.
 */
export type FloorCount = string

/** Gói hoàn thiện & nội thất — slider 3 nấc (mục III.2, trường 6). */
export type PackageTier = 'basic' | 'standard' | 'vip'

/**
 * Kiểu kiến trúc & phong cách — MỘT trường gộp (Phụ lục A, trường 7), quyết
 * định cả kiến trúc bên ngoài lẫn nội thất bên trong. Danh mục hiển thị đổi
 * theo loại công trình (`STYLES_BY_BUILDING_TYPE`) và do admin cấu hình
 * (mục X, #6).
 */
export type DesignStyle =
  | 'modern'
  | 'wabi-sabi'
  | 'neoclassical'
  | 'minimal'
  | 'indochine'
  | 'thai-roof'
  | 'japanese-roof'
  | 'garden-thai-roof'
  | 'garden-japanese-roof'
  | 'garden-villa'
  | 'level4-modern'

/** Ba bước của luồng Thiết kế & Dự toán (stepper, mục III). */
export type DesignStep = 1 | 2 | 3

/**
 * Trạng thái dự án — badge trên thẻ và chip lọc ở trang "Dự án của tôi"
 * (mục IV.1, theo Hình 02): Đang nhập liệu → Đang thiết kế → Chờ duyệt →
 * Hoàn tất. Backend chưa chốt trường này nên suy ra từ bước đang dừng
 * (`projectStatus` trong `project-list.service`).
 */
export type ProjectStatus = 'input' | 'designing' | 'review' | 'completed'

/** Thứ tự sắp xếp lưới dự án — dropdown "Mới cập nhật" (mục IV.1). */
export type ProjectSort = 'recent' | 'oldest' | 'name'

/** Ba phần chi phí trong bảng dự toán (mục III.3b). */
export type CostSection = 'structure' | 'finishing' | 'interior'

/** Dự án do người dùng tạo ở modal Tạo dự án (mục IV.2). */
export interface Project {
  /** Mã dự án, định dạng `SVC-YYYY-NNNN` (quy ước xuyên suốt, mục I). */
  id: string
  name: string
  description?: string
  createdAt: string
  /** Lần chạm gần nhất — dòng "Cập nhật {ngày}" trên thẻ (mục IV.1). */
  updatedAt: string
  /** Bước người dùng đang dừng lại — hiển thị trong "Dự án của tôi". */
  currentStep: DesignStep
  /** Badge trạng thái + chip lọc ở trang Dự án của tôi (mục IV.1). */
  status: ProjectStatus
  /** Ảnh lô đất đã tải ở Bước 1, dùng làm ảnh bìa thẻ dự án. */
  coverUrl?: string | null
  /**
   * Loại công trình đã chọn ở Bước 1 — dòng "Tạo ngày … · Nhà phố · 120 m²"
   * trên thẻ dự án (Hình S24). `null` khi khách chưa qua Bước 1.
   */
  buildingType?: BuildingType | null
  /** Tên loại công trình do API trả (danh mục động, không thuộc enum `BuildingType`) — thẻ ưu tiên dùng tên này. */
  buildingTypeLabel?: string | null
  /**
   * Tổng diện tích sàn AI ước tính (m²), lấy từ kết quả Bước 2. `null` khi
   * chưa chạy dự toán — thẻ khi đó chỉ in ngày tạo và loại công trình.
   */
  floorArea?: number | null
}

/**
 * Các phần của địa chỉ công trình. Giữ riêng để khi mở lại bản nháp, ô gợi ý
 * tỉnh/phường vẫn chọn đúng thứ người dùng đã chọn — không phải đoán lại từ
 * chuỗi đã ghép.
 */
export interface AddressDetail {
  street: string
  wardCode: number | null
  wardName: string
  provinceCode: number | null
  provinceName: string
}

/** Toàn bộ dữ liệu Bước 1 — Nhập liệu (mục III.2). */
export interface DesignInput {
  /** Ảnh lô đất (Căn hộ: ảnh mặt bằng căn hộ hiện trạng). Bắt buộc. */
  landPhotoUrl: string | null
  /** Địa chỉ đã ghép, gửi lên API — dùng để áp đơn giá theo khu vực. Bắt buộc. */
  address: string
  /** Các phần rời của địa chỉ, phục vụ hiển thị lại trên giao diện. */
  addressDetail: AddressDetail
  buildingType: BuildingType | null
  /** Ẩn với Căn hộ (khóa 1 mặt sàn) — Phụ lục A, trường 4. */
  floorCount: FloorCount | null
  /** Ẩn với Căn hộ (mặc định Không tum) — Phụ lục A, trường 5. */
  hasAttic: boolean | null
  packageTier: PackageTier
  /** Kiểu kiến trúc & phong cách — hiện với MỌI loại. Phụ lục A, trường 7. */
  style: DesignStyle | null
  /** Tùy chọn, tối đa 500 ký tự. */
  wishes: string
}

/**
 * Hạn mức lượt thiết kế hiển thị trên nút "Nhận dự toán ngay" (mục IV.3.c).
 * `planName: null` = khách chưa mua gói, đang dùng lượt miễn phí.
 */
export interface DesignQuota {
  planName: string | null
  remaining: number
  /** Tổng lượt của gói; `null` khi đang dùng lượt miễn phí. */
  total: number | null
}

/**
 * Hạng mục con — chỉ xuất hiện trong file Excel, không liệt kê trên màn hình
 * (mục III.3b, khối 1). Cấu trúc theo Phụ lục 02.
 */
export interface EstimateSubItem {
  id: string
  /** Localized label resolved by the API/mock, not a translation key. */
  label: string
  /** Đơn vị tính đã bản địa hóa ("m²", "bộ", "hệ"...). */
  unit: string
  quantity: number
  unitPrice: number
  /** `quantity × unitPrice`, do API tính sẵn để bảng Excel không lệch làm tròn. */
  amount: number
}

/** Một hạng mục lớn trong bảng dự toán (không liệt kê chi tiết trên màn hình). */
export interface EstimateLineItem {
  id: string
  /** Localized label resolved by the API/mock, not a translation key. */
  label: string
  amount: number
  /** Hạng mục con gộp thành `amount`; nguồn dữ liệu cho file Excel. */
  children: EstimateSubItem[]
}

export interface EstimateSection {
  section: CostSection
  items: EstimateLineItem[]
  total: number
}

/** Kết quả Bước 2 (mục III.3b). */
export interface EstimateResult {
  projectId: string
  sections: EstimateSection[]
  /** Tổng cả 3 phần — luôn hiển thị, nổi bật. */
  grandTotal: number
  /** Đoạn văn tư vấn cá nhân hóa, đã điền biến theo dự án. */
  advisory: string
  /** Diện tích sàn do AI ước tính (m²). */
  estimatedFloorArea: number
  xlsxUrl: string
  /** Lúc dự toán dựng xong (ISO) — thanh tiến trình ghi "Hoàn thành ngày …". */
  completedAt?: string
  /** AI báo đây là dữ liệu MẪU (hợp đồng giả `mock-v1`): màn kết quả ghi rõ để khách không tưởng là số thật. */
  isSample?: boolean
  /** Ghi chú đi kèm dữ liệu mẫu. */
  notice?: string
}

/** Trạng thái màn hình Bước 3 (mục III.4). */
export type DossierStatus = 'idle' | 'rendering' | 'ready'

/** Bộ hồ sơ thi công sau khi render xong (mục III.4c). */
export interface Dossier {
  projectId: string
  status: DossierStatus
  pdfUrl: string | null
  /** Bytes — hiển thị dung lượng cạnh nút Tải hồ sơ PDF. */
  pdfSize: number | null
  shareToken: string | null
  /** Link chia sẻ ĐẦY ĐỦ do BE cấp (kèm token trong fragment). Có thì dùng nguyên, không tự dựng từ `shareToken`. */
  shareUrl?: string | null
  /** Ngày hết hạn của link chia sẻ hiện hành (`YYYY-MM-DD`, giờ Việt Nam). */
  shareExpiry?: string | null
  /** Ảnh thật của kết quả AI (route BE, cookie đăng nhập đi kèm): bìa, mặt bằng 2D, phối cảnh. */
  images?: DossierImages
}

/** Đường dẫn ảnh kết quả theo vai trò tệp (`cover-image`, `floor-plan-2d`, `perspective`). */
export interface DossierImages {
  cover: string | null
  floorPlan: string | null
  perspective: string | null
}

/**
 * Bản hồ sơ rút gọn cho người xem qua link chia sẻ — không đăng nhập, chỉ đọc
 * (mục III.4c). Không kèm số điện thoại hay thông tin cá nhân khác.
 */
export interface SharedDossier {
  /** Id ảnh kết quả theo vai trò — người xem tải về bằng token của link. */
  files?: { fileId: string; roleKey: string }[]
  projectName: string
  address: string
  createdAt: string
  sections: EstimateSection[]
  grandTotal: number
  estimatedFloorArea: number
}

/** Tiến độ dùng chung cho màn chờ Bước 2 và màn chờ render Bước 3. */
export interface GenerationProgress {
  /** 0–100. */
  percent: number
  /** Localized status line ("đang đọc bản vẽ", "đang tính chi phí"...). */
  stage: string
  done: boolean
}
