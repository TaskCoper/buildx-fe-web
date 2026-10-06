import type { PagedResult } from '@/shared/types'

/**
 * Cắt một trang từ danh sách đã có đủ trong tay — cho những endpoint BMT trả
 * nguyên danh sách (danh mục dự toán) hoặc không lọc được phía server (thư viện
 * mẫu), để vẫn dùng chung `ApiResourceManager`. `pageIndex` bắt đầu từ 1.
 */
export function pageLocally<T>(items: readonly T[], pageIndex: number, pageSize: number): PagedResult<T> {
  const totalCount = items.length
  const lastPage = Math.max(1, Math.ceil(totalCount / pageSize))
  const page = Math.min(Math.max(1, pageIndex), lastPage)
  return {
    items: items.slice((page - 1) * pageSize, page * pageSize),
    pageIndex: page,
    pageSize,
    totalCount,
    hasNextPage: page < lastPage,
    hasPreviousPage: page > 1
  }
}

/** Khớp từ khóa theo tên, không phân biệt hoa thường / dấu cách hai đầu. */
export function matchesKeyword(name: string | null | undefined, keyword: string | undefined): boolean {
  if (!keyword) return true
  return (name ?? '').toLocaleLowerCase('vi').includes(keyword.trim().toLocaleLowerCase('vi'))
}
