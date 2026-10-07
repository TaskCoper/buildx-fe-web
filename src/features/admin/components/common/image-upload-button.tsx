'use client'

import { UploadOutlined } from '@ant-design/icons'
import { App, Button, Image as AntImage, Typography, Upload } from 'antd'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { isApiError } from '@/shared/lib/api'
import { ACCEPTED_IMAGE_TYPES, MediaUploadError, type MediaPurpose, uploadImage } from '@/shared/media'

import { FileDropZone } from './file-drop-zone'

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

/**
 * Chạy đủ ba bước của MEDIA cho một tệp ảnh và báo kết quả cho người vận hành bằng thông báo.
 * Trả URL ảnh đã được backend xác minh, hoặc `undefined` khi lỗi (lỗi đã được báo rồi).
 *
 * Một nơi duy nhất cho cả ba đường vào — bấm chọn tệp, kéo thả, khung ảnh trong richtext — để
 * câu báo lỗi không lệch nhau.
 */
export function useImageUpload(purpose?: MediaPurpose) {
  const t = useTranslations('admin.imageUpload')
  const { message } = App.useApp()
  const [pending, setPending] = useState(0)

  async function upload(file: File): Promise<string | undefined> {
    setPending((count) => count + 1)
    try {
      const uploaded = await uploadImage(file, purpose)
      message.success(t('done'))
      return uploaded.url
    } catch (error) {
      if (error instanceof MediaUploadError) {
        message.error(isKnownError(error.code) ? t(`errors.${error.code}`) : t('errors.generic'))
      } else {
        message.error(isApiError(error) ? error.message : t('errors.generic'))
      }
      return undefined
    } finally {
      setPending((count) => count - 1)
    }
  }

  return { upload, busy: pending > 0 }
}

interface PickImageButtonProps {
  onFile: (file: File) => void
  busy: boolean
  size?: 'small' | 'middle'
  label?: string
}

/** Nút bấm → hộp chọn tệp ảnh. Chỉ chọn tệp; việc tải lên do bên gọi (`useImageUpload`) điều khiển. */
function PickImageButton({ onFile, busy, size = 'middle', label }: PickImageButtonProps) {
  const t = useTranslations('admin.imageUpload')

  return (
    <Upload
      accept={ACCEPTED_IMAGE_TYPES.join(',')}
      showUploadList={false}
      maxCount={1}
      // `customRequest` để antd không tự POST tệp đi đâu cả — mọi bước do `uploadImage` điều khiển.
      customRequest={({ file }) => onFile(file as File)}
    >
      <Button icon={<UploadOutlined />} loading={busy} size={size}>
        {label ?? t('button')}
      </Button>
    </Upload>
  )
}

interface ImageUploadButtonProps {
  /** Nhận URL ảnh đã được backend xác minh — chỉ gọi khi chắc chắn thành công. */
  onUploaded: (url: string) => void
  purpose?: MediaPurpose
  size?: 'small' | 'middle'
  label?: string
}

/**
 * Nút tải ảnh dùng chung cho khu quản trị, thay cho việc bắt người vận hành tự
 * dán URL. Bấm → chọn tệp (hoặc kéo thả ảnh lên nút) → tự chạy đủ ba bước của MEDIA → trả URL cố định.
 *
 * LƯU Ý NGHIỆP VỤ: ảnh chỉ được tính là "đang dùng" khi bản ghi được LƯU thành
 * công. Bỏ form giữa chừng thì ảnh vừa tải sẽ bị dọn sau 24 giờ (BR-MEDIA-002) —
 * nên đừng coi lúc tải xong là đã lưu.
 */
export function ImageUploadButton({ onUploaded, purpose, size, label }: ImageUploadButtonProps) {
  const { upload, busy } = useImageUpload(purpose)
  const pick = async (file: File) => {
    const url = await upload(file)
    if (url) onUploaded(url)
  }

  return (
    <FileDropZone className='inline-block' disabled={busy} onFiles={([file]) => file && void pick(file)}>
      <PickImageButton busy={busy} size={size} label={label} onFile={(file) => void pick(file)} />
    </FileDropZone>
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
  const { upload, busy } = useImageUpload(purpose)

  const pick = async (file: File) => {
    const url = await upload(file)
    if (url) onChange?.(url)
  }

  return (
    <FileDropZone disabled={busy} onFiles={([file]) => file && void pick(file)}>
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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <PickImageButton
              size='small'
              busy={busy}
              label={value ? t('replace') : t('button')}
              onFile={(file) => void pick(file)}
            />
            {value ? (
              <Button type='text' size='small' danger onClick={() => onChange?.(undefined)}>
                {t('remove')}
              </Button>
            ) : null}
          </div>
          <Typography.Text type='secondary' style={{ fontSize: 11 }}>
            {t('orDrop')}
          </Typography.Text>
        </div>
      </div>
    </FileDropZone>
  )
}
