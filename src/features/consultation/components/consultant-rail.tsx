'use client'

import { useEffect, useMemo, useOptimistic, useRef, useTransition } from 'react'
import { LoaderCircle, Search } from 'lucide-react'
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'motion/react'
import { useTranslations } from 'next-intl'

import { Link } from '@/i18n/navigation'
import { Photo } from '@/shared/components/common'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { consultantRoute } from '@/shared/constants/routes'
import { useDebouncedValue } from '@/shared/hooks'
import { cn } from '@/shared/lib/utils'
import { filterConsultants } from '../services/consultation.service'
import type { Consultant } from '../types/consultation.types'
import { HighlightedText } from './consultant-card'
import { useConsultTransitionState } from './consult-transition-state'

interface ConsultantRailProps {
  consultants: readonly Consultant[]
  activeId: string
  isPending?: boolean
  /** KTS đang xem, dùng để nối vào cuối danh sách khi danh sách không chứa người này. */
  activeConsultant?: Consultant
  hasNextPage: boolean
  isLoadingMore: boolean
  isError: boolean
  errorMessage: string | null
  onLoadMore: () => void
}

/**
 * Cột trái trang hồ sơ KTS (mục VIII.2, Hình 15): ô tìm + danh sách thu gọn.
 *
 * Người đang xem có một dải nền mang `layoutId` DUY NHẤT — đổi người thì
 * Motion tự "trượt" dải đó (kèm viền trái) từ hàng cũ sang hàng mới, ảnh của
 * hàng mới phồng nhẹ một nhịp; hàng vừa chọn luôn tự cuộn vào khung nhìn (mục
 * 2). Rê một hàng KHÁC: nền xám nhạt, ảnh nhích sang phải (mục 3). Gõ tìm:
 * hàng không khớp co + mờ rồi biến mất, hàng còn lại tự trượt lấp chỗ trống
 * nhờ `layout`, chữ khớp tô nền xanh nhạt (mục 1).
 */
export function ConsultantRail({
  consultants,
  activeId,
  isPending,
  activeConsultant,
  hasNextPage,
  isLoadingMore,
  isError,
  errorMessage,
  onLoadMore
}: ConsultantRailProps) {
  const t = useTranslations('consult.rail')
  const reduceMotion = useReducedMotion()

  const { directoryTerm: term, setDirectoryTerm: setTerm, setProfileDirection } = useConsultTransitionState()
  const [visualActiveId, setVisualActiveId] = useOptimistic(activeId)
  const [, startSelectionTransition] = useTransition()
  const query = useDebouncedValue(term, 250)

  // Giữ thứ tự trang API để các hàng cũ không bị xáo khi nối thêm trang.
  const baseResults = useMemo(() => filterConsultants(consultants, { query }), [consultants, query])
  // Không xáo thứ tự khi chọn KTS. Chỉ khi KTS đang xem không có trong danh sách (vào thẳng từ
  // trang chi tiết) và không bị bộ lọc tìm kiếm loại thì mới nối vào cuối.
  const results = useMemo(() => {
    if (!activeConsultant || query.trim() || baseResults.some((item) => item.id === activeConsultant.id)) {
      return baseResults
    }
    return [...baseResults, activeConsultant]
  }, [baseResults, activeConsultant, query])

  const activeRef = useRef<HTMLLIElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const loadMoreRef = useRef<HTMLLIElement>(null)
  useEffect(() => {
    const root = listRef.current
    const target = loadMoreRef.current
    if (!root || !target || isPending || !hasNextPage || isLoadingMore || isError) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) onLoadMore()
      },
      { root, rootMargin: '0px 0px 120px 0px' }
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [hasNextPage, isLoadingMore, isError, isPending, onLoadMore])
  useEffect(() => {
    // Chỉ cuộn bên trong danh sách. `scrollIntoView` còn kéo cả trang theo, nên vừa vào hồ sơ KTS ở
    // điện thoại trang bị trượt khỏi đầu trang.
    const list = listRef.current
    const item = activeRef.current
    if (!list || !item) return
    const listRect = list.getBoundingClientRect()
    const itemRect = item.getBoundingClientRect()
    const behavior = reduceMotion ? 'auto' : 'smooth'
    if (itemRect.top < listRect.top) list.scrollBy({ top: itemRect.top - listRect.top, behavior })
    else if (itemRect.bottom > listRect.bottom) list.scrollBy({ top: itemRect.bottom - listRect.bottom, behavior })
  }, [reduceMotion, visualActiveId, isPending])

  return (
    <aside className='bg-card relative min-h-0 min-w-0 rounded-xl border'>
      <div className='flex min-h-0 flex-col gap-3 p-3 lg:absolute lg:inset-0'>
        <div className='relative shrink-0'>
          <Search className='text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2' />
          <Input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder={t('searchPlaceholder')}
            aria-label={t('searchPlaceholder')}
            className='pl-9'
          />
        </div>

        {isPending ? (
          <div className='space-y-2'>
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className='h-16 w-full rounded-lg' />
            ))}
          </div>
        ) : (
          <LayoutGroup id='consultant-rail-selection'>
            <ul
              ref={listRef}
              className='max-h-[32rem] min-h-0 space-y-1 overflow-y-auto scroll-py-1 pr-1 lg:max-h-none lg:flex-1'
            >
              <AnimatePresence initial={false}>
                {results.map((consultant) => {
                  const active = consultant.id === visualActiveId

                  return (
                    <motion.li
                      key={consultant.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.85 }}
                      transition={{ duration: reduceMotion ? 0.01 : 0.2 }}
                      ref={active ? activeRef : undefined}
                    >
                      <Link
                        href={consultantRoute(consultant.id)}
                        onClick={() => {
                          const currentIndex = baseResults.findIndex((item) => item.id === visualActiveId)
                          const nextIndex = baseResults.findIndex((item) => item.id === consultant.id)
                          setProfileDirection(nextIndex >= currentIndex ? 1 : -1)
                          startSelectionTransition(() => setVisualActiveId(consultant.id))
                        }}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'group relative isolate flex min-w-0 items-center gap-3 rounded-lg border border-transparent p-2 transition-colors',
                          !active && 'hover:bg-muted/60'
                        )}
                      >
                        {active ? (
                          <motion.span
                            layoutId='consultant-rail-active'
                            transition={
                              reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 40 }
                            }
                            className='bg-accent border-primary absolute inset-0 -z-10 rounded-lg border'
                          />
                        ) : null}

                        <motion.span
                          key={active ? 'pop' : 'idle'}
                          initial={active && !reduceMotion ? { scale: 0.82 } : false}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 420, damping: 14 }}
                          className={cn('shrink-0 transition-transform', !active && 'group-hover:translate-x-1')}
                        >
                          <Photo
                            className='size-11 rounded-full'
                            src={consultant.avatarUrl}
                            alt={consultant.name}
                            sizes='44px'
                          />
                        </motion.span>

                        <span className='min-w-0'>
                          <span className='block truncate text-sm font-medium'>
                            <HighlightedText text={consultant.name} query={query} />
                          </span>
                          <span className='text-muted-foreground block truncate text-xs'>
                            <HighlightedText
                              text={consultant.specialties.map((specialty) => specialty.label).join(' · ')}
                              query={query}
                            />
                          </span>
                        </span>
                      </Link>
                    </motion.li>
                  )
                })}
              </AnimatePresence>
              {!results.length && !isError && <li className='text-muted-foreground px-2 py-3 text-sm'>{t('empty')}</li>}
              {(hasNextPage || isError || isLoadingMore) && (
                <li ref={loadMoreRef} className='px-2 pt-2'>
                  {isError && (
                    <p role='alert' className='text-destructive mb-2 text-sm'>
                      {errorMessage ?? t('loadError')}
                    </p>
                  )}
                  {isLoadingMore ? (
                    <p
                      role='status'
                      className='text-muted-foreground flex items-center justify-center gap-2 py-3 text-sm'
                    >
                      <LoaderCircle aria-hidden className='size-4 animate-spin motion-reduce:animate-none' />
                      {t('loadingMore')}
                    </p>
                  ) : (
                    <Button type='button' variant='ghost' className='w-full' onClick={onLoadMore}>
                      {isError ? t('retry') : t('loadMore')}
                    </Button>
                  )}
                </li>
              )}
            </ul>
          </LayoutGroup>
        )}
      </div>
    </aside>
  )
}
