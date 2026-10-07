'use client'

import { DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { App, Button, Card, Empty, Form, Input, Skeleton, Space, Table, type FormInstance, type TableProps } from 'antd'
import { useTranslations } from 'next-intl'
import { Suspense, useEffect, useEffectEvent, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { isLocalizedCollection, type CmsCollection, type CmsCollectionMap } from '@/shared/cms'
import { useAdminCollection, useDeleteAdminItem, useSaveAdminItem } from '../../hooks/use-admin-data'
import { useFormPage, type FormPageMode } from '../../hooks/use-form-page'
import { useUnsavedGuard } from '../../hooks/use-unsaved-guard'
import { AdminPage } from './admin-page'
import { ContentLocaleBanner } from './content-locale-banner'
import { FormPage } from './form-page'
import { MockApiNotice } from './mock-api-notice'
import { RowActionsMenu, type RowAction } from './row-actions-menu'

/** Mọi bản ghi trong kho đều có `id` — engine dựa vào đó để sửa / xóa. */
type WithId = { id: string }

export interface ResourceManagerProps<K extends CmsCollection> {
  collection: K
  title: string
  description?: string
  columns: NonNullable<TableProps<CmsCollectionMap[K]>['columns']>
  /** Các trường trong trang sửa. Nhận `form` để bật/tắt trường theo giá trị khác. */
  renderForm: (form: FormInstance) => ReactNode
  /** Bản ghi trống khi bấm "Thêm mới". `null` = màn chỉ sửa, không thêm. */
  createItem?: () => CmsCollectionMap[K]
  /** Bản ghi → giá trị form. Mặc định dùng thẳng bản ghi. */
  toFormValues?: (item: CmsCollectionMap[K]) => Record<string, unknown>
  /** Giá trị form → bản ghi. Mặc định trộn đè lên bản ghi đang sửa. */
  fromFormValues?: (values: Record<string, unknown>, current: CmsCollectionMap[K]) => CmsCollectionMap[K]
  /** Chuỗi để lọc theo ô tìm kiếm. */
  searchText?: (item: CmsCollectionMap[K]) => string
  /** Bộ lọc ngoài (ví dụ ô chọn trạng thái ở đầu màn) — chạy trước ô tìm kiếm. */
  filterItems?: (item: CmsCollectionMap[K]) => boolean
  /** Cho phép xóa. Bảng vận hành (dự án, người dùng) thường không cho. */
  allowDelete?: boolean
  /**
   * Cho phép mở trang sửa. Tắt ở bảng CHỈ ĐỌC / chỉ thao tác bằng nút riêng
   * (giao dịch, subscription) — cây bút mà bấm ra một form trống thì gây hiểu
   * lầm là màn bị lỗi.
   */
  allowEdit?: boolean
  /**
   * Khối CHỈ ĐỌC hiện đầu trang sửa — dữ liệu do khách nhập hoặc do hệ thống
   * sinh ra.
   *
   * Có mặt để `renderForm` chỉ còn đúng những trường mà VẬN HÀNH được phép đổi.
   * Bảng dự án / người dùng / lịch hẹn không phải nội dung site: sửa tên dự án,
   * địa chỉ hay tổng dự toán của khách là sửa dữ liệu của người khác — nhìn thì
   * được, đổi thì không.
   */
  renderDetail?: (item: CmsCollectionMap[K]) => ReactNode
  /**
   * Gợi ý độ rộng của form. Tên cũ từ thời còn dùng ngăn kéo: từ 700 trở lên thì trang thêm / sửa
   * rộng hơn, còn lại là trang vừa.
   */
  drawerWidth?: number
  /** Nút phụ cạnh nút "Thêm mới". */
  extraActions?: ReactNode
  /** Khối hiện phía trên bảng (thẻ số liệu, bộ lọc riêng…). */
  banner?: ReactNode
  /**
   * Chặn xóa một bản ghi cụ thể — trả về LÝ DO (hiện ở tooltip, nút mờ đi) khi
   * bản ghi đã phát sinh ràng buộc, `null` khi xóa được.
   */
  deleteBlockedReason?: (item: CmsCollectionMap[K]) => string | null
  /** Nội dung xác nhận xóa riêng cho từng bản ghi (tên, số liệu liên quan…). */
  deleteConfirm?: (item: CmsCollectionMap[K]) => ReactNode
  /**
   * Hành động riêng của từng dòng (chuyển trạng thái, xác minh…) — trả DANH SÁCH
   * `RowAction[]`, hiện trong menu "…" kèm icon + chữ, đứng TRƯỚC Xem/Sửa/Xóa.
   */
  rowActions?: (item: CmsCollectionMap[K]) => RowAction[]
  /** Trang "Xem chi tiết" chỉ đọc — có thì dòng nào cũng có nút con mắt. */
  renderView?: (item: CmsCollectionMap[K]) => ReactNode
  /**
   * Kiểm tra chéo trước khi lưu — trả về thông báo lỗi để chặn lưu, `null` khi
   * hợp lệ. Dùng cho quy tắc không gắn với một ô (trùng tên, điều kiện kích hoạt…).
   */
  validate?: (next: CmsCollectionMap[K], current: CmsCollectionMap[K], isNew: boolean) => string | null
  /**
   * Hỏi lại trước khi lưu — trả về nội dung cảnh báo (ví dụ số hồ sơ bị ảnh
   * hưởng) để hiện hộp xác nhận, `null` khi lưu thẳng.
   */
  confirmSave?: (next: CmsCollectionMap[K], current: CmsCollectionMap[K], isNew: boolean) => ReactNode | null
  /**
   * Đổi giá trị này (bộ lọc ngoài vừa đổi) là bảng quay về trang đầu — spec yêu
   * cầu mọi danh sách về trang 1 khi đổi từ khóa hoặc bộ lọc.
   */
  filterKey?: string
  /** Từ khóa điền sẵn vào ô tìm kiếm — mở từ đường dẫn `?q=` của màn khác. */
  initialQuery?: string
  /** Mở sẵn trang "Xem chi tiết" của bản ghi này — đường dẫn `?id=` từ màn khác. */
  initialViewId?: string | null
  /** Chạy sau khi lưu thành công — giữ ràng buộc giữa các bản ghi (vd: tối đa một gói phổ biến). */
  afterSave?: (saved: CmsCollectionMap[K], previous: CmsCollectionMap[K]) => Promise<unknown> | void
}

/**
 * Engine CRUD dùng chung cho mọi bảng của khu quản trị.
 *
 * Mười màn quản lý đều cùng một hình dạng — bảng + ô tìm + trang sửa + xác nhận
 * xóa — nên chúng khai báo cột và các trường của form, phần còn lại chạy ở đây.
 * Cách này giữ mọi màn hành xử giống nhau và sửa một chỗ là cả khu đổi theo.
 *
 * Thêm / Sửa / Xem mở ra MỘT TRANG riêng thay bảng (URL `?act=…&rid=…`, xem `useFormPage`) chứ không
 * còn là ngăn kéo.
 */
export function ResourceManager<K extends CmsCollection>(props: ResourceManagerProps<K>) {
  // `useFormPage` đọc `useSearchParams`, cần ranh giới Suspense để trang vẫn dựng tĩnh được.
  return (
    <Suspense>
      <ResourceManagerBody {...props} />
    </Suspense>
  )
}

function ResourceManagerBody<K extends CmsCollection>({
  collection,
  title,
  description,
  columns,
  renderForm,
  createItem,
  toFormValues,
  fromFormValues,
  searchText,
  filterItems,
  allowDelete = true,
  allowEdit = true,
  renderDetail,
  drawerWidth = 560,
  extraActions,
  banner,
  deleteBlockedReason,
  deleteConfirm,
  rowActions,
  renderView,
  validate,
  confirmSave,
  filterKey,
  initialQuery,
  initialViewId,
  afterSave
}: ResourceManagerProps<K>) {
  type Item = CmsCollectionMap[K]

  const t = useTranslations('admin')
  const { message, modal } = App.useApp()
  const formPage = useFormPage()

  const { data, isPending } = useAdminCollection(collection)
  const remove = useDeleteAdminItem(collection)

  const [query, setQuery] = useState(initialQuery ?? '')
  const [page, setPage] = useState(1)

  // Đổi từ khóa hoặc bộ lọc ngoài → về trang đầu. Mẫu "điều chỉnh state khi
  // giá trị đổi" của React: so với lần render trước ngay trong thân hàm.
  const resetKey = `${query}|${filterKey ?? ''}`
  const [seenResetKey, setSeenResetKey] = useState(resetKey)
  if (resetKey !== seenResetKey) {
    setSeenResetKey(resetKey)
    setPage(1)
  }

  const all = useMemo(() => (data ?? []) as Item[], [data])

  const items = useMemo(() => {
    const filtered = filterItems ? all.filter(filterItems) : all
    const needle = query.trim().toLowerCase()
    if (!needle || !searchText) return filtered
    return filtered.filter((item) => searchText(item).toLowerCase().includes(needle))
  }, [all, query, searchText, filterItems])

  const canEdit = allowEdit

  // Chỉ nhận chế độ mà màn này thật sự hỗ trợ — URL gõ tay `?act=edit` ở màn chỉ đọc thì về danh sách.
  const requested = formPage.mode
  const mode: FormPageMode | null =
    (requested === 'new' && createItem) || (requested === 'edit' && canEdit) || (requested === 'view' && renderView)
      ? requested
      : null
  const rowId = formPage.id
  // Cả kho nằm trong bộ nhớ nên tìm theo `id` là đủ, kể cả khi tải lại trang.
  const target = rowId ? (all.find((item) => (item as WithId).id === rowId) ?? null) : null

  // Mở sẵn trang "Xem chi tiết" của dòng được chỉ định (`?id=`) MỘT lần, ngay khi dữ liệu về.
  const consumedInitial = useRef(false)
  const openInitial = useEffectEvent(() => {
    if (consumedInitial.current || !initialViewId || !renderView) return
    consumedInitial.current = true
    if (all.some((item) => (item as WithId).id === initialViewId)) {
      formPage.open('view', initialViewId, { replace: true })
    }
  })
  useEffect(() => {
    if (data) openInitial()
  }, [data])

  function openPage(next: FormPageMode, item?: Item) {
    formPage.open(next, item ? (item as WithId).id : undefined)
  }

  const wide = drawerWidth >= 700

  /* ===== Trang Thêm / Sửa ===== */
  if (mode === 'new' || mode === 'edit') {
    if (mode === 'edit' && target === null) {
      // Chưa thấy bản ghi cần sửa: đang tải kho thì chờ, tải xong mà vẫn không có thì báo.
      return (
        <FormPage title={t('actions.edit')} listTitle={title} wide={wide} onBack={() => formPage.close()}>
          {isPending ? (
            <Skeleton active paragraph={{ rows: 6 }} />
          ) : (
            <Empty description={t('feedback.recordNotFound')} />
          )}
        </FormPage>
      )
    }
    return (
      <FormSession<K>
        // Mỗi trang form một phiên riêng (form, cờ chưa lưu, bản ghi đang sửa) — đổi trang là dựng lại từ đầu.
        key={formPage.key}
        mode={mode}
        target={target}
        collection={collection}
        title={title}
        wide={wide}
        renderForm={renderForm}
        createItem={createItem}
        toFormValues={toFormValues}
        fromFormValues={fromFormValues}
        renderDetail={renderDetail}
        validate={validate}
        confirmSave={confirmSave}
        afterSave={afterSave}
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
        actions={
          canEdit && target ? (
            <Button
              icon={<EditOutlined />}
              onClick={() => formPage.open('edit', (target as WithId).id, { replace: true })}
            >
              {t('actions.edit')}
            </Button>
          ) : null
        }
      >
        {target ? (
          renderView(target)
        ) : isPending ? (
          <Skeleton active paragraph={{ rows: 6 }} />
        ) : (
          <Empty description={t('feedback.recordNotFound')} />
        )}
      </FormPage>
    )
  }

  const actionColumn: NonNullable<TableProps<Item>['columns']>[number] = {
    title: t('table.actions'),
    key: 'actions',
    fixed: 'right',
    align: 'right',
    render: (_, record) => {
      const actions: RowAction[] = [...(rowActions?.(record) ?? [])]
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
          onClick: () => openPage('edit', record)
        })
      }
      if (allowDelete) {
        const blocked = deleteBlockedReason?.(record)
        actions.push({
          key: 'delete',
          label: t('actions.delete'),
          icon: <DeleteOutlined />,
          danger: true,
          disabled: Boolean(blocked),
          onClick: () =>
            modal.confirm({
              title: t('actions.deleteConfirmTitle'),
              content: deleteConfirm ? deleteConfirm(record) : t('actions.deleteConfirmBody'),
              okText: t('actions.delete'),
              okButtonProps: { danger: true },
              cancelText: t('actions.cancel'),
              onOk: async () => {
                await remove.mutateAsync((record as WithId).id)
                message.success(t('feedback.deleted'))
              }
            })
        })
      }
      return <RowActionsMenu actions={actions} moreLabel={t('actions.more')} />
    }
  }

  /**
   * "Chưa có bản ghi nào" và "lọc không ra kết quả" là hai tình huống khác nhau:
   * cái đầu cần nút Thêm mới, cái sau cần nút xóa từ khóa. Bảng trống mà cứ hiện
   * "chưa có dữ liệu" thì người vận hành tưởng bản ghi bị mất.
   */
  const emptyState =
    query.trim() && all.length > 0 ? (
      <Empty description={t('table.noSearchResult', { query: query.trim() })}>
        <Button onClick={() => setQuery('')}>{t('table.clearSearch')}</Button>
      </Empty>
    ) : all.length > 0 ? (
      // Có dữ liệu nhưng bộ lọc ngoài loại hết — không phải "chưa có bản ghi".
      <Empty description={t('table.noFilterResult')} />
    ) : (
      <Empty description={t('table.empty')}>
        {createItem ? (
          <Button type='primary' icon={<PlusOutlined />} onClick={() => openPage('new')}>
            {t('actions.create')}
          </Button>
        ) : null}
      </Empty>
    )

  /* ===== Danh sách ===== */
  return (
    <AdminPage
      title={title}
      description={description}
      actions={
        <>
          {extraActions}
          {createItem ? (
            <Button type='primary' icon={<PlusOutlined />} onClick={() => openPage('new')}>
              {t('actions.create')}
            </Button>
          ) : null}
        </>
      }
    >
      <MockApiNotice />
      {isLocalizedCollection(collection) ? <ContentLocaleBanner /> : null}
      {banner}

      <Card
        // Bảng chạy hết bề ngang thẻ; lề của ô đầu / ô cuối do `.admin-table-card`
        // trong `admin.css` trả lại, vì đó là DOM bên trong của antd.
        className='admin-table-card'
        styles={{ body: { padding: 0 } }}
        title={
          searchText ? (
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder={t('table.searchPlaceholder')}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              style={{ maxWidth: 320 }}
            />
          ) : undefined
        }
      >
        <Table<Item>
          rowKey={(record) => (record as WithId).id}
          loading={isPending}
          dataSource={items}
          // Không sửa, không xóa thì đừng bày cột Thao tác trống.
          columns={canEdit || allowDelete || rowActions || renderView ? [...columns, actionColumn] : [...columns]}
          locale={{ emptyText: isPending ? ' ' : emptyState }}
          scroll={{ x: 'max-content' }}
          pagination={{
            current: page,
            onChange: setPage,
            pageSize: 10,
            showSizeChanger: true,
            hideOnSinglePage: false,
            // Đếm luôn tổng để biết bộ lọc đang giấu bớt bao nhiêu bản ghi.
            showTotal: (total) => t('table.total', { total }),
            responsive: true
          }}
          size='middle'
        />
      </Card>
    </AdminPage>
  )
}

interface FormSessionProps<K extends CmsCollection> {
  mode: 'new' | 'edit'
  /** Sửa: bản ghi cần sửa. */
  target: CmsCollectionMap[K] | null
  collection: K
  title: string
  wide: boolean
  renderForm: ResourceManagerProps<K>['renderForm']
  createItem?: ResourceManagerProps<K>['createItem']
  toFormValues?: ResourceManagerProps<K>['toFormValues']
  fromFormValues?: ResourceManagerProps<K>['fromFormValues']
  renderDetail?: ResourceManagerProps<K>['renderDetail']
  validate?: ResourceManagerProps<K>['validate']
  confirmSave?: ResourceManagerProps<K>['confirmSave']
  afterSave?: ResourceManagerProps<K>['afterSave']
  onClose: () => void
}

/**
 * Một lần mở trang Thêm / Sửa. Form, cờ "chưa lưu" và bản ghi đang sửa đều thuộc về phiên này nên mở
 * trang khác (hoặc về danh sách) là sạch hết — không phải dọn tay.
 */
function FormSession<K extends CmsCollection>({
  mode,
  target,
  collection,
  title,
  wide,
  renderForm,
  createItem,
  toFormValues,
  fromFormValues,
  renderDetail,
  validate,
  confirmSave,
  afterSave,
  onClose
}: FormSessionProps<K>) {
  type Item = CmsCollectionMap[K]

  const t = useTranslations('admin')
  const { message, modal } = App.useApp()
  const [form] = Form.useForm()
  const save = useSaveAdminItem(collection)
  const [dirty, setDirty] = useState(false)
  useUnsavedGuard(dirty)

  const isNew = mode === 'new'
  // Chốt bản ghi và giá trị form ngay lúc mở: Lưu dùng đúng bản này dù kho có đổi giữa chừng.
  const [item] = useState<Item | null>(() => (isNew ? (createItem?.() ?? null) : target))
  const [initialValues] = useState(() =>
    item ? (toFormValues ? toFormValues(item) : (item as unknown as Record<string, unknown>)) : undefined
  )
  // Nạp giá trị SAU khi các ô đã dựng và TRƯỚC khi vẽ ra màn hình (không nháy ô trống): giống cách cũ
  // của ngăn kéo. Truyền qua `initialValues` của Form thì antd cảnh báo "Field can not overwrite it" ở
  // mọi ô tự khai `initialValue` trùng đường dẫn (vd. bảng quyền lợi của gói).
  useLayoutEffect(() => {
    if (initialValues) form.setFieldsValue(initialValues)
  }, [form, initialValues])

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

  async function submit() {
    if (!item) return
    // Form sai thì antd reject kèm lỗi từng ô — đã hiện dưới ô, không cần ném tiếp.
    const values = (await form.validateFields().catch(() => null)) as Record<string, unknown> | null
    if (!values) return
    const next = fromFormValues ? fromFormValues(values, item) : ({ ...item, ...values } as Item)
    const problem = validate?.(next, item, isNew)
    if (problem) {
      message.error(problem)
      return
    }
    const warning = confirmSave?.(next, item, isNew)
    if (warning) {
      const confirmed = await modal.confirm({
        title: t('actions.confirmSaveTitle'),
        content: warning,
        okText: t('actions.save'),
        cancelText: t('actions.keepEditing')
      })
      if (!confirmed) return
    }
    await save.mutateAsync(next)
    await afterSave?.(next, item)
    message.success(isNew ? t('feedback.created') : t('feedback.saved'))
    setDirty(false)
    onClose()
  }

  return (
    <FormPage
      title={isNew ? t('actions.create') : t('actions.edit')}
      listTitle={title}
      wide={wide}
      onBack={requestClose}
      actions={
        <Space>
          <Button onClick={requestClose}>{t('actions.cancel')}</Button>
          <Button type='primary' loading={save.isPending} onClick={submit}>
            {t('actions.save')}
          </Button>
        </Space>
      }
    >
      {isLocalizedCollection(collection) ? <ContentLocaleBanner /> : null}
      {item && renderDetail ? <div className='mb-5'>{renderDetail(item)}</div> : null}

      {/* Gần như trường nào cũng không bắt buộc, nên `requiredMark='optional'`
          dán "(Tùy chọn)" lên hầu hết nhãn — nhiễu và làm nhãn xuống dòng.
          Để mặc định: chỉ trường bắt buộc mới có dấu sao. */}
      <Form form={form} layout='vertical' onValuesChange={() => setDirty(true)}>
        {renderForm(form)}
      </Form>
    </FormPage>
  )
}
