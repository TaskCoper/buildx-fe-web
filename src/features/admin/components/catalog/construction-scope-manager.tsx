'use client'

import { DeleteOutlined } from '@ant-design/icons'
import { App, Form, Input, InputNumber, Switch, Typography } from 'antd'
import { useTranslations } from 'next-intl'

import { isApiError } from '@/shared/lib/api'
import { constructionScopesApi, type ConstructionScopeDto } from '../../api/bmt/construction-scopes.api'
import { matchesKeyword } from '../../services/local-page.service'
import { ApiResourceManager } from '../common/api-resource-manager'
import type { RowAction } from '../common/row-actions-menu'
import { StatusTag } from '../common/status-tag'

const { Text } = Typography

const NAME_MAX = 200
const DESC_MAX = 500

const trimmed = (value: unknown) => (typeof value === 'string' ? value.trim() : value)

/**
 * DANH MỤC PHẠM VI THI CÔNG (ConstructionScope — STORY-CTR-003, BR-CTR-007).
 *
 * Dùng chung cho hồ sơ nhà thầu (khai năng lực) và dự án tiêu biểu. Tên là duy
 * nhất; "Ngừng dùng" (`isActive=false`) không gắn mới được nhưng giữ liên kết cũ;
 * không xoá được phạm vi đang có nơi dùng (BE trả 409 `ConstructionScopeInUse`).
 */
export function ConstructionScopeManager() {
  const t = useTranslations('admin')
  const c = useTranslations('admin.constructionScopes')
  const { modal, message } = App.useApp()

  return (
    <ApiResourceManager<ConstructionScopeDto>
      title={t('nav.constructionScopes')}
      description={c('description')}
      queryKey={['admin', 'construction-scopes']}
      searchable
      fetchPage={async ({ keyword }) => {
        const all = await constructionScopesApi.list()
        const items = keyword
          ? all.filter((s) => matchesKeyword(s.name, keyword) || matchesKeyword(s.description ?? '', keyword))
          : all
        return {
          items,
          pageIndex: 1,
          pageSize: Math.max(items.length, 1),
          totalCount: items.length,
          hasNextPage: false,
          hasPreviousPage: false
        }
      }}
      rowKey={(item) => item.id}
      drawerWidth={480}
      createValues={() => ({ name: '', description: '', sortOrder: 0, isActive: true })}
      onCreate={async (values) => {
        await constructionScopesApi.create({
          name: String(values.name ?? '').trim(),
          description: String(values.description ?? '').trim() || null,
          sortOrder: Number(values.sortOrder ?? 0),
          isActive: Boolean(values.isActive)
        })
      }}
      toFormValues={(item) => ({
        name: item.name,
        description: item.description ?? '',
        sortOrder: item.sortOrder,
        isActive: item.isActive
      })}
      onUpdate={async (values, item) => {
        await constructionScopesApi.update(item.id, {
          name: String(values.name ?? '').trim(),
          description: String(values.description ?? '').trim() || null,
          sortOrder: Number(values.sortOrder ?? 0),
          isActive: Boolean(values.isActive),
          expectedVersion: item.version
        })
      }}
      rowActions={(item, ctx): RowAction[] => [
        {
          key: 'delete',
          label: t('actions.delete'),
          icon: <DeleteOutlined />,
          danger: true,
          onClick: () =>
            modal.confirm({
              title: c('deleteConfirmTitle', { name: item.name }),
              content: c('deleteConfirmBody'),
              okText: t('actions.delete'),
              okButtonProps: { danger: true },
              cancelText: t('actions.cancel'),
              onOk: async () => {
                try {
                  await constructionScopesApi.remove(item.id, item.version)
                  message.success(t('feedback.deleted'))
                  await ctx.refresh()
                } catch (err) {
                  message.error(isApiError(err) ? err.message : t('feedback.apiError'))
                }
              }
            })
        }
      ]}
      columns={[
        { title: c('name'), dataIndex: 'name', render: (_, r) => <Text strong>{r.name}</Text> },
        {
          title: c('descriptionLabel'),
          dataIndex: 'description',
          render: (_, r) =>
            r.description ? (
              <Text type='secondary' ellipsis={{ tooltip: r.description }} style={{ maxWidth: 360 }}>
                {r.description}
              </Text>
            ) : (
              <Text type='secondary'>—</Text>
            )
        },
        { title: c('sortOrder'), dataIndex: 'sortOrder', align: 'right', width: 110 },
        {
          title: c('status'),
          key: 'status',
          width: 130,
          render: (_, r) => (
            <StatusTag tone={r.isActive ? 'success' : 'off'}>{c(r.isActive ? 'active' : 'inactive')}</StatusTag>
          )
        }
      ]}
      renderForm={() => (
        <>
          <Form.Item
            name='name'
            label={c('name')}
            rules={[
              { required: true, whitespace: true, message: t('fields.requiredMessage') },
              { max: NAME_MAX, transform: trimmed, message: t('fields.maxLength', { max: NAME_MAX }) }
            ]}
          >
            <Input showCount maxLength={NAME_MAX + 20} />
          </Form.Item>
          <Form.Item
            name='description'
            label={c('descriptionLabel')}
            rules={[{ max: DESC_MAX, transform: trimmed, message: t('fields.maxLength', { max: DESC_MAX }) }]}
          >
            <Input.TextArea rows={3} showCount maxLength={DESC_MAX + 20} />
          </Form.Item>
          <Form.Item name='sortOrder' label={c('sortOrder')}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name='isActive' label={c('status')} valuePropName='checked'>
            <Switch checkedChildren={c('active')} unCheckedChildren={c('inactive')} />
          </Form.Item>
        </>
      )}
    />
  )
}
