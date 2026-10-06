'use client'

import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, App, Button, Checkbox, Descriptions, Drawer, Form, Grid, Input, Space, Tag, Typography } from 'antd'
import { useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'

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
import { useUnsavedGuard } from '../../hooks/use-unsaved-guard'
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

interface EditorState {
  mode: 'create' | 'edit'
  role: RoleSummary | null
}

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
  const [form] = Form.useForm<RoleFormValues>()
  const screens = Grid.useBreakpoint()
  const queryClient = useQueryClient()

  const [editor, setEditor] = useState<EditorState | null>(null)
  const [originalPerms, setOriginalPerms] = useState<string[]>([])
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  useUnsavedGuard(dirty)

  const permissionsQuery = useQuery({
    queryKey: adminKeys.bmt('permissions'),
    queryFn: listPermissions,
    staleTime: 5 * 60 * 1000
  })
  const permissions = useMemo(() => permissionsQuery.data ?? [], [permissionsQuery.data])
  const permMap = useMemo(() => new Map<string, PermissionItem>(permissions.map((p) => [p.code, p])), [permissions])
  const permLabel = (code: string) => permMap.get(code)?.label ?? code

  async function refreshRoles() {
    await queryClient.invalidateQueries({ queryKey: adminKeys.bmt('roles') })
  }

  function openCreate() {
    form.resetFields()
    form.setFieldsValue({ name: '', permissions: [] })
    setOriginalPerms([])
    setDirty(false)
    setEditor({ mode: 'create', role: null })
  }

  async function openEdit(role: RoleSummary) {
    setLoadingId(role.id)
    try {
      // BR/STORY: sửa thì đọc chi tiết để lấy danh sách quyền HIỆN TẠI (nguồn thật).
      const detail = await getRole(role.id)
      form.resetFields()
      form.setFieldsValue({ name: detail.name, permissions: detail.permissions })
      setOriginalPerms(detail.permissions)
      setDirty(false)
      setEditor({ mode: 'edit', role })
    } catch (err) {
      message.error(isApiError(err) ? err.message : t('feedback.apiError'))
    } finally {
      setLoadingId(null)
    }
  }

  function closeEditor() {
    setEditor(null)
    setDirty(false)
    form.resetFields()
  }

  function requestClose() {
    if (!dirty) return closeEditor()
    modal.confirm({
      title: t('actions.discardConfirmTitle'),
      content: t('actions.discardConfirmBody'),
      okText: t('actions.discard'),
      okButtonProps: { danger: true },
      cancelText: t('actions.keepEditing'),
      onOk: closeEditor
    })
  }

  async function submit() {
    if (!editor) return
    const values = await form.validateFields().catch(() => null)
    if (!values) return
    const name = values.name.trim()
    const perms = values.permissions ?? []
    setSaving(true)
    try {
      if (editor.mode === 'create') {
        await createRole({ name, permissions: perms })
        message.success(t('feedback.created'))
      } else if (editor.role) {
        const detail = await updateRole(editor.role.id, { name, permissions: perms })
        message.success(t('feedback.saved'))
        // STORY-RBAC-001 ALT-01: đổi quyền của vai trò còn người giữ → chưa hiệu lực ngay.
        if (!sameSet(perms, originalPerms) && editor.role.memberCount > 0) {
          modal.info({
            title: tr('effectiveNoteTitle'),
            content: tr('effectiveNote', { minutes: detail.effectiveWithinMinutes })
          })
        }
      }
      await refreshRoles()
      closeEditor()
    } catch (err) {
      message.error(isApiError(err) ? err.message : t('feedback.apiError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
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
        extraActions={
          <Button type='primary' icon={<PlusOutlined />} onClick={openCreate}>
            {t('actions.create')}
          </Button>
        }
        rowActions={(role, ctx): RowAction[] => {
          // Vai trò `System` bị khóa cả sửa lẫn xóa (BR-RBAC-002).
          if (role.kind === 'System') {
            return [
              { key: 'edit', label: t('actions.edit'), icon: <EditOutlined />, disabled: true, onClick: () => {} },
              {
                key: 'delete',
                label: t('actions.delete'),
                icon: <DeleteOutlined />,
                danger: true,
                disabled: true,
                onClick: () => {}
              }
            ]
          }
          return [
            {
              key: 'edit',
              label: t('actions.edit'),
              icon: <EditOutlined />,
              disabled: loadingId === role.id,
              onClick: () => void openEdit(role)
            },
            {
              key: 'delete',
              label: t('actions.delete'),
              icon: <DeleteOutlined />,
              danger: true,
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
          ]
        }}
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

      <Drawer
        open={editor !== null}
        onClose={requestClose}
        size={screens.md ? 560 : '100%'}
        destroyOnHidden
        title={editor?.mode === 'edit' ? t('actions.edit') : t('actions.create')}
        extra={
          <Space>
            <Button onClick={requestClose}>{t('actions.cancel')}</Button>
            <Button type='primary' loading={saving} onClick={submit}>
              {t('actions.save')}
            </Button>
          </Space>
        }
      >
        <Form form={form} layout='vertical' onValuesChange={() => setDirty(true)}>
          <RoleFormFields groups={groupByModule(permissions)} loading={permissionsQuery.isPending} />
        </Form>
      </Drawer>
    </>
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
