'use client'

import { useTranslations } from 'next-intl'

import { floorCountOf } from '../services/handbook.service'
import type { HandbookTemplateDetail } from '../types/handbook.types'

/** Nhãn phân loại dùng chung cho thẻ đầu trang và bảng thông tin chi tiết. */
export function useTemplateClassification(template?: HandbookTemplateDetail | null) {
  const t = useTranslations('handbook.info')
  const floorCount = template?.floorCount ?? floorCountOf(template?.tags.floorCount)
  const hasTum = template?.tags.hasAttic

  return {
    floorLabel: floorCount == null ? t('notApplicable') : t('floorCountValue', { count: floorCount }),
    tumLabel: hasTum == null ? t('notApplicable') : t(hasTum ? 'withTum' : 'withoutTum'),
    architectureLabel: template?.architectureStyles?.map((style) => style.name).join(', ') || t('notApplicable'),
    interiorLabel: template?.interiorStyles?.map((style) => style.name).join(', ') || t('notApplicable'),
    // CMS/mock cũ chỉ có một nhãn phong cách; giữ nhãn này khi chưa có hai tập phong cách.
    groupedStyles:
      template?.source === 'bmt' || template?.architectureStyles !== undefined || template?.interiorStyles !== undefined
  }
}
