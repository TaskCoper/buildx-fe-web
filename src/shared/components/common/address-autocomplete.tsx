'use client'

import { Loader2, MapPin } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRef, useState } from 'react'

import { Input } from '@/shared/components/ui/input'
import { resolveAddress, useAddressSearch, type GeocodedAddress } from '@/shared/geocode'

interface AddressAutocompleteProps {
  value: string
  onChange: (value: string) => void
  /** Gọi khi đã tra xong toạ độ của gợi ý người dùng chọn. */
  onResolved: (address: GeocodedAddress) => void
  /** Gọi khi người dùng gõ tay lại — toạ độ cũ không còn đúng nữa. */
  onCleared: () => void
  id?: string
  placeholder?: string
  maxLength?: number
}

/**
 * Ô địa chỉ có gợi ý (VietMap) cho trang khách.
 *
 * Phải CHỌN một dòng gợi ý mới có toạ độ — backend từ chối tạo công trình nếu
 * thiếu kinh độ/vĩ độ (BR-SITE-001). Gõ tay sửa lại thì toạ độ cũ bị xoá
 * (`onCleared`), đúng BR-CTR-006 mục 6: đổi địa chỉ là phải tính lại toạ độ.
 *
 * Danh sách gợi ý vẽ tuyệt đối ngay dưới ô, không dùng Popover — form này nằm
 * trong Dialog, lồng thêm một lớp portal nữa rất dễ sinh lỗi tiêu điểm.
 */
export function AddressAutocomplete({
  value,
  onChange,
  onResolved,
  onCleared,
  id,
  placeholder,
  maxLength
}: AddressAutocompleteProps) {
  const t = useTranslations('address')
  const [open, setOpen] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [failed, setFailed] = useState(false)
  // Giữ nguyên danh sách khi ô mất tiêu điểm lúc đang bấm chọn.
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { suggestions, isSearching } = useAddressSearch(value)

  async function pick(refId: string, display: string) {
    if (blurTimer.current) clearTimeout(blurTimer.current)
    onChange(display)
    setOpen(false)
    setResolving(true)
    setFailed(false)
    try {
      onResolved(await resolveAddress(refId))
    } catch {
      setFailed(true)
      onCleared()
    } finally {
      setResolving(false)
    }
  }

  return (
    <div className='relative'>
      <Input
        id={id}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        autoComplete='off'
        onChange={(event) => {
          onChange(event.target.value)
          onCleared()
          setFailed(false)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          blurTimer.current = setTimeout(() => setOpen(false), 150)
        }}
      />
      {resolving ? (
        <Loader2 className='text-muted-foreground absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin' />
      ) : null}

      {/* Danh sách nằm TRONG dòng chảy, không đặt tuyệt đối: form này nằm trong
          Dialog mà `DialogContent` có `overflow-y-auto`, nên một lớp đè tuyệt đối
          sẽ bị cắt mất đáy (và che luôn nút Lưu). Đẩy nội dung xuống thì dialog
          tự cuộn, dùng được ở mọi ngữ cảnh mà không cần portal. */}
      {open && value.trim().length >= 2 ? (
        <div
          className='bg-popover mt-1 overflow-hidden rounded-lg border shadow-sm'
          // Bấm xuống một dòng không được làm ô nhập mất focus (mất focus là danh sách bị gỡ trước khi click kịp tới nút).
          onMouseDown={(event) => event.preventDefault()}
        >
          {isSearching ? (
            <p className='text-muted-foreground px-3 py-2.5 text-sm'>{t('searching')}</p>
          ) : suggestions.length ? (
            <ul className='max-h-64 overflow-y-auto'>
              {suggestions.map((item) => (
                <li key={item.refId}>
                  <button
                    type='button'
                    className='hover:bg-accent flex w-full items-start gap-2 px-3 py-2 text-left transition-colors'
                    onClick={() => pick(item.refId, item.display)}
                  >
                    <MapPin className='text-muted-foreground mt-0.5 size-4 shrink-0' />
                    <span className='min-w-0'>
                      <span className='block truncate text-sm font-medium'>{item.name || item.display}</span>
                      <span className='text-muted-foreground block truncate text-xs'>{item.address}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className='text-muted-foreground px-3 py-2.5 text-sm'>{t('noResult')}</p>
          )}
        </div>
      ) : null}

      {failed ? <p className='text-destructive mt-1.5 text-xs'>{t('resolveFailed')}</p> : null}
    </div>
  )
}
