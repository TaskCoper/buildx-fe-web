import { FOOTER_PAGE_KEY } from '@/shared/cms/footer-sections'
import { http } from '@/shared/lib/api'
import type { BmtPageSectionAdmin, BmtPageSectionWrite } from './handbook.api'

/**
 * Khối nội dung của chân trang (`/admin/pages/footer/sections`): thông tin liên hệ, liên kết mạng xã hội và nội dung
 * năm trang "Về BuildX". Cùng cơ chế khối chữ với trang chủ: cần quyền `news.manage`, khóa lạc quan bằng `version`, và
 * backend kiểm nội dung theo hình dạng đã khai báo của từng khối (sai hình dạng trả 422 `InvalidPageSection`, khối hoặc
 * trang chưa khai báo trả 404 `PageSectionNotFound`). Trường rich text (`body`) được backend làm sạch rồi mới lưu.
 */
const BASE = `/admin/pages/${FOOTER_PAGE_KEY}/sections`

export const footerAdminApi = {
  /** Mọi khối đã có bản lưu của một ngôn ngữ; khối chưa lưu không có trong danh sách. */
  listSections: (locale: string) => http.get<BmtPageSectionAdmin[]>(BASE, { params: { locale } }),

  saveSection: (sectionKey: string, body: BmtPageSectionWrite) =>
    http.put<BmtPageSectionAdmin>(`${BASE}/${sectionKey}`, body),

  /** Xóa bản đã lưu để chân trang và trang pháp lý quay lại dùng nội dung có sẵn trong ứng dụng. */
  deleteSection: (sectionKey: string, locale: string) =>
    http.delete<void>(`${BASE}/${sectionKey}`, { params: { locale } })
}
