'use client'

import { useState } from 'react'

import { Photo, PlanDrawing } from '@/shared/components/common'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { libraryImageSrcSet, libraryImageUrl } from '@/shared/media/library-image.logic'
import { cn } from '@/shared/lib/utils'
import { isProtectedContentUrl } from '../api/handbook.library.logic'
import type { HandbookFloor, HandbookTemplate } from '../types/handbook.types'

interface TemplateFigureProps {
  template: HandbookTemplate
  /** Tầng cần vẽ. Bỏ trống thì lấy ảnh bìa (hoặc tầng đầu tiên). */
  floor?: HandbookFloor
  className?: string
  sizes?: string
  priority?: boolean
  /** Đóng dấu bản quyền SAVICO — bật ở ảnh lớn, tắt ở thumbnail. */
  watermark?: boolean
  /** Bản vẽ tự cao theo tỷ lệ lô thay vì lấp đầy khung tỷ lệ cố định. */
  autoHeight?: boolean
  /** Blur-to-sharp reveal for large handbook media only. */
  revealOnLoad?: boolean
  /** Original pixels for the zoom viewer; regular previews use responsive images. */
  original?: boolean
}

/**
 * Khung hình của một mẫu.
 *
 * Mẫu 3D luôn có ảnh phối cảnh thật. Mẫu 2D chỉ một phần có file bản vẽ; tầng
 * nào chưa có thì dựng bằng SVG (`PlanDrawing`) theo `planVariant` của tầng —
 * cùng một component hiển thị ảnh thật ngay khi admin tải bản vẽ lên, không phải
 * sửa nơi gọi.
 *
 * Bản vẽ mặt bằng luôn hiện TRỌN khung (`fit='contain'`): file thật là ảnh dọc
 * còn khung thẻ là 3:2, cắt theo kiểu `cover` thì mất cả dãy phòng lẫn dòng ghi
 * diện tích ở chân bản vẽ.
 */
export function TemplateFigure({
  template,
  floor,
  className,
  sizes,
  priority,
  watermark,
  autoHeight,
  revealOnLoad,
  original
}: TemplateFigureProps) {
  const target = floor ?? template.floors[0]
  const src = floor?.imageUrl ?? (floor ? undefined : template.imageUrl) ?? target?.imageUrl

  if (src) {
    const fit = template.kind === '2d' ? 'contain' : 'cover'

    // Ảnh phối cảnh cũng đóng dấu bản quyền như bản vẽ (Hình 8) — chỉ khác là
    // dấu nằm đè lên ảnh nên phải có bóng chữ mới đọc được trên nền sáng.
    if (!watermark) {
      return revealOnLoad ? (
        <RevealPhoto
          className={className}
          src={src}
          alt={template.name}
          sizes={sizes}
          priority={priority}
          fit={fit}
          original={original}
        />
      ) : (
        <Picture
          className={className}
          src={src}
          alt={template.name}
          sizes={sizes}
          priority={priority}
          fit={fit}
          original={original}
        />
      )
    }
    return (
      <div className={cn('relative', className)}>
        {revealOnLoad ? (
          <RevealPhoto
            className='size-full'
            src={src}
            alt={template.name}
            sizes={sizes}
            priority={priority}
            fit={fit}
            original={original}
          />
        ) : (
          <Picture
            className='size-full'
            src={src}
            alt={template.name}
            sizes={sizes}
            priority={priority}
            fit={fit}
            original={original}
          />
        )}
        <span
          aria-hidden
          className='absolute right-3 bottom-2 text-lg font-bold tracking-widest text-white/70 drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]'
        >
          BUILDX
        </span>
      </div>
    )
  }

  const lot = parseLot(template.specs.lotSize)

  return (
    <PlanDrawing
      className={className}
      variant={target?.planVariant ?? 'ground'}
      // Bản vẽ đặt chiều sâu lô nằm ngang, mặt tiền nằm dọc — đúng như bản vẽ
      // nhà phố thật, nên tỷ lệ khung là sâu/ngang.
      ratio={lot ? lot.depth / lot.frontage : undefined}
      dimensions={lot ? { width: toMillimetres(lot.depth), depth: toMillimetres(lot.frontage) } : undefined}
      watermark={watermark}
      paper={false}
      autoHeight={autoHeight}
      seed={`${template.id}-${target?.id ?? ''}`}
    />
  )
}

function RevealPhoto({
  className,
  src,
  alt,
  sizes,
  priority,
  fit,
  original
}: {
  className?: string
  src: string
  alt: string
  sizes?: string
  priority?: boolean
  fit: 'cover' | 'contain'
  original?: boolean
}) {
  const [loaded, setLoaded] = useState(false)

  return (
    <Picture
      className={className}
      src={src}
      alt={alt}
      sizes={sizes}
      priority={priority}
      fit={fit}
      original={original}
      imageClassName={cn('handbook-image-reveal', loaded && 'is-loaded')}
      onLoad={() => setLoaded(true)}
    />
  )
}

/** Tách "5 × 20 m" của CMS thành số mét: mặt tiền và chiều sâu lô. */
function parseLot(lotSize: string | undefined): { frontage: number; depth: number } | undefined {
  if (!lotSize) return undefined

  const [frontage, depth] = lotSize
    .replace(/m/gi, '')
    .split('×')
    .map((part) => Number(part.trim().replace(',', '.')))

  if (!frontage || !depth) return undefined
  return { frontage, depth }
}

/** 5 → "5 000"; dấu cách nghìn theo quy ước ghi kích thước trên bản vẽ. */
function toMillimetres(metres: number): string {
  return String(Math.round(metres * 1000)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

interface PictureProps {
  src: string
  alt: string
  className?: string
  sizes?: string
  priority?: boolean
  fit?: 'cover' | 'contain'
  imageClassName?: string
  onLoad?: () => void
  original?: boolean
}

/** Public images use Next optimization; protected LIB images use the authenticated media route. */
export function Picture(props: PictureProps) {
  return <PictureFrame key={`${props.src}|${Boolean(props.original)}`} {...props} />
}

function PictureFrame({
  src,
  alt,
  className,
  sizes,
  priority,
  fit = 'cover',
  imageClassName,
  onLoad,
  original
}: PictureProps) {
  const [failed, setFailed] = useState(false)
  if (!isProtectedContentUrl(src)) {
    return (
      <Photo
        className={className}
        src={src}
        alt={alt}
        sizes={sizes}
        priority={priority}
        fit={fit}
        imageClassName={imageClassName}
        onLoad={onLoad}
        unoptimized={original}
        skeletonClassName='handbook-skeleton animate-none'
      />
    )
  }
  const optimized = !original && !failed ? libraryImageUrl(src, 1280) : null
  return (
    <PrivatePicture
      key={optimized ?? src}
      src={optimized ?? src}
      alt={alt}
      className={className}
      sizes={sizes}
      priority={priority}
      fit={fit}
      imageClassName={imageClassName}
      onLoad={onLoad}
      srcSet={optimized ? libraryImageSrcSet(src) : undefined}
      onError={optimized ? () => setFailed(true) : undefined}
    />
  )
}

function PrivatePicture({
  src,
  alt,
  className,
  sizes,
  priority,
  fit,
  imageClassName,
  onLoad,
  srcSet,
  onError
}: PictureProps & { srcSet?: string; onError?: () => void }) {
  const [settled, setSettled] = useState(false)
  function loaded() {
    setSettled(true)
    onLoad?.()
  }
  function failed() {
    setSettled(true)
    onError?.()
  }
  return (
    <div
      className={cn('bg-muted relative overflow-hidden', className)}
      aria-busy={!settled}
      data-photo-loading={!settled}
    >
      {!settled ? (
        <Skeleton
          data-photo-skeleton
          aria-hidden='true'
          style={{ position: 'absolute', inset: 0 }}
          className='handbook-skeleton pointer-events-none z-10 animate-none rounded-[inherit]'
        />
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element -- protected images must carry the viewer's session */}
      <img
        src={src}
        srcSet={srcSet}
        sizes={srcSet ? sizes : undefined}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding='async'
        onLoad={loaded}
        onError={failed}
        ref={(img) => {
          if (!img?.complete || !img.currentSrc) return
          if (img.naturalWidth > 0) loaded()
          else failed()
        }}
        className={cn(
          'absolute inset-0 size-full',
          fit === 'contain' ? 'object-contain' : 'object-cover',
          imageClassName
        )}
      />
    </div>
  )
}
