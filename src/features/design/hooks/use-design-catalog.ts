'use client'

import { useTranslations } from 'next-intl'
import { useMemo } from 'react'

import { cmsText, siteImage, useCmsCollection, useCmsDocument } from '@/shared/cms'

import { catalogBuildingTypes, catalogStyles } from '../services/design-catalog.service'
import type { BuildingType } from '../types/design.types'

interface CatalogOption {
  value: string
  label: string
  imageUrl?: string
  /** Loại đã Ngừng hoạt động, chỉ hiện vì hồ sơ đã lưu nó — không chọn lại được. */
  disabled?: boolean
}

interface DesignCatalog {
  /** Loại công trình cho ô chọn ở nhóm 3. */
  buildingTypes: CatalogOption[]
  /** Thẻ ảnh phong cách của loại công trình đang chọn. */
  styles: CatalogOption[]
}

/**
 * Danh mục Bước 1 do admin cấu hình (mục X, #6) — admin bật / tắt / đổi thứ tự
 * loại công trình và phong cách ở `/admin/catalog` là ô chọn đổi theo ngay.
 *
 * Chữ và ảnh chỉ GHI ĐÈ: admin để trống thì rơi về bản dịch `messages/*.json`
 * và ảnh mẫu trong `shared/lib/imagery`, nên đổi ngôn ngữ vẫn có nhãn đúng.
 */
export function useDesignCatalog(
  buildingType: BuildingType | null,
  savedBuildingType: BuildingType | null = null
): DesignCatalog {
  const t = useTranslations('design.input')
  const cmsBuildingTypes = useCmsCollection('buildingTypes')
  const cmsStyles = useCmsCollection('styleOptions')
  const assets = useCmsDocument('uiAssets')

  return useMemo(
    () => ({
      buildingTypes: catalogBuildingTypes(cmsBuildingTypes, savedBuildingType).map((option) => {
        const label = cmsText(option.label, t(`buildingType.options.${option.value}`))
        return option.inactive
          ? { value: option.value, label: `${label} ${t('inactiveSuffix')}`, disabled: true }
          : { value: option.value, label }
      }),
      styles: catalogStyles(cmsStyles, buildingType).map((option) => ({
        value: option.value,
        label: cmsText(option.label, t(`style.options.${option.value}`)),
        imageUrl: cmsText(option.imageUrl, siteImage(assets, `style.${option.value}`))
      }))
    }),
    [cmsBuildingTypes, cmsStyles, assets, buildingType, savedBuildingType, t]
  )
}
