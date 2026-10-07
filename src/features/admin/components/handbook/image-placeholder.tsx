'use client'

import { LoadingOutlined, PictureOutlined } from '@ant-design/icons'
import { Node as TiptapNode, NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react'
import { Upload } from 'antd'
import { useTranslations } from 'next-intl'

import { ACCEPTED_IMAGE_TYPES } from '@/shared/media'

import { FileDropZone } from '../common/file-drop-zone'
import { useImageUpload } from '../common/image-upload-button'
import { NodeRemoveButton } from './node-remove-button'

export const IMAGE_PLACEHOLDER = 'imagePlaceholder'

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
 */
function ImagePlaceholderView({ editor, node, getPos, deleteNode }: NodeViewProps) {
  const t = useTranslations('admin.newsArticles.editor')
  const { upload, busy } = useImageUpload()

  async function handleFile(file: File) {
    const url = await upload(file)
    if (!url) return
    const pos = getPos()
    // Khung có thể đã bị gỡ trong lúc chờ tải. Khi đó không chèn gì: ảnh chưa gắn vào bài sẽ bị
    // backend dọn sau 24 giờ (BR-MEDIA-002).
    if (pos === undefined || editor.state.doc.nodeAt(pos)?.type.name !== IMAGE_PLACEHOLDER) return
    editor
      .chain()
      .focus()
      .insertContentAt({ from: pos, to: pos + node.nodeSize }, { type: 'image', attrs: { src: url } })
      .run()
  }

  return (
    <NodeViewWrapper contentEditable={false} className='my-2'>
      <FileDropZone disabled={busy} onFiles={([file]) => file && void handleFile(file)}>
        <Upload.Dragger
          accept={ACCEPTED_IMAGE_TYPES.join(',')}
          showUploadList={false}
          multiple={false}
          disabled={busy}
          // Không để antd tự POST tệp đi đâu — tải lên do `useImageUpload` điều khiển.
          customRequest={({ file }) => void handleFile(file as File)}
        >
          <p className='ant-upload-drag-icon'>{busy ? <LoadingOutlined /> : <PictureOutlined />}</p>
          <p className='ant-upload-text'>{busy ? t('imageUploading') : t('imageDropTitle')}</p>
          <p className='ant-upload-hint'>{t('imageDropHint')}</p>
        </Upload.Dragger>
        <NodeRemoveButton label={t('imageRemove')} disabled={busy} onClick={() => deleteNode()} />
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

  renderHTML() {
    return ['div', { 'data-image-placeholder': '' }]
  },

  addNodeView() {
    // Mọi sự kiện bên trong khung (bấm, kéo, thả) thuộc về ô tải — ProseMirror không được chen vào,
    // không thì nó nuốt cú thả tệp hoặc đặt lại con trỏ ngay lúc người dùng đang chọn ảnh.
    return ReactNodeViewRenderer(ImagePlaceholderView, { stopEvent: () => true })
  }
})
