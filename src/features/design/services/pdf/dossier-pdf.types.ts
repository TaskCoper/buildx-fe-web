import type { CostSection } from '../../types/design.types'

/**
 * Dữ liệu đã bản địa hóa của bộ hồ sơ PDF (mục III.4c).
 *
 * Tài liệu PDF không gọi được `useTranslations`, nên lớp component dịch sẵn mọi
 * nhãn rồi truyền vào — cùng cách làm với file Excel dự toán.
 */
export interface DossierPdfLabels {
  documentTitle: string
  coverEyebrow: string
  coverIssued: string
  infoTitle: string
  info: Record<
    | 'customerName'
    | 'projectName'
    | 'phone'
    | 'address'
    | 'createdAt'
    | 'buildingType'
    | 'scale'
    | 'floorArea'
    | 'package'
    | 'style',
    string
  >
  estimateTitle: string
  columns: Record<'item' | 'unit' | 'quantity' | 'unitPrice' | 'amount', string>
  sections: Record<CostSection, string>
  sectionTotal: string
  grandTotal: string
  advisoryTitle: string
  disclaimer: string
  page: string
}

export interface DossierPdfSubItem {
  label: string
  unit: string
  quantity: string
  unitPrice: string
  amount: string
}

export interface DossierPdfItem {
  label: string
  amount: string
  children: DossierPdfSubItem[]
}

export interface DossierPdfSection {
  section: CostSection
  items: DossierPdfItem[]
  total: string
}

export interface DossierPdfData {
  brand: string
  /** Các dòng "nhãn — giá trị" ở trang thông tin dự án, đã lọc dòng rỗng. */
  info: { label: string; value: string }[]
  projectName: string
  issuedAt: string
  sections: DossierPdfSection[]
  grandTotal: string
  /** Đoạn văn tư vấn cá nhân hóa, mỗi phần tử là một đoạn. */
  advisory: string[]
}
