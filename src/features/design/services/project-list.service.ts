import { designDossierRoute, designEstimateRoute, designInputRoute } from '@/shared/constants/routes'
import { PROJECTS_PAGE_SIZE } from '../constants/design.constants'
import type { DesignStep, Project, ProjectSort, ProjectStatus } from '../types/design.types'

/**
 * Logic thuần của khối "DỰ ÁN CỦA TÔI" (mục IV.1): suy trạng thái, tìm kiếm,
 * lọc theo chip, sắp xếp, đếm nhanh và phân trang. Không React, không HTTP —
 * đây là phần đáng viết unit test nhất của màn hình này.
 */

/** Bộ lọc đang áp dụng. `status: null` = chip "Tất cả". */
export interface ProjectListFilter {
  query: string
  status: ProjectStatus | null
  sort: ProjectSort
}

/** Số liệu cho 4 thẻ đếm nhanh phía trên khối danh sách (Hình 02). */
export interface ProjectCounts {
  total: number
  input: number
  designing: number
  review: number
  completed: number
}

/**
 * Suy trạng thái từ bước đang dừng khi backend chưa trả `status`.
 * Bước 1 = đang nhập liệu · Bước 2 = đang thiết kế · Bước 3 = hoàn tất.
 * "Chờ duyệt" không suy ra được từ bước — backend (hoặc mock) đặt thẳng.
 */
export function projectStatus(currentStep: DesignStep): ProjectStatus {
  if (currentStep === 1) return 'input'
  if (currentStep === 2) return 'designing'
  return 'completed'
}

/** Trạng thái một nấc của mini-stepper trên thẻ dự án (mục IV.1). */
export type MiniStepState = 'done' | 'current' | 'pending'

/**
 * Nấc xong → tích xanh, nấc đang làm → chấm đặc có số, nấc chưa tới → xám.
 * Dự án hoàn tất thì cả ba nấc đều xong, kể cả nấc 3.
 */
export function miniStepState(step: DesignStep, project: Pick<Project, 'currentStep' | 'status'>): MiniStepState {
  if (project.status === 'completed' || step < project.currentStep) return 'done'
  if (step === project.currentStep) return 'current'
  return 'pending'
}

/**
 * Ô tìm khớp cả tên lẫn mã dự án ("Tìm theo tên hoặc mã dự án..."). So khớp
 * không phân biệt hoa thường và bỏ dấu cách thừa hai đầu.
 */
export function matchesQuery(project: Project, query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return project.name.toLowerCase().includes(needle) || project.id.toLowerCase().includes(needle)
}

export function filterProjects(projects: readonly Project[], filter: Pick<ProjectListFilter, 'query' | 'status'>) {
  return projects.filter(
    (project) => matchesQuery(project, filter.query) && (!filter.status || project.status === filter.status)
  )
}

/** Không sắp xếp tại chỗ — danh sách gốc đến từ cache TanStack Query. */
export function sortProjects(projects: readonly Project[], sort: ProjectSort): Project[] {
  const copy = [...projects]
  if (sort === 'name') return copy.sort((a, b) => a.name.localeCompare(b.name))

  const direction = sort === 'oldest' ? 1 : -1
  return copy.sort((a, b) => direction * (Date.parse(a.updatedAt) - Date.parse(b.updatedAt)))
}

export function countProjects(projects: readonly Project[]): ProjectCounts {
  return {
    total: projects.length,
    input: projects.filter((p) => p.status === 'input').length,
    designing: projects.filter((p) => p.status === 'designing').length,
    review: projects.filter((p) => p.status === 'review').length,
    completed: projects.filter((p) => p.status === 'completed').length
  }
}

/**
 * Route to pick up a project where it was left off, by status (Hình 02:
 * "Tiếp tục nhập" / "Mở tiếp" / "Xem dự toán" / "Xem hồ sơ"). Exported so the
 * homepage's "Mở tiếp dự án" affordances (navbar avatar, hero, dải 5 bước,
 * CTA cuối trang — mục II.2) send people to the exact same place as the
 * project card does.
 */
export const RESUME_ROUTE_BY_STATUS: Record<ProjectStatus, (projectId: string) => string> = {
  input: designInputRoute,
  designing: designEstimateRoute,
  review: designEstimateRoute,
  completed: designDossierRoute
}

export function resumeProjectRoute(project: Pick<Project, 'id' | 'status'>): string {
  return RESUME_ROUTE_BY_STATUS[project.status](project.id)
}

/**
 * Most recently touched project that isn't finished yet — "dự án dở" the
 * homepage personalizes around (mục II.2: chấm xanh trên avatar, nút "Mở
 * tiếp dự án" ở hero/CTA cuối, bước hiện tại tự sáng ở dải 5 bước, KTS đúng
 * loại nhà lên đầu ở khối Tư vấn 1:1).
 */
export function mostRecentActiveProject(projects: readonly Project[]): Project | undefined {
  return sortProjects(
    projects.filter((project) => project.status !== 'completed'),
    'recent'
  )[0]
}

export function pageCount(itemCount: number, pageSize = PROJECTS_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(itemCount / pageSize))
}

/** `page` đếm từ 1 và được kẹp vào khoảng hợp lệ để không trả về trang rỗng. */
export function paginate<T>(items: readonly T[], page: number, pageSize = PROJECTS_PAGE_SIZE): T[] {
  const safePage = Math.min(Math.max(1, page), pageCount(items.length, pageSize))
  const start = (safePage - 1) * pageSize
  return items.slice(start, start + pageSize)
}

/** Lọc → sắp xếp → cắt trang, dùng chung một lần cho toàn khối danh sách. */
export function selectProjects(projects: readonly Project[], filter: ProjectListFilter, page: number) {
  const matched = sortProjects(filterProjects(projects, filter), filter.sort)
  return {
    /** Số dự án khớp bộ lọc — dòng đếm "Hiển thị N dự án". */
    matchedCount: matched.length,
    pageCount: pageCount(matched.length),
    items: paginate(matched, page)
  }
}
