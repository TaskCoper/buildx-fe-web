'use client'

import { env } from '@/shared/config/env'
import { useLocale, useTranslations } from 'next-intl'

import type { Locale } from '@/i18n/routing'
import { useCmsDocument } from '@/shared/cms'
import { formatCurrency, formatNumber } from '@/shared/utils'
import { advisoryFacts } from '../services/advisory.service'
import { useFloorCountLabel } from './use-floor-count-label'
import type { DesignInput, EstimateResult } from '../types/design.types'

/**
 * Đoạn văn tư vấn cá nhân hóa, tách thành từng đoạn (mục III.3b, khối 3).
 *
 * Dùng chung cho khối tư vấn trên màn kết quả và cho bộ hồ sơ PDF, nên phải là
 * hook chứ không nằm trong component. Backend trả `result.advisory` (AI sinh
 * theo Phụ lục 02, mục II.3) thì dùng nguyên văn.
 */
export function useAdvisory(result: EstimateResult | undefined, customerName: string, input?: DesignInput): string[] {
  const t = useTranslations('design.estimate.advisory')
  const tInput = useTranslations('design.input')
  const floorLabel = useFloorCountLabel()
  const locale = useLocale() as Locale
  // Nội dung tư vấn SAVICO admin soạn (spec admin #3); trống thì dùng câu mặc định.
  const advice = useCmsDocument('estimateAdvice')

  if (!result) return []
  if (!env.NEXT_PUBLIC_USE_MOCK_API) return result.advisory.split(/\n{2,}/).filter(Boolean)
  if (result.advisory) return result.advisory.split(/\n{2,}/).filter(Boolean)

  const facts = advisoryFacts(result)
  const name = customerName.trim() || t('defaultName')
  const unitCost = formatCurrency(facts.unitCost, locale)

  const buildingLabel = input?.buildingType
    ? tInput(`buildingType.options.${input.buildingType}`).toLowerCase()
    : t('unknownBuilding')
  const scaleLabel = input?.floorCount ? floorLabel(input.floorCount).toLowerCase() : ''
  const packageLabel = input ? tInput(`packageTier.options.${input.packageTier}`) : ''
  const interiorLabel = input?.style ? tInput(`style.options.${input.style}`) : ''

  return [
    t('intro', {
      name,
      building: buildingLabel,
      address: input?.address || t('unknownAddress'),
      area: formatNumber(result.estimatedFloorArea, locale),
      total: formatCurrency(result.grandTotal, locale)
    }),
    // Căn hộ bị khóa 1 mặt sàn nên không có số tầng để nhắc lại.
    scaleLabel
      ? t('unitCostWithScale', { unitCost, package: packageLabel, scale: scaleLabel })
      : t('unitCost', { unitCost, package: packageLabel }),
    t('breakdown', {
      structure: facts.percentBySection.structure,
      finishing: facts.percentBySection.finishing,
      interior: facts.percentBySection.interior
    }),
    advice.dominant[facts.dominantSection].trim() || t(`dominant.${facts.dominantSection}`),
    interiorLabel ? t('style', { style: interiorLabel }) : null,
    advice.disclaimer.trim() || t('disclaimer')
  ].filter((paragraph) => paragraph !== null)
}
