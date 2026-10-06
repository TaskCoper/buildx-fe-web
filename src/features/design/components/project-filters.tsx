'use client'

import { Search } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Input } from '@/shared/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { cn } from '@/shared/lib/utils'
import { PROJECT_SORTS, PROJECT_STATUSES } from '../constants/design.constants'
import type { ProjectSort, ProjectStatus } from '../types/design.types'

interface ProjectFiltersProps {
  query: string
  onQueryChange: (query: string) => void
  status: ProjectStatus | null
  onStatusChange: (status: ProjectStatus | null) => void
  sort: ProjectSort
  onSortChange: (sort: ProjectSort) => void
}

/** `all` chỉ tồn tại ở giao diện; trong state nó là `status: null`. */
const CHIPS = ['all', ...PROJECT_STATUSES] as const

/**
 * Hàng công cụ của khối "DỰ ÁN CỦA TÔI" (mục IV.1, Hình 02) — một dòng: ô tìm
 * bên trái, hàng chip lọc ở giữa, dropdown sắp xếp dồn về phải. Màn hẹp thì
 * xuống dòng và chip cuộn ngang.
 */
export function ProjectFilters({
  query,
  onQueryChange,
  status,
  onStatusChange,
  sort,
  onSortChange
}: ProjectFiltersProps) {
  const t = useTranslations('design.projects')

  return (
    <div className='flex flex-wrap items-center gap-3'>
      <div className='relative w-full sm:w-72'>
        <Search className='text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2' />
        <Input
          type='search'
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={t('search.placeholder')}
          aria-label={t('search.label')}
          className='h-9 rounded-lg pl-9 text-sm'
        />
      </div>

      <ul className='scrollbar-none flex max-w-full items-center gap-2 overflow-x-auto'>
        {CHIPS.map((chip) => {
          const value = chip === 'all' ? null : chip
          const active = status === value
          return (
            <li key={chip}>
              <button
                type='button'
                data-filter-chip
                onClick={() => onStatusChange(value)}
                aria-pressed={active}
                className={cn(
                  'rounded-full border px-3.5 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors',
                  active
                    ? 'border-primary-strong bg-primary-strong text-primary-foreground'
                    : 'bg-card text-muted-foreground hover:bg-accent/40 hover:text-foreground'
                )}
              >
                {t(`filters.${chip}`)}
              </button>
            </li>
          )
        })}
      </ul>

      <Select value={sort} onValueChange={(value) => onSortChange(value as ProjectSort)}>
        <SelectTrigger className='ms-auto h-9 w-full rounded-lg text-sm sm:w-44' aria-label={t('sort.label')}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PROJECT_SORTS.map((option) => (
            <SelectItem key={option} value={option}>
              {t(`sort.${option}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
