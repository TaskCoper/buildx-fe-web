/**
 * Logic THUẦN cho nội dung biên tập của trang Cẩm nang — ba bước, khối Bản tin và khối chữ cố định
 * (TDD-HB-001, TDD-HB-002, TDD-HB-003). Không gọi mạng, không import alias, nên kiểm được bằng
 * `scripts/handbook-cms.test.mjs`.
 */
import { descendantIds, type NewsCategoryNode } from './handbook.news.logic'

/* ===========================================================================
 * Ba bước
 * ======================================================================== */

/** Mã kỹ thuật ổn định của ba bước (BR-HB-001 khoản 1); giao diện đối chiếu theo mã, không theo tiêu đề. */
export const HANDBOOK_STAGE_CODES = ['structure', 'finishing', 'interior'] as const
export type HandbookStageCode = (typeof HANDBOOK_STAGE_CODES)[number]

export interface BmtStageTopic {
  id?: string | null
  name?: string | null
  iconKey?: string | null
  sortOrder?: number | null
}

export interface BmtStage {
  id?: string | null
  code?: string | null
  stepNumber?: number | null
  title?: string | null
  description?: string | null
  coverImageUrl?: string | null
  topics?: BmtStageTopic[] | null
}

export interface StageTopicView {
  id: string
  stage: HandbookStageCode
  title: string
  icon?: string
}

export interface StageView {
  /** Mã của bước (`structure`, `finishing`, `interior`) — là khóa mà phần còn lại của giao diện dùng. */
  id: HandbookStageCode
  /** Định danh thật ở backend, dùng khi gọi API quản trị. */
  remoteId: string
  order: number
  title: string
  description: string
  imageUrl: string
  topics: StageTopicView[]
}

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

export function isStageCode(value: unknown): value is HandbookStageCode {
  return typeof value === 'string' && (HANDBOOK_STAGE_CODES as readonly string[]).includes(value)
}

/** `null` khi mã bước lạ hoặc thiếu định danh — một bước như vậy không dựng được thẻ. */
export function normalizeStage(raw: BmtStage | null | undefined): StageView | null {
  const code = text(raw?.code)
  const remoteId = text(raw?.id)
  if (!isStageCode(code) || !remoteId) return null

  const topics = (raw?.topics ?? [])
    .map((topic): (StageTopicView & { sortOrder: number }) | null => {
      const id = text(topic.id)
      const title = text(topic.name)
      if (!id || !title) return null
      const icon = text(topic.iconKey)
      return {
        id,
        stage: code,
        title,
        ...(icon ? { icon } : {}),
        sortOrder: typeof topic.sortOrder === 'number' && Number.isFinite(topic.sortOrder) ? topic.sortOrder : 0
      }
    })
    .filter((topic): topic is StageTopicView & { sortOrder: number } => topic !== null)
    // Backend đã sắp `sortOrder` rồi `id`; sắp lại cùng khóa để thứ tự ổn định kể cả khi dữ liệu đổi thứ tự.
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
    .map(({ sortOrder: _sortOrder, ...topic }) => topic)

  return {
    id: code,
    remoteId,
    order: typeof raw?.stepNumber === 'number' ? raw.stepNumber : 0,
    title: text(raw?.title),
    description: text(raw?.description),
    imageUrl: text(raw?.coverImageUrl),
    topics
  }
}

/** Ba bước theo thứ tự `stepNumber`; bước lạ bị bỏ. */
export function normalizeStages(raw: readonly BmtStage[] | null | undefined): StageView[] {
  return (raw ?? [])
    .map(normalizeStage)
    .filter((stage): stage is StageView => stage !== null)
    .sort((a, b) => a.order - b.order)
}

/* ===========================================================================
 * Bài thuộc chủ đề nào
 * ======================================================================== */

interface ArticleLike {
  categoryIds?: readonly string[] | null
  topicId?: string
  topicIds?: string[]
}

/**
 * Gắn `topicIds` cho từng bài: mọi chủ đề mà nhánh của nó chứa ít nhất một danh mục của bài (BR-HB-001 khoản 7).
 * Bài gắn danh mục của nhiều chủ đề thì thuộc nhiều chủ đề; bài không gắn danh mục nào có `topicIds` rỗng.
 *
 * Bài không có `categoryIds` (bài mock) giữ nguyên, để chế độ mock vẫn dùng `topicId` cũ.
 */
export function withTopicIds<T extends ArticleLike>(
  articles: readonly T[],
  stages: readonly { topics: readonly { id: string }[] }[],
  nodes: readonly NewsCategoryNode[]
): T[] {
  const topicScopes = stages.flatMap((stage) =>
    stage.topics.map((topic) => ({ id: topic.id, scope: descendantIds(nodes, topic.id) }))
  )

  return articles.map((article) => {
    if (!article.categoryIds) return article
    const categoryIds = article.categoryIds
    const topicIds = topicScopes.filter(({ scope }) => categoryIds.some((id) => scope.has(id))).map(({ id }) => id)
    return { ...article, topicIds }
  })
}

/* ===========================================================================
 * Đường dẫn bài viết
 * ======================================================================== */

/**
 * Đường dẫn dùng để dựng link bài viết: đường dẫn hiện tại, hoặc định danh với bài cũ chưa được gán đường dẫn
 * (BR-NEWS-004 Except). Route `/handbook/bai-viet/[slug]` nhận cả hai.
 */
export function articleSlugOf(slug: string | null | undefined, id: string): string {
  return text(slug) || id
}

/* ===========================================================================
 * Khối chữ cố định
 * ======================================================================== */

export interface BmtPageSection {
  sectionKey?: string | null
  schemaVersion?: number | null
  content?: Record<string, unknown> | null
}

export type PageSections = ReadonlyMap<string, Record<string, unknown>>

/** Khối đã biên tập theo `sectionKey`. Khối thiếu mã hoặc nội dung không phải đối tượng bị bỏ. */
export function indexPageSections(raw: readonly BmtPageSection[] | null | undefined): PageSections {
  const map = new Map<string, Record<string, unknown>>()
  for (const section of raw ?? []) {
    const key = text(section.sectionKey)
    const content = section.content
    if (!key || !content || typeof content !== 'object' || Array.isArray(content)) continue
    map.set(key, content)
  }
  return map
}

/**
 * Chữ của một trường trong một khối, hoặc `undefined` khi khối chưa được biên tập hay trường để trống — lúc đó giao
 * diện dùng bản dịch sẵn có (BR-HB-003 khoản 6). Không bao giờ trả chuỗi rỗng để không xóa mất chữ dự phòng.
 */
export function sectionText(
  sections: PageSections | null | undefined,
  sectionKey: string,
  field: string
): string | undefined {
  const value = sections?.get(sectionKey)?.[field]
  const trimmed = text(value)
  return trimmed || undefined
}
