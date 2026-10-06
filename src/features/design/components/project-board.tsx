'use client'

import { ChevronLeft, ChevronRight, FolderPlus, SearchX } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'

import { EmptyState } from '@/shared/components/common'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { usePageEntrance } from '@/shared/hooks'
import { cn } from '@/shared/lib/utils'
import { DEFAULT_PROJECT_SORT } from '../constants/design.constants'
import { useProjects } from '../hooks/use-projects'
import { DesignLoadError } from './design-load-error'
import { countProjects, selectProjects } from '../services/project-list.service'
import type { Project, ProjectSort, ProjectStatus } from '../types/design.types'
import { ProjectCard } from './project-card'
import { ProjectFilters } from './project-filters'
import { DeleteProjectDialog, RenameProjectDialog } from './project-menu-dialogs'
import { ProjectStatCards } from './project-stat-cards'

/** Phân trang góc phải dưới khối. Dựng bằng Button thay vì primitive
 *  `Pagination` (primitive đó là link-based và hardcode chữ tiếng Anh). */
function ProjectPagination({
  page,
  pageCount,
  onChange
}: {
  page: number
  pageCount: number
  onChange: (page: number) => void
}) {
  const t = useTranslations('design.projects.pagination')
  if (pageCount <= 1) return null

  const pages = Array.from({ length: pageCount }, (_, index) => index + 1)

  return (
    <nav aria-label={t('label')} className='flex items-center gap-1'>
      <Button
        variant='ghost'
        size='icon'
        className='text-muted-foreground size-8'
        aria-label={t('previous')}
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft className='size-4' />
      </Button>

      {pages.map((value) => (
        <Button
          key={value}
          variant={value === page ? 'outline' : 'ghost'}
          size='icon'
          className={cn('size-8 text-[13px]', value === page && 'border-primary/50 text-primary font-semibold')}
          aria-label={t('page', { page: value })}
          aria-current={value === page ? 'page' : undefined}
          onClick={() => onChange(value)}
        >
          {value}
        </Button>
      ))}

      <Button
        variant='ghost'
        size='icon'
        className='text-muted-foreground size-8'
        aria-label={t('next')}
        disabled={page === pageCount}
        onClick={() => onChange(page + 1)}
      >
        <ChevronRight className='size-4' />
      </Button>
    </nav>
  )
}

/**
 * Trang "Thiết kế & Dự toán — Dự án của tôi" (mục IV.1, Hình 02).
 *
 * 4 thẻ đếm nhanh ở trên; khối "DỰ ÁN CỦA TÔI" bên dưới là một tấm thẻ trắng
 * gồm hàng công cụ, lưới thẻ 3 cột kèm ô "Tạo dự án mới", và hàng đáy có dòng
 * đếm bên trái với phân trang bên phải. Lọc / sắp xếp / phân trang chạy hoàn
 * toàn ở client — logic thuần nằm ở `project-list.service`.
 */
export function ProjectBoard() {
  const t = useTranslations('design.projects')
  const { data: projects, isPending, isError, refetch } = useProjects()

  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<ProjectStatus | null>(null)
  const [sort, setSort] = useState<ProjectSort>(DEFAULT_PROJECT_SORT)
  const [page, setPage] = useState(1)

  // Đổi bộ lọc mà vẫn đứng ở trang 4 thì lưới trống trơn — luôn về trang đầu.
  function resetTo<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value)
      setPage(1)
    }
  }

  const [renaming, setRenaming] = useState<Project | null>(null)
  const [deleting, setDeleting] = useState<Project | null>(null)

  // `?? []` tạo mảng mới mỗi lần render nên phải ghim lại, nếu không hai
  // `useMemo` bên dưới tính lại ở mọi lần render.
  const list = useMemo(() => projects ?? [], [projects])
  const counts = useMemo(() => countProjects(list), [list])
  const { rootRef, entranceState, entranceStyle } = usePageEntrance('design.m01.board', {
    enabled: !isPending && list.length > 0
  })
  const { items, matchedCount, pageCount } = useMemo(
    () => selectProjects(list, { query, status, sort }, page),
    [list, query, status, sort, page]
  )

  if (isPending) {
    return (
      <div className='space-y-6'>
        <div className='grid grid-cols-2 gap-4 lg:grid-cols-4'>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className='h-[68px] rounded-xl' />
          ))}
        </div>
        <Skeleton className='h-[520px] rounded-2xl' />
      </div>
    )
  }

  if (isError) return <DesignLoadError onRetry={() => void refetch()} />

  // Chưa có dự án nào: bỏ hẳn thẻ đếm và bộ lọc. Không kèm nút — nút "Tạo dự án
  // mới" duy nhất của trang nằm giữa đầu trang (góp ý BuildX).
  if (list.length === 0) {
    return <EmptyState icon={FolderPlus} title={t('empty.title')} description={t('empty.description')} />
  }

  return (
    <div ref={rootRef} data-page-entrance={entranceState} style={entranceStyle} className='space-y-6'>
      <ProjectStatCards counts={counts} activeStatus={status} onSelect={resetTo(setStatus)} />

      <section data-entrance-step='3' className='bg-card space-y-4 rounded-2xl border p-4 lg:p-5'>
        <h2 className='text-muted-foreground text-xs font-semibold tracking-[0.1em] uppercase'>{t('title')}</h2>

        <ProjectFilters
          query={query}
          onQueryChange={resetTo(setQuery)}
          status={status}
          onStatusChange={resetTo(setStatus)}
          sort={sort}
          onSortChange={resetTo(setSort)}
        />

        <AnimatePresence mode='popLayout' initial={false}>
          {matchedCount === 0 ? (
            <motion.div key='empty' initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <EmptyState icon={SearchX} title={t('noMatch.title')} description={t('noMatch.description')} />
            </motion.div>
          ) : (
            <motion.div key='grid' initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <>
                <ul className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3'>
                  <AnimatePresence initial={false} mode='popLayout'>
                    {items.map((project, index) => (
                      <motion.li
                        layout='position'
                        key={project.id}
                        data-entrance-step='4'
                        data-entrance-order={index}
                        initial={{ opacity: 0, scale: 0.94, y: 12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.3, delay: index * 0.045, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <ProjectCard project={project} onRename={setRenaming} onDelete={setDeleting} />
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>

                <div className='flex flex-wrap items-center justify-between gap-3 pt-1'>
                  <p className='text-muted-foreground text-[13px]'>{t('count', { count: matchedCount })}</p>
                  <ProjectPagination page={page} pageCount={pageCount} onChange={setPage} />
                </div>
              </>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <RenameProjectDialog project={renaming} onClose={() => setRenaming(null)} />
      <DeleteProjectDialog project={deleting} onClose={() => setDeleting(null)} />
    </div>
  )
}
