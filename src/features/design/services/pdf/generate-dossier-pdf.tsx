import type { DossierPdfData, DossierPdfLabels } from './dossier-pdf.types'

/**
 * Dựng bộ hồ sơ PDF thật rồi tải về máy (mục III.4c, nút "Tải hồ sơ PDF").
 *
 * Dynamic-import cả @react-pdf/renderer lẫn tài liệu để cây ~600 KB không nằm
 * trong bundle của route.
 */
export async function generateDossierPdf(
  data: DossierPdfData,
  labels: DossierPdfLabels,
  fileName: string
): Promise<number> {
  const [{ pdf }, { DossierPdf }, { registerPdfFonts }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('./dossier-pdf'),
    import('./pdf-fonts')
  ])

  registerPdfFonts()

  const blob = await pdf(<DossierPdf data={data} labels={labels} />).toBlob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 5_000)

  return blob.size
}
