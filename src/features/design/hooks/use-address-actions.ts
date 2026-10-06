'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef } from 'react'

import { geocodeApi } from '@/shared/geocode'
import { designKeys } from '../api/design.keys'
import { estimateInputApi } from '../api/estimate-input.api'
import { mapsApi } from '../api/maps.api'
import { findByName, parseRegion } from '../services/region.logic'
import type { useEstimateInput } from './use-estimate-input'

const WARDS_STALE = 30 * 60 * 1000

interface RegionChange {
  provinceCode: string
  /** `undefined` = giữ phường hiện tại (không khớp được tên phường trong danh sách của BE). */
  wardCode: string | null | undefined
  locationDatasetVersion: string
}

/**
 * Mọi thao tác đổi VỊ TRÍ ở Bước 1: chọn địa chỉ trong gợi ý, kéo ghim bản đồ, đổi tỉnh/phường bằng tay.
 *
 * Quy tắc của BE (TDD-PROJ-001): địa chỉ (tỉnh, phường, số nhà đường) và cặp vĩ độ/kinh độ phải được lưu CÙNG NHAU, cặp
 * toạ độ phải là cặp vừa xác định cho địa chỉ mới — không được gửi địa chỉ B với toạ độ của A. Nên mỗi thao tác ở đây
 * `hold` việc tự lưu, cập nhật form ngay cho khách thấy, chờ kết quả bản đồ rồi mới nhả để lưu một lần. Chỉ thao tác MỚI
 * NHẤT được áp kết quả: kết quả của thao tác cũ đến muộn bị bỏ.
 */
export function useAddressActions(input: ReturnType<typeof useEstimateInput>) {
  const queryClient = useQueryClient()
  const seqRef = useRef(0)
  // `input` đổi mỗi lần render; giữ bản mới nhất trong ref để các hàm dưới đây không đổi danh tính.
  const inputRef = useRef(input)
  useEffect(() => {
    inputRef.current = input
  })

  const loadWards = useCallback(
    (provinceCode: string, datasetVersion: string) =>
      queryClient.fetchQuery({
        queryKey: [...designKeys.locations(), 'wards', provinceCode, datasetVersion],
        queryFn: () => estimateInputApi.listWards(provinceCode, datasetVersion),
        staleTime: WARDS_STALE
      }),
    [queryClient]
  )

  /** Địa chỉ "phường/xã, tỉnh/thành" của VietMap → mã tỉnh/phường của BE; không khớp tỉnh thì `null` (giữ nguyên). */
  const resolveRegion = useCallback(
    async (address: string): Promise<RegionChange | null> => {
      const provinceList = inputRef.current.provinces.data
      const region = parseRegion(address)
      const province = findByName(provinceList?.provinces, region.province)
      if (!provinceList || !province) return null
      const wards = await loadWards(province.code, provinceList.datasetVersion)
      const ward = findByName(wards, region.ward)
      const current = inputRef.current.getDraft()
      return {
        provinceCode: province.code,
        // Phường không khớp: cùng tỉnh thì giữ phường cũ, đổi tỉnh thì bỏ (phường cũ thuộc tỉnh khác).
        wardCode: ward ? ward.code : current?.provinceCode === province.code ? undefined : null,
        locationDatasetVersion: provinceList.datasetVersion
      }
    },
    [loadWards]
  )

  const regionPatch = (region: RegionChange | null) =>
    region
      ? {
          provinceCode: region.provinceCode,
          locationDatasetVersion: region.locationDatasetVersion,
          ...(region.wardCode !== undefined ? { wardCode: region.wardCode } : {})
        }
      : {}

  /** Khách chọn một dòng gợi ý (đã có toạ độ từ `maps/place`): ghi địa chỉ, tỉnh, phường và toạ độ CÙNG LÚC. */
  const pick = useCallback(
    async (choice: { text: string; latitude: number; longitude: number; region: string }) => {
      const seq = ++seqRef.current
      const release = inputRef.current.hold()
      try {
        const region = await resolveRegion(choice.region).catch(() => null)
        if (seq !== seqRef.current) return
        inputRef.current.patch({
          addressDetail: choice.text,
          latitude: choice.latitude,
          longitude: choice.longitude,
          ...regionPatch(region)
        })
      } finally {
        release()
      }
    },
    [resolveRegion]
  )

  /** Kéo ghim / bấm bản đồ: dời ghim ngay, rồi đổi số nhà đường + tỉnh + phường theo địa chỉ tại ghim. */
  const movePin = useCallback(
    async (latitude: number, longitude: number) => {
      const seq = ++seqRef.current
      const release = inputRef.current.hold()
      try {
        inputRef.current.patch({ latitude, longitude })
        const found = await geocodeApi.reverse(latitude, longitude).catch(() => null)
        if (seq !== seqRef.current || !found) return
        const region = found.address ? await resolveRegion(found.address).catch(() => null) : null
        if (seq !== seqRef.current) return
        // Không có địa chỉ quanh ghim thì giữ nguyên chữ đang có thay vì xoá trắng.
        inputRef.current.patch({ ...(found.name ? { addressDetail: found.name } : {}), ...regionPatch(region) })
      } finally {
        release()
      }
    },
    [resolveRegion]
  )

  /**
   * Khách đổi tỉnh/phường bằng tay: địa chỉ đã đổi nên phải lấy lại toạ độ cho nó. Tìm `số nhà, phường, tỉnh` lấy kết
   * quả đầu; không có kết quả (hoặc chưa nhập số nhà) thì giữ ghim hiện tại — khách kéo ghim để chỉnh.
   */
  const changeRegion = useCallback(async (change: { provinceCode: string; wardCode?: string }) => {
    const seq = ++seqRef.current
    const current = inputRef.current
    const release = current.hold()
    try {
      current.patch({ latitude: null, longitude: null })
      if (change.wardCode) current.chooseWard(change.wardCode)
      else current.chooseProvince(change.provinceCode)

      const draft = current.getDraft()
      const street = draft?.addressDetail.trim() ?? ''
      if (!street) return
      const provinceName = current.provinces.data?.provinces.find((item) => item.code === change.provinceCode)?.name
      const wardName = change.wardCode
        ? current.wards.data?.find((item) => item.code === change.wardCode)?.name
        : undefined
      const query = [street, wardName, provinceName].filter(Boolean).join(', ')
      const first = (await mapsApi.search(query).catch(() => []))[0]
      if (!first || seq !== seqRef.current) return
      const place = await mapsApi.place(first.refId).catch(() => null)
      if (!place || seq !== seqRef.current) return
      inputRef.current.patch({ latitude: place.latitude, longitude: place.longitude })
    } finally {
      release()
    }
  }, [])

  return { pick, movePin, changeRegion }
}
