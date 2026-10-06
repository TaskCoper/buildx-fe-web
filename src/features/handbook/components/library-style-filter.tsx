'use client'

import { ChevronDown } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/shared/components/ui/dropdown-menu'

interface LibraryStyleFilterProps {
  group: 'architecture' | 'interior'
  options: { value: string; label: string }[]
  value: string[]
  onChange: (value: string[]) => void
  disabled?: boolean
}

/** Hai nhóm chọn nhiều mục, dùng ID danh mục và giữ menu mở khi đánh dấu. */
export function LibraryStyleFilter({ group, options, value, onChange, disabled }: LibraryStyleFilterProps) {
  const t = useTranslations('handbook.library')
  const selectedLabels = options.filter((option) => value.includes(option.value)).map((option) => option.label)
  const label = t(`${group}Prefix`, { value: selectedLabels.length ? selectedLabels.join(', ') : t('optionAll') })

  return (
    <div className='min-w-0 space-y-1.5'>
      <label htmlFor={`library-${group}-filter`} className='text-muted-foreground block text-xs font-medium'>
        {t(`filterLabels.${group}`)}
      </label>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant='ghost'
            id={`library-${group}-filter`}
            disabled={disabled}
            data-library-style-filter={group}
            data-template-select
            className='border-input bg-background h-11 w-full min-w-0 justify-between rounded-lg border px-3 font-normal shadow-none'
            title={label}
          >
            <span className='truncate'>{selectedLabels.length ? selectedLabels.join(', ') : t('optionAll')}</span>
            <ChevronDown className='size-4 shrink-0 opacity-50' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='start' className='w-(--radix-dropdown-menu-trigger-width)'>
          <DropdownMenuItem onSelect={() => onChange([])}>{t('optionAll')}</DropdownMenuItem>
          {options.length ? <DropdownMenuSeparator /> : null}
          {options.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={value.includes(option.value)}
              onSelect={(event) => event.preventDefault()}
              onCheckedChange={(checked) =>
                onChange(checked ? [...value, option.value] : value.filter((id) => id !== option.value))
              }
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
