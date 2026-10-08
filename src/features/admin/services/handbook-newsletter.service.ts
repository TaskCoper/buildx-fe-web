/**
 * Logic THUẦN cho màn quản lý khối Bản tin (TDD-HB-002, BR-HB-002). Không import alias để kiểm được bằng
 * `scripts/handbook-admin.test.mjs`.
 */

/** Số bài nổi bật hiển thị trên trang công khai, đánh số 01 đến 04 (BR-HB-002 khoản 2). */
export const NEWSLETTER_DISPLAY_COUNT = 4

interface SpotlightLike {
  state: string
}

/**
 * Số thứ tự hiển thị của từng bài trong danh sách (1 đến 4), hoặc `null` nếu bài chưa hiển thị. Chỉ bài đang công
 * bố mới được đánh số, và chỉ bốn bài đầu; bài ẩn hoặc nháp giữ chỗ nhưng không chiếm số, các bài sau dồn lên
 * (BR-HB-002 khoản 3). Đây đúng là phép tính mà trang công khai thực hiện, để người quản lý thấy trước kết quả.
 */
export function displayNumbers(items: readonly SpotlightLike[], limit = NEWSLETTER_DISPLAY_COUNT): (number | null)[] {
  let shown = 0
  return items.map((item) => {
    if (item.state !== 'Published' || shown >= limit) return null
    shown += 1
    return shown
  })
}

/** Khối có ít nhất một bài đang công bố không. Không có thì trang công khai ẩn cả dải Bản tin (BR-HB-002 khoản 9). */
export function hasDisplayedArticle(items: readonly SpotlightLike[]): boolean {
  return items.some((item) => item.state === 'Published')
}

/** Dời phần tử `index` đi `delta` vị trí; ra ngoài biên thì giữ nguyên danh sách. */
export function moveItem<T>(items: readonly T[], index: number, delta: number): T[] {
  const target = index + delta
  if (index < 0 || index >= items.length || target < 0 || target >= items.length) return [...items]
  const next = [...items]
  const [moved] = next.splice(index, 1)
  next.splice(target, 0, moved as T)
  return next
}

/** Danh sách có khác bản đã lưu không, tính cả thứ tự. */
export function sameOrder(a: readonly { articleId: string }[], b: readonly { articleId: string }[]): boolean {
  return a.length === b.length && a.every((item, index) => item.articleId === b[index]?.articleId)
}
