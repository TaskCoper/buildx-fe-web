'use client'

import { useDesignStore } from '@/features/design'
import { ArticleDetail } from '@/features/handbook'

/**
 * Lớp app nối trang bài viết với modal "Tạo dự án".
 *
 * Khối mời tạo dự án ở cuối cột phải thuộc `features/handbook`, còn modal thuộc
 * `features/design` — hai feature không import lẫn nhau nên chỗ nối nằm ở đây.
 */
export function ArticleView({ slug }: { slug: string }) {
  const openCreateDialog = useDesignStore((s) => s.openCreateDialog)

  return <ArticleDetail slug={slug} onCreateProject={openCreateDialog} />
}
