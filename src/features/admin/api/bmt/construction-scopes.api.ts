import { http } from '@/shared/lib/api'

/**
 * DANH MỤC PHẠM VI THI CÔNG (ConstructionScope — STORY-CTR-003, BR-CTR-007).
 *
 * Danh mục dùng chung cho hồ sơ nhà thầu (khai năng lực) và dự án tiêu biểu
 * (mỗi dự án đúng một phạm vi). Mỗi phạm vi có khoá lạc quan `version`. Vòng đời
 * bật/tắt qua `isActive`: phạm vi "Ngừng dùng" không gắn mới được nhưng giữ liên
 * kết cũ; không xoá được phạm vi đang có nhà thầu/dự án dùng (409
 * `ConstructionScopeInUse`); tên phải là duy nhất (409 `ConstructionScopeNameTaken`).
 *
 * Cần quyền quản trị. Swagger snapshot còn thiếu path này nhưng BE đã deploy
 * (`GET /admin/construction-scopes` trả 401 khi chưa đăng nhập).
 */
export interface ConstructionScopeDto {
  id: string
  name: string
  description?: string | null
  sortOrder: number
  isActive: boolean
  version: number
}

export interface ConstructionScopeInput {
  name: string
  description?: string | null
  sortOrder?: number
  isActive?: boolean
}

const BASE = '/admin/construction-scopes'

const idempotent = () => ({ headers: { 'Idempotency-Key': crypto.randomUUID() } })

/** BE có thể trả mảng trần hoặc `{ items }`; chuẩn hoá về mảng. */
function toList(raw: ConstructionScopeDto[] | { items?: ConstructionScopeDto[] } | null): ConstructionScopeDto[] {
  if (Array.isArray(raw)) return raw
  return raw?.items ?? []
}

export const constructionScopesApi = {
  async list(): Promise<ConstructionScopeDto[]> {
    const raw = await http.get<ConstructionScopeDto[] | { items?: ConstructionScopeDto[] }>(BASE)
    return toList(raw)
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
  },

  create: (body: ConstructionScopeInput) => http.post<ConstructionScopeDto>(BASE, body, idempotent()),

  update: (id: string, body: ConstructionScopeInput & { expectedVersion: number }) =>
    http.put<ConstructionScopeDto>(`${BASE}/${id}`, body, idempotent()),

  remove: (id: string, expectedVersion: number) => http.delete<void>(`${BASE}/${id}`, { params: { expectedVersion } })
}
