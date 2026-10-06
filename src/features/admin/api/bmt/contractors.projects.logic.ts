import type { ContractorProjectDetail, ContractorProjectsResult } from './contractors.admin.api'

/**
 * Dạng THẬT của `GET /admin/contractors/{id}/projects` (đã gọi live 01/10/2026): mỗi phần tử bọc dự án trong `project`
 * và để khoá ở `projectId` — `{ projectId, project: { expectedVersion, name, buildingTypeId, … } }` — KHÔNG phải
 * phẳng như `ContractorProjectDetail`. Đọc thẳng như phẳng thì tên dự án trống, `id` undefined (key trùng, xoá nhầm
 * `/projects/undefined`, sửa mở form rỗng).
 */
interface RawProjectItem extends Partial<ContractorProjectDetail> {
  projectId?: string
  project?: Partial<ContractorProjectDetail> | null
}

/** Chấp nhận cả dạng bọc (BE thật) lẫn dạng phẳng; bỏ phần tử không có khoá. */
export function normalizeProjects(
  raw: { items?: RawProjectItem[] | null; contractorVersion?: number } | null | undefined
): ContractorProjectsResult {
  const items: ContractorProjectDetail[] = []
  for (const entry of raw?.items ?? []) {
    const id = entry.projectId ?? entry.id
    if (!id) continue
    const body = entry.project ?? entry
    items.push({
      id,
      name: body.name ?? '',
      buildingTypeId: body.buildingTypeId ?? '',
      scopeId: body.scopeId ?? '',
      images: body.images ?? [],
      widthM: body.widthM,
      lengthM: body.lengthM,
      areaM2: body.areaM2,
      floorCount: body.floorCount,
      hasAttic: body.hasAttic,
      locationText: body.locationText,
      completedYear: body.completedYear,
      roleText: body.roleText,
      mainWork: body.mainWork
    })
  }
  return { items, contractorVersion: raw?.contractorVersion ?? 0 }
}
