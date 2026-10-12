'use client'

import { LoadingOutlined, PictureOutlined } from '@ant-design/icons'
import { Node as TiptapNode, NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react'
import { Alert, Upload } from 'antd'
import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'

import { ACCEPTED_IMAGE_TYPES } from '@/shared/media'

import { FileDropZone } from '../common/file-drop-zone'
import { useImageUpload } from '../common/image-upload-button'
import { NodeRemoveButton } from './node-remove-button'
import { hostOfUrl, positiveInt } from './rich-text-paste'

export const IMAGE_PLACEHOLDER = 'imagePlaceholder'

/** Tên máy chủ của các ảnh đã tải lên kho trong phiên này — để ảnh dán lại từ chính kho không bị tải lại. */
const ownImageHosts = new Set<string>()
export const hasOwnImageHost = (host: string) => ownImageHosts.has(host)
const rememberOwnImage = (url: string) => {
  const host = hostOfUrl(url)
  if (host) ownImageHosts.add(host)
}

/**
 * Khung ảnh chỉ sống trong lúc soạn — KHÔNG được lọt vào `contentHtml` gửi lên backend. Node này
 * xuất ra một `<div data-image-placeholder>` rỗng (TipTap bắt buộc có đầu ra), và mọi chỗ lấy HTML
 * ra khỏi editor phải đi qua hàm này để bỏ nó đi.
 */
export const stripImagePlaceholders = (html: string) => html.replace(/<div data-image-placeholder[^>]*><\/div>/g, '')

/**
 * Bấm nút ảnh trên thanh công cụ → chèn khung này vào đúng chỗ con trỏ. Bấm vào khung để chọn ảnh,
 * hoặc kéo ảnh từ máy thả vào khung; tải xong khung tự biến thành ảnh. Không muốn chèn nữa thì bấm
 * dấu X đỏ ở góc trên phải.
 *
 * Tải lên có thể lâu (xin chỗ → đẩy tệp → backend xác minh), nên trong lúc chờ khung hiện bản xem
 * trước của ảnh vừa chọn, làm mờ và phủ vòng quay "Đang tải ảnh lên…" — không để khung đứng im.
 *
 * Khung cũng được tạo khi DÁN nội dung có ảnh từ nguồn ngoài (Google Docs, trang web): khi đó nó mang địa chỉ
 * `source`, tự tải ảnh về rồi tải lên kho (backend chỉ nhận ảnh ở kho của hệ thống). Trình duyệt chặn việc tải
 * (CORS) hoặc ảnh lỗi thì khung ở lại, báo rõ và cho chọn ảnh từ máy thay thế.
 */
function ImagePlaceholderView({ editor, node, getPos, deleteNode }: NodeViewProps) {
  const t = useTranslations('admin.newsArticles.editor')
  const { upload, busy } = useImageUpload()
  // Địa chỉ cục bộ của ảnh đang tải, chỉ để xem trước trong lúc chờ.
  const [preview, setPreview] = useState<string | null>(null)
  const { source, alt, width, height } = node.attrs as {
    source: string | null
    alt: string | null
    width: number | null
    height: number | null
  }
  const [importing, setImporting] = useState(Boolean(source))
  const [importFailed, setImportFailed] = useState(false)

  /** Tải một tệp lên kho rồi thay khung bằng ảnh. Trả `true` khi khung đã thành ảnh. */
  async function handleFile(file: File): Promise<boolean> {
    const local = file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    setPreview(local)
    try {
      const url = await upload(file)
      if (!url) return false
      rememberOwnImage(url)
      const pos = getPos()
      // Khung có thể đã bị gỡ trong lúc chờ tải. Khi đó không chèn gì: ảnh chưa gắn vào bài sẽ bị
      // backend dọn sau 24 giờ (BR-MEDIA-002).
      if (pos === undefined || editor.state.doc.nodeAt(pos)?.type.name !== IMAGE_PLACEHOLDER) return false
      editor
        .chain()
        .focus()
        .insertContentAt(
          { from: pos, to: pos + node.nodeSize },
          {
            type: 'image',
            attrs: { src: url, alt: alt ?? undefined, ...(width && height ? { width, height } : {}) }
          }
        )
        .run()
      return true
    } finally {
      if (local) URL.revokeObjectURL(local)
      setPreview(null)
    }
  }

  // Luôn dùng bản `handleFile` mới nhất mà không phải đưa nó vào danh sách phụ thuộc của effect tải ảnh dán.
  const latestHandleFile = useRef(handleFile)
  useEffect(() => {
    latestHandleFile.current = handleFile
  })

  // Tải ảnh dán một lần duy nhất cho mỗi khung (cờ `started` giữ qua lần mount thứ hai của StrictMode).
  const started = useRef(false)
  useEffect(() => {
    if (!source || started.current) return
    started.current = true
    void (async () => {
      let replaced = false
      try {
        const response = await fetch(source, { credentials: 'omit' })
        const blob = response.ok ? await response.blob() : null
        if (blob?.type.startsWith('image/')) {
          const extension = (blob.type.split('/')[1] ?? 'png').split('+')[0] ?? 'png'
          replaced = await latestHandleFile.current(new File([blob], `pasted.${extension}`, { type: blob.type }))
        }
      } catch {
        // Bị chặn (CORS), mất mạng… — xử lý chung ở dưới.
      }
      if (!replaced) {
        setImportFailed(true)
        setImporting(false)
      }
    })()
  }, [source])

  const working = busy || importing

  return (
    <NodeViewWrapper contentEditable={false} className='my-2'>
      <FileDropZone disabled={working} onFiles={([file]) => file && void handleFile(file)}>
        {working ? (
          <div className='relative grid min-h-44 place-items-center overflow-hidden rounded-lg border border-dashed border-[var(--ant-color-primary,#16a34a)] bg-[var(--admin-surface)] p-4'>
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element -- bản xem trước cục bộ (blob:), không qua tối ưu ảnh của Next
              <img src={preview} alt='' className='max-h-64 max-w-full rounded-md object-contain opacity-40' />
            ) : null}
            <div role='status' className='absolute inset-0 grid place-items-center'>
              {/* Viên nền đặc để chữ vẫn đọc được khi nằm đè lên nội dung ảnh xem trước. */}
              <div className='flex items-center gap-2 rounded-full bg-[var(--admin-surface)] px-4 py-2 shadow-md'>
                <LoadingOutlined spin className='text-lg text-[var(--ant-color-primary,#16a34a)]' />
                <span className='text-sm font-medium'>
                  {importing && !busy ? t('imageImporting') : t('imageUploading')}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <>
            {importFailed ? (
              <Alert type='warning' showIcon style={{ marginBottom: 8 }} title={t('imageImportFailed')} />
            ) : null}
            <Upload.Dragger
              accept={ACCEPTED_IMAGE_TYPES.join(',')}
              showUploadList={false}
              multiple={false}
              // Không để antd tự POST tệp đi đâu — tải lên do `useImageUpload` điều khiển.
              customRequest={({ file }) => void handleFile(file as File)}
            >
              <p className='ant-upload-drag-icon'>
                <PictureOutlined />
              </p>
              <p className='ant-upload-text'>{t('imageDropTitle')}</p>
              <p className='ant-upload-hint'>{t('imageDropHint')}</p>
            </Upload.Dragger>
          </>
        )}
        <NodeRemoveButton label={t('imageRemove')} disabled={working} onClick={() => deleteNode()} />
      </FileDropZone>
    </NodeViewWrapper>
  )
}

export const ImagePlaceholder = TiptapNode.create({
  name: IMAGE_PLACEHOLDER,
  group: 'block',
  atom: true,
  selectable: true,
  draggable: false,

  // Thông tin của ảnh dán từ nguồn ngoài (không bao giờ xuất ra HTML — xem `renderHTML`).
  addAttributes() {
    return {
      source: { default: null, parseHTML: (element: HTMLElement) => element.getAttribute('data-image-source') },
      alt: { default: null, parseHTML: (element: HTMLElement) => element.getAttribute('alt') },
      width: { default: null, parseHTML: (element: HTMLElement) => positiveInt(element.getAttribute('width')) },
      height: { default: null, parseHTML: (element: HTMLElement) => positiveInt(element.getAttribute('height')) }
    }
  },

  // `img[data-image-source]` do `normalizePastedHtml` tạo ra cho ảnh dán từ nguồn ngoài; ưu tiên cao hơn thẻ ảnh thường.
  parseHTML() {
    return [{ tag: 'div[data-image-placeholder]' }, { tag: 'img[data-image-source]', priority: 1000 }]
  },

  renderHTML() {
    return ['div', { 'data-image-placeholder': '' }]
  },

  addNodeView() {
    // Mọi sự kiện bên trong khung (bấm, kéo, thả) thuộc về ô tải — ProseMirror không được chen vào,
    // không thì nó nuốt cú thả tệp hoặc đặt lại con trỏ ngay lúc người dùng đang chọn ảnh.
    return ReactNodeViewRenderer(ImagePlaceholderView, { stopEvent: () => true })
  }
})
