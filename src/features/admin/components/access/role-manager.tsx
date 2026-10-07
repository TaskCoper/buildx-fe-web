'use client'

import { DeleteOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Alert, App, Checkbox, Descriptions, Form, Input, Space, Tag, Typography } from 'antd'
import { useTranslations } from 'next-intl'
import { useMemo, useRef } from 'react'

import { isApiError } from '@/shared/lib/api'
import { adminKeys } from '../../api/admin.keys'
import {
  createRole,
  deleteRole,
  getRole,
  listPermissions,
  listRoles,
  updateRole,
  type PermissionItem,
  type RoleSummary
} from '../../api/bmt/roles.api'
import { matchesKeyword, pageLocally } from '../../services/local-page.service'
import { ApiResourceManager } from '../common/api-resource-manager'
import type { RowAction } from '../common/row-actions-menu'
import { StatusTag } from '../common/status-tag'

const { Text } = Typography
const NAME_MAX = 200

/** Module (đoạn trước dấu `.` của mã quyền) có nhãn i18n; module lạ lùi về mã thô. */
const KNOWN_MODULES = [
  'commerce',
  'package',
  'supervision',
  'user',
  'role',
  'assignment',
  'audit',
  'plan',
  'estimate',
  'payment',
  'consultation',
  'news',
  'library'
] as const
type KnownModule = (typeof KNOWN_MODULES)[number]

interface RoleFormValues {
  name: string
  permissions: string[]
}

/** Nhóm mã quyền theo module (đoạn trước dấu `.` đầu tiên), giữ thứ tự API trả. */
function groupByModule(items: PermissionItem[]): { module: string; items: PermissionItem[] }[] {
  const order: string[] = []
  const map = new Map<string, PermissionItem[]>()
  for (const item of items) {
    const mod = item.code.split('.')[0] ?? item.code
    if (!map.has(mod)) {
      map.set(mod, [])
      order.push(mod)
    }
    map.get(mod)?.push(item)
  }
  return order.map((mod) => ({ module: mod, items: map.get(mod) ?? [] }))
}

const sameSet = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|')

/**
 * VAI TRÒ & QUYỀN (STORY-RBAC-001, BR-RBAC-001..012) — RBAC người → vai trò → quyền
 * trên BMT API. Danh mục 14 mã quyền cố định lấy từ `GET /permissions` (nhãn từ API).
 *
 * Tạo / sửa vai trò tự tạo bằng ngăn kéo riêng để khóa được thao tác trên vai
 * trò `System` theo từng dòng (BR-RBAC-002): vai trò hệ thống không sửa / đổi tên
 * / xóa — nút bị vô hiệu kèm tooltip lý do. Mọi rào chắn thật do backend thực thi;
 * FE chỉ hiện thông báo lỗi (`RoleIsSystem`, `RoleInUse`, `PermissionNotHeldByActor`,
 * `SelfPrivilegeEscalation`, `StaffHasActiveAssignments`…).
 */
export function RoleManager() {
  const t = useTranslations('admin')
  const tr = useTranslations('admin.rbacRoles')
  const { message, modal } = App.useApp()
  // Quyền của vai trò lúc mở sửa (đọc từ API) — để Lưu biết quyền có đổi không (STORY-RBAC-001 ALT-01).
  const originalPerms = useRef<string[]>([])

  const permissionsQuery = useQuery({
    queryKey: adminKeys.bmt('permissions'),
    queryFn: listPermissions,
    staleTime: 5 * 60 * 1000
  })
  const permissions = useMemo(() => permissionsQuery.data ?? [], [permissionsQuery.data])
  const permMap = useMemo(() => new Map<string, PermissionItem>(permissions.map((p) => [p.code, p])), [permissions])
  const permLabel = (code: string) => permMap.get(code)?.label ?? code

  return (
    <ApiResourceManager<RoleSummary>
      title={tr('title')}
      description={tr('description')}
      queryKey={adminKeys.bmt('roles')}
      searchable
      fetchPage={async ({ pageIndex, pageSize, keyword }) => {
        const rows = (await listRoles()).filter((role) => matchesKeyword(role.name, keyword))
        return pageLocally(rows, pageIndex, pageSize)
      }}
      rowKey={(item) => item.id}
      // Vai trò `System` bị khóa cả sửa lẫn xóa (BR-RBAC-002).
      editLocked={(role) => role.kind === 'System'}
      createValues={() => ({ name: '', permissions: [] })}
      onCreate={async (values) => {
        const { name, permissions: perms } = values as unknown as RoleFormValues
        await createRole({ name: name.trim(), permissions: perms ?? [] })
      }}
      // BR/STORY: sửa thì đọc chi tiết để lấy danh sách quyền HIỆN TẠI (nguồn thật).
      toFormValues={async (role) => {
        const detail = await getRole(role.id)
        originalPerms.current = detail.permissions
        return { name: detail.name, permissions: detail.permissions }
      }}
      onUpdate={async (values, role) => {
        const { name, permissions: chosen } = values as unknown as RoleFormValues
        const perms = chosen ?? []
        const detail = await updateRole(role.id, { name: name.trim(), permissions: perms })
        // STORY-RBAC-001 ALT-01: đổi quyền của vai trò còn người giữ → chưa hiệu lực ngay.
        if (!sameSet(perms, originalPerms.current) && role.memberCount > 0) {
          modal.info({
            title: tr('effectiveNoteTitle'),
            content: tr('effectiveNote', { minutes: detail.effectiveWithinMinutes })
          })
        }
      }}
      renderForm={() => <RoleFormFields groups={groupByModule(permissions)} loading={permissionsQuery.isPending} />}
      rowActions={(role, ctx): RowAction[] => [
        {
          key: 'delete',
          label: t('actions.delete'),
          icon: <DeleteOutlined />,
          danger: true,
          disabled: role.kind === 'System',
          onClick: () =>
            modal.confirm({
              title: tr('deleteTitle', { name: role.name }),
              content: <div style={{ maxWidth: 300 }}>{tr('deleteBody')}</div>,
              okText: t('actions.delete'),
              okButtonProps: { danger: true },
              cancelText: t('actions.cancel'),
              onOk: async () => {
                try {
                  await deleteRole(role.id)
                  await ctx.refresh()
                  message.success(t('feedback.deleted'))
                } catch (err) {
                  message.error(isApiError(err) ? err.message : t('feedback.apiError'))
                }
              }
            })
        }
      ]}
      columns={[
        {
          title: tr('columns.name'),
          dataIndex: 'name',
          render: (name: string, role) => (
            <Space orientation='vertical' size={0}>
              <Text strong>{name}</Text>
              {role.code ? (
                <Text type='secondary' style={{ fontSize: 12 }}>
                  {role.code}
                </Text>
              ) : null}
            </Space>
          )
        },
        {
          title: tr('columns.kind'),
          dataIndex: 'kind',
          width: 130,
          render: (kind: RoleSummary['kind']) => (
            <StatusTag tone={kind === 'System' ? 'info' : 'off'}>{tr(`kind.${kind}`)}</StatusTag>
          )
        },
        {
          title: tr('columns.memberCount'),
          dataIndex: 'memberCount',
          width: 130,
          align: 'right',
          render: (count: number) => count
        },
        {
          title: tr('columns.permissionCount'),
          key: 'permissionCount',
          width: 120,
          align: 'right',
          render: (_, role) => role.permissions.length
        }
      ]}
      renderView={(role) => (
        <Descriptions
          size='small'
          column={1}
          bordered
          items={[
            { key: 'name', label: tr('columns.name'), children: role.name },
            ...(role.code ? [{ key: 'code', label: tr('view.code'), children: role.code }] : []),
            { key: 'kind', label: tr('columns.kind'), children: tr(`kind.${role.kind}`) },
            { key: 'members', label: tr('columns.memberCount'), children: role.memberCount },
            {
              key: 'permissions',
              label: tr('columns.permissionCount'),
              children:
                role.permissions.length === 0 ? (
                  <Text type='secondary'>{tr('view.noPermissions')}</Text>
                ) : (
                  <Space size={4} wrap>
                    {role.permissions.map((code) => (
                      <Tag key={code} color={permMap.get(code)?.requiresAssignment ? 'orange' : 'blue'}>
                        {permLabel(code)}
                      </Tag>
                    ))}
                  </Space>
                )
            }
          ]}
        />
      )}
    />
  )
}

/** Ô tên + nhóm checkbox chọn quyền (nhóm theo module, nhãn từ API). */
function RoleFormFields({
  groups,
  loading
}: {
  groups: { module: string; items: PermissionItem[] }[]
  loading: boolean
}) {
  const t = useTranslations('admin')
  const tr = useTranslations('admin.rbacRoles')
  const trimmed = (value: unknown) => (typeof value === 'string' ? value.trim() : value)

  // Thiếu bản dịch module (API thêm module mới) → lùi về tên module thô.
  const moduleLabel = (mod: string) =>
    (KNOWN_MODULES as readonly string[]).includes(mod) ? tr(`modules.${mod as KnownModule}`) : mod

  return (
    <>
      <Form.Item
        name='name'
        label={tr('fields.name')}
        rules={[
          { required: true, whitespace: true, message: t('fields.requiredMessage') },
          { max: NAME_MAX, transform: trimmed, message: t('fields.maxLength', { max: NAME_MAX }) }
        ]}
      >
        <Input showCount maxLength={NAME_MAX + 20} placeholder={tr('fields.namePlaceholder')} />
      </Form.Item>

      <Form.Item label={tr('fields.permissions')} extra={tr('fields.permissionsHint')}>
        <Form.Item name='permissions' noStyle>
          <Checkbox.Group style={{ width: '100%' }}>
            <Space orientation='vertical' size='middle' style={{ width: '100%' }}>
              {loading ? (
                <Text type='secondary'>{tr('fields.permissionsLoading')}</Text>
              ) : (
                groups.map((group) => (
                  <div key={group.module}>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>
                      {moduleLabel(group.module)}
                    </Text>
                    <Space orientation='vertical' size={8} style={{ width: '100%' }}>
                      {group.items.map((permission) => (
                        <div key={permission.code}>
                          <Checkbox value={permission.code}>
                            {permission.label}
                            {permission.requiresAssignment ? (
                              <Tag color='orange' style={{ marginInlineStart: 8 }}>
                                {tr('fields.requiresAssignment')}
                              </Tag>
                            ) : null}
                          </Checkbox>
                          {permission.description ? (
                            <Text type='secondary' style={{ display: 'block', fontSize: 12, marginInlineStart: 24 }}>
                              {permission.description}
                            </Text>
                          ) : null}
                        </div>
                      ))}
                    </Space>
                  </div>
                ))
              )}
            </Space>
          </Checkbox.Group>
        </Form.Item>
      </Form.Item>

      <Alert type='info' showIcon title={tr('fields.requiresAssignmentNote')} style={{ marginTop: 8 }} />
    </>
  )
}
