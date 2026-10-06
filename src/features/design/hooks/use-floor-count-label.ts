'use client'

import { useTranslations } from 'next-intl'
import { useCallback } from 'react'

import { cmsSeedOf, useCmsCollection } from '@/shared/cms'

import { FLOOR_COUNTS } from '../constants/design.constants'
import type { FloorCount, KnownFloorCount } from '../types/design.types'

function isKnownFloorCount(id: string): id is KnownFloorCount {
  return (FLOOR_COUNTS as readonly string[]).includes(id)
}

/**
 * Nhãn một phương án Số tầng theo danh mục admin quản lý (epic
 * ConstructionTypeManagement §3): admin đổi tên thì hiện tên mới, phương án
 * admin thêm thì hiện đúng tên đã đặt. Năm phương án gốc chưa bị đổi tên vẫn
 * dùng bản dịch, để trang tiếng Anh không hiện chữ Việt của seed.
 */
export function useFloorCountLabel(): (id: FloorCount) => string {
  const t = useTranslations('design.input')
  const options = useCmsCollection('floorOptions')

  return useCallback(
    (id: FloorCount) => {
      const option = options.find((item) => item.id === id)
      if (!isKnownFloorCount(id)) return option?.label ?? id
      const seedLabel = cmsSeedOf('floorOptions').find((item) => item.id === id)?.label
      return option && option.label !== seedLabel ? option.label : t(`floorCount.options.${id}`)
    },
    [options, t]
  )
}
