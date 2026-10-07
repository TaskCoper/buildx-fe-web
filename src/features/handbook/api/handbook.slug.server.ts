/**
 * Chuyển hướng đường dẫn bài viết về đường dẫn hiện tại, chạy ở SERVER (TDD-NEWS-003/Architecture — Kỹ thuật 2).
 *
 * Backend là API JSON và luôn trả 200 kèm `slug` hiện tại. Nếu nó trả 301 thì thư viện gọi HTTP sẽ tự đi theo và
 * thanh địa chỉ của người đọc không đổi — đúng thứ công cụ tìm kiếm cần lại không xảy ra. Vì vậy server component
 * của Next.js so `slug` do backend trả với đoạn đường dẫn đang mở rồi gọi `permanentRedirect`.
 *
 * Chỉ dùng cho trang công khai: endpoint không cần đăng nhập nên không mang cookie. Lỗi bất kỳ trả `null` để
 * trang cứ hiển thị bình thường — việc chuyển hướng là tối ưu cho đường dẫn cũ, không được làm hỏng việc đọc bài.
 */

const API_ORIGIN = (process.env.BMT_API_ORIGIN ?? 'https://bmt-api.vnzdna.com').replace(/\/$/, '')

/** Đủ ngắn để đổi đường dẫn có hiệu lực nhanh, đủ dài để không gọi lại backend ở mỗi lần xem. */
const REVALIDATE_SECONDS = 30

interface ArticleEnvelope {
  isSuccess?: boolean
  value?: { slug?: string | null } | null
}

/**
 * Đường dẫn hiện tại của bài đang mở bằng `idOrSlug`, hoặc `null` khi không có gì để chuyển hướng: bài không tồn
 * tại, bài cũ chưa có đường dẫn, hoặc backend lỗi.
 */
export async function resolveCurrentArticleSlug(idOrSlug: string): Promise<string | null> {
  try {
    const response = await fetch(`${API_ORIGIN}/api/v1/news/articles/${encodeURIComponent(idOrSlug)}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: REVALIDATE_SECONDS }
    })
    if (!response.ok) return null

    const body = (await response.json()) as ArticleEnvelope
    const slug = body.isSuccess === false ? null : body.value?.slug?.trim()
    return slug || null
  } catch {
    return null
  }
}
