'use client'

import { Form } from 'antd'
import type { NamePath } from 'antd/es/form/interface'
import { useTranslations } from 'next-intl'

import { ImagePicker } from './image-upload-button'

/**
 * Ô ảnh BẮT BUỘC cho dữ liệu nằm trên BMT API.
 *
 * Trước đây màn chưa có nút tải ảnh nên phải bắt người vận hành dán URL https.
 * Từ khi MEDIA bật (presign 3 bước), ô dán URL đã bỏ: chỉ còn chọn tệp, URL do
 * backend trả về sau khi xác minh và được giữ ngầm trong form.
 */
export function HttpsImageField({ name, label }: { name: NamePath; label: string }) {
  const t = useTranslations('admin')

  return (
    <Form.Item
      name={name}
      label={label}
      required
      rules={[{ required: true, message: t('fields.requiredMessage') }]}
      style={{ marginBottom: 16 }}
    >
      <ImagePicker />
    </Form.Item>
  )
}
