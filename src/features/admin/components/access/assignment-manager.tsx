'use client'

import { DeleteOutlined, SwapOutlined, UserAddOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, App, Button, Card, Empty, Form, Modal, Select, Space, Spin, Tag, Typography } from 'antd'
import { useLocale, useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'

import type { Locale } from '@/i18n/routing'
import { PERMISSIONS, useAuth } from '@/shared/auth'
import { isApiError } from '@/shared/lib/api'
import { formatDisplayDateTime } from '@/shared/utils'
import { adminKeys } from '../../api/admin.keys'
import {
  assignmentsAdminApi,
  type BmtAssignmentItem,
  type BmtNeedsReassignmentItem,
  type BmtStaffItem
} from '../../api/bmt/assignments.api'
import { ApiResourceManager } from '../common/api-resource-manager'
import type { RowAction } from '../common/row-actions-menu'
import { StatusTag } from '../common/status-tag'

const { Text } = Typography

/** Tình trạng hiệu lực để lọc danh sách phân công. */
type ActiveFilter = 'active' | 'all'

/** Nhãn nhân viên: "Họ Tên (email)", rơi về email khi thiếu tên. */
function staffLabel(staff: BmtStaffItem): string {
  const name = `${staff.firstName} ${staff.lastName}`.trim()
  return name ? `${name} (${staff.email})` : staff.email
}

/**
 * PHÂN CÔNG GÓI GIÁM SÁT — STORY-RBAC-003 / TDD-RBAC-003, quyền `assignment.manage`.
 *
 * Hai phần:
 *   1. Cần chia lại (banner từ `/assignments/needs-reassignment`): gói đang gán
 *      mà chưa có người hoặc người phụ trách đang bị khóa → nút "Phân công".
 *   2. Danh sách phân công (`/assignments`, phân trang thật): lọc theo nhân viên
 *      và tình trạng hiệu lực; mỗi dòng đang hiệu lực có Chuyển giao và Gỡ.
 *
 * Chỉ có một loại tài nguyên (gói giám sát). Điều kiện người nhận
 * (đang hoạt động + có `supervision.complete`) và trạng thái gói do backend kiểm;
 * bị từ chối thì hiện nguyên `err.message`.
 */
export function AssignmentManager() {
  const t = useTranslations('admin.rbacAssignments')
  const tAdmin = useTranslations('admin')
  const { message, modal } = App.useApp()
  const queryClient = useQueryClient()
  const { hasPermission } = useAuth()
  const canListStaff = hasPermission(PERMISSIONS.USER_MANAGE)

  const [staffFilter, setStaffFilter] = useState<string | 'all'>('all')
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('active')
  // Dòng đang mở modal Chuyển giao (nâng lên cấp cha để menu "…" chỉ cần mở nó).
  const [transferItem, setTransferItem] = useState<BmtAssignmentItem | null>(null)

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: adminKeys.bmt('assignments') }),
      queryClient.invalidateQueries({ queryKey: adminKeys.bmt('needs-reassignment') })
    ])

  // Danh sách nhân viên: vừa để lọc / chọn người nhận, vừa để tra tên theo id.
  const staffQuery = useQuery({
    queryKey: adminKeys.bmt('staff'),
    queryFn: () => assignmentsAdminApi.listStaff(),
    enabled: canListStaff
  })
  const staff = useMemo(() => staffQuery.data ?? [], [staffQuery.data])
  const activeStaff = useMemo(() => staff.filter((item) => item.status === 'Active'), [staff])
  const staffById = useMemo(() => new Map(staff.map((item) => [item.userId, item])), [staff])

  const filters = {
    staffUserId: staffFilter === 'all' ? undefined : staffFilter,
    activeOnly: activeFilter === 'active' ? true : undefined
  }

  const nameOf = (staffUserId: string, fallback?: string | null) => {
    const found = staffById.get(staffUserId)
    const name = found ? `${found.firstName} ${found.lastName}`.trim() : ''
    return name || fallback || '—'
  }

  return (
    <>
      <ApiResourceManager<BmtAssignmentItem>
        title={t('title')}
        description={t('description')}
        queryKey={adminKeys.bmt('assignments', filters)}
        fetchPage={({ pageIndex, pageSize }) =>
          assignmentsAdminApi.listAssignments({ pageIndex, pageSize, resourceType: 'SupervisionGrant', ...filters })
        }
        rowKey={(item) => item.id}
        drawerWidth={520}
        banner={
          <Space orientation='vertical' size={16} style={{ width: '100%' }}>
            {!canListStaff ? <Alert type='info' showIcon title={t('staffPermissionRequired')} /> : null}
            <NeedsReassignmentPanel
              activeStaff={activeStaff}
              staffLoading={staffQuery.isLoading}
              canListStaff={canListStaff}
            />
            <Space wrap>
              <Select<string | 'all'>
                disabled={!canListStaff}
                value={staffFilter}
                onChange={setStaffFilter}
                style={{ minWidth: 240 }}
                showSearch
                optionFilterProp='label'
                loading={staffQuery.isLoading}
                options={[
                  { value: 'all', label: t('filters.allStaff') },
                  ...staff.map((item) => ({ value: item.userId, label: staffLabel(item) }))
                ]}
              />
              <Select<ActiveFilter>
                value={activeFilter}
                onChange={setActiveFilter}
                style={{ minWidth: 180 }}
                options={[
                  { value: 'active', label: t('filters.activeOnly') },
                  { value: 'all', label: t('filters.allAssignments') }
                ]}
              />
            </Space>
          </Space>
        }
        columns={[
          {
            title: t('columns.staff'),
            key: 'staff',
            render: (_, item) => {
              const locked = staffById.get(item.staffUserId)?.status === 'Locked'
              return (
                <Space orientation='vertical' size={2}>
                  <Text strong>{nameOf(item.staffUserId, item.staffName)}</Text>
                  {locked ? <StatusTag tone='danger'>{t('lockedAssignee')}</StatusTag> : null}
                </Space>
              )
            }
          },
          {
            title: t('columns.resource'),
            key: 'resource',
            render: (_, item) => (
              <Space orientation='vertical' size={2}>
                <Tag color='purple'>{t('resourceTypes.SupervisionGrant')}</Tag>
                <Text copyable style={{ fontSize: 12 }} type='secondary'>
                  {item.resourceId}
                </Text>
              </Space>
            )
          },
          {
            title: t('columns.effectiveFrom'),
            dataIndex: 'effectiveFromUtc',
            width: 180,
            render: (value: string) => <Stamp value={value} />
          },
          {
            title: t('columns.effectiveTo'),
            key: 'effectiveTo',
            width: 180,
            render: (_, item) =>
              item.effectiveToUtc ? (
                <Space orientation='vertical' size={2}>
                  <Stamp value={item.effectiveToUtc} />
                  {item.endReason ? (
                    <Text type='secondary' style={{ fontSize: 12 }}>
                      {t(`endReasons.${item.endReason}`)}
                    </Text>
                  ) : null}
                </Space>
              ) : (
                <StatusTag tone='success'>{t('activeBadge')}</StatusTag>
              )
          }
        ]}
        rowActions={(item): RowAction[] => {
          // Dòng đã kết thúc hiệu lực thì không còn thao tác.
          if (item.effectiveToUtc) return []
          return [
            ...(canListStaff
              ? [
                  {
                    key: 'transfer',
                    label: t('transfer'),
                    icon: <SwapOutlined />,
                    onClick: () => setTransferItem(item)
                  }
                ]
              : []),
            {
              key: 'remove',
              label: t('remove'),
              icon: <DeleteOutlined />,
              danger: true,
              onClick: () =>
                modal.confirm({
                  title: t('removeConfirmTitle'),
                  content: t('removeConfirmBody'),
                  okText: t('remove'),
                  okButtonProps: { danger: true },
                  cancelText: tAdmin('actions.cancel'),
                  onOk: async () => {
                    try {
                      await assignmentsAdminApi.deleteAssignment(item.id)
                      message.success(t('feedback.removed'))
                      await invalidate()
                    } catch (err) {
                      message.error(isApiError(err) ? err.message : tAdmin('feedback.apiError'))
                    }
                  }
                })
            }
          ]
        }}
      />

      <StaffPickerModal
        open={transferItem !== null}
        title={t('transferTitle')}
        okText={t('transfer')}
        confirmLabel={t('selectStaff')}
        // Chuyển cho chính người đang phụ trách sẽ bị BE từ chối (DuplicateAssignment).
        options={activeStaff.filter((s) => s.userId !== transferItem?.staffUserId)}
        loading={staffQuery.isLoading}
        onClose={() => setTransferItem(null)}
        onSubmit={async (staffUserId) => {
          if (!transferItem) return
          await assignmentsAdminApi.transferAssignment(transferItem.id, { toStaffUserId: staffUserId })
          message.success(t('feedback.transferred'))
          await invalidate()
        }}
      />
    </>
  )
}

/** Thời điểm UTC → giờ Việt Nam (tiện ích dùng chung `shared/utils`). */
function Stamp({ value }: { value?: string | null }) {
  const locale = useLocale() as Locale
  return <>{value ? formatDisplayDateTime(value, locale) : '—'}</>
}

/** Banner "Cần chia lại": mỗi gói kèm nút Phân công. */
function NeedsReassignmentPanel({
  activeStaff,
  staffLoading,
  canListStaff
}: {
  activeStaff: BmtStaffItem[]
  staffLoading: boolean
  canListStaff: boolean
}) {
  const t = useTranslations('admin.rbacAssignments')
  const tAdmin = useTranslations('admin')
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [assignTo, setAssignTo] = useState<BmtNeedsReassignmentItem | null>(null)

  const { data, isPending, isError, error } = useQuery({
    queryKey: adminKeys.bmt('needs-reassignment'),
    queryFn: () => assignmentsAdminApi.listNeedsReassignment({ pageIndex: 1, pageSize: 100 })
  })

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: adminKeys.bmt('assignments') }),
      queryClient.invalidateQueries({ queryKey: adminKeys.bmt('needs-reassignment') })
    ])

  const items = data?.items ?? []

  return (
    <Card size='small' title={t('needsTitle')} className='admin-table-card'>
      <Text type='secondary' style={{ display: 'block', marginBottom: 12 }}>
        {t('needsDescription')}
      </Text>
      {isPending ? (
        <Spin />
      ) : isError ? (
        <Alert type='error' showIcon title={isApiError(error) ? error.message : tAdmin('feedback.apiError')} />
      ) : items.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('needsEmpty')} />
      ) : (
        <Space orientation='vertical' size={8} style={{ width: '100%' }}>
          {items.map((item) => (
            <div
              key={item.supervisionGrantId}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                flexWrap: 'wrap'
              }}
            >
              <Space orientation='vertical' size={2}>
                <Text strong>{item.constructionSiteName}</Text>
                <Space size={6}>
                  <StatusTag tone={item.status === 'NoAssignee' ? 'warning' : 'danger'}>
                    {t(`status.${item.status}`)}
                  </StatusTag>
                  <Text type='secondary' style={{ fontSize: 12 }}>
                    {item.supervisionGrantId}
                  </Text>
                </Space>
              </Space>
              <Button
                type='primary'
                size='small'
                disabled={!canListStaff}
                icon={<UserAddOutlined />}
                onClick={() => setAssignTo(item)}
              >
                {t('assign')}
              </Button>
            </div>
          ))}
        </Space>
      )}
      <StaffPickerModal
        open={assignTo !== null}
        title={t('assignTitle')}
        okText={t('assign')}
        confirmLabel={t('selectStaff')}
        options={activeStaff}
        loading={staffLoading}
        onClose={() => setAssignTo(null)}
        onSubmit={async (staffUserId) => {
          if (!assignTo) return
          await assignmentsAdminApi.createAssignment({
            staffUserId,
            resourceType: 'SupervisionGrant',
            resourceId: assignTo.supervisionGrantId
          })
          message.success(t('feedback.assigned'))
          await invalidate()
        }}
      />
    </Card>
  )
}

/** Modal chọn một nhân viên (dùng cho cả Phân công và Chuyển giao). */
function StaffPickerModal({
  open,
  title,
  okText,
  confirmLabel,
  options,
  loading,
  onClose,
  onSubmit
}: {
  open: boolean
  title: string
  okText: string
  confirmLabel: string
  options: BmtStaffItem[]
  loading: boolean
  onClose: () => void
  onSubmit: (staffUserId: string) => Promise<void>
}) {
  const t = useTranslations('admin.rbacAssignments')
  const tAdmin = useTranslations('admin')
  const { message } = App.useApp()
  const [form] = Form.useForm<{ staffUserId: string }>()
  const [busy, setBusy] = useState(false)

  async function submit() {
    const values = await form.validateFields().catch(() => null)
    if (!values) return
    setBusy(true)
    try {
      await onSubmit(values.staffUserId)
      form.resetFields()
      onClose()
    } catch (err) {
      message.error(isApiError(err) ? err.message : tAdmin('feedback.apiError'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      title={title}
      okText={okText}
      okButtonProps={{ loading: busy }}
      cancelText={tAdmin('actions.cancel')}
      onOk={() => void submit()}
      onCancel={() => {
        form.resetFields()
        onClose()
      }}
      destroyOnHidden
    >
      <Form form={form} layout='vertical'>
        <Form.Item name='staffUserId' label={confirmLabel} rules={[{ required: true, message: t('staffRequired') }]}>
          <Select
            showSearch
            optionFilterProp='label'
            loading={loading}
            placeholder={t('selectStaffPlaceholder')}
            notFoundContent={loading ? <Spin size='small' /> : t('noStaff')}
            options={options.map((item) => ({ value: item.userId, label: staffLabel(item) }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
