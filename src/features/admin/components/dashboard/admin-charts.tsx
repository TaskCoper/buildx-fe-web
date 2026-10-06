'use client'

import { BarChartOutlined, TableOutlined } from '@ant-design/icons'
import { Card, Col, Empty, Row, Segmented, Skeleton, Table, Typography } from 'antd'
import dynamic from 'next/dynamic'
import { useLocale, useTranslations } from 'next-intl'
import { useState, type ReactNode } from 'react'
import { useTheme } from 'next-themes'

import type { Locale } from '@/i18n/routing'
import { formatCurrency } from '@/shared/utils'
import { useAdminCollection } from '../../hooks/use-admin-data'

const { Text } = Typography

/*
 * G2 đo kích thước bằng DOM nên không dựng được ở phía máy chủ — nạp động,
 * tắt SSR. Khung `Skeleton` giữ đúng chiều cao để thẻ không nhảy khi chart tới.
 */
const Column = dynamic(() => import('@ant-design/charts').then((mod) => mod.Column), {
  ssr: false,
  loading: () => <Skeleton active paragraph={{ rows: 4 }} />
})
const Bar = dynamic(() => import('@ant-design/charts').then((mod) => mod.Bar), {
  ssr: false,
  loading: () => <Skeleton active paragraph={{ rows: 4 }} />
})

const CHART_HEIGHT = 240

/**
 * Bảng màu đã CHẠY QUA BỘ KIỂM TRA, không phải chọn bằng mắt.
 *
 * Mỗi biểu đồ ở đây chỉ có MỘT chuỗi số liệu, nên dùng một sắc xanh duy nhất
 * (thang tuần tự) thay vì mỗi cột một màu: tô màu theo danh mục khi danh mục
 * không mang ý nghĩa nhận dạng là mã hóa thừa — chiều dài cột đã nói hết.
 *
 * Đã thử bộ màu trạng thái (tốt/cảnh báo/nặng/nguy) cho biểu đồ đơn hàng nhưng
 * trượt: cặp cam ↔ vàng chỉ cách nhau ΔE 13,6 ở mắt thường (ngưỡng 15) và cả
 * hai đều dưới 3:1 trên nền trắng. Trạng thái giờ nằm ở nhãn trục, không phải
 * ở màu.
 *
 * Hai sắc xanh dưới đây đều đạt dải sáng và tương phản ≥ 3:1 trên đúng nền của
 * antd (#ffffff sáng, #141414 tối).
 */
const PALETTE = {
  light: {
    series: '#2a78d6',
    grid: '#e1e0d9',
    axis: '#c3c2b7',
    label: '#898781'
  },
  dark: {
    series: '#3987e5',
    grid: '#2c2c2a',
    axis: '#383835',
    label: '#898781'
  }
} as const

interface Point {
  label: string
  value: number
}

/**
 * Một thẻ biểu đồ, kèm công tắc đổi sang BẢNG.
 *
 * Bảng không phải trang trí: người đọc bằng trình đọc màn hình, người in ra
 * giấy đen trắng và người phân biệt màu kém đều cần một đường đọc số không dựa
 * vào hình. Tooltip chỉ bổ trợ, không được là lối duy nhất để biết con số.
 */
function ChartCard({
  title,
  hint,
  data,
  format,
  children
}: {
  title: string
  hint: string
  data: Point[]
  format: (value: number) => string
  children: ReactNode
}) {
  const t = useTranslations('admin')
  const [view, setView] = useState<'chart' | 'table'>('chart')
  const empty = data.every((point) => point.value === 0)

  return (
    <Card
      title={title}
      extra={
        <Segmented
          size='small'
          value={view}
          onChange={(next) => setView(next as 'chart' | 'table')}
          options={[
            { value: 'chart', icon: <BarChartOutlined />, title: t('charts.viewChart') },
            { value: 'table', icon: <TableOutlined />, title: t('charts.viewTable') }
          ]}
        />
      }
    >
      <Text type='secondary' style={{ display: 'block', marginBottom: 12 }}>
        {hint}
      </Text>

      {empty ? (
        <Empty description={t('charts.empty')} style={{ margin: `${CHART_HEIGHT / 4}px 0` }} />
      ) : view === 'chart' ? (
        children
      ) : (
        <Table<Point>
          size='small'
          pagination={false}
          rowKey='label'
          dataSource={data}
          columns={[
            { title: t('charts.tableLabel'), dataIndex: 'label' },
            {
              title: t('charts.tableValue'),
              dataIndex: 'value',
              align: 'right',
              render: (value: number) => format(value)
            }
          ]}
        />
      )}
    </Card>
  )
}

/**
 * BỐN BIỂU ĐỒ của trang Tổng quan, đặt TRÊN hàng đợi việc.
 *
 * Hàng đợi vẫn là thứ vận hành dùng hằng ngày nên không bỏ; biểu đồ trả lời câu
 * hỏi khác — tháng này bán được bao nhiêu, dự án đang tắc ở bước nào, đơn kẹt ở
 * trạng thái nào, nhà thầu phủ miền nào — tức là nhìn tháng chứ không nhìn ngày.
 */
export function AdminCharts() {
  const t = useTranslations('admin')
  const locale = useLocale() as Locale
  const { resolvedTheme } = useTheme()
  const colors = resolvedTheme === 'dark' ? PALETTE.dark : PALETTE.light

  const transactions = useAdminCollection('transactions')
  const orders = useAdminCollection('orders')
  const projects = useAdminCollection('designProjects')
  const contractors = useAdminCollection('contractors')

  const loading = [transactions, orders, projects, contractors].some((query) => query.isPending)
  if (loading) return <Skeleton active paragraph={{ rows: 8 }} />

  /* --- Doanh thu 6 tháng gần nhất -------------------------------------- */
  // Khung tháng dựng sẵn rồi mới đổ số vào: tháng không bán được đồng nào vẫn
  // phải hiện thành cột rỗng, bỏ đi thì trục thời gian nói dối.
  // Khóa tháng tính theo giờ MÁY, không cắt chuỗi `toISOString()`: chuỗi đó là
  // giờ UTC, ở UTC+7 ngày 1 lúc 0h thành ngày cuối tháng trước và cả trục lệch
  // một tháng. Giao dịch cũng parse ra `Date` vì mock webhook ghi giờ UTC.
  const monthKey = (date: Date) => date.getFullYear() * 12 + date.getMonth()
  const now = new Date()
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1)
    return { key: monthKey(date), label: `${date.getMonth() + 1}/${date.getFullYear()}` }
  })
  const paid = (transactions.data ?? []).filter((row) => row.status === 'paid')
  const revenue: Point[] = months.map((month) => ({
    label: month.label,
    value: paid
      .filter((row) => monthKey(new Date(row.createdAt)) === month.key)
      .reduce((sum, row) => sum + row.amount, 0)
  }))
  const compact = new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 })

  /* --- Dự án thiết kế theo bước ----------------------------------------- */
  const projectRows = projects.data ?? []
  const steps: Point[] = [1, 2, 3].map((step) => ({
    label: t(`charts.step`, { step }),
    value: projectRows.filter((row) => row.currentStep === step).length
  }))

  /* --- Đơn hàng theo trạng thái ----------------------------------------- */
  const orderRows = orders.data ?? []
  const statuses: Point[] = (['awaiting', 'verifying', 'paid', 'failed'] as const).map((status) => ({
    label: t(`orderStatus.${status}`),
    value: orderRows.filter((row) => row.status === status).length
  }))

  /* --- Nhà thầu theo miền ------------------------------------------------ */
  const contractorRows = contractors.data ?? []
  const regions: Point[] = (['north', 'central', 'south'] as const).map((region) => ({
    label: t(`contractors.regions.${region}`),
    value: contractorRows.filter((row) => row.region === region).length
  }))

  // Trục và lưới là HẠ TẦNG chứ không phải số liệu: kẻ mảnh, liền nét, lùi một
  // bậc so với nền. Lưới đứt nét đọc thành "ngưỡng" trong khi nó chỉ là lưới.
  const axis = {
    x: { line: true, lineStroke: colors.axis, tick: false, labelFill: colors.label, labelFontSize: 12 },
    y: { line: false, tick: false, labelFill: colors.label, labelFontSize: 12, gridStroke: colors.grid }
  }
  const countAxis = { ...axis, y: { ...axis.y, tickFilter: (value: number) => Number.isInteger(value) } }

  // Theme tối của G2 lo nền, tooltip và chữ chú thích; màu cột/trục vẫn lấy từ
  // PALETTE ở trên để hai chế độ dùng cùng một bảng đã kiểm.
  const common = {
    height: CHART_HEIGHT,
    autoFit: true,
    theme: resolvedTheme === 'dark' ? 'classicDark' : 'classic'
  }

  const columnStyle = { fill: colors.series, radiusTopLeft: 4, radiusTopRight: 4, maxWidth: 40 }
  const barStyle = { fill: colors.series, radiusTopRight: 4, radiusBottomRight: 4, maxWidth: 28 }

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} xl={12}>
        <ChartCard
          title={t('charts.revenue')}
          hint={t('charts.revenueHint')}
          data={revenue}
          format={(value) => formatCurrency(value, locale)}
        >
          <Column
            data={revenue}
            xField='label'
            yField='value'
            {...common}
            style={columnStyle}
            axis={{
              ...axis,
              y: { ...axis.y, labelFormatter: (value: number) => compact.format(value) }
            }}
            tooltip={{
              title: 'label',
              items: [{ field: 'value', valueFormatter: (v: number) => formatCurrency(v, locale) }]
            }}
          />
        </ChartCard>
      </Col>

      <Col xs={24} xl={12}>
        <ChartCard title={t('charts.steps')} hint={t('charts.stepsHint')} data={steps} format={String}>
          <Column
            data={steps}
            xField='label'
            yField='value'
            {...common}
            style={columnStyle}
            axis={countAxis}
            label={{ text: 'value', position: 'top', fill: colors.label, dy: -4 }}
          />
        </ChartCard>
      </Col>

      <Col xs={24} xl={12}>
        <ChartCard title={t('charts.orders')} hint={t('charts.ordersHint')} data={statuses} format={String}>
          <Bar
            data={statuses}
            xField='label'
            yField='value'
            {...common}
            style={barStyle}
            axis={countAxis}
            label={{ text: 'value', position: 'right', fill: colors.label, dx: 4 }}
          />
        </ChartCard>
      </Col>

      <Col xs={24} xl={12}>
        <ChartCard title={t('charts.regions')} hint={t('charts.regionsHint')} data={regions} format={String}>
          <Bar
            data={regions}
            xField='label'
            yField='value'
            {...common}
            style={barStyle}
            axis={countAxis}
            label={{ text: 'value', position: 'right', fill: colors.label, dx: 4 }}
          />
        </ChartCard>
      </Col>
    </Row>
  )
}
