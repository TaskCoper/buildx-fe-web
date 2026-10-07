'use client'

import { useCallback, useEffect, useState } from 'react'

import { useApiErrorText } from '@/shared/hooks'

import {
  estimateGenerationApi,
  fetchSharedBlob,
  waitForExport,
  type ExportFormat
} from '../api/estimate-generation.api'

/** Lưu Blob thành tệp tải về (tên lấy từ `Content-Disposition` của BE, có tên dự phòng). */
export function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  // Để trình duyệt kịp bắt đầu tải rồi mới thu hồi.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/**
 * Tải PDF / Excel của hồ sơ qua LINK chia sẻ (công khai): yêu cầu xuất (`POST …/exports`, không AI, không lượt), chờ
 * Ready rồi tải tệp bằng token ở header. Không đăng nhập, không cookie.
 */
export function useSharedDownload(shareId: string, token: string) {
  const [pending, setPending] = useState<ExportFormat | null>(null)
  const apiErrorText = useApiErrorText()
  // `null` = chưa lỗi; chuỗi rỗng = lỗi không rõ lý do (giao diện dùng câu chung).
  const [failure, setFailure] = useState<string | null>(null)

  const download = useCallback(
    async (format: ExportFormat) => {
      if (pending) return
      setPending(format)
      setFailure(null)
      try {
        const started = await estimateGenerationApi.publicRequestExport(shareId, token, format)
        const done = await waitForExport(() => estimateGenerationApi.publicGetExport(shareId, token, started.exportId))
        if (done.state !== 'Ready') throw new Error(done.failureCode ?? 'ExportFailed')
        const { blob, fileName } = await fetchSharedBlob(
          estimateGenerationApi.publicExportFilePath(shareId, started.exportId),
          token
        )
        saveBlob(blob, fileName ?? `ho-so.${format === 'Pdf' ? 'pdf' : 'xlsx'}`)
      } catch (error) {
        setFailure(apiErrorText(error, ''))
      } finally {
        setPending(null)
      }
    },
    [pending, shareId, token, apiErrorText]
  )

  return { download, pending, failed: failure !== null, failureMessage: failure || null }
}

/**
 * Ảnh kết quả của link chia sẻ: token nằm ở header nên phải tải thành Blob rồi dựng URL tạm cho `<img>`. Lỗi (link
 * hết hạn, tệp chưa sẵn sàng) thì trả `null` để ô ảnh tự ẩn.
 */
export function useSharedImage(shareId: string, token: string, fileId: string | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!fileId) return
    let objectUrl: string | null = null
    let cancelled = false
    fetchSharedBlob(estimateGenerationApi.publicFilePath(shareId, fileId), token)
      .then(({ blob }) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [shareId, token, fileId])

  return url
}
