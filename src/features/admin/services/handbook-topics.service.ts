/**
 * Logic THUẦN cho màn quản lý chủ đề hướng dẫn của Cẩm nang (TDD-HB-001). Chủ đề là danh mục gốc bật cờ hướng
 * dẫn nên mọi thứ tính từ cây danh mục; không import alias để kiểm được bằng `scripts/handbook-admin.test.mjs`.
 */

export interface TopicCategory {
  id: string
  parentId?: string | null
  name: string
  sortOrder: number
  hasChildren: boolean
  version: number
  stageId?: string | null
  isInstruction?: boolean
  iconKey?: string | null
}

/** Chủ đề hướng dẫn: danh mục gốc bật cờ và đã gắn bước. Danh mục con và nhãn tin tức không phải chủ đề. */
export function instructionTopics(categories: readonly TopicCategory[]): TopicCategory[] {
  return categories
    .filter((category) => !category.parentId && category.isInstruction === true && Boolean(category.stageId))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
}

/** Id của một danh mục và mọi hậu duệ. Chu trình (dữ liệu hỏng) không gây lặp vô hạn. */
export function branchIds(categories: readonly TopicCategory[], rootId: string): Set<string> {
  const childrenOf = new Map<string, string[]>()
  for (const category of categories) {
    if (!category.parentId) continue
    childrenOf.set(category.parentId, [...(childrenOf.get(category.parentId) ?? []), category.id])
  }

  const result = new Set<string>([rootId])
  const queue = [rootId]
  while (queue.length) {
    const current = queue.shift() as string
    for (const child of childrenOf.get(current) ?? []) {
      if (result.has(child)) continue
      result.add(child)
      queue.push(child)
    }
  }
  return result
}

/**
 * Số bài của từng chủ đề, ở MỌI trạng thái (nháp, công bố, ẩn): đó cũng là điều kiện backend dùng để chặn xóa
 * danh mục còn bài. Bài gắn danh mục con của chủ đề vẫn tính cho chủ đề; bài gắn danh mục của nhiều chủ đề được
 * tính ở mỗi chủ đề nhưng chỉ một lần trong cùng một chủ đề.
 */
export function countArticlesPerTopic(
  articles: readonly { categoryIds: readonly string[] }[],
  categories: readonly TopicCategory[],
  topics: readonly TopicCategory[]
): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const topic of topics) {
    const branch = branchIds(categories, topic.id)
    counts[topic.id] = articles.filter((article) => article.categoryIds.some((id) => branch.has(id))).length
  }
  return counts
}

/**
 * Có xóa được chủ đề không. Backend từ chối khi còn danh mục con hoặc còn bài gắn trực tiếp (BR-NEWS-002 khoản 6);
 * màn cũng chặn khi còn bài ở cả nhánh con, vì xóa các nhánh đó phải đi qua màn danh mục.
 */
export function canDeleteTopic(topic: TopicCategory, articleCount: number): boolean {
  return !topic.hasChildren && articleCount === 0
}

/** Các danh mục gốc theo thứ tự backend lưu (thứ tự rồi định danh) — dãy chung mà chủ đề của mọi bước chen vào. */
export function sortedRoots(categories: readonly TopicCategory[]): TopicCategory[] {
  return categories
    .filter((category) => !category.parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
}

export interface TopicMove {
  /**
   * Danh mục mà chủ đề sẽ đứng NGAY TRƯỚC, hoặc `null` để xuống cuối dãy danh mục gốc. Khớp `beforeCategoryId`
   * của API đổi vị trí.
   */
  before: TopicCategory | null
}

/**
 * Chủ đề ở vị trí `index` trong danh sách của MỘT bước dời lên/xuống một nấc thì API cần mốc nào.
 *
 * Chủ đề của nhiều bước cùng nằm trong một dãy danh mục gốc nên không thể đổi chỗ theo chỉ số của riêng một bước:
 * - Lên: đứng ngay trước chủ đề liền trước của CÙNG bước.
 * - Xuống: đứng sau chủ đề liền sau của cùng bước, tức ngay trước danh mục gốc kế tiếp trong dãy chung; nếu chủ đề
 *   liền sau đã là cuối dãy thì xuống cuối.
 *
 * Trả `null` khi không dời được (đầu hoặc cuối danh sách của bước).
 */
export function topicMove(
  roots: readonly TopicCategory[],
  stageTopics: readonly TopicCategory[],
  index: number,
  direction: 'up' | 'down'
): TopicMove | null {
  if (index < 0 || index >= stageTopics.length) return null

  if (direction === 'up') {
    const previous = stageTopics[index - 1]
    return previous ? { before: previous } : null
  }

  const next = stageTopics[index + 1]
  if (!next) return null

  const nextPosition = roots.findIndex((root) => root.id === next.id)
  if (nextPosition < 0) return null
  return { before: roots[nextPosition + 1] ?? null }
}
