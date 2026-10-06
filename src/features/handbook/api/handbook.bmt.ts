import { useAuthStore } from '@/shared/auth'
import { http } from '@/shared/lib/api'
import type { PagedResult } from '@/shared/types'
import type {
  HandbookArticleWithCategories,
  HandbookFloor,
  HandbookQuota,
  HandbookTemplate,
  HandbookTemplateDetail,
  HandbookTemplateKind,
  LibraryMatchCriteria
} from '../types/handbook.types'
import {
  fetchLibraryFilters,
  fetchTemplateIdsByStyle,
  loadVersionContent,
  type LibraryFilterQuery,
  type LoadedVersionContent,
  type TemplateStyleQuery
} from './handbook.library'
import {
  coverImageOf,
  floorsFromGroups,
  normalizeStyles,
  styleLabelOf,
  type BmtStyleRef,
  type LibraryFilterOptions
} from './handbook.library.logic'
import { mockHandbookApi } from './handbook.mock'
import {
  getNewsCategory,
  listNewsCategories,
  listNewsCategoryTree,
  type ListNewsCategoriesParams
} from './handbook.news'
import type { NewsCategoryNode, NewsCategoryPage } from './handbook.news.logic'

/**
 * Nối cụm Cẩm nang vào BMT API — GIỮ MOCK LÀM NỀN.
 *
 * DB backend đang RỖNG nên mọi hàm ở đây phải TỰ VỀ MOCK khi API trả rỗng, lỗi,
 * 404 hoặc khách chưa đăng nhập: demo không bao giờ bị trống và giao diện đã
 * chốt vẫn chạy đúng với cả dữ liệu mock cũ lẫn dữ liệu API mới.
 *
 * - Bài viết (news): list + detail CÔNG KHAI, render `contentHtml`.
 * - Thư viện mẫu: list CÔNG KHAI; chi tiết CẦN ĐĂNG NHẬP (access-info → open trừ
 *   1 lượt → library-versions → SECTIONS → tệp của từng section). Mẫu API gắn cờ
 *   `source: 'bmt'` để trang chi tiết biết dựng cổng đăng nhập và đọc chi tiết từ đây
 *   (không lấy từ pool). Chi tiết theo section nằm ở `handbook.library.ts`.
 * - Danh mục tin (`/news/categories`) và bộ lọc thư viện (`/design-templates/filters`) là
 *   công khai; không có dữ liệu thì trả rỗng/`null` để giao diện dùng lựa chọn tự suy ra.
 */

/* ===========================================================================
 * DTO — News (bài viết)
 * ======================================================================== */

interface BmtArticleCategory {
  id: string
  name: string
}

interface BmtArticleSummary {
  id: string
  title: string
  readingTimeMinutes?: number | null
  coverImageUrl: string
  firstPublishedAtUtc: string
  categories: BmtArticleCategory[]
}

interface BmtArticleDetail extends BmtArticleSummary {
  contentHtml: string
}

/* ===========================================================================
 * DTO — Design templates / library access / subscription
 * ======================================================================== */

interface BmtDesignTemplateSummary {
  templateId: string
  versionId: string
  number: number
  name: string
  drawingKind: '2D' | '3D'
  widthM: string
  lengthM: string
  areaM2: string
  buildingTypeId: string
  buildingTypeName?: string | null
  floorCount?: number | null
  hasTum?: boolean | null
  thumbnailUrl?: string | null
  publishedAtUtc: string
}

/**
 * BE từ chối mở chi tiết mẫu (`access-info.canOpen = false`): chưa có gói / hết hạn (`SubscriptionInactive`) hoặc lý
 * do khác. Ném lỗi riêng để trang chi tiết dựng màn "cần gói để xem" thay vì rơi về dữ liệu mock rỗng.
 */
export class LibraryAccessDeniedError extends Error {
  constructor(readonly deniedCode: string | null) {
    super(deniedCode ?? 'LibraryAccessDenied')
    this.name = 'LibraryAccessDeniedError'
  }
}

interface BmtLibraryAccessInfo {
  templateId?: string
  currentVersionId?: string
  number?: number
  editVersion?: number
  alreadyOpened?: boolean
  requiresConfirmation?: boolean
  canOpen?: boolean
  deniedCode?: string | null
}

interface BmtLibraryOpened {
  templateId?: string
  versionId?: string
  number?: number
  editVersion?: number
  charged?: boolean
  detailUrl?: string
}

interface BmtLibraryVersionDetail {
  templateId: string
  versionId: string
  state: 'Draft' | 'Published'
  number?: number | null
  editVersion: number
  isCurrent: boolean
  name?: string | null
  description?: string | null
  drawingKind?: string | null
  widthM?: string | null
  lengthM?: string | null
  areaM2?: string | null
  buildingTypeId?: string | null
  buildingTypeName?: string | null
  floorCount?: number | null
  hasTum?: boolean | null
  publishedAtUtc?: string | null
  coverAssetId?: string | null
  coverContentUrl?: string | null
  assetCount: number
  assetsUrl: string
  /** Thêm ở đợt section (01/10/2026). */
  sectionsUrl?: string | null
  sectionCount?: number | null
  architectureStyles?: BmtStyleRef[] | null
  interiorStyles?: BmtStyleRef[] | null
}

interface BmtQuotaBalanceView {
  code: string
  label: string
  isUnlimited: boolean
  limit?: number | null
  used: number
  reserved: number
  available?: number | null
}

interface BmtDesignSubscriptionView {
  quotas?: BmtQuotaBalanceView[]
}

/* ===========================================================================
 * Helpers
 * ======================================================================== */

const isAuthenticated = () => useAuthStore.getState().isAuthenticated

/** Lọc bài ở phía BE: `categoryId` (gồm danh mục con) và từ khoá tìm theo tiêu đề. */
export interface ArticleListQuery {
  categoryId?: string
  keyword?: string
}

/** "2 tầng", "2 tầng + tum" — nhãn quy mô gộp thông tin tum (chuỗi dữ liệu, không phải chữ UI). */
function floorLabelOf(floorCount?: number | null, hasTum?: boolean | null): string {
  if (floorCount == null) return ''
  return `${floorCount} tầng${hasTum ? ' + tum' : ''}`
}

/** Số phút đọc ước tính từ độ dài nội dung (≈200 từ/phút), tối thiểu 1. */
function readingMinutesOf(html: string): number {
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!text) return 3
  return Math.max(1, Math.round(text.split(' ').length / 200))
}

function dimensionSpecs(width?: string | null, length?: string | null, area?: string | null) {
  const lotSize = width && length ? `${width} × ${length} m` : undefined
  const floorArea = area ? `${area} m²` : undefined
  return { lotSize, floorArea }
}

function toArticleSummary(dto: BmtArticleSummary): HandbookArticleWithCategories {
  return {
    id: dto.id,
    // Route `/handbook/bai-viet/[slug]` nhận id trực tiếp làm slug.
    slug: dto.id,
    title: dto.title,
    // BE đã bỏ `summary`; type UI khách bắt buộc `excerpt` nên để chuỗi rỗng.
    excerpt: '',
    imageUrl: dto.coverImageUrl,
    category: dto.categories[0]?.name ?? '',
    publishedAt: dto.firstPublishedAtUtc,
    // Ưu tiên số phút đọc do BE trả; thiếu thì mặc định 3 (danh sách không có nội dung để ước lượng).
    readingMinutes: dto.readingTimeMinutes ?? 3,
    body: [],
    tags: {},
    // Bộ lọc danh mục khớp theo id (gồm cả danh mục con), không theo tên.
    categoryIds: dto.categories.map((category) => category.id)
  }
}

function toArticleDetail(dto: BmtArticleDetail): HandbookArticleWithCategories {
  return {
    ...toArticleSummary(dto),
    // Số phút đọc lấy từ BE; thiếu thì ước lượng theo độ dài nội dung.
    readingMinutes: dto.readingTimeMinutes ?? readingMinutesOf(dto.contentHtml ?? ''),
    contentHtml: dto.contentHtml,
    body: []
  }
}

function toTemplateSummary(dto: BmtDesignTemplateSummary): HandbookTemplate {
  const kind = dto.drawingKind === '3D' ? '3d' : '2d'
  const { lotSize, floorArea } = dimensionSpecs(dto.widthM, dto.lengthM, dto.areaM2)
  const buildingTypeLabel = dto.buildingTypeName ?? ''
  return {
    id: dto.templateId,
    name: dto.name,
    kind,
    imageUrl: dto.thumbnailUrl ?? undefined,
    styleLabel: buildingTypeLabel,
    specs: {
      buildingTypeLabel,
      floorLabel: floorLabelOf(dto.floorCount, dto.hasTum),
      ...(kind === '2d' ? { lotSize, floorArea } : {})
    },
    description: [],
    floors: [],
    tags: {
      buildingType: dto.buildingTypeId || undefined,
      floorCount: dto.floorCount != null ? String(dto.floorCount) : undefined,
      hasAttic: dto.hasTum ?? undefined
    },
    buildingTypeId: dto.buildingTypeId || undefined,
    floorCount: dto.floorCount ?? undefined,
    lotWidth: Number(dto.widthM) || undefined,
    lotLength: Number(dto.lengthM) || undefined,
    area: Number(dto.areaM2) || undefined,
    versionId: dto.versionId,
    source: 'bmt'
  }
}

function toTemplateDetail(detail: BmtLibraryVersionDetail, content: LoadedVersionContent): HandbookTemplateDetail {
  const kind = detail.drawingKind === '3D' ? '3d' : '2d'
  const { lotSize, floorArea } = dimensionSpecs(detail.widthM, detail.lengthM, detail.areaM2)
  const buildingTypeLabel = detail.buildingTypeName ?? ''
  const architectureStyles = normalizeStyles(detail.architectureStyles)
  const interiorStyles = normalizeStyles(detail.interiorStyles)
  // Dải "tầng" của trình xem ảnh = mọi ảnh của các section, theo thứ tự section rồi tệp; nhãn là
  // tên section. Tệp đính kèm (PDF/DWG/DXF) không vào dải này mà nằm ở `sections`.
  const floors: HandbookFloor[] = floorsFromGroups(content.groups)
  const coverUrl = detail.coverContentUrl ?? coverImageOf(content.groups) ?? floors[0]?.imageUrl

  return {
    id: detail.templateId,
    name: detail.name ?? '',
    kind,
    imageUrl: coverUrl ?? undefined,
    // Mẫu 3D: dòng "Phong cách" là phong cách kiến trúc + nội thất (nếu BE có), rơi về loại công trình.
    styleLabel: kind === '3d' ? styleLabelOf(architectureStyles, interiorStyles, buildingTypeLabel) : buildingTypeLabel,
    specs: {
      buildingTypeLabel,
      floorLabel: floorLabelOf(detail.floorCount, detail.hasTum),
      ...(kind === '2d' ? { lotSize, floorArea } : { imageCount: floors.length })
    },
    description: (detail.description ?? '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean),
    floors,
    tags: {
      buildingType: detail.buildingTypeId ?? undefined,
      floorCount: detail.floorCount != null ? String(detail.floorCount) : undefined,
      hasAttic: detail.hasTum ?? undefined
    },
    buildingTypeId: detail.buildingTypeId ?? undefined,
    floorCount: detail.floorCount ?? undefined,
    lotWidth: Number(detail.widthM) || undefined,
    lotLength: Number(detail.lengthM) || undefined,
    area: Number(detail.areaM2) || undefined,
    versionId: detail.versionId,
    source: 'bmt',
    sections: content.groups,
    ...(architectureStyles.length ? { architectureStyles } : {}),
    ...(interiorStyles.length ? { interiorStyles } : {})
  }
}

/* ===========================================================================
 * Adapter
 * ======================================================================== */

export const bmtHandbookApi = {
  /**
   * Danh sách bài viết công khai (`GET /news/articles`). Panel tư vấn (`topic`)
   * không có API nên luôn dùng mock. API rỗng/lỗi → mock.
   */
  async listArticles(topic?: string, query?: ArticleListQuery): Promise<HandbookArticleWithCategories[]> {
    if (topic) return mockHandbookApi.listArticles(topic)
    const keyword = query?.keyword?.trim()
    const filtered = Boolean(query?.categoryId || keyword)
    try {
      // `categoryId` ở BE gồm bài gắn thẳng vào danh mục VÀ mọi danh mục con, không trùng bài;
      // id không tồn tại cho trang rỗng (không phải 404).
      const page = await http.get<PagedResult<BmtArticleSummary>>('/news/articles', {
        params: {
          pageIndex: 1,
          pageSize: 100,
          ...(query?.categoryId ? { categoryId: query.categoryId } : {}),
          ...(keyword ? { keyword } : {})
        }
      })
      // Trang rỗng là kết quả hợp lệ của một bộ lọc; chỉ khi KHÔNG lọc mà rỗng mới về mock.
      if (!page.items.length) return filtered ? [] : mockHandbookApi.listArticles(topic)
      return page.items.map(toArticleSummary)
    } catch {
      return mockHandbookApi.listArticles(topic)
    }
  },

  /** Chi tiết bài viết công khai (`GET /news/articles/{id}`). 404/lỗi → mock. */
  async getArticle(idOrSlug: string): Promise<HandbookArticleWithCategories | null> {
    try {
      return toArticleDetail(await http.get<BmtArticleDetail>(`/news/articles/${idOrSlug}`))
    } catch {
      // 404 (bài nháp/ẩn/không tồn tại) hoặc lỗi bất kỳ → về mock để demo không trống.
      return mockHandbookApi.getArticle(idOrSlug)
    }
  },

  /**
   * Mẫu khớp thông tin dự toán (`POST /design-templates/matches`, TDD-LIB-001): chỉ đọc, công khai, không tính lượt.
   * KHÔNG rơi về mock: rỗng nghĩa là chưa có mẫu khớp, lỗi để hook xử lý (lỗi thư viện không được ảnh hưởng AI).
   * 2D bỏ qua phong cách nên không gửi.
   */
  async matchTemplates(
    criteria: LibraryMatchCriteria,
    kind: HandbookTemplateKind,
    pageSize = 6
  ): Promise<{ items: HandbookTemplate[]; totalCount: number }> {
    const is3d = kind === '3d'
    const page = await http.post<PagedResult<BmtDesignTemplateSummary>>('/design-templates/matches', {
      drawingKind: is3d ? '3D' : '2D',
      catalogRevisionId: criteria.catalogRevisionId,
      buildingTypeId: criteria.buildingTypeId,
      floorCount: criteria.floorCount ?? null,
      hasTum: criteria.hasTum ?? null,
      architectureStyleId: is3d ? (criteria.architectureStyleId ?? null) : null,
      interiorStyleId: is3d ? (criteria.interiorStyleId ?? null) : null,
      pageIndex: 1,
      pageSize
    })
    return { items: page.items.map(toTemplateSummary), totalCount: page.totalCount }
  },

  /** Danh sách mẫu công khai (`GET /design-templates`). Rỗng/lỗi → danh sách rỗng (không mock). */
  async listTemplates(): Promise<HandbookTemplate[]> {
    try {
      const items: BmtDesignTemplateSummary[] = []
      for (let pageIndex = 1; pageIndex <= 20; pageIndex++) {
        const page = await http.get<PagedResult<BmtDesignTemplateSummary>>('/design-templates', {
          params: { pageIndex, pageSize: 100 }
        })
        items.push(...page.items)
        if (!page.hasNextPage) break
      }
      return items.map(toTemplateSummary)
    } catch {
      // Thư viện lấy từ BE, không dùng mock: lỗi thì hiện thư viện trống thay vì mẫu giả.
      return []
    }
  },

  /**
   * Chi tiết mẫu CẦN ĐĂNG NHẬP: access-info → (nếu chưa mở) open trừ 1 lượt →
   * library-versions → sections → tệp từng section. Chưa đăng nhập / mẫu mock / lỗi → mock (component
   * dựng cổng đăng nhập trước khi hook này được phép chạy cho mẫu API).
   */
  async getTemplate(id: string): Promise<HandbookTemplateDetail | null> {
    if (!isAuthenticated()) return mockHandbookApi.getTemplate(id)
    try {
      const access = await http.get<BmtLibraryAccessInfo>(`/design-templates/${id}/access-info`)
      const versionId = access.currentVersionId
      if (!versionId) return mockHandbookApi.getTemplate(id)

      // Mẫu đã mở trước đó thì xem lại không cần gói; chưa mở mà BE báo không mở được thì dừng ở đây.
      if (!access.alreadyOpened && access.canOpen === false) {
        throw new LibraryAccessDeniedError(access.deniedCode ?? null)
      }

      if (!access.alreadyOpened) {
        // Mở lần đầu: xác nhận dùng 1 lượt kèm editVersion đọc từ access-info.
        await http.post<BmtLibraryOpened>(`/design-templates/${id}/open`, {
          versionId,
          expectedEditVersion: access.editVersion,
          confirmUse: true
        })
      }

      const detail = await http.get<BmtLibraryVersionDetail>(`/library-versions/${versionId}`)
      const content = await loadVersionContent(versionId, detail.editVersion)
      return toTemplateDetail(detail, content)
    } catch (error) {
      if (error instanceof LibraryAccessDeniedError) throw error
      // 404 (mẫu mock/không có ở API), 409 (đổi phiên bản), lỗi bất kỳ → về mock.
      return mockHandbookApi.getTemplate(id)
    }
  },

  /**
   * Danh mục bộ lọc công khai từ hệ thống. Giữ lỗi để giao diện báo và cho thử lại.
   */
  async getLibraryFilters(query?: LibraryFilterQuery): Promise<LibraryFilterOptions | null> {
    return fetchLibraryFilters(query)
  },

  /**
   * ID mẫu khớp loại, tầng, tum và phong cách (BE lọc, phong cách dùng tham số lặp).
   * Giữ lỗi để giao diện không âm thầm bỏ điều kiện đã chọn.
   */
  async listTemplateIdsByStyle(query: TemplateStyleQuery): Promise<string[] | null> {
    return fetchTemplateIdsByStyle(query)
  },

  /** Một trang con trực tiếp của `parentId` (hoặc cấp gốc). Lỗi → trang rỗng. */
  async listNewsCategories(params?: ListNewsCategoriesParams): Promise<NewsCategoryPage> {
    try {
      return await listNewsCategories(params)
    } catch {
      return { items: [], hasNextPage: false }
    }
  },

  async getNewsCategory(id: string): Promise<NewsCategoryNode | null> {
    try {
      return await getNewsCategory(id)
    } catch {
      return null
    }
  },

  /** Toàn bộ cây danh mục tin dạng danh sách phẳng. Lỗi → rỗng (giao diện dùng nhãn mock). */
  async listNewsCategoryTree(): Promise<NewsCategoryNode[]> {
    try {
      return await listNewsCategoryTree()
    } catch {
      return []
    }
  },

  /**
   * Hạn mức xem chi tiết trong ngày. Lấy `catalog.detail` từ
   * `/me/design-subscription`; lượt TRA lưới không có API nên giữ theo mock.
   * Chưa đăng nhập / 401 / rỗng → mock (giữ counter demo).
   */
  async getQuota(): Promise<HandbookQuota> {
    const base = await mockHandbookApi.getQuota()
    if (!isAuthenticated()) return base
    try {
      const sub = await http.get<BmtDesignSubscriptionView | null>('/me/design-subscription')
      const detail = sub?.quotas?.find((quota) => quota.code === 'catalog.detail')
      // Tài khoản free (chưa có gói / gói không có quyền này) vẫn được 3 lượt xem chi tiết mỗi ngày: giữ số mock cho tới khi
      // BE có API đếm lượt free, lúc đó thay tại đây. Hết lượt thì trang chi tiết mở popup mời mua gói.
      if (!detail) return base
      if (detail.isUnlimited) return { ...base, detailMode: 'unlimited' }
      return {
        ...base,
        detailTotal: detail.limit ?? base.detailTotal,
        detailRemaining: detail.available ?? base.detailRemaining,
        detailMode: 'plan'
      }
    } catch {
      return base
    }
  }
}
