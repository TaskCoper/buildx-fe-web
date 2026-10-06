'use client'

import { CheckOutlined, PhoneOutlined, RollbackOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { App, Descriptions, Form, Input, Segmented, Select, Spin, Typography } from 'antd'
import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'

import type { Locale } from '@/i18n/routing'
import { isApiError } from '@/shared/lib/api'
import { formatDisplayDateTime } from '@/shared/utils'
import { adminKeys } from '../../api/admin.keys'
import {
  CONSULT_LIMITS,
  consultAdminApi,
  type BmtConsultationRequestItem,
  type ConsultationRequestStatus
} from '../../api/bmt/consult.api'
import { ApiResourceManager } from '../common/api-resource-manager'
import type { RowAction } from '../common/row-actions-menu'
import { StatusTag, type StatusTone } from '../common/status-tag'

const { Text, Paragraph } = Typography

type StatusFilter = 'all' | ConsultationRequestStatus

const RESOURCE = 'consultation-requests'

const STATUS_TONE: Record<ConsultationRequestStatus, StatusTone> = {
  Pending: 'warning',
  Resolved: 'success'
}

interface RequestFormValues {
  status?: ConsultationRequestStatus
  internalNote?: string
  expectedVersion?: string
}

/** Ghi chú trống / toàn khoảng trắng → `null` (xóa ghi chú). */
const noteOrNull = (value?: string | null) => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

/**
 * YÊU CẦU TƯ VẤN KTS (STORY-CONSULT-003, BR-CONSULT-003/004) — dữ liệu trên BMT API.
 *
 * Hai trạng thái Chưa xử lý / Đã xử lý, được mở lại. Admin gọi số liên lạc trên
 * đơn để thống nhất lịch — thời gian khách chọn chỉ là mong muốn, không giữ chỗ.
 * Ghi chú nội bộ chỉ admin thấy, không vào email. Đổi trạng thái không gửi email.
 * Mặc định lọc Chưa xử lý — chỗ có khách đang đợi được gọi lại. Giờ hiển thị theo
 * giờ Việt Nam (UTC+7).
 */
export function BookingManager() {
  const t = useTranslations('admin')
  const tr = useTranslations('admin.consultRequests')
  const locale = useLocale() as Locale
  const { modal, message } = App.useApp()
  const [status, setStatus] = useState<StatusFilter>('Pending')

  const statusLabel = (value: ConsultationRequestStatus) => tr(`statuses.${value}`)

  return (
    <ApiResourceManager<BmtConsultationRequestItem>
      title={t('nav.bookings')}
      description={tr('description')}
      queryKey={adminKeys.bmt(RESOURCE, status)}
      fetchPage={(params) =>
        consultAdminApi.listRequests({
          pageIndex: params.pageIndex,
          pageSize: params.pageSize,
          status: status === 'all' ? undefined : status
        })
      }
      rowKey={(item) => item.id}
      banner={
        <Segmented<StatusFilter>
          value={status}
          onChange={setStatus}
          options={(['Pending', 'Resolved', 'all'] as const).map((value) => ({
            value,
            label: value === 'all' ? tr('statuses.all') : statusLabel(value)
          }))}
        />
      }
      columns={[
        {
          title: tr('desiredAt'),
          dataIndex: 'desiredAtUtc',
          width: 170,
          render: (value: string) => <Text strong>{formatDisplayDateTime(value, locale)}</Text>
        },
        {
          title: tr('customer'),
          key: 'customer',
          render: (_, record) => (
            <div style={{ minWidth: 0 }}>
              <Text strong style={{ display: 'block' }}>
                {record.customerName}
              </Text>
              <Text copyable={{ text: record.contactPhone }} type='secondary' style={{ fontSize: 12 }}>
                <PhoneOutlined /> {record.contactPhone}
              </Text>
            </div>
          )
        },
        { title: tr('architect'), dataIndex: 'architectName', width: 200 },
        {
          title: tr('status'),
          dataIndex: 'status',
          width: 140,
          render: (value: ConsultationRequestStatus) => (
            <StatusTag tone={STATUS_TONE[value]}>{statusLabel(value)}</StatusTag>
          )
        },
        {
          title: tr('createdAt'),
          dataIndex: 'createdOnUtc',
          width: 170,
          render: (value: string) => formatDisplayDateTime(value, locale)
        }
      ]}
      toFormValues={async (item) => {
        const detail = await consultAdminApi.getRequest(item.id)
        return {
          status: detail.status,
          internalNote: detail.internalNote ?? '',
          expectedVersion: detail.version
        }
      }}
      onUpdate={(values, item) => {
        const form = values as RequestFormValues
        return consultAdminApi.updateRequest(item.id, {
          status: form.status ?? item.status,
          internalNote: noteOrNull(form.internalNote),
          expectedVersion: form.expectedVersion ?? item.version
        })
      }}
      renderForm={(_, { item }) => (
        <>
          {item ? <RequestSummary id={item.id} /> : null}
          <Form.Item name='expectedVersion' hidden>
            <Input />
          </Form.Item>
          <Form.Item name='status' label={tr('status')} extra={tr('statusHint')} rules={[{ required: true }]}>
            <Select
              options={(['Pending', 'Resolved'] as const).map((value) => ({ value, label: statusLabel(value) }))}
            />
          </Form.Item>
          <Form.Item
            name='internalNote'
            label={tr('internalNote')}
            extra={tr('internalNoteHint')}
            rules={[
              { max: CONSULT_LIMITS.internalNote, message: t('fields.maxLength', { max: CONSULT_LIMITS.internalNote }) }
            ]}
          >
            <Input.TextArea rows={5} maxLength={CONSULT_LIMITS.internalNote} showCount />
          </Form.Item>
        </>
      )}
      rowActions={(item, ctx) => {
        // Đánh dấu Đã xử lý / Mở lại nhanh. PATCH là cập nhật nguyên khối (bắt
        // buộc có `internalNote`), nên đọc bản chi tiết để giữ nguyên ghi chú.
        const resolving = item.status === 'Pending'
        const label = resolving ? tr('markResolved') : tr('reopen')
        return [
          {
            key: 'toggle',
            label,
            icon: resolving ? <CheckOutlined /> : <RollbackOutlined />,
            onClick: () =>
              modal.confirm({
                title: resolving
                  ? tr('resolveTitle', { name: item.customerName })
                  : tr('reopenTitle', { name: item.customerName }),
                content: <div style={{ maxWidth: 300 }}>{resolving ? tr('resolveBody') : tr('reopenBody')}</div>,
                okText: label,
                cancelText: t('actions.cancel'),
                onOk: async () => {
                  try {
                    const detail = await consultAdminApi.getRequest(item.id)
                    await consultAdminApi.updateRequest(item.id, {
                      status: resolving ? 'Resolved' : 'Pending',
                      internalNote: detail.internalNote ?? null,
                      expectedVersion: detail.version
                    })
                    await ctx.refresh()
                    message.success(t('feedback.saved'))
                  } catch (err) {
                    message.error(isApiError(err) ? err.message : t('feedback.apiError'))
                  }
                }
              })
          }
        ] satisfies RowAction[]
      }}
      renderView={(item) => <RequestSummary id={item.id} withNote />}
    />
  )
}

/** Thông tin khách gửi (chỉ đọc) — đọc bản chi tiết vì danh sách không có nội dung tư vấn. */
function RequestSummary({ id, withNote = false }: { id: string; withNote?: boolean }) {
  const t = useTranslations('admin')
  const tr = useTranslations('admin.consultRequests')
  const locale = useLocale() as Locale
  const { data, isPending, error } = useQuery({
    queryKey: adminKeys.bmt(RESOURCE, 'detail', id),
    queryFn: () => consultAdminApi.getRequest(id),
    staleTime: 0
  })

  if (isPending) return <Spin />
  if (!data) return <Text type='danger'>{isApiError(error) ? error.message : t('feedback.apiError')}</Text>

  return (
    <Descriptions
      size='small'
      column={1}
      bordered
      style={{ marginBottom: 16 }}
      items={[
        { key: 'customer', label: tr('customer'), children: data.customerName },
        {
          key: 'phone',
          label: tr('contactPhone'),
          children: <Text copyable>{data.contactPhone}</Text>
        },
        { key: 'architect', label: tr('architect'), children: data.architectName },
        { key: 'desired', label: tr('desiredAt'), children: formatDisplayDateTime(data.desiredAtUtc, locale) },
        {
          key: 'message',
          label: tr('message'),
          children: data.message ? (
            <Paragraph style={{ whiteSpace: 'pre-line', margin: 0 }}>{data.message}</Paragraph>
          ) : (
            <Text type='secondary'>{tr('noMessage')}</Text>
          )
        },
        {
          key: 'status',
          label: tr('status'),
          children: <StatusTag tone={STATUS_TONE[data.status]}>{tr(`statuses.${data.status}`)}</StatusTag>
        },
        ...(withNote
          ? [
              {
                key: 'note',
                label: tr('internalNote'),
                children: data.internalNote ? (
                  <Paragraph style={{ whiteSpace: 'pre-line', margin: 0 }}>{data.internalNote}</Paragraph>
                ) : (
                  '-'
                )
              }
            ]
          : []),
        { key: 'created', label: tr('createdAt'), children: formatDisplayDateTime(data.createdOnUtc, locale) },
        {
          key: 'modified',
          label: tr('modifiedAt'),
          children: data.modifiedOnUtc ? formatDisplayDateTime(data.modifiedOnUtc, locale) : '-'
        }
      ]}
    />
  )
}
