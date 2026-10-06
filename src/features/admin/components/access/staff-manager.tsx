'use client'

import {
  CopyOutlined,
  DeleteOutlined,
  LockOutlined,
  LogoutOutlined,
  TeamOutlined,
  UnlockOutlined
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import {
  Alert,
  App,
  Button,
  Descriptions,
  Divider,
  Drawer,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Tag,
  Typography
} from 'antd'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { PERMISSIONS, useAuth } from '@/shared/auth'
import { isApiError } from '@/shared/lib/api'
import { adminKeys } from '../../api/admin.keys'
import {
  createStaff,
  forceLogout,
  listRoles,
  listStaff,
  lockStaff,
  revokeRole,
  unlockStaff,
  grantRole,
  type RoleSummary,
  type StaffCreated,
  type StaffItem,
  type StaffRoleRef
} from '../../api/bmt/staff.api'
import { ApiResourceManager } from '../common/api-resource-manager'
import type { RowAction } from '../common/row-actions-menu'
import { StatusTag } from '../common/status-tag'

const { Text, Paragraph } = Typography

const RESOURCE = 'rbac-staff'
const ROLES_KEY = adminKeys.bmt('rbac-roles')

/** Vai trò hệ thống Khách hàng — không gán cho nhân viên (BR-RBAC-005). */
const CUSTOMER_ROLE_CODE = 'customer'

const assignableRoles = (roles: RoleSummary[]) => roles.filter((role) => role.code !== CUSTOMER_ROLE_CODE)

interface CreateStaffFormValues {
  email?: string
  firstName?: string
  lastName?: string
  roleIds?: string[]
}

const fullName = (item: { lastName: string; firstName: string }) => `${item.lastName} ${item.firstName}`.trim()

/**
 * TÀI KHOẢN NHÂN VIÊN (STORY-RBAC-002) — dữ liệu trên BMT API.
 *
 * Người quản trị tạo tài khoản (BE sinh mật khẩu, hiển thị MỘT LẦN), gán / thu hồi
 * vai trò, khóa / mở khóa và buộc đăng xuất. Danh sách trả mảng thẳng nên lọc và
 * phân trang tại client. Lỗi nghiệp vụ của BE (`SelfPrivilegeEscalation`,
 * `RoleNotAssignableToStaff`, `StaffHasActiveAssignments`, `CannotLockSelf`,
 * `LastAdminProtected`…) hiện nguyên `err.message`.
 */
export function StaffManager() {
  const t = useTranslations('admin')
  const tr = useTranslations('admin.rbacStaff')
  const { message, modal } = App.useApp()
  const { hasPermission, hasAllPermissions } = useAuth()
  const canManageRoles = hasPermission(PERMISSIONS.ROLE_MANAGE)
  const canCreate = hasAllPermissions([PERMISSIONS.USER_MANAGE, PERMISSIONS.ROLE_MANAGE])

  const [rolesTarget, setRolesTarget] = useState<StaffItem | null>(null)
  const [created, setCreated] = useState<StaffCreated | null>(null)

  const { data: roles = [] } = useQuery({ queryKey: ROLES_KEY, queryFn: listRoles, enabled: canManageRoles })
  const roleOptions = assignableRoles(roles)

  return (
    <>
      <ApiResourceManager<StaffItem>
        title={tr('title')}
        description={tr('description')}
        queryKey={adminKeys.bmt(RESOURCE)}
        searchable
        fetchPage={async ({ pageIndex, pageSize, keyword }) => {
          const all = await listStaff()
          const kw = keyword?.trim().toLowerCase()
          const filtered = kw
            ? all.filter((item) => fullName(item).toLowerCase().includes(kw) || item.email.toLowerCase().includes(kw))
            : all
          const start = (pageIndex - 1) * pageSize
          return {
            items: filtered.slice(start, start + pageSize),
            pageIndex,
            pageSize,
            totalCount: filtered.length,
            hasNextPage: start + pageSize < filtered.length,
            hasPreviousPage: pageIndex > 1
          }
        }}
        rowKey={(item) => item.userId}
        drawerWidth={560}
        columns={[
          {
            title: tr('columns.name'),
            key: 'name',
            render: (_, record) => <Text strong>{fullName(record) || tr('noName')}</Text>
          },
          { title: tr('columns.email'), dataIndex: 'email', key: 'email' },
          {
            title: tr('columns.status'),
            dataIndex: 'status',
            key: 'status',
            width: 120,
            render: (status: StaffItem['status']) => (
              <StatusTag tone={status === 'Active' ? 'success' : 'danger'}>{tr(`status.${status}`)}</StatusTag>
            )
          },
          {
            title: tr('columns.roles'),
            key: 'roles',
            render: (_, record) =>
              record.roles.length ? (
                <Space size={4} wrap>
                  {record.roles.map((role) => (
                    <Tag key={role.id}>{role.name}</Tag>
                  ))}
                </Space>
              ) : (
                <Text type='secondary'>{tr('noRoles')}</Text>
              )
          },
          {
            title: tr('columns.firstLogin'),
            dataIndex: 'mustChangePassword',
            key: 'mustChangePassword',
            width: 200,
            render: (mustChange: boolean) =>
              mustChange ? (
                <StatusTag tone='warning'>{tr('mustChangePassword')}</StatusTag>
              ) : (
                <Text type='secondary'>{tr('passwordChanged')}</Text>
              )
          }
        ]}
        createValues={() => ({ roleIds: [] })}
        onCreate={
          canCreate
            ? async (values) => {
                const form = values as CreateStaffFormValues
                const result = await createStaff({
                  email: (form.email ?? '').trim(),
                  firstName: (form.firstName ?? '').trim(),
                  lastName: (form.lastName ?? '').trim(),
                  roleIds: form.roleIds ?? []
                })
                // Bắt lấy mật khẩu sinh ra để hiện một lần sau khi ngăn kéo đóng.
                setCreated(result)
                return result
              }
            : undefined
        }
        rowActions={(item, ctx): RowAction[] => {
          const isLocked = item.status === 'Locked'
          return [
            ...(canManageRoles
              ? [
                  {
                    key: 'manageRoles',
                    label: tr('actions.manageRoles'),
                    icon: <TeamOutlined />,
                    onClick: () => setRolesTarget(item)
                  }
                ]
              : []),
            {
              key: 'lock',
              label: isLocked ? tr('actions.unlock') : tr('actions.lock'),
              icon: isLocked ? <UnlockOutlined /> : <LockOutlined />,
              danger: !isLocked,
              onClick: () =>
                modal.confirm({
                  title: isLocked
                    ? tr('confirm.unlockTitle', { name: fullName(item) })
                    : tr('confirm.lockTitle', { name: fullName(item) }),
                  content: (
                    <div style={{ maxWidth: 300 }}>{isLocked ? tr('confirm.unlockBody') : tr('confirm.lockBody')}</div>
                  ),
                  okText: t('actions.confirm'),
                  cancelText: t('actions.cancel'),
                  okButtonProps: { danger: !isLocked },
                  onOk: async () => {
                    try {
                      const status =
                        item.status === 'Active' ? await lockStaff(item.userId) : await unlockStaff(item.userId)
                      await ctx.refresh()
                      if (item.status === 'Active') {
                        message.success(
                          status.activeAssignmentCount > 0
                            ? tr('feedback.lockedWithAssignments', { count: status.activeAssignmentCount })
                            : tr('feedback.locked')
                        )
                      } else {
                        message.success(tr('feedback.unlocked'))
                      }
                    } catch (err) {
                      message.error(isApiError(err) ? err.message : t('feedback.apiError'))
                    }
                  }
                })
            },
            {
              key: 'forceLogout',
              label: tr('actions.forceLogout'),
              icon: <LogoutOutlined />,
              onClick: () =>
                modal.confirm({
                  title: tr('confirm.forceLogoutTitle', { name: fullName(item) }),
                  content: <div style={{ maxWidth: 300 }}>{tr('confirm.forceLogoutBody')}</div>,
                  okText: t('actions.confirm'),
                  cancelText: t('actions.cancel'),
                  onOk: async () => {
                    try {
                      await forceLogout(item.userId)
                      message.success(tr('feedback.forcedLogout'))
                    } catch (err) {
                      message.error(isApiError(err) ? err.message : t('feedback.apiError'))
                    }
                  }
                })
            }
          ]
        }}
        renderForm={() => (
          <>
            <Alert type='info' showIcon style={{ marginBottom: 16 }} message={tr('form.passwordNotice')} />
            <Form.Item
              name='email'
              label={tr('form.email')}
              rules={[
                { required: true, whitespace: true, message: t('fields.requiredMessage') },
                { type: 'email', message: t('fields.emailMessage') }
              ]}
            >
              <Input autoComplete='off' placeholder={tr('form.emailPlaceholder')} />
            </Form.Item>
            <Form.Item
              name='lastName'
              label={tr('form.lastName')}
              rules={[{ required: true, whitespace: true, message: t('fields.requiredMessage') }]}
            >
              <Input autoComplete='off' />
            </Form.Item>
            <Form.Item
              name='firstName'
              label={tr('form.firstName')}
              rules={[{ required: true, whitespace: true, message: t('fields.requiredMessage') }]}
            >
              <Input autoComplete='off' />
            </Form.Item>
            <Form.Item
              name='roleIds'
              label={tr('form.roles')}
              extra={tr('form.rolesHint')}
              rules={[{ required: true, type: 'array', min: 1, message: tr('form.rolesRequired') }]}
            >
              <Select
                mode='multiple'
                optionFilterProp='label'
                placeholder={tr('form.rolesPlaceholder')}
                options={roleOptions.map((role) => ({ value: role.id, label: role.name }))}
              />
            </Form.Item>
          </>
        )}
      />

      <GeneratedPasswordModal created={created} onClose={() => setCreated(null)} />

      {canManageRoles ? (
        <StaffRolesDrawer target={rolesTarget} roles={roleOptions} onClose={() => setRolesTarget(null)} />
      ) : null}
    </>
  )
}

/**
 * Hộp hiển thị mật khẩu do BE sinh — CHỈ MỘT LẦN. Không tự đóng: người quản trị
 * phải bấm xác nhận đã lưu (BR-RBAC-006). Không có đường xem lại sau khi đóng.
 */
function GeneratedPasswordModal({ created, onClose }: { created: StaffCreated | null; onClose: () => void }) {
  const tr = useTranslations('admin.rbacStaff')
  const { message } = App.useApp()

  const copy = async () => {
    if (!created) return
    try {
      await navigator.clipboard.writeText(created.generatedPassword)
      message.success(tr('password.copied'))
    } catch {
      message.error(tr('password.copyFailed'))
    }
  }

  return (
    <Modal
      open={created !== null}
      title={tr('password.title')}
      onCancel={onClose}
      maskClosable={false}
      keyboard={false}
      footer={
        <Button type='primary' onClick={onClose}>
          {tr('password.saved')}
        </Button>
      }
    >
      {created ? (
        <>
          <Alert type='warning' showIcon style={{ marginBottom: 16 }} message={tr('password.warning')} />
          <Descriptions
            column={1}
            size='small'
            items={[{ key: 'email', label: tr('form.email'), children: created.email }]}
          />
          <Paragraph type='secondary' style={{ marginTop: 12, marginBottom: 4 }}>
            {tr('password.label')}
          </Paragraph>
          <Space.Compact style={{ width: '100%' }}>
            <Input readOnly value={created.generatedPassword} style={{ fontFamily: 'monospace', fontWeight: 600 }} />
            <Button type='primary' icon={<CopyOutlined />} onClick={copy}>
              {tr('password.copy')}
            </Button>
          </Space.Compact>
        </>
      ) : null}
    </Modal>
  )
}

/**
 * Ngăn kéo chi tiết vai trò của một nhân viên: xem vai trò đang giữ (gỡ bằng nút),
 * thêm vai trò bằng ô chọn. Giữ bản sao vai trò tại chỗ để phản ánh ngay sau mỗi
 * thao tác mà không cần đóng / mở lại.
 */
function StaffRolesDrawer({
  target,
  roles,
  onClose
}: {
  target: StaffItem | null
  roles: RoleSummary[]
  onClose: () => void
}) {
  return (
    <Drawer open={target !== null} onClose={onClose} title={target ? fullName(target) : ''} width={480} destroyOnHidden>
      {/* key theo userId để đổi nhân viên là nạp lại state vai trò từ đầu. */}
      {target ? <StaffRolesPanel key={target.userId} target={target} roles={roles} /> : null}
    </Drawer>
  )
}

function StaffRolesPanel({ target, roles }: { target: StaffItem; roles: RoleSummary[] }) {
  const t = useTranslations('admin')
  const tr = useTranslations('admin.rbacStaff')
  const { message } = App.useApp()

  const [held, setHeld] = useState<StaffRoleRef[]>(target.roles)
  const [selected, setSelected] = useState<string | undefined>(undefined)
  const [busy, setBusy] = useState(false)

  const heldIds = new Set(held.map((role) => role.id))
  const addable = roles.filter((role) => !heldIds.has(role.id))

  const add = async () => {
    if (!selected) return
    const role = roles.find((item) => item.id === selected)
    if (!role) return
    setBusy(true)
    try {
      await grantRole(target.userId, role.id)
      setHeld((prev) => [...prev, { id: role.id, name: role.name }])
      setSelected(undefined)
      message.success(tr('feedback.roleGranted', { role: role.name }))
    } catch (err) {
      message.error(isApiError(err) ? err.message : t('feedback.apiError'))
    } finally {
      setBusy(false)
    }
  }

  const remove = async (role: StaffRoleRef) => {
    setBusy(true)
    try {
      await revokeRole(target.userId, role.id)
      setHeld((prev) => prev.filter((item) => item.id !== role.id))
      message.success(tr('feedback.roleRevoked', { role: role.name }))
    } catch (err) {
      message.error(isApiError(err) ? err.message : t('feedback.apiError'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Text type='secondary'>{tr('rolesDrawer.hint')}</Text>
      <Divider titlePlacement='start' style={{ marginTop: 16 }}>
        {tr('rolesDrawer.current')}
      </Divider>
      {held.length ? (
        <Space direction='vertical' style={{ width: '100%' }} size={8}>
          {held.map((role) => (
            <div
              key={role.id}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
            >
              <Tag>{role.name}</Tag>
              <Popconfirm
                title={tr('confirm.revokeTitle', { role: role.name })}
                description={<div style={{ maxWidth: 280 }}>{tr('confirm.revokeBody')}</div>}
                okText={t('actions.confirm')}
                cancelText={t('actions.cancel')}
                okButtonProps={{ danger: true }}
                onConfirm={() => remove(role)}
              >
                <Button
                  type='text'
                  size='small'
                  danger
                  icon={<DeleteOutlined />}
                  aria-label={tr('actions.revokeRole')}
                />
              </Popconfirm>
            </div>
          ))}
        </Space>
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={tr('noRoles')} />
      )}

      <Divider titlePlacement='start'>{tr('rolesDrawer.add')}</Divider>
      <Space.Compact style={{ width: '100%' }}>
        <Select
          style={{ width: '100%' }}
          showSearch
          optionFilterProp='label'
          value={selected}
          onChange={setSelected}
          placeholder={tr('rolesDrawer.addPlaceholder')}
          options={addable.map((role) => ({ value: role.id, label: role.name }))}
          notFoundContent={<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={tr('rolesDrawer.noneLeft')} />}
        />
        <Button type='primary' loading={busy} disabled={!selected} onClick={add}>
          {tr('rolesDrawer.addButton')}
        </Button>
      </Space.Compact>
    </>
  )
}
