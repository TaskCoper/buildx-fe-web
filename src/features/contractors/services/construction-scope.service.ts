import type { ConstructionScope } from '../types/contractor.types'

/** Chỉ dùng để đọc dữ liệu cũ và chế độ mock; lựa chọn mới lấy ID danh mục API. */
export const LEGACY_CONSTRUCTION_SCOPES = ['turnkey', 'shell', 'finishing', 'interior'] as const

export function isLegacyConstructionScope(value: string): value is ConstructionScope {
  return LEGACY_CONSTRUCTION_SCOPES.some((scope) => scope === value)
}

export interface ConstructionScopeOption {
  id: string
  name: string
}

/** Ưu tiên tên hiện hành; tên lưu giúp đọc mục đã ngừng dùng hoặc lúc API chưa tải xong. */
export function constructionScopeLabel(
  id: string,
  savedName: string | undefined,
  options: readonly ConstructionScopeOption[],
  legacyLabel: (scope: ConstructionScope) => string,
  unavailable: string
): string {
  return (
    options.find((option) => option.id === id)?.name ??
    (isLegacyConstructionScope(id) ? legacyLabel(id) : savedName?.trim() || unavailable)
  )
}
