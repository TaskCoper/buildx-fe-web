import { Document, Page, Text, View } from '@react-pdf/renderer'

import type { DossierPdfData, DossierPdfLabels } from './dossier-pdf.types'
import { pdfStyles as s } from './pdf-styles'

/**
 * Bộ hồ sơ thi công dạng PDF (mục III.4c): trang bìa → thông tin dự án →
 * bảng dự toán chi tiết → đoạn văn tư vấn.
 *
 * Bản vẽ mặt bằng 2D và phối cảnh ngoại thất sẽ chèn vào giữa khi backend trả
 * ảnh render thật; hiện chưa có ảnh nên bỏ qua thay vì in khung rỗng.
 */
export function DossierPdf({ data, labels }: { data: DossierPdfData; labels: DossierPdfLabels }) {
  return (
    <Document title={`${labels.documentTitle} — ${data.projectName}`} author={data.brand}>
      <Page size='A4' style={s.cover}>
        <Text style={s.brand}>{data.brand}</Text>
        <Text style={s.coverEyebrow}>{labels.coverEyebrow}</Text>
        <Text style={s.coverTitle}>{labels.documentTitle}</Text>
        <Text style={s.coverProject}>{data.projectName}</Text>
        <View style={s.coverRule} />
        <Text style={s.coverIssued}>
          {labels.coverIssued} {data.issuedAt}
        </Text>
      </Page>

      <Page size='A4' style={s.page}>
        <Text style={s.sectionTitle}>{labels.infoTitle}</Text>
        {data.info.map((row) => (
          <View key={row.label} style={s.infoRow}>
            <Text style={s.infoLabel}>{row.label}</Text>
            <Text style={s.infoValue}>{row.value}</Text>
          </View>
        ))}

        {data.advisory.length > 0 ? (
          <>
            <Text style={s.blockTitle}>{labels.advisoryTitle}</Text>
            {data.advisory.map((paragraph, index) => (
              <Text key={index} style={s.paragraph}>
                {paragraph}
              </Text>
            ))}
          </>
        ) : null}

        <Text
          style={s.pageNumber}
          render={({ pageNumber, totalPages }) =>
            labels.page.replace('{page}', `${pageNumber}`).replace('{total}', `${totalPages}`)
          }
          fixed
        />
      </Page>

      <Page size='A4' style={s.page}>
        <Text style={s.sectionTitle}>{labels.estimateTitle}</Text>

        <View style={s.tableHead} fixed>
          <Text style={[s.tableHeadCell, s.colItem]}>{labels.columns.item}</Text>
          <Text style={[s.tableHeadCell, s.colUnit]}>{labels.columns.unit}</Text>
          <Text style={[s.tableHeadCell, s.colQty]}>{labels.columns.quantity}</Text>
          <Text style={[s.tableHeadCell, s.colPrice]}>{labels.columns.unitPrice}</Text>
          <Text style={[s.tableHeadCell, s.colAmount]}>{labels.columns.amount}</Text>
        </View>

        {data.sections.map((section) => (
          <View key={section.section} wrap>
            <View style={s.sectionBand}>
              <Text style={[s.tableHeadCell, s.colItem]}>{labels.sections[section.section]}</Text>
              <Text style={[s.tableHeadCell, s.colUnit]}> </Text>
              <Text style={[s.tableHeadCell, s.colQty]}> </Text>
              <Text style={[s.tableHeadCell, s.colPrice]}>{labels.sectionTotal}</Text>
              <Text style={[s.tableHeadCell, s.colAmount]}>{section.total}</Text>
            </View>

            {section.items.map((item) => (
              <View key={item.label} wrap={false}>
                <View style={s.row}>
                  <Text style={[s.colItem, s.itemRow]}>{item.label}</Text>
                  <Text style={s.colUnit}> </Text>
                  <Text style={s.colQty}> </Text>
                  <Text style={s.colPrice}> </Text>
                  <Text style={[s.colAmount, s.itemRow]}>{item.amount}</Text>
                </View>
                {item.children.map((child) => (
                  <View key={child.label} style={s.row}>
                    <Text style={[s.colItem, s.subLabel]}>{child.label}</Text>
                    <Text style={s.colUnit}>{child.unit}</Text>
                    <Text style={s.colQty}>{child.quantity}</Text>
                    <Text style={s.colPrice}>{child.unitPrice}</Text>
                    <Text style={s.colAmount}>{child.amount}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        ))}

        <View style={s.totalRow}>
          <Text style={s.totalLabel}>{labels.grandTotal}</Text>
          <Text style={s.totalValue}>{data.grandTotal}</Text>
        </View>

        <Text style={s.disclaimer}>{labels.disclaimer}</Text>

        <Text
          style={s.pageNumber}
          render={({ pageNumber, totalPages }) =>
            labels.page.replace('{page}', `${pageNumber}`).replace('{total}', `${totalPages}`)
          }
          fixed
        />
      </Page>
    </Document>
  )
}
