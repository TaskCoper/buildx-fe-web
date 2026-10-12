'use client'

import { useState } from 'react'
import { LoaderCircle, Search, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useTranslations } from 'next-intl'

import { EmptyState } from '@/shared/components/common'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { useDebouncedValue } from '@/shared/hooks'
import { cn } from '@/shared/lib/utils'
import { CONSULTANT_DIRECTORY_PAGE_SIZE } from '../constants/consultation.constants'
import { useConsultantDirectory, useConsultantSpecialties } from '../hooks/use-consultation'
import { ConsultantCard } from './consultant-card'
import { SpecialtyFilter } from './specialty-filter'
import { useConsultTransitionState } from './consult-transition-state'

/** Giá trị "tất cả" của dropdown — Select không nhận value rỗng. */
const ALL = 'all'

/** Ngừng gõ chừng này mới gửi từ khóa lên backend. */
const SEARCH_DEBOUNCE_MS = 300

/**
 * Trang danh sách kiến trúc sư (mục VIII.1, Hình 14).
 *
 * Tiêu đề canh giữa, hàng công cụ tìm + lọc chuyên môn + dòng đếm, rồi lưới 3
 * cột. Danh sách phân trang ở BACKEND (6 thẻ mỗi trang, mới tạo trước): tìm theo
 * tên/chuyên môn và lọc chuyên môn cũng do backend làm, nút "Xem thêm" tải trang
 * kế tiếp. Dòng đếm là số kiến trúc sư khớp bộ lọc, không phải số thẻ đã tải.
 *
 * ★ Tiêu đề + mô tả trượt lên mờ vào CHỈ MỘT LẦN lúc vào trang (`initial`+
 * `animate` chạy đúng 1 lần khi mount, tìm/lọc chỉ đổi state cục bộ nên không
 * remount lại tiêu đề). Ô tìm hiện ký tự ngay nhưng chỉ gửi backend sau khi
 * ngừng gõ SEARCH_DEBOUNCE_MS; trong lúc chờ kết quả mới, danh sách cũ mờ đi chứ
 * không trống. Thẻ không còn trong kết quả co nhỏ + mờ dần rồi biến mất, thẻ còn
 * lại tự trượt lấp chỗ trống (`layout` của motion trên từng thẻ); thẻ của trang
 * tải thêm vào với hiệu ứng "làn sóng" tính từ thẻ đầu của trang đó.
 */
export function ConsultantDirectory() {
  const t = useTranslations('consult.directory')

  const { directoryTerm: term, setDirectoryTerm: setTerm, specialtyId, setSpecialtyId } = useConsultTransitionState()
  const [searchFocused, setSearchFocused] = useState(false)

  const keyword = useDebouncedValue(term.trim(), SEARCH_DEBOUNCE_MS)
  const {
    data,
    isPending,
    isError,
    isPlaceholderData,
    isFetchingNextPage,
    isFetchNextPageError,
    hasNextPage,
    fetchNextPage,
    refetch
  } = useConsultantDirectory({ keyword, specialtyId: specialtyId === ALL ? '' : specialtyId })
  const { data: specialties } = useConsultantSpecialties()

  const results = data?.consultants ?? []
  const total = data?.totalCount ?? 0

  return (
    <div className='mx-auto w-full max-w-[90rem] space-y-5 lg:space-y-6 px-4 py-5 lg:py-10 lg:px-8'>
      {/*
        AnimatePresence riêng để CHẮN không cho `initial={false}` của
        <ConsultTransition> (chuyển cảnh route bọc ngoài) lan xuống context và
        tắt luôn hiệu ứng vào trang của tiêu đề — không có ranh giới Presence
        riêng thì SSR render thẳng ra trạng thái `animate` (bỏ qua `initial`).
      */}
      <AnimatePresence>
        <motion.header
          initial={{ opacity: 0, y: -16, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.5 }}
          className='space-y-2 text-center'
        >
          <h1 className='text-2xl font-semibold tracking-tight text-balance sm:text-3xl'>{t('title')}</h1>
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className='text-muted-foreground'
          >
            {t('subtitle')}
          </motion.p>
        </motion.header>
      </AnimatePresence>

      <div className='bg-card flex flex-wrap items-center gap-3 rounded-xl border p-3'>
        <div
          className={cn(
            'relative min-w-56 flex-1 rounded-md transition-shadow duration-300',
            searchFocused && 'shadow-[0_0_0_4px_var(--color-accent)]'
          )}
        >
          <Search
            className={cn(
              'pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 transition-colors',
              searchFocused ? 'text-primary' : 'text-muted-foreground'
            )}
          />
          <Input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder={t('searchPlaceholder')}
            aria-label={t('searchPlaceholder')}
            className='pr-9 pl-9'
          />
          {term ? (
            <button
              type='button'
              onClick={() => setTerm('')}
              aria-label={t('clearSearch')}
              className='text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2'
            >
              <X className='size-4' />
            </button>
          ) : null}
        </div>

        <SpecialtyFilter
          value={specialtyId}
          onValueChange={setSpecialtyId}
          options={(specialties ?? []).map((specialty) => ({ id: specialty.id, label: specialty.label }))}
          allValue={ALL}
          allLabel={t('allSpecialties')}
          ariaLabel={t('specialty')}
        />

        <p className='text-muted-foreground flex items-center gap-1 text-sm'>
          <FlippingDigits value={total} />
          {t('countLabel')}
        </p>
      </div>

      <p className='text-center text-sm font-medium'>{t('lead')}</p>

      {isPending ? (
        <div className='grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {Array.from({ length: CONSULTANT_DIRECTORY_PAGE_SIZE }, (_, i) => (
            <Skeleton key={i} className='h-52 w-full rounded-xl' />
          ))}
        </div>
      ) : isError && !data ? (
        <div role='alert' className='flex flex-col items-center gap-3 py-8 text-center'>
          <p className='text-destructive text-sm'>{t('loadError')}</p>
          <Button type='button' variant='outline' onClick={() => void refetch()}>
            {t('retry')}
          </Button>
        </div>
      ) : results.length === 0 ? (
        <EmptyState title={t('empty.title')} description={t('empty.description')} />
      ) : (
        <>
          <div
            aria-busy={isPlaceholderData}
            className={cn(
              'grid grid-cols-[minmax(0,1fr)] gap-4 transition-opacity sm:grid-cols-2 lg:grid-cols-3',
              isPlaceholderData && 'opacity-60'
            )}
          >
            <AnimatePresence>
              {results.map((consultant, index) => (
                <ConsultantCard
                  key={consultant.id}
                  consultant={consultant}
                  query={term}
                  index={index % CONSULTANT_DIRECTORY_PAGE_SIZE}
                  onSelectSpecialty={setSpecialtyId}
                />
              ))}
            </AnimatePresence>
          </div>

          {isFetchNextPageError ? (
            <p role='alert' className='text-destructive text-center text-sm'>
              {t('loadMoreError')}
            </p>
          ) : null}
          {hasNextPage || isFetchingNextPage ? (
            <div className='flex justify-center'>
              {isFetchingNextPage ? (
                <p role='status' className='text-muted-foreground flex items-center gap-2 py-2 text-sm'>
                  <LoaderCircle aria-hidden className='size-4 animate-spin motion-reduce:animate-none' />
                  {t('loadingMore')}
                </p>
              ) : (
                <Button
                  type='button'
                  variant='outline'
                  size='lg'
                  disabled={isPlaceholderData}
                  onClick={() => void fetchNextPage()}
                >
                  {isFetchNextPageError ? t('retry') : t('loadMore')}
                </Button>
              )}
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}

/**
 * Chỉ CON SỐ lật khi đổi — số cũ trượt lên + mờ đi, số mới trượt từ dưới lên;
 * chữ nhãn đứng yên bên ngoài component này (mục 7). Số không đổi thì không
 * remount nên không có gì để chạy.
 */
function FlippingDigits({ value }: { value: number }) {
  return (
    <span className='relative inline-grid h-[1.4em] overflow-hidden align-bottom tabular-nums'>
      <AnimatePresence mode='popLayout' initial={false}>
        <motion.span
          key={value}
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: '0%', opacity: 1 }}
          exit={{ y: '-100%', opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className='col-start-1 row-start-1 font-semibold'
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
