/**
 * Cây danh mục Tin tức (BR-NEWS-002) — hàm thuần trên danh sách phẳng
 * `{ id, parentId, name, sortOrder }` mà API trả theo từng tầng.
 */

interface CategoryLike {
  id: string
  parentId?: string | null
  name: string
  sortOrder: number
}

export interface CategoryTreeNode {
  value: string
  title: string
  disabled?: boolean
  children?: CategoryTreeNode[]
}

/** Dựng dữ liệu cho antd `TreeSelect`. `disabledIds` là các nút không chọn được. */
export function buildCategoryTree<T extends CategoryLike>(
  list: readonly T[],
  disabledIds: ReadonlySet<string> = new Set()
): CategoryTreeNode[] {
  const build = (parentId: string | null): CategoryTreeNode[] =>
    list
      .filter((item) => (item.parentId ?? null) === parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((item) => {
        const children = build(item.id)
        return {
          value: item.id,
          title: item.name,
          disabled: disabledIds.has(item.id),
          children: children.length ? children : undefined
        }
      })
  return build(null)
}

/** Tên đầy đủ theo nhánh: "Vật liệu › Sơn". Không tìm thấy → trả chính id. */
export function categoryPath<T extends CategoryLike>(list: readonly T[], id: string): string {
  const byId = new Map(list.map((item) => [item.id, item]))
  const names: string[] = []
  const seen = new Set<string>()
  for (let current = byId.get(id); current && !seen.has(current.id); current = byId.get(current.parentId ?? '')) {
    seen.add(current.id)
    names.unshift(current.name)
  }
  return names.length ? names.join(' › ') : id
}

/** Chính danh mục và mọi hậu duệ — không được chọn làm cha (tránh vòng lặp, BR-NEWS-002 khoản 4). */
export function selfAndDescendants<T extends CategoryLike>(list: readonly T[], id: string): Set<string> {
  const result = new Set([id])
  let grew = true
  while (grew) {
    grew = false
    for (const item of list) {
      if (item.parentId && result.has(item.parentId) && !result.has(item.id)) {
        result.add(item.id)
        grew = true
      }
    }
  }
  return result
}
