export const guideKeys = {
  all: ['guide'] as const,
  videos: () => [...guideKeys.all, 'videos'] as const,
  /** Một video theo id (deep link `?video=`). */
  detail: (id: string) => [...guideKeys.all, 'detail', id] as const,
  articles: () => [...guideKeys.all, 'articles'] as const
} as const
