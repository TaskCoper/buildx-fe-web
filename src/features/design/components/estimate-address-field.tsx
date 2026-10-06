'use client'

import { Loader2, MapPin } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'

import { FieldLabel, LocationMap } from '@/shared/components/common'
import { Input } from '@/shared/components/ui/input'
import { cn } from '@/shared/lib/utils'
import { mapsApi } from '../api/maps.api'
import { useEstimateAddressSearch } from '../hooks/use-address-search'
import { addressWithHouseNumber } from '../services/address.logic'

interface EstimateAddressFieldProps {
  /** Số nhà, đường ĐÃ XÁC NHẬN (trường `addressDetail` của đầu vào dự toán). */
  value: string
  /** Vị trí đã xác nhận; chưa có thì chưa hiện bản đồ. */
  latitude: number | null
  longitude: number | null
  /** Tên phường/xã + tỉnh/thành đã chọn: ghép vào lúc tìm để ưu tiên kết quả đúng khu vực. */
  context: string
  /** Khách chọn một dòng gợi ý (đã có toạ độ): form ghi địa chỉ + tỉnh + phường + toạ độ cùng lúc. */
  onPick: (choice: { text: string; latitude: number; longitude: number; region: string }) => Promise<void>
  /** Ghim được kéo / bản đồ được bấm. */
  onPinMove: (latitude: number, longitude: number) => void
  /** Ô đang có chữ gõ tay chưa được xác nhận bằng một gợi ý (form không cho sang bước sau). */
  onUnconfirmedChange?: (unconfirmed: boolean) => void
  invalid?: boolean
  required?: boolean
  disabled?: boolean
}

/**
 * Số nhà, đường của Bước 1 kèm gợi ý địa chỉ (BE `/maps/search`) và bản đồ có ghim.
 *
 * BE bắt buộc vĩ độ/kinh độ và chỉ tin cặp toạ độ lấy từ bản đồ cho đúng địa chỉ đó, nên chữ gõ tay KHÔNG tự đi vào dự
 * toán: chỉ khi chọn một gợi ý (hoặc kéo ghim) thì địa chỉ mới được ghi, cùng toạ độ. Gõ tay chưa chọn gợi ý thì ô báo
 * "chọn một dòng gợi ý". Bản đồ chỉ hiện sau khi có vị trí.
 * Danh sách gợi ý nằm trong dòng chảy (không vẽ tuyệt đối) để khỏi bị thẻ nhóm cắt mất.
 */
export function EstimateAddressField({
  value,
  latitude,
  longitude,
  context,
  onPick,
  onPinMove,
  onUnconfirmedChange,
  invalid,
  required = true,
  disabled = false
}: EstimateAddressFieldProps) {
  const t = useTranslations('design.inputApi')
  // `null` = ô đang hiện đúng địa chỉ đã xác nhận; chuỗi = chữ gõ tay chưa xác nhận.
  const [typed, setTyped] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [resolveFailed, setResolveFailed] = useState(false)
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const text = typed ?? value
  const unconfirmed = typed !== null && typed.trim() !== value.trim()
  // Chỉ tìm gợi ý khi danh sách đang mở (đang gõ): ô đổi chữ do kéo ghim thì không tốn thêm một lượt tìm.
  const { suggestions, isSearching, failed } = useEstimateAddressSearch(open && !disabled ? text : '', context)

  useEffect(() => {
    onUnconfirmedChange?.(unconfirmed || resolving)
  }, [onUnconfirmedChange, unconfirmed, resolving])

  async function pick(refId: string, name: string, display: string, region: string) {
    if (disabled || resolving) return
    if (blurTimer.current) clearTimeout(blurTimer.current)
    // Giữ số nhà khách đã gõ: gợi ý của VietMap thường chỉ có tên đường.
    const chosen = addressWithHouseNumber(text, name || display)
    setOpen(false)
    setResolving(true)
    setResolveFailed(false)
    try {
      const place = await mapsApi.place(refId)
      setTyped(null)
      await onPick({ text: chosen, latitude: place.latitude, longitude: place.longitude, region })
    } catch {
      setResolveFailed(true)
    } finally {
      setResolving(false)
    }
  }

  return (
    <div id='field-addressDetail' className='space-y-2 sm:col-span-2'>
      <FieldLabel htmlFor='address-detail' hint={t('address.hint')} required={required}>
        {t('address.label')}
      </FieldLabel>
      <div className='relative'>
        <Input
          id='address-detail'
          disabled={disabled}
          value={text}
          placeholder={t('address.placeholder')}
          className={cn((invalid || unconfirmed) && 'border-destructive')}
          autoComplete='off'
          onChange={(event) => {
            setTyped(event.target.value)
            setResolveFailed(false)
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
      </div>

      {open && !disabled && text.trim().length >= 2 ? (
        <div
          className='bg-popover overflow-hidden rounded-lg border shadow-xs'
          // Bấm xuống một dòng không được làm ô nhập mất focus: mất focus là danh sách bị gỡ trước khi click kịp tới nút.
          onMouseDown={(event) => event.preventDefault()}
        >
          {isSearching ? (
            <p className='text-muted-foreground px-3 py-2.5 text-sm'>{t('address.searching')}</p>
          ) : failed ? (
            <p className='text-muted-foreground px-3 py-2.5 text-sm'>{t('address.searchFailed')}</p>
          ) : suggestions.length ? (
            <ul className='max-h-64 overflow-y-auto'>
              {suggestions.map((item) => (
                <li key={item.refId}>
                  <button
                    type='button'
                    disabled={disabled || resolving}
                    className='hover:bg-accent flex w-full items-start gap-2 px-3 py-2 text-left transition-colors'
                    onClick={() => void pick(item.refId, item.name, item.display, item.address)}
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
            <p className='text-muted-foreground px-3 py-2.5 text-sm'>{t('address.noResult')}</p>
          )}
        </div>
      ) : null}

      {resolveFailed ? <p className='text-destructive text-xs'>{t('address.resolveFailed')}</p> : null}
      {unconfirmed ? <p className='text-destructive text-xs'>{t('address.unconfirmed')}</p> : null}

      <div id='field-location' className='space-y-2'>
        {latitude !== null && longitude !== null ? (
          <>
            <LocationMap latitude={latitude} longitude={longitude} onChange={disabled ? undefined : onPinMove} />
            <p className='text-muted-foreground text-xs'>
              {t('address.coordinates', { lat: latitude.toFixed(6), lng: longitude.toFixed(6) })}
            </p>
          </>
        ) : (
          <p className='text-muted-foreground text-xs'>{t('address.mapHint')}</p>
        )}
      </div>
    </div>
  )
}
