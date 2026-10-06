'use client'

import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useTranslations } from 'next-intl'

import { EmptyState } from '@/shared/components/common'
import { Input } from '@/shared/components/ui/input'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { cn } from '@/shared/lib/utils'
import { useConsultants } from '../hooks/use-consultation'
import { filterConsultants, sortConsultants, specialtyOptions } from '../services/consultation.service'
import { ConsultantCard } from './consultant-card'
import { SpecialtyFilter } from './specialty-filter'
import { useConsultTransitionState } from './consult-transition-state'

/** Giá trị "tất cả" của dropdown — Select không nhận value rỗng. */
const ALL = 'all'

interface ConsultantDirectoryProps {
  /**
   * Chuyên môn được ưu tiên đưa lên đầu — lớp app truyền vào theo loại công
   * trình của dự án gần nhất (mục VIII.1, phần đề xuất). Bỏ trống thì danh sách
   * chỉ nhóm theo chuyên môn.
   */
  preferredSpecialtyId?: string
}

/**
 * Trang danh sách kiến trúc sư (mục VIII.1, Hình 14).
 *
 * Tiêu đề canh giữa, hàng công cụ tìm + lọc chuyên môn + dòng đếm, rồi lưới 3
 * cột. Danh sách mặc định sắp xếp nhóm theo chuyên môn nên khách lướt theo cụm
 * chứ không phải theo thứ tự ngẫu nhiên của backend.
 *
 * ★ Tiêu đề + mô tả trượt lên mờ vào CHỈ MỘT LẦN lúc vào trang (`initial`+
 * `animate` chạy đúng 1 lần khi mount, tìm/lọc chỉ đổi state cục bộ nên không
 * remount lại tiêu đề). Gõ tìm lọc NGAY từng ký tự (không debounce — đây là
 * lọc mảng thuần trong bộ nhớ, không cần trì hoãn). Thẻ không khớp co nhỏ +
 * mờ dần rồi biến mất, thẻ còn lại tự trượt lấp chỗ trống (`layout` của
 * motion trên từng thẻ) — xoá hết tìm kiếm thì các thẻ đó REMOUNT nên lại
 * chơi đúng hiệu ứng "làn sóng" như lúc vào trang lần đầu.
 */
export function ConsultantDirectory({ preferredSpecialtyId }: ConsultantDirectoryProps) {
  const t = useTranslations('consult.directory')

  const { directoryTerm: term, setDirectoryTerm: setTerm, specialtyId, setSpecialtyId } = useConsultTransitionState()
  const [searchFocused, setSearchFocused] = useState(false)

  const { data: consultants, isPending } = useConsultants()
  const pool = useMemo(() => consultants ?? [], [consultants])

  const options = useMemo(() => specialtyOptions(pool), [pool])

  const results = useMemo(
    () =>
      sortConsultants(
        filterConsultants(pool, {
          query: term,
          ...(specialtyId === ALL ? {} : { specialtyId })
        }),
        preferredSpecialtyId
      ),
    [pool, term, specialtyId, preferredSpecialtyId]
  )

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
          options={options.map((specialty) => ({ id: specialty.id, label: specialty.label }))}
          allValue={ALL}
          allLabel={t('allSpecialties')}
          ariaLabel={t('specialty')}
        />

        <p className='text-muted-foreground flex items-center gap-1 text-sm'>
          <FlippingDigits value={results.length} />
          {t('countLabel')}
        </p>
      </div>

      <p className='text-center text-sm font-medium'>{t('lead')}</p>

      {isPending ? (
        <div className='grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className='h-52 w-full rounded-xl' />
          ))}
        </div>
      ) : results.length === 0 ? (
        <EmptyState title={t('empty.title')} description={t('empty.description')} />
      ) : (
        <div className='grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          <AnimatePresence>
            {results.map((consultant, index) => (
              <ConsultantCard
                key={consultant.id}
                consultant={consultant}
                query={term}
                index={index}
                onSelectSpecialty={setSpecialtyId}
              />
            ))}
          </AnimatePresence>
        </div>
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
