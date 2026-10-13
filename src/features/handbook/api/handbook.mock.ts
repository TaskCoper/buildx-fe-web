import { cmsDb } from '@/shared/cms'
import { mockDelay } from '@/shared/lib/mock'
import type {
  HandbookArticle,
  HandbookNewsletter,
  HandbookQuota,
  HandbookStage,
  HandbookTemplate,
  HandbookTemplateKind,
  LibraryMatchCriteria
} from '../types/handbook.types'
import { featuredArticles, sortByNewest } from '../services/handbook.service'
import type { ArticleListQuery } from './handbook.bmt'
import type { PageSections } from './handbook.cms.logic'
import type { LibraryFilterQuery, TemplateStyleQuery } from './handbook.library'
import type { LibraryFilterOptions } from './handbook.library.logic'
import type { ListNewsCategoriesParams } from './handbook.news'
import type { NewsCategoryNode, NewsCategoryPage } from './handbook.news.logic'

/**
 * Mock của Cẩm nang. Nội dung (mẫu 2D/3D, bài viết, giai đoạn) đọc thẳng từ kho
 * `shared/cms` nên admin sửa trong trang quản trị là trang Cẩm nang đổi theo —
 * đúng mô hình "dữ liệu tĩnh do admin biên soạn" ở mục VI.
 */

/**
 * Hạn mức tra cứu — backend thật đếm theo tài khoản và reset mỗi ngày.
 *
 * Tổng số lượt lấy từ kho nội dung (`quotas`) để vận hành đổi được; phần "còn
 * lại" ở mock giả định người dùng chưa tra lượt nào hôm nay.
 */
function currentQuota(): HandbookQuota {
  const { handbookLookupPerDay, handbookDetailPerDay } = cmsDb.getDocument('quotas')
  return {
    lookupRemaining: handbookLookupPerDay,
    lookupTotal: handbookLookupPerDay,
    detailRemaining: handbookDetailPerDay,
    detailTotal: handbookDetailPerDay
  }
}

/** Thiếu trạng thái = dữ liệu cũ, coi như đang phát hành. */
const isPublished = (item: { status?: 'active' | 'inactive' }) => item.status !== 'inactive'

export const mockHandbookApi = {
  /** Chỉ mẫu Active hiện ở thư viện (2DTemplateManagement §5). */
  listTemplates: async (): Promise<HandbookTemplate[]> => {
    await mockDelay()
    return cmsDb.list('handbookTemplates').filter(isPublished)
  },

  /** Không có "mẫu khớp dự toán" ở chế độ mock: dự toán mock không có danh mục thật để đối chiếu. */
  matchTemplates: async (
    ..._args: [criteria: LibraryMatchCriteria, kind: HandbookTemplateKind, pageSize?: number]
  ): Promise<{ items: HandbookTemplate[]; totalCount: number }> => ({ items: [], totalCount: 0 }),

  /** Mock không có danh mục thật nên không có mẫu cùng loại công trình để đối chiếu. */
  listSameBuildingType: async (
    ..._args: [kind: HandbookTemplateKind, buildingTypeId: string, pageSize?: number]
  ): Promise<{ items: HandbookTemplate[]; totalCount: number }> => ({ items: [], totalCount: 0 }),

  getTemplate: async (id: string): Promise<HandbookTemplate | null> => {
    await mockDelay()
    const template = cmsDb.find('handbookTemplates', id)
    return template && isPublished(template) ? template : null
  },

  /** Chỉ bài Active hiện phía khách hàng (BR-134, BR-135). */
  listArticles: async (topic?: string, _query?: ArticleListQuery): Promise<HandbookArticle[]> => {
    await mockDelay()
    const articles = cmsDb.list('handbookArticles').filter(isPublished)
    if (!topic) return articles
    return articles.filter((article) => article.panelTopic === topic)
  },

  /** Bản tin mock: bài có `featuredRank` làm nổi bật, các bài còn lại mới nhất trước làm bài liên quan. */
  getNewsletter: async (): Promise<HandbookNewsletter> => {
    await mockDelay()
    const articles = cmsDb.list('handbookArticles').filter(isPublished)
    const featured = featuredArticles(articles)
    return { featured, related: sortByNewest(articles).filter((article) => !featured.includes(article)) }
  },

  /** Mock không có khối chữ biên tập: mọi khối dùng bản dịch trong giao diện. */
  listPageSections: async (_locale: string): Promise<PageSections> => new Map(),

  getArticle: async (slug: string): Promise<HandbookArticle | null> => {
    await mockDelay()
    return cmsDb.list('handbookArticles').find((article) => article.slug === slug && isPublished(article)) ?? null
  },

  listStages: async (): Promise<HandbookStage[]> => {
    await mockDelay()
    return cmsDb.list('handbookStages')
  },

  getQuota: async (): Promise<HandbookQuota> => {
    await mockDelay()
    return currentQuota()
  },

  /**
   * Mock không có bộ lọc/danh mục từ API: trả "không có dữ liệu" để giao diện dùng tuỳ chọn
   * tự suy ra từ chính dữ liệu đang hiển thị (đúng như trước khi nối API).
   */
  getLibraryFilters: async (_query?: LibraryFilterQuery): Promise<LibraryFilterOptions | null> => null,
  listTemplateIdsByStyle: async (_query: TemplateStyleQuery): Promise<string[] | null> => null,
  listNewsCategories: async (_params?: ListNewsCategoriesParams): Promise<NewsCategoryPage> => ({
    items: [],
    hasNextPage: false
  }),
  getNewsCategory: async (_id: string): Promise<NewsCategoryNode | null> => null,
  listNewsCategoryTree: async (): Promise<NewsCategoryNode[]> => []
}
