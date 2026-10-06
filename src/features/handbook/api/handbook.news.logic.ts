/**
 * Logic THUẦN cho danh mục tin tức công khai (TDD-NEWS-002) — không gọi mạng, không import
 * alias, kiểm được bằng `node --experimental-strip-types`.
 *
 * Danh mục là CÂY không giới hạn cấp, BE chỉ trả MỘT cấp mỗi lần gọi
 * (`GET /news/categories?parentId=`), item `{id, parentId, name, sortOrder, hasChildren}`.
 * Lọc bài `GET /news/articles?categoryId=X` gồm bài gắn trực tiếp X VÀ mọi danh mục con ở mọi
 * cấp — phía trình duyệt phải tự dựng lại tập hậu duệ để khớp đúng như vậy khi lọc trên danh
 * sách đã tải.
 */

export interface NewsCategoryNode {
  id: string
  parentId: string | null
  name: string
  sortOrder: number
  hasChildren: boolean
}

export interface NewsCategoryPage {
  items: NewsCategoryNode[]
  hasNextPage: boolean
}

export interface BmtNewsCategory {
  id?: string | null
  parentId?: string | null
  name?: string | null
  sortOrder?: number | null
  hasChildren?: boolean | null
}

export interface BmtNewsCategoryPage {
  items?: BmtNewsCategory[]
  hasNextPage?: boolean
}

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

/** `null` khi thiếu `id` hoặc tên — một nút như vậy không hiển thị được. */
export function normalizeNewsCategory(raw: BmtNewsCategory | null | undefined): NewsCategoryNode | null {
  const id = text(raw?.id)
  const name = text(raw?.name)
  if (!id || !name) return null
  return {
    id,
    parentId: text(raw?.parentId) || null,
    name,
    sortOrder: typeof raw?.sortOrder === 'number' && Number.isFinite(raw.sortOrder) ? raw.sortOrder : 0,
    hasChildren: Boolean(raw?.hasChildren)
  }
}

/** Sắp `sortOrder` rồi `id` — đúng thứ tự BE. */
export function normalizeNewsCategoryPage(raw: BmtNewsCategoryPage | null | undefined): NewsCategoryPage {
  const items = (raw?.items ?? [])
    .map(normalizeNewsCategory)
    .filter((node): node is NewsCategoryNode => node !== null)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
  return { items, hasNextPage: Boolean(raw?.hasNextPage) }
}

/**
 * Tập id của một nút VÀ mọi hậu duệ (mọi cấp) trong danh sách phẳng. Chu trình (dữ liệu hỏng)
 * không gây lặp vô hạn.
 */
export function descendantIds(nodes: readonly NewsCategoryNode[], rootId: string): Set<string> {
  const childrenOf = new Map<string, string[]>()
  for (const node of nodes) {
    if (!node.parentId) continue
    childrenOf.set(node.parentId, [...(childrenOf.get(node.parentId) ?? []), node.id])
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
 * Các nút làm CHIP lọc. Nút gốc chỉ để gom (có con) thì nhường chỗ cho các con trực tiếp của
 * nó; nút gốc không có con thì tự là chip. Dữ liệu thật hiện có gốc "Tất cả" → con "Kinh
 * nghiệm xây nhà": chip là "Kinh nghiệm xây nhà", còn "Tất cả" đã có sẵn ở nút Tất cả của giao
 * diện nên không lặp lại. Các cấp sâu hơn không thành chip nhưng vẫn được tính khi lọc.
 */
export function chipNodes(nodes: readonly NewsCategoryNode[]): NewsCategoryNode[] {
  const order = (list: NewsCategoryNode[]) =>
    [...list].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
  const roots = order(nodes.filter((node) => node.parentId === null))
  const chips: NewsCategoryNode[] = []

  for (const root of roots) {
    const children = order(nodes.filter((node) => node.parentId === root.id))
    if (children.length) chips.push(...children)
    else chips.push(root)
  }
  return chips
}

/** Tập id (nút + hậu duệ) của từng chip — để khớp bài theo `categoryIds` như `categoryId` ở BE. */
export function descendantsByChip(
  nodes: readonly NewsCategoryNode[],
  chips: readonly NewsCategoryNode[]
): Map<string, Set<string>> {
  return new Map(chips.map((chip) => [chip.id, descendantIds(nodes, chip.id)]))
}

/**
 * Bài có thuộc chip không. Bài chưa có `categoryIds` (bài mock, hoặc BE không trả) thì KHÔNG
 * khớp chip nào — không đoán theo tên.
 */
export function articleInChip(
  categoryIds: readonly string[] | null | undefined,
  chipId: string,
  descendants: ReadonlyMap<string, ReadonlySet<string>>
): boolean {
  if (!categoryIds?.length) return false
  const scope = descendants.get(chipId)
  if (!scope) return categoryIds.includes(chipId)
  return categoryIds.some((id) => scope.has(id))
}
