import type { Cell, Row, SheetData } from 'write-excel-file/browser'

import { COST_SECTIONS } from '../constants/design.constants'
import type { CostSection, EstimateResult } from '../types/design.types'

/**
 * Dựng nội dung file "Bảng dự toán chi tiết" (.xlsx) — cả nút "XEM CHI TIẾT" và
 * liên kết "Tải bảng dự toán Excel" đều tải đúng file này (mục III.3b, khối 1).
 *
 * Pure: chỉ trả về mảng ô, không đụng tới DOM và không tự ghi file — việc tải về
 * nằm ở `useDownloadEstimate`.
 */

/** Nhãn đã bản địa hóa, do lớp component lấy từ next-intl rồi truyền vào. */
export interface EstimateXlsxLabels {
  title: string
  sheet: string
  project: string
  address: string
  floorArea: string
  columns: {
    no: string
    item: string
    unit: string
    quantity: string
    unitPrice: string
    amount: string
  }
  sections: Record<CostSection, string>
  sectionTotal: string
  grandTotal: string
  note: string
}

export interface EstimateXlsxContext {
  projectName: string
  address: string
}

const COLUMN_COUNT = 6
const MONEY_FORMAT = '#,##0'
const HEADER_BACKGROUND = '#F5F0E6'
const SECTION_BACKGROUND = '#EFE7D6'
const MUTED_TEXT = '#6B6257'

/** Độ rộng cột: STT · hạng mục · ĐVT · khối lượng · đơn giá · thành tiền. */
export const ESTIMATE_XLSX_COLUMNS = [
  { width: 8 },
  { width: 46 },
  { width: 10 },
  { width: 12 },
  { width: 16 },
  { width: 18 }
]

/** Điền ô trống cho đủ `COLUMN_COUNT` để màu nền của hàng phủ hết bảng. */
function fill(cells: Row, backgroundColor?: string): Row {
  const padding = Array.from({ length: COLUMN_COUNT - cells.length }, () =>
    backgroundColor ? { backgroundColor } : null
  )
  return [...cells, ...padding]
}

function money(value: number, extra: Partial<Exclude<Cell, null | undefined>> = {}): Cell {
  return { value, type: Number, format: MONEY_FORMAT, align: 'right', ...extra }
}

function sectionTotalLabel(template: string, section: string) {
  return template.replace('{section}', section).trim()
}

export function buildEstimateSheet(
  result: EstimateResult,
  context: EstimateXlsxContext,
  labels: EstimateXlsxLabels
): SheetData {
  const rows: SheetData = [
    fill([{ value: labels.title, fontSize: 14, fontWeight: 'bold', columnSpan: COLUMN_COUNT }]),
    fill([
      { value: labels.project, fontWeight: 'bold' },
      { value: context.projectName, columnSpan: COLUMN_COUNT - 1 }
    ]),
    fill([
      { value: labels.address, fontWeight: 'bold' },
      { value: context.address, columnSpan: COLUMN_COUNT - 1 }
    ]),
    fill([
      { value: labels.floorArea, fontWeight: 'bold' },
      { value: result.estimatedFloorArea, type: Number, columnSpan: COLUMN_COUNT - 1 }
    ]),
    [],
    [
      labels.columns.no,
      labels.columns.item,
      labels.columns.unit,
      labels.columns.quantity,
      labels.columns.unitPrice,
      labels.columns.amount
    ].map<Cell>((value) => ({
      value,
      fontWeight: 'bold',
      align: 'center',
      wrap: true,
      backgroundColor: HEADER_BACKGROUND
    }))
  ]

  // Thứ tự phần bám theo COST_SECTIONS để khớp thứ tự tab trên màn hình.
  const ordered = COST_SECTIONS.map((section) => result.sections.find((s) => s.section === section)).filter(
    (section) => section !== undefined
  )

  ordered.forEach((section, sectionIndex) => {
    const sectionNo = String.fromCharCode(65 + sectionIndex) // A · B · C

    rows.push(
      fill(
        [
          { value: sectionNo, fontWeight: 'bold', align: 'center', backgroundColor: SECTION_BACKGROUND },
          { value: labels.sections[section.section], fontWeight: 'bold', backgroundColor: SECTION_BACKGROUND }
        ],
        SECTION_BACKGROUND
      )
    )

    section.items.forEach((item, itemIndex) => {
      const itemNo = `${sectionNo}${itemIndex + 1}`

      rows.push([
        { value: itemNo, align: 'center', fontWeight: 'bold' },
        { value: item.label, fontWeight: 'bold' },
        null,
        null,
        null,
        money(item.amount, { fontWeight: 'bold' })
      ])

      item.children.forEach((child, childIndex) => {
        rows.push([
          { value: `${itemNo}.${childIndex + 1}`, align: 'center' },
          { value: child.label, wrap: true, indent: 1 },
          { value: child.unit, align: 'center' },
          { value: child.quantity, type: Number, align: 'right' },
          money(child.unitPrice),
          money(child.amount)
        ])
      })
    })

    rows.push([
      null,
      {
        value: sectionTotalLabel(labels.sectionTotal, labels.sections[section.section]),
        fontWeight: 'bold',
        align: 'right'
      },
      null,
      null,
      null,
      money(section.total, { fontWeight: 'bold' })
    ])
    rows.push([])
  })

  rows.push([
    { backgroundColor: HEADER_BACKGROUND },
    { value: labels.grandTotal, fontWeight: 'bold', fontSize: 12, align: 'right', backgroundColor: HEADER_BACKGROUND },
    { backgroundColor: HEADER_BACKGROUND },
    { backgroundColor: HEADER_BACKGROUND },
    { backgroundColor: HEADER_BACKGROUND },
    money(result.grandTotal, { fontWeight: 'bold', fontSize: 12, backgroundColor: HEADER_BACKGROUND })
  ])
  rows.push([])
  rows.push(fill([{ value: labels.note, columnSpan: COLUMN_COUNT, fontSize: 9, textColor: MUTED_TEXT }]))

  return rows
}
