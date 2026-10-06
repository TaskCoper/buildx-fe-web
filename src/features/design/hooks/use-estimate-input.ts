'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { isApiError } from '@/shared/lib/api'
import { estimateInputApi, type EstimateDetail } from '../api/estimate-input.api'
import { designKeys } from '../api/design.keys'
import {
  applyBuildingType,
  changedFields,
  draftFromInput,
  inputBody,
  missingFields,
  normalizeSaved,
  type EstimateInputBody,
  type EstimateInputDraft
} from '../services/estimate-input.logic'

/** Chờ sau lần gõ cuối rồi mới lưu (BR-PROJ-003 khoản 3: tự lưu, không có nút Lưu nháp). */
const AUTOSAVE_DELAY_MS = 800
const STATIC_STALE = 60 * 60 * 1000

/**
 * - `idle`: chưa có thay đổi · `pending`: có thay đổi chưa gửi · `saving`: đang chờ BE xác nhận
 * - `saved`: BE xác nhận (chỉ báo "đã lưu" sau khi BE trả thành công, BR-PROJ-003 khoản 8)
 * - `error`: lưu hỏng (mạng / máy chủ) — nội dung vẫn giữ, có Thử lại và tự thử khi có mạng
 * - `denied`: BE từ chối vì quyền / gói / lượt / đang khoá đầu vào — không tự thử lại (khoản 7 phần Except)
 */
export type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error' | 'denied' | 'conflict'

/** Vì sao form không sửa được (BR-PROJ-005: AI đang chạy hoặc đã có kết quả thì khoá đầu vào). */
export type LockReason = 'noEdit' | 'generating' | 'generated' | null

const GENERATING_STATES = ['Pending', 'Processing']

function lockReasonOf(detail: EstimateDetail | undefined, deniedCode: string | null): LockReason {
  if (deniedCode === 'GenerationInProgress') return 'generating'
  if (deniedCode === 'EstimateAlreadyGenerated') return 'generated'
  if (!detail) return null
  if (detail.state === 'Succeeded') return 'generated'
  if (GENERATING_STATES.includes(detail.state)) return 'generating'
  return detail.canEdit === false ? 'noEdit' : null
}

/**
 * Bước 1 của bản dự toán THẬT: đọc bản (`GET /estimates/{id}`), danh mục ghim, tỉnh/xã; giữ bản đang nhập trong
 * state; tự lưu bằng `PUT /estimates/{id}/input`.
 *
 * Mỗi lần lưu gửi ĐỦ mọi trường kèm `changedFields` = trường khác bản đã lưu. Các lần lưu chạy NỐI TIẾP (mỗi lần
 * tăng `inputVersion`). Xung đột phiên bản giữ nội dung đang nhập và chặn ghi đến khi khách chủ động tải bản đã lưu.
 */
export function useEstimateInput(projectId: string) {
  const queryClient = useQueryClient()

  const detail = useQuery({
    queryKey: designKeys.estimateDetail(projectId),
    queryFn: ({ signal }) => estimateInputApi.getEstimate(projectId, signal),
    staleTime: Infinity,
    refetchOnWindowFocus: false
  })
  const catalog = useQuery({
    queryKey: designKeys.estimateCatalog(projectId),
    queryFn: () => estimateInputApi.getCatalog(projectId),
    staleTime: STATIC_STALE
  })
  const provinces = useQuery({
    queryKey: [...designKeys.locations(), 'provinces'],
    queryFn: () => estimateInputApi.listProvinces(),
    staleTime: STATIC_STALE,
    // Nguồn địa chỉ của BE có thể chưa sẵn sàng (503): báo ngay kèm nút Tải lại thay vì để ô chọn quay mãi.
    retry: false
  })

  const [draft, setDraft] = useState<EstimateInputDraft | null>(null)
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [deniedCode, setDeniedCode] = useState<string | null>(null)

  const draftRef = useRef<EstimateInputDraft | null>(null)
  const savedRef = useRef<EstimateInputBody | null>(null)
  const versionRef = useRef(0)
  const timerRef = useRef<number | null>(null)
  const chainRef = useRef<Promise<boolean>>(Promise.resolve(true))
  const deniedRef = useRef(false)
  const coordinatesSupported = true
  const conflictRef = useRef(false)
  const editsFrozenRef = useRef(false)
  const autoRetryRef = useRef(false)
  const requestRef = useRef<{
    key: string
    body: { expectedInputVersion: number; changedFields: string[]; input: EstimateInputBody }
  } | null>(null)
  // Đang chờ kết quả bản đồ (tìm toạ độ / tra địa chỉ): KHÔNG lưu, để khỏi gửi địa chỉ mới kèm toạ độ cũ (TDD-PROJ-001).
  const holdRef = useRef(0)
  const pendingSaveRef = useRef(false)
  const holdWaitersRef = useRef<(() => void)[]>([])

  // Nạp bản đã lưu vào form MỘT lần; sau đó form là nguồn sự thật, server chỉ xác nhận.
  useEffect(() => {
    if (!detail.data || draftRef.current) return
    const initial = draftFromInput(detail.data.input)
    draftRef.current = initial
    savedRef.current = normalizeSaved(detail.data.input)
    versionRef.current = detail.data.inputVersion
    setDraft(initial)
  }, [detail.data, projectId])

  const wardsProvince = draft?.provinceCode ?? null
  const datasetVersion = provinces.data?.datasetVersion ?? null
  const wards = useQuery({
    queryKey: [...designKeys.locations(), 'wards', wardsProvince, datasetVersion],
    queryFn: () => estimateInputApi.listWards(wardsProvince as string, datasetVersion as string),
    enabled: Boolean(wardsProvince && datasetVersion),
    staleTime: STATIC_STALE
  })

  /**
   * Lưu phần khác bản đã lưu, lặp cho tới khi không còn gì chưa lưu (người dùng gõ tiếp trong lúc lưu thì lưu nối
   * tiếp). Trả `true` nếu đã lưu hết.
   */
  const saveAll = useCallback(async (): Promise<boolean> => {
    for (;;) {
      if (holdRef.current > 0) await new Promise<void>((resolve) => holdWaitersRef.current.push(resolve))
      autoRetryRef.current = false
      const current = draftRef.current
      const saved = savedRef.current
      if (!current || !saved || deniedRef.current || conflictRef.current) return false
      const withCoordinates = true
      const changed = changedFields(saved, current, withCoordinates)
      if (changed.length === 0 && !requestRef.current) {
        setStatus((previous) => (previous === 'idle' ? previous : 'saved'))
        return true
      }

      const body = inputBody(current, withCoordinates)
      const addressChanged = changed.some((field) => ['provinceCode', 'wardCode', 'addressDetail'].includes(field))
      if (!requestRef.current && addressChanged && (body.latitude === null || body.longitude === null)) {
        setStatus('error')
        return false
      }
      requestRef.current ??= {
        key: crypto.randomUUID(),
        body: {
          expectedInputVersion: versionRef.current,
          changedFields: changed,
          input: body
        }
      }
      const request = requestRef.current
      setStatus('saving')
      try {
        const receipt = await estimateInputApi.saveInput(projectId, request.body, request.key)
        // GET là nguồn chính thức cho dữ liệu chuẩn hóa; không đoán từ body gửi lên.
        const fresh = await estimateInputApi.getEstimate(projectId)
        if (fresh.inputVersion !== receipt.savedInputVersion) {
          conflictRef.current = true
          requestRef.current = null
          setStatus('conflict')
          return false
        }
        const confirmed = normalizeSaved(fresh.input)
        const latest = draftRef.current ?? current
        const editedWhileSaving = changedFields(request.body.input, latest, true)
        const reconciled = draftFromInput(fresh.input)
        for (const field of editedWhileSaving) Object.assign(reconciled, { [field]: latest[field] })
        savedRef.current = confirmed
        versionRef.current = fresh.inputVersion
        requestRef.current = null
        draftRef.current = reconciled
        setDraft(reconciled)
        queryClient.setQueryData(designKeys.estimateDetail(projectId), fresh)
        setErrorMessage(null)
      } catch (error) {
        autoRetryRef.current = isApiError(error) && (error.status === 0 || error.status >= 500)
        if (isApiError(error)) {
          const code = error.messageCode ?? error.code
          if (code === 'InputVersionConflict') {
            requestRef.current = null
            conflictRef.current = true
            setStatus('conflict')
            return false
          }
          // Không tự thử lại dữ liệu sai, hạn mức hoặc dataset đã thay đổi.
          if (error.status > 0 && error.status < 500) requestRef.current = null
          // Quyền / gói / lượt / đang khoá: không tự thử lại để vượt khoá (BR-PROJ-003 phần Except).
          const locked = code === 'GenerationInProgress' || code === 'EstimateAlreadyGenerated'
          if (error.status === 403 || code === 'QuotaUnavailable' || locked) {
            deniedRef.current = true
            setDeniedCode(code ?? 'AccessForbidden')
            setErrorMessage(error.message)
            setStatus('denied')
            return false
          }
          setErrorMessage(error.message)
        } else {
          setErrorMessage(null)
        }
        setStatus('error')
        return false
      }
    }
  }, [projectId, queryClient])

  /** Xếp hàng một lượt lưu sau các lượt đang chạy (không bao giờ có hai PUT cùng lúc). */
  const enqueueSave = useCallback((): Promise<boolean> => {
    chainRef.current = chainRef.current.then(saveAll, saveAll)
    return chainRef.current
  }, [saveAll])

  const scheduleSave = useCallback(
    (delay: number = AUTOSAVE_DELAY_MS) => {
      if (deniedRef.current || conflictRef.current) return
      if (timerRef.current) window.clearTimeout(timerRef.current)
      setStatus('pending')
      if (holdRef.current > 0) {
        // Đang chờ bản đồ: nhớ là còn việc phải lưu, `release` sẽ lên lịch lại.
        pendingSaveRef.current = true
        return
      }
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null
        void enqueueSave()
      }, delay)
    },
    [enqueueSave]
  )

  /** Lưu NGAY phần còn dở (trước khi sang bước sau). Trả `true` khi đã lưu hết. */
  const flush = useCallback(async (): Promise<boolean> => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    // Chưa xong việc với bản đồ thì đợi xong rồi mới lưu, không lưu dở địa chỉ.
    if (holdRef.current > 0) await new Promise<void>((resolve) => holdWaitersRef.current.push(resolve))
    return enqueueSave()
  }, [enqueueSave])

  /**
   * Tạm KHÔNG tự lưu trong lúc chờ kết quả bản đồ. Trả hàm nhả: gọi khi đã có đủ cặp địa chỉ + toạ độ để lưu cùng nhau
   * (hoặc khi bỏ cuộc). Nhiều lần giữ chồng nhau thì chỉ lưu khi nhả hết.
   */
  const hold = useCallback((): (() => void) => {
    holdRef.current++
    let released = false
    return () => {
      if (released) return
      released = true
      holdRef.current = Math.max(0, holdRef.current - 1)
      if (holdRef.current > 0) return
      holdWaitersRef.current.splice(0).forEach((resolve) => resolve())
      if (pendingSaveRef.current) {
        pendingSaveRef.current = false
        scheduleSave()
      }
    }
  }, [scheduleSave])

  // Mất mạng → có mạng lại thì tự thử lưu (BR-PROJ-003 khoản 7).
  useEffect(() => {
    const onOnline = () => {
      if (status === 'error' && autoRetryRef.current) void flush()
    }
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [flush, status])

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    },
    []
  )

  const update = useCallback(
    (next: EstimateInputDraft) => {
      if (editsFrozenRef.current) return
      draftRef.current = next
      setDraft(next)
      scheduleSave()
    },
    [scheduleSave]
  )

  const patch = useCallback(
    (partial: Partial<EstimateInputDraft>) => {
      if (draftRef.current) update({ ...draftRef.current, ...partial })
    },
    [update]
  )

  const chooseBuildingType = useCallback(
    (buildingTypeId: string) => {
      if (draftRef.current && catalog.data) update(applyBuildingType(draftRef.current, catalog.data, buildingTypeId))
    },
    [catalog.data, update]
  )

  const chooseProvince = useCallback(
    (provinceCode: string) => {
      patch({ provinceCode, wardCode: null, locationDatasetVersion: provinces.data?.datasetVersion ?? null })
    },
    [patch, provinces.data?.datasetVersion]
  )

  const chooseWard = useCallback(
    (wardCode: string) => {
      patch({ wardCode, locationDatasetVersion: provinces.data?.datasetVersion ?? null })
    },
    [patch, provinces.data?.datasetVersion]
  )

  const missing = useMemo(
    () => (draft ? missingFields(draft, catalog.data, coordinatesSupported) : []),
    [catalog.data, coordinatesSupported, draft]
  )

  const reloadSaved = useCallback(async () => {
    try {
      const fresh = await estimateInputApi.getEstimate(projectId)
      const loaded = draftFromInput(fresh.input)
      savedRef.current = normalizeSaved(fresh.input)
      versionRef.current = fresh.inputVersion
      draftRef.current = loaded
      requestRef.current = null
      conflictRef.current = false
      deniedRef.current = false
      setDeniedCode(null)
      setDraft(loaded)
      setStatus('idle')
      queryClient.setQueryData(designKeys.estimateDetail(projectId), fresh)
      // Không tự gửi PUT sau tải lại: khách xem bản hiện hành trước khi sửa tiếp.
    } catch (error) {
      setErrorMessage(isApiError(error) ? error.message : null)
    }
  }, [projectId, queryClient])

  const lock = lockReasonOf(detail.data, deniedCode)

  /** Giữ nguyên bản vừa lưu trong lúc kiểm tra và gửi Generate. */
  const freezeEdits = useCallback(() => {
    editsFrozenRef.current = true
    return () => {
      editsFrozenRef.current = false
    }
  }, [])

  return {
    detail,
    catalog,
    provinces,
    wards,
    draft,
    missing,
    status,
    errorMessage,
    lock,
    deniedCode,
    patch,
    chooseBuildingType,
    chooseProvince,
    chooseWard,
    getDraft: () => draftRef.current,
    hold,
    freezeEdits,
    coordinatesSupported,
    flush,
    retry: conflictRef.current ? reloadSaved : flush
  }
}
