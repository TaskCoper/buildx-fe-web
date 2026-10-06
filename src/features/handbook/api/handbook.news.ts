import { http, isApiError } from '@/shared/lib/api'
import {
  normalizeNewsCategory,
  normalizeNewsCategoryPage,
  type BmtNewsCategory,
  type BmtNewsCategoryPage,
  type NewsCategoryNode,
  type NewsCategoryPage
} from './handbook.news.logic'

/**
 * Danh mục tin tức CÔNG KHAI (TDD-NEWS-002): cây không giới hạn cấp, BE chỉ trả MỘT cấp mỗi
 * lần gọi, theo `parentId` (bỏ trống = cấp gốc). Không có khái niệm ẩn/nháp cho danh mục nên
 * không cần đăng nhập. Chuyển đổi dữ liệu ở `handbook.news.logic.ts`.
 */

const PAGE_SIZE = 100
const MAX_PAGES = 10
/** Chặn cây quá sâu/quá lớn (dữ liệu hỏng hoặc bị nhập bậy) — bộ lọc chỉ cần vài cấp. */
const MAX_DEPTH = 5
const MAX_NODES = 400

export interface ListNewsCategoriesParams {
  parentId?: string
  pageIndex?: number
  pageSize?: number
}

/** `GET /news/categories` — một trang con TRỰC TIẾP của `parentId` (hoặc cấp gốc). */
export async function listNewsCategories({
  parentId,
  pageIndex = 1,
  pageSize = PAGE_SIZE
}: ListNewsCategoriesParams = {}): Promise<NewsCategoryPage> {
  const raw = await http.get<BmtNewsCategoryPage>('/news/categories', {
    params: { ...(parentId ? { parentId } : {}), pageIndex, pageSize }
  })
  return normalizeNewsCategoryPage(raw)
}

/** `GET /news/categories/{id}` — nhãn của một nút. 404 (không có/đã xoá) → `null`. */
export async function getNewsCategory(id: string): Promise<NewsCategoryNode | null> {
  try {
    return normalizeNewsCategory(await http.get<BmtNewsCategory>(`/news/categories/${id}`))
  } catch (error) {
    if (isApiError(error) && error.status === 404) return null
    throw error
  }
}

async function listLevel(parentId?: string): Promise<NewsCategoryNode[]> {
  const nodes: NewsCategoryNode[] = []
  for (let pageIndex = 1; pageIndex <= MAX_PAGES; pageIndex++) {
    const page = await listNewsCategories({ parentId, pageIndex })
    nodes.push(...page.items)
    if (!page.hasNextPage) break
  }
  return nodes
}

/**
 * Toàn bộ cây dạng danh sách phẳng, duyệt theo cấp: mỗi cấp gọi các nút có `hasChildren` song
 * song. Lỗi ở một nhánh con bị bỏ qua (giữ phần đã có) — bộ lọc vẫn dùng được với cây thiếu.
 */
export async function listNewsCategoryTree(): Promise<NewsCategoryNode[]> {
  const all: NewsCategoryNode[] = await listLevel()
  let frontier = all.filter((node) => node.hasChildren)

  for (let depth = 1; depth < MAX_DEPTH && frontier.length && all.length < MAX_NODES; depth++) {
    const levels = await Promise.all(frontier.map((node) => listLevel(node.id).catch(() => [] as NewsCategoryNode[])))
    const next = levels.flat()
    all.push(...next)
    frontier = next.filter((node) => node.hasChildren)
  }

  return all.slice(0, MAX_NODES)
}
