import { CONTRACTORS_PAGE_KEY } from '@/shared/cms/contractors-sections'
import { http } from '@/shared/lib/api'
import type { BmtPageSectionAdmin, BmtPageSectionWrite } from './handbook.api'

/**
 * Khối nội dung của trang "Tìm nhà thầu" (`/admin/pages/contractors/sections`): đầu trang (chữ và ảnh), bốn cam kết, ba
 * thẻ an toàn, bảy câu hỏi và dải kêu gọi cuối trang. Cùng cơ chế khối chữ với trang chủ: cần quyền `news.manage`, khóa
 * lạc quan bằng `version`, và backend kiểm nội dung theo hình dạng đã khai báo của từng khối (sai hình dạng trả 422
 * `InvalidPageSection`, khối hoặc trang chưa khai báo trả 404 `PageSectionNotFound`). Không liên quan tới API quản lý
 * nhà thầu (`/admin/contractors`).
 */
const BASE = `/admin/pages/${CONTRACTORS_PAGE_KEY}/sections`

export const contractorsPageAdminApi = {
  /** Mọi khối đã có bản lưu của một ngôn ngữ; khối chưa lưu không có trong danh sách. */
  listSections: (locale: string) => http.get<BmtPageSectionAdmin[]>(BASE, { params: { locale } }),

  saveSection: (sectionKey: string, body: BmtPageSectionWrite) =>
    http.put<BmtPageSectionAdmin>(`${BASE}/${sectionKey}`, body),

  /** Xóa bản đã lưu để trang quay lại dùng nội dung có sẵn trong ứng dụng. */
  deleteSection: (sectionKey: string, locale: string) =>
    http.delete<void>(`${BASE}/${sectionKey}`, { params: { locale } })
}
