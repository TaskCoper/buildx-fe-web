'use client'

import { useTranslations } from 'next-intl'
import { useCallback } from 'react'

/** Số tầng BMT → nhãn: 1 là Trệt, 3 là Trệt + 2 lầu (tum tính riêng). */
export function useFloorLabel() {
  const t = useTranslations('admin.estimateCatalog')
  return useCallback((count: number) => (count <= 1 ? t('floorGround') : t('floorUpper', { count: count - 1 })), [t])
}
