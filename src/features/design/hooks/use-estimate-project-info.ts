'use client'

import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'

import { designKeys } from '../api/design.keys'
import { estimateInputApi } from '../api/estimate-input.api'
import { isApiEstimateId } from '../services/estimate-input.logic'

/** Thông tin dự án hiển thị ở khối "Thông tin dự án" Bước 3, lấy từ dự toán THẬT. Rỗng = chưa nhập. */
export interface EstimateProjectInfo {
  address: string
  buildingTypeLabel: string
  scaleLabel: string
  packageLabel: string
  styleLabel: string
}

const PACKAGE_KEY = { Basic: 'basic', Standard: 'standard', Vip: 'vip' } as const

/**
 * Đọc đầu vào Bước 1 đã lưu của một dự toán thật (`GET /estimates/{id}`) cùng danh mục ghim của nó (tên loại công
 * trình, phong cách) và đổi thành chữ cho người xem. Dự toán mock (id `SVC-…`) không có dữ liệu này nên trả `undefined`:
 * màn Bước 3 rơi về bản nháp cục bộ như cũ.
 *
 * Dùng cùng khoá với màn nhập liệu nên nếu vừa đi qua Bước 1 thì không gọi lại.
 */
export function useEstimateProjectInfo(projectId: string): EstimateProjectInfo | undefined {
  const tInput = useTranslations('design.input')
  const tApi = useTranslations('design.inputApi')
  const enabled = isApiEstimateId(projectId)

  const detail = useQuery({
    queryKey: designKeys.estimateDetail(projectId),
    queryFn: ({ signal }) => estimateInputApi.getEstimate(projectId, signal),
    enabled,
    staleTime: 60_000
  })
  const catalog = useQuery({
    queryKey: designKeys.estimateCatalog(projectId),
    queryFn: () => estimateInputApi.getCatalog(projectId),
    enabled,
    staleTime: 5 * 60_000
  })

  const input = detail.data?.input

  // BE có thể chỉ trả MÃ tỉnh/phường (TDD-PROJ-001 không ghi tên): khi đó tra tên từ danh mục địa chỉ, cùng khoá cache với
  // form Bước 1 nên không gọi trùng. Tra lỗi thì bỏ phần tên, không chặn cả khối thông tin.
  const needNames = enabled && Boolean(input?.provinceCode) && !(input?.provinceName && input?.wardName)
  const provinces = useQuery({
    queryKey: [...designKeys.locations(), 'provinces'],
    queryFn: () => estimateInputApi.listProvinces(),
    enabled: needNames,
    staleTime: 5 * 60_000,
    retry: false
  })
  const datasetVersion = provinces.data?.datasetVersion ?? null
  const provinceCode = input?.provinceCode ?? null
  const wards = useQuery({
    queryKey: [...designKeys.locations(), 'wards', provinceCode, datasetVersion],
    queryFn: () => estimateInputApi.listWards(provinceCode as string, datasetVersion as string),
    enabled: needNames && Boolean(provinceCode && input?.wardCode && datasetVersion),
    staleTime: 5 * 60_000,
    retry: false
  })

  if (!enabled || !input) return undefined

  const provinceName =
    input.provinceName ?? provinces.data?.provinces.find((item) => item.code === input.provinceCode)?.name
  const wardName = input.wardName ?? wards.data?.find((item) => item.code === input.wardCode)?.name

  const buildingType = catalog.data?.buildingTypes.find((type) => type.buildingTypeId === input.buildingTypeId)
  // Kiểu kiến trúc & phong cách nội thất gộp một trường (Phụ lục A, trường 7); loại công trình không áp dụng thì bỏ qua.
  const styles = [
    catalog.data?.architectureStyles.find((style) => style.styleId === input.architectureStyleId)?.name,
    catalog.data?.interiorStyles.find((style) => style.styleId === input.interiorStyleId)?.name
  ].filter((name): name is string => Boolean(name))

  return {
    address: [input.addressDetail, wardName, provinceName]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(', '),
    buildingTypeLabel: buildingType?.name ?? '',
    // Tum chỉ ghi khi loại công trình có áp dụng (BE lưu `null` khi không áp dụng).
    scaleLabel: input.floorCount
      ? [
          tApi('floorCount.option', { count: input.floorCount }),
          input.hasTum === null ? '' : tApi(input.hasTum ? 'tum.yes' : 'tum.no')
        ]
          .filter(Boolean)
          .join(' · ')
      : '',
    packageLabel: input.finishPackage ? tInput(`packageTier.options.${PACKAGE_KEY[input.finishPackage]}`) : '',
    styleLabel: styles.join(' · ')
  }
}
