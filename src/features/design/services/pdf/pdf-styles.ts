import { StyleSheet } from '@react-pdf/renderer'

import { PDF_FONT_FAMILY } from './pdf-fonts'

/**
 * Bảng màu bản in — lấy tinh thần từ token OKLCH trong `globals.css` nhưng ghi
 * bằng hex vì @react-pdf/renderer không hiểu biến CSS.
 */
const COLORS = {
  text: '#211d16',
  muted: '#6b6257',
  border: '#e6dfd1',
  soft: '#faf7ef',
  primary: '#8b5a2b',
  primarySoft: '#f5f0e6',
  brandDark: '#332b20'
} as const

export const pdfStyles = StyleSheet.create({
  cover: {
    fontFamily: PDF_FONT_FAMILY,
    fontSize: 10,
    color: COLORS.text,
    backgroundColor: COLORS.soft,
    padding: 56
  },
  page: {
    fontFamily: PDF_FONT_FAMILY,
    fontSize: 9.5,
    color: COLORS.text,
    paddingTop: 44,
    paddingBottom: 52,
    paddingHorizontal: 44,
    lineHeight: 1.45
  },

  brand: { fontSize: 13, fontWeight: 700, letterSpacing: 2, color: COLORS.brandDark },
  coverEyebrow: { marginTop: 140, fontSize: 9, letterSpacing: 3, color: COLORS.muted, textTransform: 'uppercase' },
  coverTitle: { marginTop: 10, fontSize: 30, fontWeight: 700, lineHeight: 1.2 },
  coverProject: { marginTop: 18, fontSize: 14, fontWeight: 500, color: COLORS.primary },
  coverRule: { marginTop: 26, height: 3, width: 96, backgroundColor: COLORS.primary },
  coverIssued: { marginTop: 26, fontSize: 9, color: COLORS.muted },

  sectionTitle: { fontSize: 14, fontWeight: 700, marginBottom: 12 },
  blockTitle: { fontSize: 10.5, fontWeight: 600, marginTop: 14, marginBottom: 6 },

  infoRow: { flexDirection: 'row', paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  infoLabel: { width: '38%', color: COLORS.muted },
  infoValue: { width: '62%', fontWeight: 500 },

  tableHead: { flexDirection: 'row', backgroundColor: COLORS.primarySoft, paddingVertical: 5, paddingHorizontal: 4 },
  tableHeadCell: { fontSize: 8.5, fontWeight: 700 },
  sectionBand: { flexDirection: 'row', backgroundColor: COLORS.soft, paddingVertical: 5, paddingHorizontal: 4 },
  row: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border
  },
  itemRow: { fontWeight: 600 },
  subLabel: { paddingLeft: 10, color: COLORS.muted },

  colItem: { width: '42%' },
  colUnit: { width: '10%', textAlign: 'center' },
  colQty: { width: '12%', textAlign: 'right' },
  colPrice: { width: '18%', textAlign: 'right' },
  colAmount: { width: '18%', textAlign: 'right' },

  totalRow: {
    flexDirection: 'row',
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 4,
    backgroundColor: COLORS.primarySoft
  },
  totalLabel: { flex: 1, fontSize: 11, fontWeight: 700 },
  totalValue: { fontSize: 11, fontWeight: 700, color: COLORS.primary },

  paragraph: { marginBottom: 6 },
  disclaimer: { marginTop: 14, fontSize: 8, color: COLORS.muted, lineHeight: 1.5 },

  pageNumber: { position: 'absolute', bottom: 24, left: 44, right: 44, fontSize: 8, color: COLORS.muted }
})
