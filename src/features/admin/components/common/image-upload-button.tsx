'use client'

import { UploadOutlined } from '@ant-design/icons'
import { App, Button, Image as AntImage, Typography, Upload } from 'antd'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { isApiError } from '@/shared/lib/api'
import { ACCEPTED_IMAGE_TYPES, MediaUploadError, type MediaPurpose, uploadImage } from '@/shared/media'

/**
 * Các mã lỗi có câu tiếng Việt riêng. Mã ngoài danh sách này (backend thêm sau,
 * hoặc `failureCode` chưa được tài liệu liệt kê) rơi về câu chung — thà nói
 * chung chung còn hơn hiện mã kỹ thuật cho người vận hành.
 */
const KNOWN_ERRORS = [
  'UnsupportedType',
  'TooLarge',
  'StoragePutFailed',
  'StillValidating',
  'MediaUploadExpired',
  'MediaUploadNotReady',
  'MediaStorageUnavailable',
  'Rejected'
] as const

type KnownError = (typeof KNOWN_ERRORS)[number]

const isKnownError = (code: string): code is KnownError => (KNOWN_ERRORS as readonly string[]).includes(code)

interface ImageUploadButtonProps {
  /** Nhận URL ảnh đã được backend xác minh — chỉ gọi khi chắc chắn thành công. */
  onUploaded: (url: string) => void
  purpose?: MediaPurpose
  size?: 'small' | 'middle'
  label?: string
}

/**
 * Nút tải ảnh dùng chung cho khu quản trị, thay cho việc bắt người vận hành tự
 * dán URL. Bấm → chọn tệp → tự chạy đủ ba bước của MEDIA → trả URL cố định.
 *
 * Ô nhập URL vẫn giữ bên cạnh: ảnh cũ đã nằm sẵn trên kho thì dán lại nhanh hơn
 * tải lên lần nữa.
 *
 * LƯU Ý NGHIỆP VỤ: ảnh chỉ được tính là "đang dùng" khi bản ghi được LƯU thành
 * công. Bỏ form giữa chừng thì ảnh vừa tải sẽ bị dọn sau 24 giờ (BR-MEDIA-002) —
 * nên đừng coi lúc tải xong là đã lưu.
 */
export function ImageUploadButton({ onUploaded, purpose, size = 'middle', label }: ImageUploadButtonProps) {
  const t = useTranslations('admin.imageUpload')
  const { message } = App.useApp()
  const [busy, setBusy] = useState(false)

  return (
    <Upload
      accept={ACCEPTED_IMAGE_TYPES.join(',')}
      showUploadList={false}
      maxCount={1}
      // `customRequest` để antd không tự POST tệp đi đâu cả — mọi bước do
      // `uploadImage` điều khiển.
      customRequest={async ({ file }) => {
        setBusy(true)
        try {
          const uploaded = await uploadImage(file as File, purpose)
          onUploaded(uploaded.url)
          message.success(t('done'))
        } catch (error) {
          if (error instanceof MediaUploadError) {
            message.error(isKnownError(error.code) ? t(`errors.${error.code}`) : t('errors.generic'))
          } else {
            message.error(isApiError(error) ? error.message : t('errors.generic'))
          }
        } finally {
          setBusy(false)
        }
      }}
    >
      <Button icon={<UploadOutlined />} loading={busy} size={size}>
        {label ?? t('button')}
      </Button>
    </Upload>
  )
}

/**
 * Ô chọn ảnh cho form quản trị: xem trước + tải lên + gỡ. KHÔNG còn ô dán URL —
 * người vận hành chỉ chọn tệp, URL là giá trị ngầm của form.
 *
 * Nhận `value`/`onChange` do `Form.Item` tiêm vào, nên báo lỗi bắt buộc hiển thị
 * như mọi trường khác.
 */
export function ImagePicker({
  value,
  onChange,
  purpose
}: {
  value?: string
  onChange?: (url: string | undefined) => void
  purpose?: MediaPurpose
}) {
  const t = useTranslations('admin.imageUpload')
  const tf = useTranslations('admin')

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div
        style={{
          width: 96,
          height: 68,
          flexShrink: 0,
          borderRadius: 8,
          overflow: 'hidden',
          background: 'var(--admin-placeholder)',
          display: 'grid',
          placeItems: 'center'
        }}
      >
        {value ? (
          <AntImage src={value} alt='' width={96} height={68} style={{ objectFit: 'cover' }} />
        ) : (
          <Typography.Text type='secondary' style={{ fontSize: 11 }}>
            {tf('fields.noImage')}
          </Typography.Text>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <ImageUploadButton
          size='small'
          purpose={purpose}
          label={value ? t('replace') : t('button')}
          onUploaded={(url) => onChange?.(url)}
        />
        {value ? (
          <Button type='text' size='small' danger onClick={() => onChange?.(undefined)}>
            {t('remove')}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
