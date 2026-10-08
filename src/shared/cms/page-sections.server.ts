import { indexHomeSections, type BmtPageSection, type HomeSections } from './home-sections'

/**
 * Lấy các khối chữ công khai của một trang (`GET /pages/{pageKey}/sections`), chạy ở SERVER. Dùng chung cho trang chủ,
 * chân trang và các trang pháp lý.
 *
 * Endpoint công khai, không cần đăng nhập nên không mang cookie. Trả `undefined` khi không lấy được (mock, backend sập,
 * chậm, trả sai hình dạng) để bên gọi tự rơi về nội dung có sẵn — CMS không bao giờ được làm trang không mở được.
 */

const API_ORIGIN = (process.env.BMT_API_ORIGIN ?? 'https://bmt-api.vnzdna.com').replace(/\/$/, '')

/** Admin sửa xong thấy trên trang trong tối đa chừng này giây (trang được dựng sẵn và làm mới định kỳ). */
const REVALIDATE_SECONDS = 60

/** Quá thời gian này thì bỏ qua CMS, dùng nội dung có sẵn. */
const TIMEOUT_MS = 4000

interface SectionsEnvelope {
  isSuccess?: boolean
  value?: BmtPageSection[] | null
}

export async function fetchPageSections(pageKey: string, locale: string): Promise<HomeSections | undefined> {
  // Chế độ mock không có backend để hỏi.
  if (process.env.NEXT_PUBLIC_USE_MOCK_API === 'true') return undefined

  try {
    const response = await fetch(
      `${API_ORIGIN}/api/v1/pages/${encodeURIComponent(pageKey)}/sections?locale=${encodeURIComponent(locale)}`,
      {
        headers: { Accept: 'application/json' },
        next: { revalidate: REVALIDATE_SECONDS },
        signal: AbortSignal.timeout(TIMEOUT_MS)
      }
    )
    if (!response.ok) return undefined

    const body = (await response.json()) as SectionsEnvelope
    if (body.isSuccess === false) return undefined

    return indexHomeSections(body.value)
  } catch {
    return undefined
  }
}
