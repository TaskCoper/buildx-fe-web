'use client'

import { Check, ChevronsUpDown } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { Button } from '@/shared/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/shared/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { cn } from '@/shared/lib/utils'

export interface SearchableSelectOption {
  value: string
  label: string
}

interface SearchableSelectProps {
  id?: string
  value: string
  onValueChange: (value: string) => void
  options: SearchableSelectOption[]
  placeholder: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  invalid?: boolean
  className?: string
}

/** Bỏ dấu + chữ thường để gõ "ha noi" vẫn ra "Hà Nội" (cmdk mặc định chỉ so khớp mờ theo từng ký tự có dấu). */
const fold = (text: string) =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase()

/**
 * Ô chọn có tìm nhanh (tỉnh/thành, phường/xã…): bấm mở danh sách, gõ để lọc không phân biệt dấu. Dùng thay `Select`
 * khi danh sách dài, nơi cuộn tìm từng dòng rất chậm.
 */
export function SearchableSelect({
  id,
  value,
  onValueChange,
  options,
  placeholder,
  searchPlaceholder,
  emptyText,
  disabled = false,
  invalid = false,
  className
}: SearchableSelectProps) {
  const t = useTranslations('common.combobox')
  const [open, setOpen] = useState(false)
  const selected = options.find((option) => option.value === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type='button'
          variant='outline'
          role='combobox'
          aria-expanded={open}
          aria-invalid={invalid || undefined}
          disabled={disabled}
          className={cn(
            'w-full justify-between font-normal',
            !selected && 'text-muted-foreground',
            invalid && 'border-destructive',
            className
          )}
        >
          <span className='truncate'>{selected?.label ?? placeholder}</span>
          <ChevronsUpDown className='ml-2 size-4 shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-(--radix-popover-trigger-width) p-0' align='start'>
        <Command filter={(itemValue, search) => (fold(itemValue).includes(fold(search)) ? 1 : 0)}>
          <CommandInput placeholder={searchPlaceholder ?? t('searchPlaceholder')} />
          <CommandList>
            <CommandEmpty>{emptyText ?? t('emptyMessage')}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  // `value` của cmdk là chuỗi để lọc; thêm mã để hai mục trùng tên vẫn phân biệt được.
                  value={`${option.label} ${option.value}`}
                  onSelect={() => {
                    onValueChange(option.value)
                    setOpen(false)
                  }}
                >
                  <Check className={cn('mr-2 size-4', option.value === value ? 'opacity-100' : 'opacity-0')} />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
