'use client'

import { useQuery } from '@tanstack/react-query'

import { useDebouncedValue } from '@/shared/hooks'
import { mapsApi, type AddressSuggestion } from '../api/maps.api'

/**
 * Gợi ý địa chỉ khi gõ. Gõ trễ 350ms vì mỗi lần gọi là một lượt tính tiền của VietMap; cùng một chuỗi thì không hỏi
 * lại. `context` (phường, tỉnh đã chọn) được ghép vào để ưu tiên kết quả đúng khu vực.
 */
export function useEstimateAddressSearch(input: string, context: string) {
  const text = useDebouncedValue(input.trim(), 350)
  const enabled = text.length >= 2
  const query = context ? `${text}, ${context}` : text

  const result = useQuery<AddressSuggestion[]>({
    queryKey: ['design', 'address-search', query],
    queryFn: () => mapsApi.search(query),
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: false
  })

  return { suggestions: result.data ?? [], isSearching: enabled && result.isFetching, failed: result.isError }
}
