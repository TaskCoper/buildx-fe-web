'use client'

import { useTranslations } from 'next-intl'

import { useCmsCollection, type CmsStageKey } from '@/shared/cms'

/**
 * Tên giai đoạn giám sát theo danh mục admin quản lý (spec admin #15); trống
 * thì rơi về bản dịch. `short` dùng cho thanh tiến độ hẹp.
 */
export function useStageLabel(variant: 'full' | 'short' = 'full') {
  const stages = useCmsCollection('supervisionStages')
  const tFull = useTranslations('supervision.stages')
  const tShort = useTranslations('supervision.stagesShort')

  return (key: CmsStageKey): string => {
    const stage = stages.find((item) => item.id === key)
    const text = variant === 'short' ? stage?.shortName || stage?.name : stage?.name
    return text?.trim() || (variant === 'short' ? tShort(key) : tFull(key))
  }
}
