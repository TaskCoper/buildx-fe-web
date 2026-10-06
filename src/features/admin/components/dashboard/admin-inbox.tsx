'use client'

import {
  CalendarOutlined,
  CheckCircleTwoTone,
  DiffOutlined,
  RightOutlined,
  SafetyCertificateOutlined,
  SendOutlined,
  TeamOutlined
} from '@ant-design/icons'
import { Badge, Card, Col, Empty, Row, Skeleton, Statistic, Typography } from 'antd'
import { useLocale, useTranslations } from 'next-intl'
import { createElement, type ComponentType } from 'react'

import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { ADMIN_ROUTES, type AdminRoute } from '@/shared/constants'
import { formatCurrency } from '@/shared/utils'
import { useAdminCollection } from '../../hooks/use-admin-data'
import { invitationNeedsAction, pendingChangeRequests, relativeTime } from '../../services/ops.service'
import { AdminPage } from '../common/admin-page'
import { MockApiNotice } from '../common/mock-api-notice'
import { AdminCharts } from './admin-charts'

const { Text } = Typography

/** Khóa dịch `admin.inbox.queues.<key>` — khai hẹp để next-intl kiểm được khóa. */
type QueueKey = 'invitations' | 'inspections' | 'changeRequests' | 'bookings' | 'contractors'

interface Queue {
  key: QueueKey
  icon: ComponentType
  href: AdminRoute
  count: number
  /** Mốc của việc chờ LÂU NHẤT — "cũ nhất: 3 giờ trước". */
  oldest?: string | undefined
  /** Việc có người đang ngồi chờ (khách đợi gọi xác nhận…) — tô đỏ khi còn. */
  urgent?: boolean
}

function oldestOf(values: (string | undefined)[]): string | undefined {
  return values.filter((value): value is string => Boolean(value)).sort()[0]
}

/**
 * TỔNG QUAN = HÀNG ĐỢI VIỆC HÔM NAY.
 *
 * Người mở khu quản trị lúc 8 giờ sáng cần biết một điều: ai đang chờ mình. Nên
 * trang đầu không phải biểu đồ mà là danh sách hàng đợi, mỗi dòng một loại việc,
 * kèm số việc và việc cũ nhất đã chờ bao lâu, bấm vào là tới đúng màn đã lọc
 * sẵn trạng thái cần xử lý. Hàng đợi hết việc thì tự lùi xuống cuối.
 *
 * Thứ tự là thứ tự ưu tiên: lịch hẹn với người ngoài (nhà thầu, kỹ sư, kiến
 * trúc sư) → kiểm duyệt nội dung. Không có hàng đợi thanh toán: trạng thái đơn
 * do backend cập nhật qua webhook, vận hành không phải xác nhận tiền.
 */
export function AdminInbox() {
  const t = useTranslations('admin')
  const locale = useLocale() as Locale

  const orders = useAdminCollection('orders')
  const invitations = useAdminCollection('contractorInvitations')
  const supervision = useAdminCollection('supervisionProjects')
  const bookings = useAdminCollection('bookings')
  const contractors = useAdminCollection('contractors')

  const loading = [orders, invitations, supervision, bookings, contractors].some((query) => query.isPending)

  if (loading) {
    return (
      <AdminPage title={t('nav.dashboard')} description={t('inbox.description')}>
        <Skeleton active paragraph={{ rows: 10 }} />
      </AdminPage>
    )
  }

  const orderRows = orders.data ?? []
  const invitationRows = invitations.data ?? []
  const supervisionRows = supervision.data ?? []

  const invitationsToHandle = invitationRows.filter(invitationNeedsAction)
  const stagesToConfirm = supervisionRows.filter((project) =>
    project.stages.some((stage) => stage.status === 'inProgress' && stage.files.some((file) => file.by === 'KH'))
  )
  const changeRequests = pendingChangeRequests(supervisionRows)
  const pendingBookings = (bookings.data ?? []).filter((booking) => booking.status === 'pending')
  const unverified = (contractors.data ?? []).filter((contractor) => !contractor.verified)

  const queues: Queue[] = [
    {
      key: 'invitations',
      icon: SendOutlined,
      href: ADMIN_ROUTES.INVITATIONS,
      count: invitationsToHandle.length,
      oldest: oldestOf(invitationsToHandle.map((invitation) => invitation.survey.handledAt ?? invitation.sentAt)),
      urgent: true
    },
    {
      key: 'inspections',
      icon: SafetyCertificateOutlined,
      href: ADMIN_ROUTES.INSPECTIONS,
      count: stagesToConfirm.length
    },
    {
      key: 'changeRequests',
      icon: DiffOutlined,
      // Yêu cầu sửa đổi duyệt ngay trong màn Dự án giám sát.
      href: ADMIN_ROUTES.INSPECTIONS,
      count: changeRequests.length,
      oldest: oldestOf(changeRequests.map((request) => request.proposedAt))
    },
    {
      key: 'bookings',
      icon: CalendarOutlined,
      href: ADMIN_ROUTES.BOOKINGS,
      count: pendingBookings.length
    },
    {
      key: 'contractors',
      icon: TeamOutlined,
      href: ADMIN_ROUTES.CONTRACTORS,
      count: unverified.length
    }
  ]

  // Hàng đợi còn việc lên trước, giữ nguyên thứ tự ưu tiên trong từng nhóm.
  const sorted = [...queues.filter((queue) => queue.count > 0), ...queues.filter((queue) => queue.count === 0)]
  const totalOpen = queues.reduce((sum, queue) => sum + queue.count, 0)

  // So tháng theo giờ máy — cắt chuỗi `toISOString()` là giờ UTC, lệch tháng
  // trong 7 tiếng đầu mỗi tháng ở UTC+7.
  const now = new Date()
  const isThisMonth = (iso: string) => {
    const date = new Date(iso)
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
  }
  const paidThisMonth = orderRows.filter(
    (order) => order.status === 'paid' && order.paidAt !== undefined && isThisMonth(order.paidAt)
  )
  const revenue = paidThisMonth.reduce((sum, order) => sum + order.total, 0)
  const activeSupervision = supervisionRows.filter((project) =>
    project.stages.some((stage) => stage.status !== 'confirmed')
  ).length
  const openInvitations = invitationRows.filter(
    (invitation) => invitation.status !== 'done' && invitation.status !== 'rejected'
  ).length

  return (
    <AdminPage title={t('nav.dashboard')} description={t('inbox.description')}>
      <MockApiNotice />
      <Row gutter={[16, 16]}>
        <Col xs={12} lg={6}>
          <Card>
            <Statistic title={t('inbox.kpi.revenue')} value={formatCurrency(revenue, locale)} />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card>
            <Statistic title={t('inbox.kpi.paidOrders')} value={paidThisMonth.length} />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card>
            <Statistic title={t('inbox.kpi.openInvitations')} value={openInvitations} />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card>
            <Statistic title={t('inbox.kpi.activeSupervision')} value={activeSupervision} />
          </Card>
        </Col>
      </Row>

      <AdminCharts />

      <Card
        title={t('inbox.queuesTitle')}
        extra={<Text type='secondary'>{t('inbox.openTotal', { count: totalOpen })}</Text>}
        styles={{ body: { padding: 0 } }}
      >
        {totalOpen === 0 ? (
          <Empty
            image={<CheckCircleTwoTone twoToneColor='#2a753f' style={{ fontSize: 48 }} />}
            description={t('inbox.allClear')}
            style={{ padding: 32 }}
          />
        ) : null}
        <div className='divide-y divide-[var(--admin-border)]'>
          {sorted.map((queue) => (
            <Link key={queue.key} href={queue.href} style={{ display: 'block', color: 'inherit' }}>
              <div
                className='flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-[var(--admin-tint)]'
                style={{ opacity: queue.count === 0 ? 0.55 : 1 }}
              >
                <span
                  className='grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--admin-tint)] text-base'
                  style={{ color: '#2a753f' }}
                >
                  {createElement(queue.icon)}
                </span>
                <div className='min-w-0 flex-1'>
                  <Text strong style={{ display: 'block' }}>
                    {t(`inbox.queues.${queue.key}.title`)}
                  </Text>
                  <Text type='secondary' style={{ fontSize: 12 }}>
                    {queue.count > 0 && queue.oldest
                      ? t('inbox.oldest', { time: relativeTime(queue.oldest, locale) })
                      : t(`inbox.queues.${queue.key}.hint`)}
                  </Text>
                </div>
                <Badge
                  count={queue.count}
                  showZero
                  overflowCount={99}
                  color={queue.count === 0 ? '#d4d4d8' : queue.urgent ? '#dc2626' : '#2a753f'}
                />
                <RightOutlined style={{ color: 'var(--admin-muted, #a1a1aa)' }} />
              </div>
            </Link>
          ))}
        </div>
      </Card>
    </AdminPage>
  )
}
