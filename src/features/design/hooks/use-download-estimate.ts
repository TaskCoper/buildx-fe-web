'use client'

import { useCallback, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { env } from '@/shared/config/env'

import { estimateGenerationApi, waitForExport, downloadEstimateExport } from '../api/estimate-generation.api'
import { COST_SECTIONS } from '../constants/design.constants'
import {
  buildEstimateSheet,
  ESTIMATE_XLSX_COLUMNS,
  type EstimateXlsxContext,
  type EstimateXlsxLabels
} from '../services/estimate-xlsx.service'
import type { CostSection, EstimateResult } from '../types/design.types'

/**
 * Tải "Bảng dự toán chi tiết" (.xlsx) đầy đủ hạng mục con — dùng chung cho nút
 * "XEM CHI TIẾT" và liên kết "Tải bảng dự toán Excel" (mục III.3b, khối 1).
 *
 * Khi backend đã phát hành file thật, `result.xlsxUrl` là một URL tải được và
 * hook trả về đúng URL đó; ở chế độ mock (`xlsxUrl` rỗng hoặc `#`) file được
 * dựng ngay trong trình duyệt từ chính dữ liệu đang hiển thị.
 */
export function useDownloadEstimate(result: EstimateResult | undefined, context: EstimateXlsxContext) {
  const t = useTranslations('design.estimate')
  const [isPending, setPending] = useState(false)

  const remoteUrl = result?.xlsxUrl && result.xlsxUrl !== '#' ? result.xlsxUrl : null

  const download = useCallback(async () => {
    if (!result || isPending) return

    const fileName = t('xlsx.fileName', { project: context.projectName || t('xlsx.untitledProject') })

    setPending(true)
    try {
      // API thật chỉ cung cấp tệp của kết quả nguồn, không tự dựng Excel khi xuất hỏng.
      if (!env.NEXT_PUBLIC_USE_MOCK_API) {
        const started = await estimateGenerationApi.requestExport(result.projectId, 'Xlsx')
        const done = await waitForExport(() => estimateGenerationApi.getExport(result.projectId, started.exportId))
        if (done.state !== 'Ready') throw new Error(done.failureCode ?? 'ExportFailed')
        await downloadEstimateExport(result.projectId, started.exportId, fileName)
        return
      }

      if (remoteUrl) {
        const anchor = document.createElement('a')
        anchor.href = remoteUrl
        anchor.download = fileName
        anchor.click()
        // Giữ trạng thái "đang chuẩn bị" đủ lâu để người dùng nhận biết được
        // trước nhịp tick xác nhận hoàn tất.
        await new Promise((resolve) => window.setTimeout(resolve, 420))
        return
      }

      const labels: EstimateXlsxLabels = {
        title: t('xlsx.title'),
        sheet: t('xlsx.sheet'),
        project: t('xlsx.project'),
        address: t('xlsx.address'),
        floorArea: t('xlsx.floorArea'),
        columns: {
          no: t('xlsx.columns.no'),
          item: t('xlsx.columns.item'),
          unit: t('xlsx.columns.unit'),
          quantity: t('xlsx.columns.quantity'),
          unitPrice: t('xlsx.columns.unitPrice'),
          amount: t('xlsx.columns.amount')
        },
        sections: Object.fromEntries(COST_SECTIONS.map((s) => [s, t(`sections.${s}`)])) as Record<CostSection, string>,
        // Lấy template thô vì key này có biến `{section}`; truyền thẳng `t()`
        // mà thiếu biến sẽ làm next-intl ném FORMATTING_ERROR và chặn tải file.
        sectionTotal: t.raw('sectionTotal') as string,
        grandTotal: t('grandTotal'),
        note: t('xlsx.note')
      }

      // Lazy — bộ ghi .xlsx chỉ tải về khi người dùng thật sự bấm tải.
      const { default: writeXlsxFile } = await import('write-excel-file/browser')
      await writeXlsxFile(buildEstimateSheet(result, context, labels), {
        sheet: labels.sheet,
        columns: ESTIMATE_XLSX_COLUMNS
      }).toFile(fileName)
    } catch (error) {
      toast.error(t('exportError'))
      throw error
    } finally {
      setPending(false)
    }
  }, [result, context, isPending, remoteUrl, t])

  return { download, isPending }
}
