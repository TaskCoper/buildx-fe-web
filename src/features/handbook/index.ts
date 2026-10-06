/**
 * Public API of the `handbook` feature — Cẩm nang (thư viện mẫu 2D/3D + kho bài
 * viết) và bảng "Cẩm nang cá nhân hóa" dùng ở màn chờ Bước 2 / Bước 3.
 */
export { HandbookBrowser } from './components/handbook-browser'
export { TemplateLibrary } from './components/template-library'
export { TemplateDetail } from './components/template-detail'
export { ArticleList } from './components/article-list'
export { ArticleDetail } from './components/article-detail'
export { FoundationBlock } from './components/foundation-block'
export { HandbookHighlights } from './components/handbook-highlights'
export { NewsletterBlock } from './components/newsletter-block'
export { PersonalizedPanel } from './components/personalized-panel'
export { TemplateCard } from './components/template-card'
export { TemplateFigure } from './components/template-figure'
export { TemplateQuickView } from './components/template-quick-view'
export { ArticleCard } from './components/article-card'
export { ArticleDetailDialog } from './components/article-detail-dialog'
export { ConsultButton } from './components/consult-button'
export { QuotaBadge } from './components/quota-badge'
export { ReadBadge } from './components/read-badge'
export {
  useHandbookTemplates,
  useHandbookTemplate,
  useHandbookArticles,
  useHandbookArticle,
  useHandbookStages,
  useHandbookQuota,
  usePersonalizedTemplates
} from './hooks/use-handbook'
export {
  selectPersonalizedTemplates,
  selectSimilarTemplates,
  selectRelatedArticles,
  filterTemplates,
  countArticlesByTopic,
  articlesOfTopic,
  featuredArticles,
  sortByNewest,
  pageSlice,
  pageCount,
  matchesTags,
  type LibraryFilter
} from './services/handbook.service'
export { useHandbookPanelStore } from './store/handbook-panel.store'
export { useHandbookReadStore, useIsRead, HANDBOOK_READ_STORAGE_KEY } from './store/handbook-read.store'
export {
  PERSONALIZED_TEMPLATE_COUNT,
  TAG_RELAXATION_ORDER,
  LIBRARY_PAGE_SIZE,
  HOME_HANDBOOK_COUNT,
  LATEST_NEWS_COUNT,
  ARTICLE_PAGE_SIZE,
  HANDBOOK_STAGES,
  HANDBOOK_CATEGORIES
} from './constants/handbook.constants'
export type {
  HandbookArticle,
  HandbookArticleSection,
  HandbookCategory,
  HandbookFilter,
  HandbookFloor,
  HandbookPageTab,
  HandbookPanelTab,
  HandbookQuota,
  HandbookStage,
  HandbookStageId,
  HandbookTags,
  HandbookTemplate,
  HandbookTemplateKind,
  HandbookTopic
} from './types/handbook.types'
