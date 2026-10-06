'use client'

import { Check, ChevronsUpDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'

import { Button } from '@/shared/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/shared/components/ui/command'
import { Input } from '@/shared/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { useGetProvinces, useGetWards } from '@/shared/hooks'
import { cn } from '@/shared/lib/utils'
import type { AddressDetail } from '../types/design.types'
import { FieldLabel } from '@/shared/components/common'

interface AddressFieldProps {
  value: AddressDetail
  onChange: (next: AddressDetail) => void
  invalid?: boolean
}

/**
 * Trường 2 — Địa chỉ công trình (mục III.2): ô nhập có gợi ý địa chỉ.
 *
 * Tỉnh/TP và Xã/Phường chọn từ danh mục hành chính (có ô tìm kiếm), số nhà và
 * đường nhập tay — đúng ba phần mà tooltip mô tả. Ba phần được ghép lại thành
 * một chuỗi địa chỉ gửi lên API.
 */
export function AddressField({ value, onChange, invalid }: AddressFieldProps) {
  const t = useTranslations('design.input.address')
  const { provinces, isLoadingProvinces } = useGetProvinces()
  const { wards, isLoadingWards } = useGetWards(value.provinceCode ?? undefined)
  const [wardUnlockPulse, setWardUnlockPulse] = useState(false)
  const unlockTimerRef = useRef(0)

  useEffect(() => {
    return () => window.clearTimeout(unlockTimerRef.current)
  }, [])

  return (
    <div className='space-y-2'>
      <FieldLabel htmlFor='address-street' hint={t('hint')} required>
        {t('label')}
      </FieldLabel>

      <div className='grid gap-2 sm:grid-cols-2'>
        <Picker
          label={t('province')}
          placeholder={t('provincePlaceholder')}
          searchPlaceholder={t('searchPlaceholder')}
          emptyText={t('noResult')}
          loading={isLoadingProvinces}
          selected={value.provinceName}
          invalid={invalid && !value.provinceCode}
          options={provinces.map((p) => ({ code: p.code, name: p.name }))}
          onSelect={(option) => {
            const wasLocked = value.provinceCode === null
            // Đổi tỉnh thì xã/phường cũ không còn hợp lệ.
            onChange({ ...value, provinceCode: option.code, provinceName: option.name, wardCode: null, wardName: '' })
            if (!wasLocked) return
            window.clearTimeout(unlockTimerRef.current)
            setWardUnlockPulse(false)
            window.requestAnimationFrame(() => setWardUnlockPulse(true))
            unlockTimerRef.current = window.setTimeout(() => setWardUnlockPulse(false), 760)
          }}
        />

        <Picker
          label={t('ward')}
          placeholder={t('wardPlaceholder')}
          searchPlaceholder={t('searchPlaceholder')}
          emptyText={t('noResult')}
          loading={isLoadingWards}
          disabled={!value.provinceCode}
          justUnlocked={wardUnlockPulse}
          selected={value.wardName}
          invalid={invalid && Boolean(value.provinceCode) && !value.wardCode}
          options={wards.map((w) => ({ code: w.code, name: w.name }))}
          onSelect={(option) => onChange({ ...value, wardCode: option.code, wardName: option.name })}
        />
      </div>

      <Input
        id='address-street'
        value={value.street}
        placeholder={t('streetPlaceholder')}
        onChange={(e) => onChange({ ...value, street: e.target.value })}
        className={cn(invalid && !value.street.trim() && 'border-destructive')}
      />
    </div>
  )
}

interface PickerOption {
  code: number
  name: string
}

/** Searchable single-select over an administrative list. */
function Picker({
  label,
  placeholder,
  searchPlaceholder,
  emptyText,
  options,
  selected,
  onSelect,
  loading,
  disabled,
  invalid,
  justUnlocked
}: {
  label: string
  placeholder: string
  searchPlaceholder: string
  emptyText: string
  options: PickerOption[]
  selected: string
  onSelect: (option: PickerOption) => void
  loading?: boolean
  disabled?: boolean
  invalid?: boolean
  justUnlocked?: boolean
}) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type='button'
          variant='outline'
          role='combobox'
          aria-expanded={open}
          aria-label={label}
          disabled={disabled || loading}
          data-address-unlocked={justUnlocked}
          className={cn('w-full justify-between font-normal', invalid && 'border-destructive')}
        >
          <span className={cn('truncate', !selected && 'text-muted-foreground')}>{selected || placeholder}</span>
          <ChevronsUpDown className='ml-2 size-4 shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent data-address-menu className='w-(--radix-popover-trigger-width) p-0' align='start'>
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.code}
                  value={option.name}
                  onSelect={() => {
                    onSelect(option)
                    setOpen(false)
                  }}
                >
                  <Check className={cn('mr-2 size-4', selected === option.name ? 'opacity-100' : 'opacity-0')} />
                  {option.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
