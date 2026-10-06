import { LIBRARY_PHOTO_PREFIX } from '@/shared/lib/imagery'
import {
  PERSONALIZED_TEMPLATE_COUNT,
  RELATED_ARTICLE_COUNT,
  SIMILAR_TEMPLATE_COUNT,
  TAG_RELAXATION_ORDER
} from '../constants/handbook.constants'
import type {
  HandbookArticle,
  HandbookArticleWithCategories,
  HandbookFilter,
  HandbookSectionGroup,
  HandbookTags,
  HandbookTemplate,
  HandbookTemplateDetail,
  HandbookTemplateKind
} from '../types/handbook.types'

/**
 * Các nhóm nội dung (section) của mẫu đến từ API. Mẫu mock (và `HandbookTemplate` nói chung) không
 * có trường này nên trả mảng rỗng — kiểu gốc ở `shared/cms` không được sửa từ feature này.
 */
export function templateSections(template: HandbookTemplate): HandbookSectionGroup[] {
  return (template as HandbookTemplateDetail).sections ?? []
}

/** Id các danh mục BMT gắn trực tiếp vào bài; bài mock không có → mảng rỗng. */
export function articleCategoryIds(article: HandbookArticle): readonly string[] {
  return (article as HandbookArticleWithCategories).categoryIds ?? []
}

/** A template matches when every tag the filter specifies is equal on the template. */
export function matchesTags(tags: HandbookTags, filter: HandbookFilter): boolean {
  return (Object.keys(filter) as (keyof HandbookTags)[]).every((key) => {
    const wanted = filter[key]
    if (wanted === undefined || wanted === null) return true
    return tags[key] === wanted
  })
}

/**
 * Chọn mẫu cho panel cẩm nang cá nhân hóa (Phần 1.1 + mục VI).
 *
 * Lọc theo tag khớp các trường Bước 1 rồi lấy ngẫu nhiên đủ số mẫu. Nếu không
 * đủ mẫu khớp hết tag thì nới lỏng dần tiêu chí theo {@link TAG_RELAXATION_ORDER}
 * — panel không bao giờ được hiện ít hơn {@link PERSONALIZED_TEMPLATE_COUNT}.
 *
 * Mỗi vòng nới lỏng chỉ BÙ THÊM cho đủ số chứ không chọn lại từ đầu: mẫu khớp
 * chặt nhất luôn được giữ và đứng trước. Bản cũ thay nguyên danh sách ở mỗi
 * vòng nên khi kho mẫu mỏng, đúng những mẫu khớp phong cách lại bị loại hết và
 * panel hiện toàn mẫu lệch phong cách.
 *
 * Ảnh khách gửi đứng TRƯỚC độ khớp tag: nếu kho có đủ mẫu mang file thật (bản
 * vẽ / phối cảnh trong `public/images/library`) thì panel chỉ chọn trong nhóm
 * đó, tag Bước 1 chỉ còn quyết định thứ tự bên trong nhóm. Mẫu dùng ảnh stock
 * cũng bị loại như mẫu dựng SVG — vẫn xem được ở trang Thư viện, chỉ không lọt
 * vào panel. Panel màn chờ là chỗ khách nhìn lâu nhất
 * nên một tấm hình dựng SVG lọt vào đây là thấy ngay. Lý do phải xếp trên tag:
 * `buildingType` không bao giờ được nới lỏng, nên một dự án Villa (chưa mẫu nào
 * gắn tag đó) rơi thẳng xuống nhánh bù cuối hàm và bốc ngẫu nhiên cả kho.
 * Kho chưa đủ ảnh thật thì quay lại chọn trên toàn bộ kho như trước.
 *
 * `pick` is injected so the caller controls randomness (and tests stay
 * deterministic); it receives the eligible pool and returns the chosen slice.
 */
export function selectPersonalizedTemplates(
  pool: readonly HandbookTemplate[],
  filter: HandbookFilter,
  pick: (candidates: readonly HandbookTemplate[], count: number) => HandbookTemplate[] = takeRandom,
  count = PERSONALIZED_TEMPLATE_COUNT
): HandbookTemplate[] {
  const withPhoto = pool.filter(hasClientPhoto)
  const source = withPhoto.length >= count ? withPhoto : pool

  const chosen: HandbookTemplate[] = []
  const taken = new Set<string>()
  let active: HandbookFilter = { ...filter }

  const add = (candidates: readonly HandbookTemplate[]) => {
    for (const template of pick(candidates, count - chosen.length)) {
      chosen.push(template)
      taken.add(template.id)
    }
  }

  for (let relaxed = 0; relaxed <= TAG_RELAXATION_ORDER.length; relaxed++) {
    const eligible = source.filter((template) => !taken.has(template.id) && matchesTags(template.tags, active))
    add(eligible.filter(hasClientPhoto))
    if (chosen.length < count) add(eligible.filter((template) => !hasClientPhoto(template)))
    if (chosen.length >= count) return chosen

    const next = TAG_RELAXATION_ORDER[relaxed]
    if (!next) break
    const { [next]: _dropped, ...rest } = active
    active = rest
  }

  // Every criterion relaxed and the pool is still short — bù nốt bằng mẫu còn lại.
  add(source.filter((template) => !taken.has(template.id)))
  if (chosen.length < count) add(pool.filter((template) => !taken.has(template.id)))
  return chosen
}

/**
 * Mẫu đang dùng ẢNH KHÁCH GỬI — ảnh bìa hoặc bản vẽ của tầng đầu tiên nằm trong
 * thư mục file thật. Không đủ nếu chỉ kiểm tra "có imageUrl hay không": mẫu 3D
 * nào cũng có ảnh, phần lớn là ảnh stock.
 */
function hasClientPhoto(template: HandbookTemplate): boolean {
  const src = template.imageUrl ?? template.floors[0]?.imageUrl
  return Boolean(src?.startsWith(LIBRARY_PHOTO_PREFIX))
}

/** Fisher–Yates over a copy, then take the first `count`. */
function takeRandom<T>(items: readonly T[], count: number): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const a = copy[i]
    const b = copy[j]
    if (a !== undefined && b !== undefined) {
      copy[i] = b
      copy[j] = a
    }
  }
  return copy.slice(0, count)
}

export interface LibraryFilter {
  kind: HandbookTemplateKind
  /** Bộ lọc thứ nhất — loại công trình. `undefined` là "tất cả". */
  buildingType?: string
  /**
   * Bộ lọc thứ hai. Thư viện 2D lọc theo QUY MÔ (số tầng), thư viện 3D đổi sang
   * PHONG CÁCH kiến trúc / nội thất (Phần 2.2).
   */
  secondary?: string
  floorCount?: string
  hasAttic?: boolean
  architectureStyleIds?: readonly string[]
  interiorStyleIds?: readonly string[]
  /** Từ khóa tìm theo tên và thông số hiển thị trên thẻ. */
  query?: string
  /**
   * Chỉ giữ mẫu có id trong tập này — dùng khi BE đã lọc hộ (vd theo phong cách, thứ mà danh
   * sách mẫu của API không kèm). Không truyền = không giới hạn.
   */
  allowedIds?: ReadonlySet<string>
}

/** API dùng tổng số tầng; seed mock cũ dùng ground/ground+N. */
export function floorCountOf(tag: string | undefined): number | undefined {
  if (!tag) return undefined
  const value = tag === 'ground' ? 1 : tag.startsWith('ground+') ? Number(tag.slice(7)) + 1 : Number(tag)
  return Number.isInteger(value) && value > 0 ? value : undefined
}

/**
 * Lọc lưới thư viện mẫu (Phần 2.1 / 2.2).
 *
 * Ô tìm kiếm quét cả tên lẫn dòng thông số vì Hình 5 gợi ý "Tìm mẫu theo tên,
 * kích thước…" — người dùng gõ "5×20" phải ra được mẫu.
 */
export function filterTemplates(
  pool: readonly HandbookTemplate[],
  {
    kind,
    buildingType,
    secondary,
    floorCount,
    hasAttic,
    architectureStyleIds,
    interiorStyleIds,
    query,
    allowedIds
  }: LibraryFilter
): HandbookTemplate[] {
  const term = normalizeTemplateSearch(query ?? '')

  return pool.filter((template) => {
    if (template.kind !== kind) return false
    if (allowedIds && !allowedIds.has(template.id)) return false
    if (buildingType && template.tags.buildingType !== buildingType) return false
    if (floorCount && template.tags.floorCount !== floorCount) return false
    if (hasAttic !== undefined && template.tags.hasAttic !== hasAttic) return false
    if (kind === '3d') {
      if (architectureStyleIds?.length && !architectureStyleIds.includes(template.tags.architectureStyle ?? ''))
        return false
      if (interiorStyleIds?.length && !interiorStyleIds.includes(template.tags.interiorStyle ?? '')) return false
    }
    if (secondary) {
      const matchesSecondary =
        kind === '2d'
          ? template.tags.floorCount === secondary
          : template.tags.interiorStyle === secondary || template.tags.architectureStyle === secondary
      if (!matchesSecondary) return false
    }
    if (!term) return true

    const haystack = normalizeTemplateSearch(
      [
        template.name,
        template.styleLabel,
        template.specs.floorLabel,
        template.specs.lotSize ?? '',
        template.specs.floorArea ?? ''
      ].join(' ')
    )
    return haystack.includes(term)
  })
}

/** Search dimensions naturally: `5x20`, `5 × 20` and `5×20` are equivalent. */
function normalizeTemplateSearch(value: string): string {
  return value
    .normalize('NFC')
    .toLocaleLowerCase()
    .replace(/[×✕]/g, 'x')
    .replace(/\s*x\s*/g, 'x')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Số bài của từng chủ đề — nguồn của dòng "(6 bài)" trên bảng chủ đề (Hình 10). */
export function countArticlesByTopic(articles: readonly HandbookArticle[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const article of articles) {
    if (!article.topicId) continue
    counts[article.topicId] = (counts[article.topicId] ?? 0) + 1
  }
  return counts
}

/** Bài của một chủ đề, mới nhất trước. */
export function articlesOfTopic(articles: readonly HandbookArticle[], topicId: string): HandbookArticle[] {
  return articles.filter((article) => article.topicId === topicId).sort(byNewest)
}

/** Bài đẩy lên Bản tin, xếp theo `featuredRank` (1 = bài nổi bật lớn). */
export function featuredArticles(articles: readonly HandbookArticle[]): HandbookArticle[] {
  return articles
    .filter((article) => article.featuredRank !== undefined)
    .sort((a, b) => (a.featuredRank ?? 0) - (b.featuredRank ?? 0))
}

/**
 * Mẫu tương tự ở cuối trang chi tiết (Phần 2.3).
 *
 * Ưu tiên cùng loại công trình rồi tới cùng quy mô; luôn trả đủ số thẻ bằng
 * cách bù thêm mẫu cùng `kind` nếu không đủ mẫu thật sự giống.
 */
export function selectSimilarTemplates(
  pool: readonly HandbookTemplate[],
  current: HandbookTemplate,
  count = SIMILAR_TEMPLATE_COUNT
): HandbookTemplate[] {
  const others = pool.filter((template) => template.kind === current.kind && template.id !== current.id)
  const scored = others
    .map((template) => ({
      template,
      score:
        (template.tags.buildingType === current.tags.buildingType ? 2 : 0) +
        (template.tags.floorCount === current.tags.floorCount ? 1 : 0) +
        (template.tags.interiorStyle === current.tags.interiorStyle ? 1 : 0)
    }))
    .sort((a, b) => b.score - a.score)

  return scored.slice(0, count).map((item) => item.template)
}

/**
 * Bài viết liên quan ở cuối trang bài viết (Phần 3.3).
 * Cùng chủ đề trước, hết thì lấy cùng chuyên mục.
 */
export function selectRelatedArticles(
  articles: readonly HandbookArticle[],
  current: HandbookArticle,
  count = RELATED_ARTICLE_COUNT
): HandbookArticle[] {
  const others = articles.filter((article) => article.id !== current.id)
  const sameTopic = others.filter((article) => article.topicId && article.topicId === current.topicId)
  const sameCategory = others.filter((article) => article.category === current.category && !sameTopic.includes(article))
  return [...sameTopic, ...sameCategory].slice(0, count)
}

/** Cắt trang cho lưới mẫu và danh sách bài viết. `page` đếm từ 1. */
export function pageSlice<T>(items: readonly T[], page: number, size: number): T[] {
  const start = (page - 1) * size
  return items.slice(start, start + size)
}

/** Tổng số trang, tối thiểu 1 để thanh phân trang không biến mất khi rỗng. */
export function pageCount(total: number, size: number): number {
  return Math.max(1, Math.ceil(total / size))
}

function byNewest(a: HandbookArticle, b: HandbookArticle): number {
  // So theo thời điểm, không so chuỗi: bài cũ có thể chỉ lưu ngày, bài mới lưu cả giờ.
  return Date.parse(b.publishedAt) - Date.parse(a.publishedAt)
}

/** Danh sách bài mới nhất trước — dùng ở Bản tin và "Tất cả bài viết". */
export function sortByNewest(articles: readonly HandbookArticle[]): HandbookArticle[] {
  return [...articles].sort(byNewest)
}
