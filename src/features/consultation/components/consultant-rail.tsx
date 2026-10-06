'use client'

import { useEffect, useMemo, useOptimistic, useRef, useTransition } from 'react'
import { Search } from 'lucide-react'
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'motion/react'
import { useTranslations } from 'next-intl'

import { Link } from '@/i18n/navigation'
import { Photo } from '@/shared/components/common'
import { Input } from '@/shared/components/ui/input'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { consultantRoute } from '@/shared/constants/routes'
import { useDebouncedValue } from '@/shared/hooks'
import { cn } from '@/shared/lib/utils'
import { filterConsultants, sortConsultants } from '../services/consultation.service'
import type { Consultant } from '../types/consultation.types'
import { HighlightedText } from './consultant-card'
import { useConsultTransitionState } from './consult-transition-state'

interface ConsultantRailProps {
  consultants: readonly Consultant[]
  activeId: string
  isPending?: boolean
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
export function ConsultantRail({ consultants, activeId, isPending }: ConsultantRailProps) {
  const t = useTranslations('consult.rail')
  const reduceMotion = useReducedMotion()

  const { directoryTerm: term, setDirectoryTerm: setTerm, setProfileDirection } = useConsultTransitionState()
  const [visualActiveId, setVisualActiveId] = useOptimistic(activeId)
  const [, startSelectionTransition] = useTransition()
  const query = useDebouncedValue(term, 250)

  // Thứ tự gốc (nhóm theo chuyên môn) — dùng để tính chiều trượt của hồ sơ khi đổi người.
  const baseResults = useMemo(() => sortConsultants(filterConsultants(consultants, { query })), [consultants, query])
  // KTS đang chọn được đưa LÊN ĐẦU danh sách: trên mobile danh sách dài, chọn người ở cuối mà
  // vẫn phải cuộn xuống mới thấy mình đang chọn ai. Dùng `visualActiveId` (optimistic) nên hàng
  // nhảy lên ngay lúc bấm; mỗi hàng có `layout` nên tự trượt chứ không nhảy cóc.
  const results = useMemo(() => {
    const active = baseResults.find((item) => item.id === visualActiveId)
    return active ? [active, ...baseResults.filter((item) => item.id !== visualActiveId)] : baseResults
  }, [baseResults, visualActiveId])

  const activeRef = useRef<HTMLLIElement>(null)
  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' })
  }, [reduceMotion, visualActiveId])

  return (
    <aside className='bg-card space-y-3 rounded-xl border p-3'>
      <div className='relative'>
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
          <ul className='max-h-[32rem] space-y-1 overflow-y-auto scroll-py-1 pr-1'>
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
                        'group relative isolate flex items-center gap-3 rounded-lg border border-transparent p-2 transition-colors',
                        !active && 'hover:bg-muted/60'
                      )}
                    >
                      {active ? (
                        <motion.span
                          layoutId='consultant-rail-active'
                          transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 40 }}
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
          </ul>
        </LayoutGroup>
      )}
    </aside>
  )
}
