'use client'

import { QUERY_KEY_ROOTS } from '@/shared/constants/query-keys'
import { mapService } from '@/shared/services/map.service'
import { useQuery } from '@tanstack/react-query'

export const useGetProvinces = () => {
  const { data: provinces = [], isLoading: isLoadingProvinces } = useQuery({
    queryKey: [QUERY_KEY_ROOTS.location, 'provinces'],
    queryFn: mapService.getProvinces
  })

  return { provinces, isLoadingProvinces }
}
