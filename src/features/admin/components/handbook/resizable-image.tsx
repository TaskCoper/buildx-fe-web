'use client'

import Image from '@tiptap/extension-image'
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react'
import { useTranslations } from 'next-intl'
import { useRef, useState, type PointerEvent } from 'react'

import { cn } from '@/shared/lib/utils'

import { NodeRemoveButton } from './node-remove-button'

const MIN_WIDTH = 80

/**
 * Ảnh trong bài: có dấu X đỏ để xoá và tay nắm góc dưới phải để kéo đổi kích thước (giữ tỉ lệ).
 *
 * Kích thước lưu vào `width`/`height` của thẻ `<img>` dưới dạng SỐ NGUYÊN — backend giữ hai thuộc
 * tính này và bỏ nếu không phải số nguyên dương (TDD-NEWS-001), nên không được lưu số lẻ.
 */
function ImageView({ node, selected, updateAttributes, deleteNode }: NodeViewProps) {
  const t = useTranslations('admin.newsArticles.editor')
  const { src, alt, title } = node.attrs as { src: string; alt?: string | null; title?: string | null }
  const savedWidth = Number(node.attrs.width) || undefined

  const imgRef = useRef<HTMLImageElement>(null)
  const drag = useRef<{ startX: number; startWidth: number; ratio: number; max: number } | null>(null)
  // Độ rộng đang kéo dở. Giữ tới khi node nhận kích thước mới để ảnh không giật về cỡ cũ.
  const [liveWidth, setLiveWidth] = useState<number | null>(null)
  const [shownSaved, setShownSaved] = useState(savedWidth)
  if (shownSaved !== savedWidth) {
    setShownSaved(savedWidth)
    setLiveWidth(null)
  }

  const widthAt = (event: PointerEvent) => {
    const state = drag.current
    if (!state) return MIN_WIDTH
    return Math.min(state.max, Math.max(MIN_WIDTH, state.startWidth + event.clientX - state.startX))
  }

  function startResize(event: PointerEvent<HTMLButtonElement>) {
    const img = imgRef.current
    if (!img) return
    event.preventDefault()
    event.stopPropagation()
    const rect = img.getBoundingClientRect()
    drag.current = {
      startX: event.clientX,
      startWidth: rect.width,
      ratio: img.naturalWidth > 0 ? img.naturalHeight / img.naturalWidth : rect.height / rect.width,
      // Không cho rộng hơn khung soạn.
      max: img.closest('[data-node-view-wrapper]')?.clientWidth ?? rect.width
    }
    // Bắt con trỏ để kéo ra ngoài nút vẫn nhận move/up.
    event.currentTarget.setPointerCapture(event.pointerId)
    setLiveWidth(rect.width)
  }

  function endResize(event: PointerEvent) {
    const state = drag.current
    if (!state) return
    const width = Math.round(widthAt(event))
    drag.current = null
    updateAttributes({ width, height: Math.round(width * state.ratio) })
  }

  return (
    <NodeViewWrapper>
      <div className='group relative inline-block max-w-full align-top'>
        {/* eslint-disable-next-line @next/next/no-img-element -- ảnh do người soạn tải lên, kích thước do họ kéo */}
        <img
          ref={imgRef}
          src={src}
          alt={alt ?? ''}
          title={title ?? undefined}
          style={{ width: liveWidth ?? savedWidth }}
          className={cn(
            'block h-auto max-w-full rounded-md',
            selected && 'outline-2 outline-offset-2 outline-[var(--ant-color-primary,#16a34a)]'
          )}
        />
        <NodeRemoveButton label={t('imageDelete')} onClick={() => deleteNode()} />
        <button
          type='button'
          aria-label={t('imageResize')}
          title={t('imageResize')}
          className={cn(
            'absolute -right-1.5 -bottom-1.5 z-10 size-3.5 cursor-nwse-resize touch-none rounded-sm border-2 border-white bg-[var(--ant-color-primary,#16a34a)] shadow transition-opacity',
            selected || liveWidth !== null
              ? 'opacity-100'
              : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100'
          )}
          onPointerDown={startResize}
          onPointerMove={(event) => drag.current && setLiveWidth(widthAt(event))}
          onPointerUp={endResize}
          onPointerCancel={() => {
            drag.current = null
            setLiveWidth(null)
          }}
        />
      </div>
    </NodeViewWrapper>
  )
}

/** `Image` của TipTap, thay giao diện trong editor bằng `ImageView`; HTML xuất ra vẫn là `<img src width height>`. */
export const ResizableImage = Image.extend({
  addNodeView() {
    return ReactNodeViewRenderer(ImageView)
  }
})
