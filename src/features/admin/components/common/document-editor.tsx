'use client'

import { App, Badge, Button, Card, Form, Popconfirm, Skeleton, Space, type FormInstance } from 'antd'
import { MockApiNotice } from './mock-api-notice'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useState, type ReactNode } from 'react'

import { isLocalizedDocument, type CmsDocument, type CmsDocumentMap } from '@/shared/cms'
import { useAdminDocument, useSaveAdminDocument } from '../../hooks/use-admin-data'
import { useUnsavedGuard } from '../../hooks/use-unsaved-guard'
import { AdminPage } from './admin-page'
import { ContentLocaleBanner } from './content-locale-banner'

/**
 * Trình soạn cho các nội dung "chỉ có MỘT bản": trang chủ, trang tĩnh, cài đặt
 * site. Khác `ResourceManager` ở chỗ không có bảng và không có thêm / xóa —
 * mở ra là thấy ngay nội dung hiện tại, sửa rồi Lưu.
 *
 * Các form này dài hơn màn hình nên:
 *   · khối đầu trang (kèm nút Lưu) dính dưới thanh trên;
 *   · có dấu "chưa lưu" và chặn rời trang khi còn thay đổi — soạn xong cả trang
 *     Điều khoản rồi bấm nhầm sang mục khác là mất trắng.
 */
export function DocumentEditor<K extends CmsDocument>({
  document,
  title,
  description,
  children,
  extraActions
}: {
  document: K
  title: string
  description?: string
  children: (form: FormInstance) => ReactNode
  extraActions?: ReactNode
}) {
  const t = useTranslations('admin')
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [dirty, setDirty] = useState(false)

  const { data, isPending } = useAdminDocument(document)
  const save = useSaveAdminDocument(document)

  const reset = useCallback(() => {
    if (data) form.setFieldsValue(data)
    setDirty(false)
  }, [data, form])

  // Dữ liệu về sau khi form đã mount, nên phải nạp lại giá trị khi nó tới — và
  // lại lần nữa khi đổi ngôn ngữ nội dung trên thanh trên.
  //
  // Hai việc, hai chỗ, cố ý:
  //   · ghi vào kho của antd Form là cập nhật một HỆ THỐNG BÊN NGOÀI → effect;
  //   · bỏ cờ "chưa lưu" là state của React → chỉnh ngay trong lúc render.
  // Nhét cả hai vào effect thì React phải render thừa một lượt mỗi lần dữ liệu
  // tới (xem quy tắc `react-hooks/set-state-in-effect`).
  useEffect(() => {
    if (data) form.setFieldsValue(data)
  }, [data, form])

  const [syncedData, setSyncedData] = useState(data)
  if (data !== syncedData) {
    setSyncedData(data)
    setDirty(false)
  }

  useUnsavedGuard(dirty)

  async function submit() {
    // Form sai thì antd reject kèm lỗi từng ô — đã hiện dưới ô, không cần ném tiếp.
    const values = (await form.validateFields().catch(() => null)) as CmsDocumentMap[K] | null
    if (!values) return
    await save.mutateAsync({ ...(data as CmsDocumentMap[K]), ...values })
    setDirty(false)
    message.success(t('feedback.saved'))
  }

  return (
    <AdminPage
      title={title}
      description={description}
      sticky
      actions={
        <Space>
          {extraActions}
          <Popconfirm
            title={t('actions.revertConfirmTitle')}
            description={t('actions.revertConfirmBody')}
            okText={t('actions.revert')}
            cancelText={t('actions.cancel')}
            disabled={!dirty}
            onConfirm={reset}
          >
            <Button disabled={!dirty}>{t('actions.revert')}</Button>
          </Popconfirm>
          <Badge dot={dirty} offset={[-2, 4]}>
            <Button type='primary' loading={save.isPending} onClick={submit}>
              {dirty ? t('actions.saveDirty') : t('actions.save')}
            </Button>
          </Badge>
        </Space>
      }
    >
      {isLocalizedDocument(document) ? <ContentLocaleBanner /> : null}
      <MockApiNotice />
      <Card>
        {isPending ? (
          <Skeleton active paragraph={{ rows: 8 }} />
        ) : (
          <Form form={form} layout='vertical' initialValues={data} onValuesChange={() => setDirty(true)}>
            {children(form)}
          </Form>
        )}
      </Card>
    </AdminPage>
  )
}
