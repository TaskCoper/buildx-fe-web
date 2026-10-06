'use client'

import { AutoComplete, App, Spin } from 'antd'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { resolveAddress, useAddressSearch, type GeocodedAddress } from '@/shared/geocode'

interface AddressAutoCompleteProps {
  /** antd Form.Item tiêm vào — chính là giá trị trường `address`. */
  value?: string
  onChange?: (value: string) => void
  /** Gọi khi đã tra xong toạ độ, để màn cha điền `latitude`/`longitude`. */
  onResolved: (address: GeocodedAddress) => void
  placeholder?: string
}

/**
 * Ô địa chỉ có gợi ý (VietMap) cho khu quản trị.
 *
 * Gõ ≥2 ký tự để ra gợi ý; CHỌN một dòng thì mới có toạ độ, vì VietMap chỉ trả
 * `lat`/`lng` ở bước tra `ref_id`. Gõ tay tự do vẫn lưu được địa chỉ nhưng KHÔNG
 * có toạ độ — nên hai ô vĩ độ/kinh độ bên dưới vẫn để sửa tay, phòng khi gợi ý
 * không ra đúng chỗ.
 *
 * Bản shadcn cho trang khách nằm riêng: hai khu dùng hai hệ giao diện khác nhau.
 */
export function AddressAutoComplete({ value, onChange, onResolved, placeholder }: AddressAutoCompleteProps) {
  const t = useTranslations('admin.address')
  const { message } = App.useApp()
  const [typed, setTyped] = useState(value ?? '')
  const [resolving, setResolving] = useState(false)
  const { suggestions, isSearching } = useAddressSearch(typed)

  const options = suggestions.map((item) => ({
    // Giá trị là refId để không trùng khoá khi hai gợi ý cùng dòng hiển thị;
    // ngay sau khi chọn, ô nhập được ghi đè bằng địa chỉ thật ở `onSelect`.
    value: item.refId,
    label: (
      <div className='py-0.5'>
        <div className='text-sm font-medium'>{item.name || item.display}</div>
        <div className='text-xs opacity-60'>{item.address}</div>
      </div>
    ),
    display: item.display
  }))

  async function handleSelect(refId: string, option: (typeof options)[number]) {
    onChange?.(option.display)
    setTyped(option.display)
    setResolving(true)
    try {
      onResolved(await resolveAddress(refId))
    } catch {
      message.error(t('resolveFailed'))
    } finally {
      setResolving(false)
    }
  }

  return (
    <AutoComplete
      value={value}
      options={options}
      placeholder={placeholder}
      notFoundContent={isSearching ? <Spin size='small' /> : typed.length >= 2 ? t('noResult') : null}
      suffixIcon={resolving ? <Spin size='small' /> : undefined}
      onSearch={(text) => setTyped(text)}
      onChange={(text) => onChange?.(text)}
      onSelect={handleSelect}
      style={{ width: '100%' }}
    />
  )
}
