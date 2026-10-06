import type { HandbookFilter, HandbookTemplateKind, LibraryMatchCriteria } from '../types/handbook.types'

export const handbookKeys = {
  all: ['handbook'] as const,

  templates: () => [...handbookKeys.all, 'templates'] as const,
  templateList: (filter: HandbookFilter) => [...handbookKeys.templates(), filter] as const,
  matched: (criteria: LibraryMatchCriteria, kind: HandbookTemplateKind) =>
    [...handbookKeys.templates(), 'matched', kind, criteria] as const,
  templateDetail: (id: string) => [...handbookKeys.templates(), 'detail', id] as const,

  articles: () => [...handbookKeys.all, 'articles'] as const,
  articleList: (topic: string) => [...handbookKeys.articles(), topic] as const,
  articleDetail: (slug: string) => [...handbookKeys.articles(), 'detail', slug] as const,

  libraryFilters: (kind: string, buildingTypeId?: string) =>
    [...handbookKeys.all, 'library-filters', kind, buildingTypeId] as const,
  templateIdsByStyle: (params: object) => [...handbookKeys.all, 'template-ids-by-style', params] as const,
  templateStyles: (options: object | null | undefined) => [...handbookKeys.all, 'template-styles', options] as const,
  newsCategoryTree: () => [...handbookKeys.all, 'news-category-tree'] as const,

  stages: () => [...handbookKeys.all, 'stages'] as const,
  quota: () => [...handbookKeys.all, 'quota'] as const
} as const
