'use client'

import { useQuery } from '@tanstack/react-query'
import { Descriptions, Spin, Tag, Typography } from 'antd'
import { useFormatter, useTranslations } from 'next-intl'

import { accessAuditApi, type AccessAuditItem } from '../../api/bmt/access-audit.api'
import { ApiResourceManager } from '../common/api-resource-manager'
import { StatusTag } from '../common/status-tag'

const { Text } = Typography

/** Các mã có nhãn i18n; mã lạ (nếu BE thêm) hiện thô. */
const ACTION_KEYS = [
  'RoleCreated',
  'RoleUpdated',
  'RoleDeleted',
  'RoleGranted',
  'RoleRevoked',
  'StaffCreated',
  'StaffFirstPasswordChanged',
  'StaffLocked',
  'StaffUnlocked',
  'StaffForceLoggedOut',
  'AssignmentCreated',
  'AssignmentTransferred',
  'AssignmentEnded'
] as const
type ActionKey = (typeof ACTION_KEYS)[number]
const isActionKey = (v: string): v is ActionKey => (ACTION_KEYS as readonly string[]).includes(v)

const TARGET_KEYS = ['Role', 'User', 'Assignment'] as const
type TargetKey = (typeof TARGET_KEYS)[number]
const isTargetKey = (v: string): v is TargetKey => (TARGET_KEYS as readonly string[]).includes(v)

/**
 * NHẬT KÝ THAY ĐỔI QUYỀN (STORY-RBAC-004) — CHỈ ĐỌC. Liệt kê các lần thao tác
 * vai trò / quyền / phân công (kể cả lần bị từ chối); mở một dòng để xem trạng
 * thái trước/sau. Không tạo/sửa/xoá: nhật ký chỉ ghi thêm (BR-RBAC-012).
 */
export function AccessAuditManager() {
  const t = useTranslations('admin')
  const c = useTranslations('admin.accessAudit')
  const format = useFormatter()

  const actionLabel = (v: string) => (isActionKey(v) ? c(`actionLabels.${v}`) : v)
  const targetTypeLabel = (v: string) => (isTargetKey(v) ? c(`targetTypes.${v}`) : v)
  const outcomeLabel = (v: string) => (v === 'Succeeded' || v === 'Rejected' ? c(`outcomeValues.${v}`) : v)

  return (
    <ApiResourceManager<AccessAuditItem>
      title={t('nav.accessAudit')}
      description={c('description')}
      queryKey={['admin', 'access-audit']}
      fetchPage={({ pageIndex, pageSize }) => accessAuditApi.list({ pageIndex, pageSize })}
      rowKey={(item) => item.id}
      drawerWidth={560}
      renderView={(item) => <AuditDetail id={item.id} />}
      columns={[
        {
          title: c('occurredAt'),
          dataIndex: 'occurredAtUtc',
          width: 170,
          render: (_, r) => (
            <Text style={{ fontSize: 13 }}>
              {format.dateTime(new Date(r.occurredAtUtc), { dateStyle: 'short', timeStyle: 'short' })}
            </Text>
          )
        },
        { title: c('actor'), dataIndex: 'actorName', render: (_, r) => <Text strong>{r.actorName}</Text> },
        { title: c('action'), dataIndex: 'action', render: (_, r) => <Tag>{actionLabel(r.action)}</Tag> },
        {
          title: c('target'),
          key: 'target',
          render: (_, r) => (
            <span>
              <Tag color='blue'>{targetTypeLabel(r.targetType)}</Tag>
              <Text>{r.targetLabel}</Text>
            </span>
          )
        },
        {
          title: c('outcome'),
          dataIndex: 'outcome',
          width: 120,
          render: (_, r) => (
            <StatusTag tone={r.outcome === 'Succeeded' ? 'success' : 'danger'}>{outcomeLabel(r.outcome)}</StatusTag>
          )
        }
      ]}
    />
  )
}

/** Chi tiết một dòng nhật ký: các trường danh sách + trạng thái trước/sau. */
function AuditDetail({ id }: { id: string }) {
  const t = useTranslations('admin')
  const c = useTranslations('admin.accessAudit')
  const format = useFormatter()
  const detail = useQuery({ queryKey: ['admin', 'access-audit', id], queryFn: () => accessAuditApi.get(id) })

  if (detail.isPending) return <Spin />
  if (!detail.data) return <Text type='secondary'>{t('feedback.apiError')}</Text>
  const d = detail.data
  const actionLabel = isActionKey(d.action) ? c(`actionLabels.${d.action}`) : d.action
  const targetLabel = isTargetKey(d.targetType) ? c(`targetTypes.${d.targetType}`) : d.targetType
  const outcomeLabel =
    d.outcome === 'Succeeded' || d.outcome === 'Rejected' ? c(`outcomeValues.${d.outcome}`) : d.outcome
  const json = (value: unknown) =>
    value == null ? (
      <Text type='secondary'>—</Text>
    ) : (
      <pre style={{ margin: 0, fontSize: 12, whiteSpace: 'pre-wrap' }}>{JSON.stringify(value, null, 2)}</pre>
    )

  return (
    <Descriptions
      size='small'
      column={1}
      bordered
      items={[
        {
          key: 'time',
          label: c('occurredAt'),
          children: format.dateTime(new Date(d.occurredAtUtc), { dateStyle: 'medium', timeStyle: 'short' })
        },
        { key: 'actor', label: c('actor'), children: d.actorName },
        { key: 'action', label: c('action'), children: actionLabel },
        { key: 'target', label: c('target'), children: `${targetLabel} · ${d.targetLabel}` },
        {
          key: 'outcome',
          label: c('outcome'),
          children: <StatusTag tone={d.outcome === 'Succeeded' ? 'success' : 'danger'}>{outcomeLabel}</StatusTag>
        },
        ...(d.rejectReasonCode ? [{ key: 'reason', label: c('rejectReason'), children: d.rejectReasonCode }] : []),
        { key: 'before', label: c('before'), children: json(d.before) },
        { key: 'after', label: c('after'), children: json(d.after) }
      ]}
    />
  )
}
