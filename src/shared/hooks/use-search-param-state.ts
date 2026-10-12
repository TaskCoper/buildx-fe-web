'use client'

import { useSearchParams } from 'next/navigation'
import { useCallback, useState } from 'react'

import { replaceSearchParam } from '@/shared/lib/search-params'

/**
 * Trạng thái hiển thị (tab, bộ lọc) lưu trong `?key=` để chia sẻ được đường dẫn, nhưng đổi giá trị KHÔNG gọi máy chủ.
 *
 * Giá trị đầu và mọi lần điều hướng thật (bấm liên kết, Back/Forward, mở thẳng đường dẫn) lấy từ `useSearchParams`; lúc
 * người dùng tự chọn thì giữ bằng state cục bộ rồi ghi thanh địa chỉ qua `replaceSearchParam`. Giá trị lạ trên URL rơi
 * về `fallback`. Lý do không dùng `router.replace`: xem `replaceSearchParam`.
 */
export function useSearchParamState<T extends string>(key: string, values: readonly T[], fallback: T) {
  const param = useSearchParams().get(key)
  const fromUrl = values.includes(param as T) ? (param as T) : fallback

  const [value, setValue] = useState<T>(fromUrl)
  // Mẫu "điều chỉnh state khi prop đổi" của React: chỉ đi theo URL khi chính URL đổi, không ghi đè lựa chọn vừa bấm.
  const [seenFromUrl, setSeenFromUrl] = useState<T>(fromUrl)
  if (fromUrl !== seenFromUrl) {
    setSeenFromUrl(fromUrl)
    setValue(fromUrl)
  }

  const select = useCallback(
    (next: T) => {
      setValue(next)
      replaceSearchParam(key, next)
    },
    [key]
  )

  return [value, select] as const
}
