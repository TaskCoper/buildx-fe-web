import { http, isApiError } from '@/shared/lib/api'
import type { PagedResult } from '@/shared/types'
import type { GuideVideo } from '../types/guide.types'
import { classifyGuideLookupStatus, isUuid, normalizeGuide } from './guide.logic'
import { mockGuideApi } from './guide.mock'

/**
 * Nối trang Hướng dẫn vào BMT API — GIỮ MOCK LÀM NỀN (như Cẩm nang).
 *
 * BE ship cụm guide dạng danh sách VIDEO YouTube xếp thứ tự (`GET /guides`,
 * `Response.PublicGuide`). Trang khách render các video thành lưới phẳng có tìm
 * kiếm + phân trang theo đúng thứ tự API trả, nên chỉ cần map thẳng.
 *
 * DB backend đang RỖNG nên hàm này TỰ VỀ MOCK khi API trả rỗng / lỗi — demo
 * không bị trống. Khi admin publish guide thật thì dữ liệu API thay cho mock.
 *
 * Hai điểm BE chưa có (đã ghi `docs/BE_API_GAPS.md` mục 2.5), map tạm và KHÔNG
 * ảnh hưởng hiển thị lưới video:
 *   - `topic` (nhóm chủ đề): chỉ dùng cho neo deep-link từ luồng 3 bước và gợi ý
 *     "bước kế tiếp cùng nhóm" → dồn tạm về 'input'.
 *   - `featured` (video nổi bật): lấy video ĐẦU danh sách.
 * `listArticles` (bài hướng dẫn) BE không có endpoint → luôn mock.
 */

export const bmtGuideApi = {
  async listVideos(): Promise<GuideVideo[]> {
    try {
      const items: unknown[] = []
      for (let pageIndex = 1; pageIndex <= 20; pageIndex++) {
        const page = await http.get<PagedResult<unknown>>('/guides', {
          params: { pageIndex, pageSize: 100 }
        })
        items.push(...page.items)
        if (!page.hasNextPage) break
      }
      // Phần tử không dùng được bị bỏ qua (xem `normalizeGuide`) chứ không làm vỡ cả danh sách.
      const videos = items.map((item, index) => normalizeGuide(item, index)).filter((video) => video !== null)
      // BE rỗng → về mock để trang demo không trống.
      if (!videos.length) return mockGuideApi.listVideos()
      return videos
    } catch {
      return mockGuideApi.listVideos()
    }
  },

  /**
   * `GET /guides/{guideId}` — một hướng dẫn công khai, cùng DTO với item của danh sách. `null` khi
   * video không xem được: 404 `GuideNotFound` (Draft / Hidden / đã xoá) hoặc 400 (id sai định dạng).
   * Id không phải GUID là id của bản mock → chỉ tra mock, không gọi API (BE sẽ trả 400).
   */
  async getGuide(guideId: string): Promise<GuideVideo | null> {
    if (!isUuid(guideId)) return mockGuideApi.getGuide(guideId)
    try {
      // `index = 1`: bản chi tiết không phải "video đầu danh sách" nên không mang cờ nổi bật.
      return normalizeGuide(await http.get<unknown>(`/guides/${guideId}`), 1)
    } catch (error) {
      if (isApiError(error) && classifyGuideLookupStatus(error.status) === 'unavailable') return null
      // Lỗi mạng / 5xx không khẳng định video mất: thử bản mock rồi thôi.
      return mockGuideApi.getGuide(guideId)
    }
  }
}
