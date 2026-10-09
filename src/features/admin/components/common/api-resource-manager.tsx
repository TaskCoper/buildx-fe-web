'use client'

import { DownOutlined, EditOutlined, EyeOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  App,
  Button,
  Card,
  Dropdown,
  Empty,
  Form,
  Input,
  Skeleton,
  Space,
  Table,
  type FormInstance,
  type TableProps
} from 'antd'
import { useTranslations } from 'next-intl'
import { Suspense, useLayoutEffect, useState, type ReactNode } from 'react'

import { isApiError } from '@/shared/lib/api'
import type { PagedResult } from '@/shared/types'
import { useFormPage, type FormPageMode } from '../../hooks/use-form-page'
import { useUnsavedGuard } from '../../hooks/use-unsaved-guard'
import { AdminPage } from './admin-page'
import { FormPage } from './form-page'
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
  /** Tiêu đề cấp nhỏ cho danh sách, khi màn được nhúng làm một phần của màn khác. */
  compactHeader?: boolean
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
  /** Gợi ý riêng cho ô tìm kiếm khi màn chỉ tìm theo một trường (ví dụ mã hồ sơ); bỏ trống dùng câu chung. */
  searchPlaceholder?: string
  /** Các trường trong trang thêm / sửa. */
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
  /** Trang "Xem chi tiết" chỉ đọc. */
  renderView?: (item: T, ctx: ApiRowContext) => ReactNode
  /** Dòng nào không được sửa (vd. vai trò hệ thống): nút Sửa của dòng đó mờ đi thay vì biến mất. */
  editLocked?: (item: T) => boolean
  /** Khối phía trên bảng (bộ lọc riêng, thẻ số liệu…). */
  banner?: ReactNode
  extraActions?: ReactNode
  /**
   * Gợi ý độ rộng của form. Tên cũ từ thời còn dùng ngăn kéo: từ 700 trở lên thì trang thêm / sửa
   * rộng hơn, còn lại là trang vừa.
   */
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
 *
 * Thêm / Sửa / Xem mở ra MỘT TRANG riêng thay bảng (URL `?act=…&rid=…`, xem `useFormPage`) chứ không
 * còn là ngăn kéo.
 */
export function ApiResourceManager<T>(props: ApiResourceManagerProps<T>) {
  // `useFormPage` đọc `useSearchParams`, cần ranh giới Suspense để trang vẫn dựng tĩnh được.
  return (
    <Suspense>
      <ApiResourceManagerBody {...props} />
    </Suspense>
  )
}

function ApiResourceManagerBody<T>({
  title,
  description,
  compactHeader,
  queryKey,
  fetchPage,
  rowKey,
  columns,
  searchable = false,
  searchPlaceholder,
  renderForm,
  createValues,
  onCreate,
  toFormValues,
  onUpdate,
  saveOptions,
  rowActions,
  renderView,
  editLocked,
  banner,
  extraActions,
  drawerWidth = 560,
  pageSize: initialPageSize = 10,
  formatError
}: ApiResourceManagerProps<T>) {
  const t = useTranslations('admin')
  const queryClient = useQueryClient()
  const formPage = useFormPage()

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(initialPageSize)
  const [query, setQuery] = useState('')
  const [keyword, setKeyword] = useState('')
  // Dòng vừa bấm mở: giữ lại để trang form không phụ thuộc việc dòng đó còn nằm trong trang danh sách hiện tại.
  const [opened, setOpened] = useState<T | null>(null)

  const { data, isPending, isFetching, isError, error } = useQuery({
    queryKey: [...queryKey, { page, pageSize, keyword }],
    queryFn: () => fetchPage({ pageIndex: page, pageSize, keyword: keyword || undefined }),
    placeholderData: keepPreviousData
  })

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey })
  }
  const ctx: ApiRowContext = { refresh }

  const canCreate = Boolean(createValues && onCreate && renderForm)
  const canEdit = Boolean(onUpdate && renderForm)

  // Chỉ nhận chế độ mà màn này thật sự hỗ trợ — URL gõ tay `?act=edit` ở màn chỉ đọc thì về danh sách.
  const requested = formPage.mode
  const mode: FormPageMode | null =
    (requested === 'new' && canCreate) || (requested === 'edit' && canEdit) || (requested === 'view' && renderView)
      ? requested
      : null
  const rowId = formPage.id
  const fromList = rowId ? (data?.items.find((item) => rowKey(item) === rowId) ?? null) : null
  const target = fromList ?? (opened && rowId && rowKey(opened) === rowId ? opened : null)

  function openPage(next: FormPageMode, item?: T) {
    setOpened(item ?? null)
    formPage.open(next, item ? rowKey(item) : undefined)
  }

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
          onClick: () => openPage('view', record)
        })
      }
      if (canEdit) {
        actions.push({
          key: 'edit',
          label: t('actions.edit'),
          icon: <EditOutlined />,
          disabled: editLocked?.(record),
          onClick: () => openPage('edit', record)
        })
      }
      return <RowActionsMenu actions={actions} moreLabel={t('actions.more')} />
    }
  }

  const hasActions = Boolean(rowActions || renderView || canEdit)
  const wide = drawerWidth >= 700
  const loading = isPending || isFetching

  /* ===== Trang Thêm / Sửa ===== */
  if (mode === 'new' || mode === 'edit') {
    if (mode === 'edit' && target === null) {
      // Chưa thấy dòng cần sửa: đang tải danh sách thì chờ, tải xong mà vẫn không có thì báo.
      return (
        <FormPage title={t('actions.edit')} listTitle={title} wide={wide} onBack={() => formPage.close()}>
          {loading ? <Skeleton active paragraph={{ rows: 6 }} /> : <Empty description={t('feedback.recordNotFound')} />}
        </FormPage>
      )
    }
    return (
      <FormSession<T>
        // Mỗi trang form một phiên riêng (form, cờ chưa lưu, bản ghi đang sửa) — đổi trang là dựng lại từ đầu.
        key={formPage.key}
        mode={mode}
        target={target}
        title={title}
        wide={wide}
        queryKey={queryKey}
        rowKey={rowKey}
        renderForm={renderForm}
        createValues={createValues}
        onCreate={onCreate}
        toFormValues={toFormValues}
        onUpdate={onUpdate}
        saveOptions={saveOptions}
        formatError={formatError}
        refresh={refresh}
        onClose={() => formPage.close()}
      />
    )
  }

  /* ===== Trang Xem chi tiết ===== */
  if (mode === 'view' && renderView) {
    return (
      <FormPage
        title={t('actions.view')}
        listTitle={title}
        wide={wide}
        onBack={() => formPage.close()}
        // Sửa ngay từ trang xem (thay chỗ trang xem bằng trang sửa, nút Back vẫn về danh sách). Dòng bị khóa sửa thì không có nút.
        actions={
          canEdit && target && !editLocked?.(target) ? (
            <Button icon={<EditOutlined />} onClick={() => formPage.open('edit', rowKey(target), { replace: true })}>
              {t('actions.edit')}
            </Button>
          ) : null
        }
      >
        {target ? (
          renderView(target, ctx)
        ) : loading ? (
          <Skeleton active paragraph={{ rows: 6 }} />
        ) : (
          <Empty description={t('feedback.recordNotFound')} />
        )}
      </FormPage>
    )
  }

  /* ===== Danh sách ===== */
  return (
    <AdminPage
      title={title}
      description={description}
      compact={compactHeader}
      actions={
        <>
          {extraActions}
          {canCreate ? (
            <Button type='primary' icon={<PlusOutlined />} onClick={() => openPage('new')}>
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
              placeholder={searchPlaceholder ?? t('table.searchPlaceholder')}
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
          loading={loading}
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
    </AdminPage>
  )
}

interface FormSessionProps<T> {
  mode: 'new' | 'edit'
  /** Sửa: bản ghi cần sửa. */
  target: T | null
  title: string
  wide: boolean
  queryKey: readonly unknown[]
  rowKey: (item: T) => string
  renderForm?: ApiResourceManagerProps<T>['renderForm']
  createValues?: ApiResourceManagerProps<T>['createValues']
  onCreate?: ApiResourceManagerProps<T>['onCreate']
  toFormValues?: ApiResourceManagerProps<T>['toFormValues']
  onUpdate?: ApiResourceManagerProps<T>['onUpdate']
  saveOptions?: ApiResourceManagerProps<T>['saveOptions']
  formatError?: ApiResourceManagerProps<T>['formatError']
  refresh: () => Promise<void>
  onClose: () => void
}

/**
 * Một lần mở trang Thêm / Sửa. Form, cờ "chưa lưu" và bản ghi đang sửa đều thuộc về phiên này nên mở
 * trang khác (hoặc về danh sách) là sạch hết — không phải dọn tay.
 */
function FormSession<T>({
  mode,
  target,
  title,
  wide,
  queryKey,
  rowKey,
  renderForm,
  createValues,
  onCreate,
  toFormValues,
  onUpdate,
  saveOptions,
  formatError,
  refresh,
  onClose
}: FormSessionProps<T>) {
  const t = useTranslations('admin')
  const { message, modal } = App.useApp()
  const [form] = Form.useForm()
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  useUnsavedGuard(dirty)

  // Chốt bản ghi ngay lúc mở: Lưu dùng đúng bản này dù danh sách có tải lại giữa chừng.
  const [item] = useState(target)
  const [blank] = useState(() => (mode === 'new' ? createValues?.() : undefined))

  // Sửa: giá trị form có thể phải đọc từ API (bản chi tiết kèm version nên là async). Khóa nằm NGOÀI
  // `queryKey` của danh sách để lưu xong `refresh()` không kéo nó tải lại thêm một lần nữa.
  const valuesQuery = useQuery({
    queryKey: ['admin-form-values', ...queryKey, item ? rowKey(item) : null],
    queryFn: async () => (await toFormValues?.(item as T)) ?? {},
    enabled: mode === 'edit' && item !== null,
    gcTime: 0,
    staleTime: Infinity,
    retry: false
  })
  const ready = mode === 'new' || valuesQuery.isSuccess
  const initialValues = mode === 'new' ? blank : valuesQuery.data
  // Nạp giá trị SAU khi các ô đã dựng và TRƯỚC khi vẽ ra màn hình (không nháy ô trống): giống cách cũ
  // của ngăn kéo. Truyền qua `initialValues` của Form thì antd cảnh báo "Field can not overwrite it" ở
  // mọi ô tự khai `initialValue` trùng đường dẫn (vd. bảng quyền lợi của gói).
  useLayoutEffect(() => {
    if (ready && initialValues) form.setFieldsValue(initialValues)
  }, [form, ready, initialValues])

  function requestClose() {
    if (!dirty) return onClose()
    modal.confirm({
      title: t('actions.discardConfirmTitle'),
      content: t('actions.discardConfirmBody'),
      okText: t('actions.discard'),
      okButtonProps: { danger: true },
      cancelText: t('actions.keepEditing'),
      onOk: () => {
        setDirty(false)
        onClose()
      }
    })
  }

  async function submit(saveMode?: string) {
    const values = (await form.validateFields().catch(() => null)) as Record<string, unknown> | null
    if (!values) return
    setSaving(true)
    try {
      if (mode === 'edit') {
        if (item) await onUpdate?.(values, item, saveMode)
      } else await onCreate?.(values)
      await refresh()
      message.success(mode === 'edit' ? t('feedback.saved') : t('feedback.created'))
      setDirty(false)
      onClose()
    } catch (err) {
      message.error(formatError ? formatError(err) : isApiError(err) ? err.message : t('feedback.apiError'))
    } finally {
      setSaving(false)
    }
  }

  const extraSaves = mode === 'edit' && item && saveOptions ? saveOptions(item) : []

  return (
    <FormPage
      title={mode === 'edit' ? t('actions.edit') : t('actions.create')}
      listTitle={title}
      wide={wide}
      onBack={requestClose}
      actions={
        <Space>
          <Button onClick={requestClose}>{t('actions.cancel')}</Button>
          {extraSaves.length > 0 ? (
            <Space.Compact>
              <Button type='primary' loading={saving} disabled={!ready} onClick={() => submit()}>
                {t('actions.save')}
              </Button>
              <Dropdown
                trigger={['click']}
                disabled={saving || !ready}
                menu={{
                  items: extraSaves.map((option) => ({ key: option.key, label: option.label })),
                  onClick: ({ key }) => {
                    const option = extraSaves.find((entry) => entry.key === key)
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
            <Button type='primary' loading={saving} disabled={!ready} onClick={() => submit()}>
              {t('actions.save')}
            </Button>
          )}
        </Space>
      }
    >
      {valuesQuery.isError ? (
        <Empty description={isApiError(valuesQuery.error) ? valuesQuery.error.message : t('feedback.apiError')} />
      ) : ready ? (
        <Form form={form} layout='vertical' onValuesChange={() => setDirty(true)}>
          {renderForm?.(form, { isNew: mode === 'new', item })}
        </Form>
      ) : (
        <Skeleton active paragraph={{ rows: 6 }} />
      )}
    </FormPage>
  )
}
