'use client'

import { DeleteOutlined, PlusOutlined, SwapOutlined } from '@ant-design/icons'
import { Button, Col, Form, Input, Popconfirm, Row, Space, Tooltip, Typography } from 'antd'
import type { ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import type { NamePath } from 'antd/es/form/interface'

import { ImagePicker } from './image-upload-button'

const { Text } = Typography

/**
 * Các trường form dùng lại nhiều lần trong khu quản trị.
 *
 * Bốn thứ lặp đi lặp lại ở mọi màn: ô ảnh có xem trước, danh sách chuỗi (mô tả
 * nhiều đoạn, tiểu sử KTS), danh sách mục có tiêu đề + nội dung (thân bài viết,
 * điều khoản) và bảng dòng nhiều cột (điểm cam kết, dải 3 bước). Gom về đây để
 * mọi màn nhập liệu giống nhau.
 */

/**
 * Ô ảnh cho form quản trị: xem trước + tải lên + gỡ.
 *
 * Bỏ ô dán URL từ khi MEDIA bật — người vận hành chọn tệp, backend xác minh rồi
 * trả URL, form giữ URL đó ngầm.
 */
export function ImageUrlField({ name, label, required }: { name: NamePath; label: string; required?: boolean }) {
  const t = useTranslations('admin')

  return (
    <Form.Item
      name={name}
      label={label}
      required={required}
      rules={required ? [{ required: true, message: t('fields.requiredMessage') }] : undefined}
      style={{ marginBottom: 16 }}
    >
      <ImagePicker />
    </Form.Item>
  )
}

/** Danh sách chuỗi — mỗi phần tử một đoạn / một dòng. */
export function StringListField({
  name,
  label,
  placeholder,
  textarea
}: {
  name: NamePath
  label: string
  placeholder?: string
  textarea?: boolean
}) {
  const t = useTranslations('admin')

  return (
    <Form.Item label={label} style={{ marginBottom: 16 }}>
      <Form.List name={name}>
        {(fields, { add, remove }) => (
          <Space orientation='vertical' size={8} style={{ width: '100%' }}>
            {/* Từng dòng là flex tay: item của `Space` không giãn nên ô nhập sẽ
                teo lại còn một cột hẹp dù thẻ cha rộng cả ngăn kéo. */}
            {/* Tách `key` ra khỏi phần spread: React cảnh báo khi key đi lẫn
                trong props object. */}
            {fields.map(({ key, ...field }) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Form.Item {...field} noStyle>
                  {textarea ? (
                    <Input.TextArea
                      autoSize={{ minRows: 2, maxRows: 6 }}
                      placeholder={placeholder}
                      style={{ flex: 1 }}
                    />
                  ) : (
                    <Input placeholder={placeholder} style={{ flex: 1 }} />
                  )}
                </Form.Item>
                <Button
                  type='text'
                  danger
                  icon={<DeleteOutlined />}
                  aria-label={t('actions.removeRow')}
                  onClick={() => remove(field.name)}
                />
              </div>
            ))}
            <Button type='dashed' block icon={<PlusOutlined />} onClick={() => add('')}>
              {t('actions.addRow')}
            </Button>
          </Space>
        )}
      </Form.List>
    </Form.Item>
  )
}

/**
 * Danh sách mục "tiêu đề + nội dung" — thân bài viết Cẩm nang, các điều của
 * trang Điều khoản / Bảo mật.
 */
export function SectionListField({
  name,
  label,
  headingLabel,
  bodyLabel,
  bodyAsList
}: {
  name: NamePath
  label: string
  headingLabel: string
  bodyLabel: string
  /** `true` khi nội dung là mảng đoạn văn (`paragraphs`) thay vì một chuỗi. */
  bodyAsList?: boolean
}) {
  const t = useTranslations('admin')

  return (
    <Form.Item label={label} style={{ marginBottom: 16 }}>
      <Form.List name={name}>
        {(fields, { add, remove }) => (
          <Space orientation='vertical' size={12} style={{ width: '100%' }}>
            {fields.map((field, index) => (
              <div key={field.key} style={{ border: '1px solid var(--admin-border)', borderRadius: 10, padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                  <Text strong style={{ flex: 1 }}>
                    {t('fields.sectionIndex', { index: index + 1 })}
                  </Text>
                  <Button
                    type='text'
                    danger
                    size='small'
                    icon={<DeleteOutlined />}
                    aria-label={t('actions.removeRow')}
                    onClick={() => remove(field.name)}
                  />
                </div>
                <Form.Item name={[field.name, 'heading']} label={headingLabel} style={{ marginBottom: 10 }}>
                  <Input />
                </Form.Item>
                {bodyAsList ? (
                  <StringListField name={[field.name, 'paragraphs']} label={bodyLabel} textarea />
                ) : (
                  <Form.Item name={[field.name, 'body']} label={bodyLabel} style={{ marginBottom: 0 }}>
                    <Input.TextArea autoSize={{ minRows: 3, maxRows: 8 }} />
                  </Form.Item>
                )}
              </div>
            ))}
            <Button
              type='dashed'
              block
              icon={<PlusOutlined />}
              onClick={() => add(bodyAsList ? { heading: '', paragraphs: [''] } : { heading: '', body: '' })}
            >
              {t('actions.addSection')}
            </Button>
          </Space>
        )}
      </Form.List>
    </Form.Item>
  )
}

/** Một cột của {@link RowListField}. */
export interface RowListColumn {
  /** Tên trường trong từng phần tử của mảng. */
  name: string
  label: string
  /** Số cột trên lưới 24 của antd ở khổ `md` trở lên. */
  span: number
  /** Ô khóa (mã khớp icon / khóa dịch) — hiện mờ, không cho sửa. */
  locked?: boolean
  placeholder?: string
}

/**
 * Bảng dòng nhiều cột: dải 3 điểm cam kết, dải 3 bước, và mọi danh sách "mỗi
 * dòng vài trường ngắn" khác.
 *
 * Có HÀNG TIÊU ĐỀ CỘT hẳn hoi. Trước đây mỗi ô chỉ có placeholder, mà placeholder
 * biến mất ngay khi ô có chữ — nhìn vào bảng đã điền thì không còn biết cột nào
 * là gì, và ô mã bị khóa trông y như một ô hỏng.
 */
export function RowListField({
  name,
  columns,
  emptyRow,
  addLabel
}: {
  name: NamePath
  columns: readonly RowListColumn[]
  /** Giá trị của một dòng mới. */
  emptyRow: () => Record<string, unknown>
  addLabel?: string
}) {
  const t = useTranslations('admin')
  // Cột cuối chừa 2/24 cho nút xóa, đúng bằng bề ngang nút icon của antd.
  const ACTION_SPAN = 2

  return (
    <Form.List name={name}>
      {(fields, { add, remove }) => (
        <Space orientation='vertical' size={8} style={{ width: '100%' }}>
          {fields.length > 0 ? (
            <Row gutter={8} className='px-1'>
              {columns.map((column) => (
                <Col key={column.name} xs={0} md={column.span}>
                  <Text type='secondary' style={{ fontSize: 12 }}>
                    {column.label}
                  </Text>
                </Col>
              ))}
              <Col xs={0} md={ACTION_SPAN} />
            </Row>
          ) : null}

          {fields.map((field) => (
            <Row key={field.key} gutter={8} align='middle'>
              {columns.map((column) => (
                <Col key={column.name} xs={24} md={column.span}>
                  {/* Khổ hẹp lưới xếp chồng nên placeholder là thứ duy nhất còn
                      chỉ ra cột — giữ lại nhãn ở đó. */}
                  <Form.Item name={[field.name, column.name]} style={{ marginBottom: 8 }}>
                    <Input disabled={column.locked} placeholder={column.placeholder ?? column.label} />
                  </Form.Item>
                </Col>
              ))}
              <Col xs={24} md={ACTION_SPAN}>
                <Button
                  type='text'
                  danger
                  icon={<DeleteOutlined />}
                  aria-label={t('actions.removeRow')}
                  onClick={() => remove(field.name)}
                  style={{ marginBottom: 8 }}
                />
              </Col>
            </Row>
          ))}

          <Button type='dashed' block icon={<PlusOutlined />} onClick={() => add(emptyRow())}>
            {addLabel ?? t('actions.addRow')}
          </Button>
        </Space>
      )}
    </Form.List>
  )
}

/**
 * Nút "Chuyển trạng thái" có bước xác nhận — mọi epic của spec admin đều yêu cầu
 * hộp xác nhận hiện TRẠNG THÁI HIỆN TẠI và TRẠNG THÁI SAU KHI CHUYỂN. Có
 * `blockedReason` thì nút mờ đi và giải thích vì sao chưa chuyển được (thiếu dữ
 * liệu bắt buộc, đang được sử dụng…).
 */
export function StatusSwitch({
  name,
  current,
  next,
  onConfirm,
  blockedReason,
  warning
}: {
  /** Tên bản ghi hiện trong hộp xác nhận. */
  name: string
  current: string
  next: string
  onConfirm: () => Promise<unknown> | void
  blockedReason?: string | null
  /** Cảnh báo ảnh hưởng (gói đang dùng quà này, lịch còn hiệu lực…). */
  warning?: ReactNode
}) {
  const t = useTranslations('admin')

  if (blockedReason) {
    return (
      <Tooltip title={blockedReason}>
        <Button type='text' size='small' disabled icon={<SwapOutlined />} aria-label={t('actions.switchStatus')} />
      </Tooltip>
    )
  }

  return (
    <Popconfirm
      title={t('actions.switchStatusTitle', { name })}
      description={
        <div style={{ maxWidth: 300 }}>
          <Text>{t('actions.switchStatusBody', { current, next })}</Text>
          {warning ? <div style={{ marginTop: 6 }}>{warning}</div> : null}
        </div>
      }
      okText={t('actions.confirm')}
      cancelText={t('actions.cancel')}
      onConfirm={onConfirm}
    >
      <Tooltip title={t('actions.switchStatus')}>
        <Button type='text' size='small' icon={<SwapOutlined />} aria-label={t('actions.switchStatus')} />
      </Tooltip>
    </Popconfirm>
  )
}
