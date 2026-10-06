'use client'

import { useCallback, useState } from 'react'
import { env } from '@/shared/config/env'
import { useLocale, useTranslations } from 'next-intl'

import type { Locale } from '@/i18n/routing'
import { siteConfig } from '@/shared/config/site'
import { formatCurrency, formatDisplayDate, formatNumber } from '@/shared/utils'
import { estimateGenerationApi, waitForExport, downloadEstimateExport } from '../api/estimate-generation.api'
import { COST_SECTIONS } from '../constants/design.constants'
import { displayProjectId } from '../services/estimate-input.logic'
import type { DossierPdfData, DossierPdfLabels, DossierPdfSection } from '../services/pdf/dossier-pdf.types'
import type { CostSection, Dossier, EstimateResult } from '../types/design.types'
import type { DossierProjectInfo } from '../components/dossier-overview'

interface UseDownloadDossierArgs {
  dossier: Dossier | undefined
  result: EstimateResult | undefined
  info: DossierProjectInfo
  /** Đoạn văn tư vấn đang hiển thị ở Bước 2, để in kèm vào hồ sơ. */
  advisory: string[]
}

/**
 * Nút "Tải hồ sơ PDF" (mục III.4c).
 *
 * Backend đã có file thật thì tải thẳng `dossier.pdfUrl`; ở chế độ mock, hồ sơ
 * được dựng ngay trong trình duyệt từ dữ liệu đang hiển thị.
 */
export function useDownloadDossier({ dossier, result, info, advisory }: UseDownloadDossierArgs) {
  const t = useTranslations('design.dossier')
  const tEstimate = useTranslations('design.estimate')
  const locale = useLocale() as Locale
  const [isPending, setPending] = useState(false)
  /** Dung lượng file vừa dựng — chỉ biết sau lần tải đầu ở chế độ mock. */
  const [generatedSize, setGeneratedSize] = useState<number | null>(null)

  const remoteUrl = dossier?.pdfUrl && dossier.pdfUrl !== '#' ? dossier.pdfUrl : null

  const download = useCallback(async () => {
    if (isPending) return

    const fileName = t('pdf.fileName', { project: info.projectName || siteConfig.name })

    if (!env.NEXT_PUBLIC_USE_MOCK_API) {
      if (!dossier) throw new Error('ExportNotReady')
      setPending(true)
      try {
        const started = await estimateGenerationApi.requestExport(dossier.projectId, 'Pdf')
        const done = await waitForExport(() => estimateGenerationApi.getExport(dossier.projectId, started.exportId))
        if (done.state !== 'Ready') throw new Error(done.failureCode ?? 'ExportFailed')
        await downloadEstimateExport(dossier.projectId, started.exportId, fileName)
      } finally {
        setPending(false)
      }
      return
    }
    if (remoteUrl) {
      const anchor = document.createElement('a')
      anchor.href = remoteUrl
      anchor.download = fileName
      anchor.click()
      return
    }
    if (!result) return

    setPending(true)
    try {
      const money = (value: number) => formatCurrency(value, locale)

      const sections: DossierPdfSection[] = COST_SECTIONS.map((key) =>
        result.sections.find((section) => section.section === key)
      )
        .filter((section) => section !== undefined)
        .map((section) => ({
          section: section.section,
          total: money(section.total),
          items: section.items.map((item) => ({
            label: item.label,
            amount: money(item.amount),
            children: item.children.map((child) => ({
              label: child.label,
              unit: child.unit,
              quantity: formatNumber(child.quantity, locale),
              unitPrice: money(child.unitPrice),
              amount: money(child.amount)
            }))
          }))
        }))

      const data: DossierPdfData = {
        brand: siteConfig.name,
        projectName: info.projectName,
        issuedAt: formatDisplayDate(new Date(), locale),
        grandTotal: money(result.grandTotal),
        sections,
        advisory,
        info: [
          [t('info.customerName'), info.customerName],
          [t('info.projectName'), `${info.projectName} (${displayProjectId(info.projectId)})`],
          [t('info.phone'), info.phone],
          [t('info.address'), info.address],
          [t('info.createdAt'), info.createdAt ? formatDisplayDate(info.createdAt, locale) : ''],
          [t('info.buildingType'), info.buildingTypeLabel],
          [t('info.scale'), info.scaleLabel],
          [t('info.floorArea'), t('floorAreaValue', { value: formatNumber(info.floorArea, locale) })],
          [t('info.package'), info.packageLabel],
          [t('info.style'), info.styleLabel]
        ]
          .filter(([, value]) => Boolean(value))
          .map(([label, value]) => ({ label: label ?? '', value: value ?? '' }))
      }

      const labels: DossierPdfLabels = {
        documentTitle: t('pdf.documentTitle'),
        coverEyebrow: t('pdf.coverEyebrow'),
        coverIssued: t('pdf.coverIssued'),
        infoTitle: t('infoTitle'),
        info: {
          customerName: t('info.customerName'),
          projectName: t('info.projectName'),
          phone: t('info.phone'),
          address: t('info.address'),
          createdAt: t('info.createdAt'),
          buildingType: t('info.buildingType'),
          scale: t('info.scale'),
          floorArea: t('info.floorArea'),
          package: t('info.package'),
          style: t('info.style')
        },
        estimateTitle: t('preview.estimate'),
        columns: {
          item: tEstimate('xlsx.columns.item'),
          unit: tEstimate('xlsx.columns.unit'),
          quantity: tEstimate('xlsx.columns.quantity'),
          unitPrice: tEstimate('xlsx.columns.unitPrice'),
          amount: tEstimate('xlsx.columns.amount')
        },
        sections: Object.fromEntries(COST_SECTIONS.map((s) => [s, tEstimate(`sections.${s}`)])) as Record<
          CostSection,
          string
        >,
        sectionTotal: tEstimate('sectionTotal'),
        grandTotal: tEstimate('grandTotal'),
        advisoryTitle: tEstimate('advisoryTitle'),
        disclaimer: tEstimate('xlsx.note'),
        // `t.raw` vì đây là KHUÔN chuỗi: số trang do @react-pdf/renderer điền
        // lúc phân trang, `t()` sẽ báo thiếu biến và văng lỗi.
        page: t.raw('pdf.page')
      }

      const { generateDossierPdf } = await import('../services/pdf/generate-dossier-pdf')
      setGeneratedSize(await generateDossierPdf(data, labels, fileName))
    } finally {
      setPending(false)
    }
  }, [isPending, remoteUrl, result, info, advisory, locale, t, tEstimate, dossier])

  // Cỡ file VỪA DỰNG được ưu tiên: đó là cỡ thật của thứ người dùng tải về,
  // còn `pdfSize` từ API chỉ là con số ước tính hiển thị kèm dấu "~".
  return { download, isPending, size: generatedSize ?? dossier?.pdfSize ?? null }
}
