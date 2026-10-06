'use client'

import { DownOutlined, EditOutlined, EyeOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  App,
  Button,
  Card,
  Drawer,
  Dropdown,
  Empty,
  Form,
  Grid,
  Input,
  Space,
  Table,
  type FormInstance,
  type TableProps
} from 'antd'
import { useTranslations } from 'next-intl'
import { useState, type ReactNode } from 'react'

import { isApiError } from '@/shared/lib/api'
import type { PagedResult } from '@/shared/types'
import { useUnsavedGuard } from '../../hooks/use-unsaved-guard'
import { AdminPage } from './admin-page'
import { RowActionsMenu, type RowAction } from './row-actions-menu'

/** Tham số trang gửi cho endpoint danh sách của BMT. */
export interface ApiPageParams {
  pageIndex: number
  pageSize: number
  keyword?: string
}

/** Việc cần làm lại sau một thao tác ghi (tải lại danh sách). */
export interface ApiRowContext {
  refresh: () => Promise<void>
}

export interface ApiResourceManagerProps<T> {
  title: string
  description?: string
  /**
   * Gốc query key của màn. Mọi tham số lọc bên ngoài phải nằm trong key này để
   * đổi bộ lọc là tải lại đúng trang.
   */
  queryKey: readonly unknown[]
  fetchPage: (params: ApiPageParams) => Promise<PagedResult<T>>
  rowKey: (item: T) => string
  columns: NonNullable<TableProps<T>['columns']>
  /** Có ô tìm kiếm: từ khóa đi thẳng lên server (`keyword`). */
  searchable?: boolean
  /** Các trường trong Drawer thêm / sửa. */
  renderForm?: (form: FormInstance, ctx: { isNew: boolean; item: T | null }) => ReactNode
  /** Giá trị form khi bấm "Thêm mới". Bỏ trống = màn không cho thêm. */
  createValues?: () => Record<string, unknown>
  onCreate?: (values: Record<string, unknown>) => Promise<unknown>
  /**
   * Giá trị form khi mở sửa. Được phép async để đọc bản chi tiết (kèm version
   * cho khóa lạc quan). Bỏ trống `onUpdate` = màn không cho sửa.
   */
  toFormValues?: (item: T) => Record<string, unknown> | Promise<Record<string, unknown>>
  /** `mode` là khoá của tuỳ chọn ở nút Lưu (xem `saveOptions`); Lưu thường thì không có. */
  onUpdate?: (values: Record<string, unknown>, item: T, mode?: string) => Promise<unknown>
  /**
   * Các cách Lưu khác ngoài Lưu thường (ví dụ "Lưu và phát hành phiên bản mới") — hiện trong mũi tên cạnh nút Lưu
   * khi SỬA. Có `confirm` thì hỏi xác nhận trước khi lưu.
   */
  saveOptions?: (item: T) => { key: string; label: string; confirm?: { title: string; content: string } }[]
  /**
   * Hành động riêng của từng dòng (công bố, ẩn, xóa, hủy…) — trả DANH SÁCH dữ
   * liệu `RowAction[]`, hiện trong menu "…" kèm icon + chữ. Hành động cần xác nhận
   * thì tự mở `modal.confirm` trong `onClick`.
   */
  rowActions?: (item: T, ctx: ApiRowContext) => RowAction[]
  /** Ngăn kéo "Xem chi tiết" chỉ đọc. */
  renderView?: (item: T, ctx: ApiRowContext) => ReactNode
  /** Khối phía trên bảng (bộ lọc riêng, thẻ số liệu…). */
  banner?: ReactNode
  extraActions?: ReactNode
  drawerWidth?: number
  pageSize?: number
  /** Câu lỗi riêng cho màn (ví dụ mã lỗi nghiệp vụ → tiếng Việt); bỏ trống dùng câu của BE. */
  formatError?: (err: unknown) => string
}

/**
 * Bảng quản trị cho dữ liệu nằm trên BMT API: phân trang và tìm kiếm chạy phía
 * server, ghi xong thì tải lại. Lỗi nghiệp vụ của API (sai version, vi phạm quy
 * tắc…) hiện nguyên thông báo của backend.
 *
 * Khác `ResourceManager` (kho CMS localStorage, lọc tại chỗ) ở chỗ dữ liệu có
 * thể rất nhiều và mỗi thao tác ghi có endpoint riêng, nên màn tự khai hàm
 * tạo / sửa / hành động thay vì một hàm `save` chung.
 */
export function ApiResourceManager<T>({
  title,
  description,
  queryKey,
  fetchPage,
  rowKey,
  columns,
  searchable = false,
  renderForm,
  createValues,
  onCreate,
  toFormValues,
  onUpdate,
  saveOptions,
  rowActions,
  renderView,
  banner,
  extraActions,
  drawerWidth = 560,
  pageSize: initialPageSize = 10,
  formatError
}: ApiResourceManagerProps<T>) {
  const t = useTranslations('admin')
  const { message, modal } = App.useApp()
  const [form] = Form.useForm()
  const screens = Grid.useBreakpoint()
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(initialPageSize)
  const [query, setQuery] = useState('')
  const [keyword, setKeyword] = useState('')
  const [editing, setEditing] = useState<{ item: T | null } | null>(null)
  const [viewing, setViewing] = useState<T | null>(null)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  useUnsavedGuard(dirty)

  const { data, isPending, isFetching, isError, error } = useQuery({
    queryKey: [...queryKey, { page, pageSize, keyword }],
    queryFn: () => fetchPage({ pageIndex: page, pageSize, keyword: keyword || undefined }),
    placeholderData: keepPreviousData
  })

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey })
  }
  const ctx: ApiRowContext = { refresh }

  async function openEditor(item: T | null) {
    const values = item ? await toFormValues?.(item) : createValues?.()
    setEditing({ item })
    setDirty(false)
    form.resetFields()
    if (values) form.setFieldsValue(values)
  }

  function closeEditor() {
    setEditing(null)
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

  async function submit(mode?: string) {
    if (!editing) return
    const values = (await form.validateFields().catch(() => null)) as Record<string, unknown> | null
    if (!values) return
    setSaving(true)
    try {
      if (editing.item) await onUpdate?.(values, editing.item, mode)
      else await onCreate?.(values)
      await refresh()
      message.success(editing.item ? t('feedback.saved') : t('feedback.created'))
      closeEditor()
    } catch (err) {
      message.error(formatError ? formatError(err) : isApiError(err) ? err.message : t('feedback.apiError'))
    } finally {
      setSaving(false)
    }
  }

  const extraSaves = editing?.item && saveOptions ? saveOptions(editing.item) : []
  const canCreate = Boolean(createValues && onCreate && renderForm)
  const canEdit = Boolean(onUpdate && renderForm)

  const actionColumn: NonNullable<TableProps<T>['columns']>[number] = {
    title: t('table.actions'),
    key: 'actions',
    fixed: 'right',
    align: 'right',
    render: (_, record) => {
      const actions: RowAction[] = [...(rowActions?.(record, ctx) ?? [])]
      if (renderView) {
        actions.push({
          key: 'view',
          label: t('actions.view'),
          icon: <EyeOutlined />,
          onClick: () => setViewing(record)
        })
      }
      if (canEdit) {
        actions.push({
          key: 'edit',
          label: t('actions.edit'),
          icon: <EditOutlined />,
          onClick: () =>
            openEditor(record).catch((err: unknown) =>
              message.error(isApiError(err) ? err.message : t('feedback.apiError'))
            )
        })
      }
      return <RowActionsMenu actions={actions} moreLabel={t('actions.more')} />
    }
  }

  const hasActions = Boolean(rowActions || renderView || canEdit)

  return (
    <AdminPage
      title={title}
      description={description}
      actions={
        <>
          {extraActions}
          {canCreate ? (
            <Button type='primary' icon={<PlusOutlined />} onClick={() => void openEditor(null)}>
              {t('actions.create')}
            </Button>
          ) : null}
        </>
      }
    >
      {banner}

      <Card
        className='admin-table-card'
        styles={{ body: { padding: 0 } }}
        title={
          searchable ? (
            <Input.Search
              allowClear
              prefix={<SearchOutlined />}
              placeholder={t('table.searchPlaceholder')}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                if (!event.target.value) {
                  setKeyword('')
                  setPage(1)
                }
              }}
              onSearch={(value) => {
                setKeyword(value.trim())
                setPage(1)
              }}
              style={{ maxWidth: 320 }}
            />
          ) : undefined
        }
      >
        <Table<T>
          rowKey={rowKey}
          loading={isPending || isFetching}
          dataSource={data?.items ?? []}
          columns={hasActions ? [...columns, actionColumn] : [...columns]}
          locale={{
            emptyText: isPending ? (
              ' '
            ) : isError ? (
              <Empty description={isApiError(error) ? error.message : t('feedback.apiError')} />
            ) : (
              <Empty description={keyword ? t('table.noSearchResult', { query: keyword }) : t('table.empty')} />
            )
          }}
          scroll={{ x: 'max-content' }}
          pagination={{
            current: page,
            pageSize,
            total: data?.totalCount ?? 0,
            onChange: (next, size) => {
              setPage(size !== pageSize ? 1 : next)
              setPageSize(size)
            },
            showSizeChanger: true,
            showTotal: (total) => t('table.total', { total }),
            responsive: true
          }}
          size='middle'
        />
      </Card>

      {renderForm ? (
        <Drawer
          open={editing !== null}
          onClose={requestClose}
          size={screens.md ? drawerWidth : '100%'}
          destroyOnHidden
          title={editing?.item ? t('actions.edit') : t('actions.create')}
          extra={
            <Space>
              <Button onClick={requestClose}>{t('actions.cancel')}</Button>
              {extraSaves.length > 0 ? (
                <Space.Compact>
                  <Button type='primary' loading={saving} onClick={() => submit()}>
                    {t('actions.save')}
                  </Button>
                  <Dropdown
                    trigger={['click']}
                    disabled={saving}
                    menu={{
                      items: extraSaves.map((option) => ({ key: option.key, label: option.label })),
                      onClick: ({ key }) => {
                        const option = extraSaves.find((item) => item.key === key)
                        if (!option) return
                        if (!option.confirm) return void submit(option.key)
                        modal.confirm({
                          title: option.confirm.title,
                          content: option.confirm.content,
                          okText: option.label,
                          cancelText: t('actions.cancel'),
                          onOk: () => submit(option.key)
                        })
                      }
                    }}
                  >
                    <Button type='primary' icon={<DownOutlined />} aria-label={t('actions.saveOptions')} />
                  </Dropdown>
                </Space.Compact>
              ) : (
                <Button type='primary' loading={saving} onClick={() => submit()}>
                  {t('actions.save')}
                </Button>
              )}
            </Space>
          }
        >
          <Form form={form} layout='vertical' onValuesChange={() => setDirty(true)}>
            {editing ? renderForm(form, { isNew: !editing.item, item: editing.item }) : null}
          </Form>
        </Drawer>
      ) : null}

      {renderView ? (
        <Drawer
          open={viewing !== null}
          onClose={() => setViewing(null)}
          size={screens.md ? drawerWidth : '100%'}
          destroyOnHidden
          title={t('actions.view')}
        >
          {viewing ? renderView(viewing, ctx) : null}
        </Drawer>
      ) : null}
    </AdminPage>
  )
}
