'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

import { STAGE_TYPICAL_MINUTES, stageEtaRemainingMs, stageEtaState } from '../services/pipeline.logic'

/**
 * Dòng thời gian ước tính dưới tiến độ chặng: “khoảng 3–4 phút”, quá khoảng đó thì đổi sang câu trấn an. Hẹn đúng một
 * lần tới mốc đổi câu, không chạy đồng hồ mỗi giây.
 */
export function useStageEtaText(acceptedAtUtc: string | null | undefined): string {
  const t = useTranslations('design.pipeline.eta')
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const remaining = stageEtaRemainingMs(acceptedAtUtc, Date.now())
    if (remaining === null) return
    const timer = window.setTimeout(() => setNow(Date.now()), remaining + 1_000)
    return () => window.clearTimeout(timer)
  }, [acceptedAtUtc])
  return stageEtaState(acceptedAtUtc, now) === 'overdue'
    ? t('overdue')
    : t('typical', { min: STAGE_TYPICAL_MINUTES.min, max: STAGE_TYPICAL_MINUTES.max })
}
