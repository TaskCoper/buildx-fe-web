'use client'

import { CheckOutlined, CloseOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { App, Button, Drawer, Empty, Grid, Input, Popconfirm, Space, Table, Tooltip, Typography } from 'antd'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { isApiError } from '@/shared/lib/api'
import { adminKeys } from '../../api/admin.keys'
import { CONSULT_LIMITS, consultAdminApi, type BmtArchitectCategory } from '../../api/bmt/consult.api'

const { Text, Paragraph } = Typography

export const ARCHITECT_CATEGORIES_KEY = adminKeys.bmt('architect-categories', 'all')

/**
 * DANH MỤC CHUYÊN MÔN KTS (BR-CONSULT-001 khoản 5–6, STORY-CONSULT-001 ALT-03).
 *
 * Tạo, đổi tên, xóa. Tên bắt buộc, tối đa 200 ký tự, được phép trùng. Chỉ xóa
 * được khi không còn KTS nào dùng, kể cả KTS đang ẩn — backend kiểm và trả lỗi
 * "đang được sử dụng", màn hiện nguyên thông báo đó.
 */
export function ArchitectCategoryDrawer({
  open,
  onClose,
  onChanged
}: {
  open: boolean
  onClose: () => void
  /** Gọi sau mỗi lần ghi — để bảng KTS tải lại tên chuyên môn. */
  onChanged: () => Promise<unknown>
}) {
  const t = useTranslations('admin')
  const tc = useTranslations('admin.architectCategories')
  const { message } = App.useApp()
  const screens = Grid.useBreakpoint()
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const {
    data = [],
    isPending,
    isError,
    error
  } = useQuery({
    queryKey: ARCHITECT_CATEGORIES_KEY,
    queryFn: consultAdminApi.listAllCategories,
    enabled: open
  })

  const nameError = (value: string) => {
    const name = value.trim()
    if (!name) return tc('nameRequired')
    if (name.length > CONSULT_LIMITS.categoryName) return t('fields.maxLength', { max: CONSULT_LIMITS.categoryName })
    return null
  }

  const run = async (action: () => Promise<unknown>, done: string) => {
    setBusy(true)
    try {
      await action()
      await Promise.all([queryClient.invalidateQueries({ queryKey: ARCHITECT_CATEGORIES_KEY }), onChanged()])
      message.success(done)
      return true
    } catch (err) {
      message.error(isApiError(err) ? err.message : t('feedback.apiError'))
      return false
    } finally {
      setBusy(false)
    }
  }

  const create = async () => {
    const problem = nameError(draft)
    if (problem) return void message.warning(problem)
    if (await run(() => consultAdminApi.createCategory(draft.trim()), t('feedback.created'))) setDraft('')
  }

  const rename = async (item: BmtArchitectCategory) => {
    if (!editing) return
    const problem = nameError(editing.name)
    if (problem) return void message.warning(problem)
    if (
      await run(() => consultAdminApi.renameCategory(item.id, editing.name.trim(), item.version), t('feedback.saved'))
    )
      setEditing(null)
  }

  return (
    <Drawer open={open} onClose={onClose} size={screens.md ? 560 : '100%'} destroyOnHidden title={tc('title')}>
      <Space orientation='vertical' size={16} style={{ width: '100%' }}>
        <Paragraph type='secondary' style={{ margin: 0 }}>
          {tc('description')}
        </Paragraph>
        <div style={{ display: 'flex', gap: 8 }}>
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onPressEnter={() => void create()}
            placeholder={tc('newPlaceholder')}
            maxLength={CONSULT_LIMITS.categoryName}
            style={{ flex: 1 }}
          />
          <Button type='primary' icon={<PlusOutlined />} loading={busy} onClick={() => void create()}>
            {t('actions.create')}
          </Button>
        </div>
        <Table<BmtArchitectCategory>
          rowKey='id'
          size='small'
          loading={isPending && open}
          dataSource={data}
          pagination={false}
          locale={{
            emptyText: isError ? (
              <Empty description={isApiError(error) ? error.message : t('feedback.apiError')} />
            ) : (
              <Empty description={t('table.empty')} />
            )
          }}
          columns={[
            {
              title: tc('name'),
              dataIndex: 'name',
              render: (name: string, record) =>
                editing?.id === record.id ? (
                  <Input
                    autoFocus
                    size='small'
                    value={editing.name}
                    maxLength={CONSULT_LIMITS.categoryName}
                    onChange={(event) => setEditing({ id: record.id, name: event.target.value })}
                    onPressEnter={() => void rename(record)}
                  />
                ) : (
                  <Text>{name}</Text>
                )
            },
            {
              title: t('table.actions'),
              key: 'actions',
              width: 110,
              render: (_, record) =>
                editing?.id === record.id ? (
                  <Space size={0}>
                    <Button
                      type='text'
                      size='small'
                      icon={<CheckOutlined />}
                      aria-label={t('actions.save')}
                      loading={busy}
                      onClick={() => void rename(record)}
                    />
                    <Button
                      type='text'
                      size='small'
                      icon={<CloseOutlined />}
                      aria-label={t('actions.cancel')}
                      onClick={() => setEditing(null)}
                    />
                  </Space>
                ) : (
                  <Space size={0}>
                    <Tooltip title={t('actions.edit')}>
                      <Button
                        type='text'
                        size='small'
                        icon={<EditOutlined />}
                        aria-label={t('actions.edit')}
                        onClick={() => setEditing({ id: record.id, name: record.name })}
                      />
                    </Tooltip>
                    <Popconfirm
                      title={tc('deleteTitle', { name: record.name })}
                      description={<div style={{ maxWidth: 280 }}>{tc('deleteBody')}</div>}
                      okText={t('actions.delete')}
                      okButtonProps={{ danger: true }}
                      cancelText={t('actions.cancel')}
                      onConfirm={() =>
                        run(() => consultAdminApi.deleteCategory(record.id, record.version), t('feedback.deleted'))
                      }
                    >
                      <Tooltip title={t('actions.delete')}>
                        <Button
                          type='text'
                          size='small'
                          danger
                          icon={<DeleteOutlined />}
                          aria-label={t('actions.delete')}
                        />
                      </Tooltip>
                    </Popconfirm>
                  </Space>
                )
            }
          ]}
        />
      </Space>
    </Drawer>
  )
}
