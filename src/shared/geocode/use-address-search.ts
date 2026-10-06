'use client'

import { useQuery } from '@tanstack/react-query'

import { useDebouncedValue } from '@/shared/hooks'

import { geocodeApi } from './geocode.api'
import type { AddressSuggestion, GeocodedAddress } from './geocode.types'

/**
 * Gợi ý địa chỉ khi gõ. Gõ trễ 350ms vì MỖI lần gọi là một lượt tính tiền của
 * VietMap — không gõ trễ thì gõ xong một địa chỉ mất vài chục lượt.
 *
 * Phần giao diện cố ý để bên ngoài: khu quản trị dùng antd, trang khách dùng
 * shadcn, dùng chung một component thì một trong hai chỗ sẽ lạc kiểu.
 */
export function useAddressSearch(input: string, focus?: string) {
  const text = useDebouncedValue(input.trim(), 350)
  const enabled = text.length >= 2

  const query = useQuery<AddressSuggestion[]>({
    queryKey: ['geocode', 'suggest', text, focus ?? null],
    queryFn: () => geocodeApi.suggest(text, focus),
    enabled,
    // Cùng một chuỗi chữ thì đừng hỏi lại — đỡ một lượt tính tiền.
    staleTime: 5 * 60 * 1000,
    retry: false
  })

  return {
    suggestions: query.data ?? [],
    isSearching: enabled && query.isFetching,
    failed: query.isError
  }
}

/** Tra toạ độ của gợi ý vừa chọn (bước hai, VietMap không trả kèm ở bước gợi ý). */
export async function resolveAddress(refId: string): Promise<GeocodedAddress> {
  return geocodeApi.place(refId)
}
