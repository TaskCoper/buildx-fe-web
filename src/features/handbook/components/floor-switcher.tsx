'use client'

import { useLayoutEffect, useMemo, useRef, useState } from 'react'

import { cn } from '@/shared/lib/utils'
import type { HandbookFloor, HandbookTemplate } from '../types/handbook.types'
import { TemplateFigure } from './template-figure'

interface FloorSwitcherProps {
  template: HandbookTemplate
  activeId: string
  onChange: (floorId: string) => void
  /** Hiện dải ảnh xem trước dưới nhóm nút (trang chi tiết — Hình 7, Hình 8). */
  showThumbnails?: boolean
  className?: string
}

interface PillStyle {
  transform: string
  width: number
  height: number
  ready: boolean
}

/**
 * Nhóm nút chuyển tầng + dải ảnh xem trước.
 *
 * Trang chi tiết dùng một pill duy nhất trượt giữa các tab thay vì đổi nền từng
 * button. Thumbnail dùng cùng `onChange`, nên click tab / thumbnail / swipe / phím
 * luôn đi qua một nguồn state ở component cha.
 */
export function FloorSwitcher({ template, activeId, onChange, showThumbnails, className }: FloorSwitcherProps) {
  const { floors } = template
  // Gom ảnh theo mục: mẫu mock mỗi ảnh là một tầng (mỗi nhóm một ảnh); mẫu thật một mục có thể nhiều ảnh.
  const groups = useMemo(() => {
    const byId = new Map<string, { id: string; label: string; floors: HandbookFloor[] }>()
    for (const floor of floors) {
      const id = floor.groupId ?? floor.id
      const group = byId.get(id) ?? { id, label: floor.groupLabel ?? floor.label, floors: [] }
      group.floors.push(floor)
      byId.set(id, group)
    }
    return [...byId.values()]
  }, [floors])
  const activeFloor = floors.find((floor) => floor.id === activeId)
  const activeGroupId = activeFloor ? (activeFloor.groupId ?? activeFloor.id) : groups[0]?.id
  // Có mục nhiều ảnh → dải ảnh nhỏ chỉ hiện ảnh của mục đang chọn; không thì hiện mọi ảnh như mock.
  const hasMultiImageGroup = groups.some((group) => group.floors.length > 1)
  const thumbnails = hasMultiImageGroup ? (groups.find((group) => group.id === activeGroupId)?.floors ?? []) : floors
  const trackRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [pillStyle, setPillStyle] = useState<PillStyle>({
    transform: 'translate3d(0,0,0)',
    width: 0,
    height: 0,
    ready: false
  })

  useLayoutEffect(() => {
    const track = trackRef.current
    const active = tabRefs.current[activeGroupId ?? '']
    if (!track || !active) return

    const update = () => {
      const trackRect = track.getBoundingClientRect()
      const activeRect = active.getBoundingClientRect()
      setPillStyle({
        transform: `translate3d(${activeRect.left - trackRect.left}px, ${activeRect.top - trackRect.top}px, 0)`,
        width: activeRect.width,
        height: activeRect.height,
        ready: true
      })
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(track)
    observer.observe(active)
    return () => observer.disconnect()
  }, [activeGroupId, groups.length])

  return (
    <div data-floor-switcher className={cn('space-y-3', className)}>
      <div
        ref={trackRef}
        data-floor-tab-track
        className='bg-muted/60 relative inline-flex flex-wrap gap-1 rounded-lg p-1'
      >
        <span
          data-floor-tab-pill
          data-ready={pillStyle.ready}
          aria-hidden
          className='bg-primary pointer-events-none absolute top-0 left-0 rounded-md shadow-sm'
          style={{ transform: pillStyle.transform, width: pillStyle.width, height: pillStyle.height }}
        />
        {groups.map((group) => {
          const active = group.id === activeGroupId
          return (
            <button
              key={group.id}
              ref={(node) => {
                tabRefs.current[group.id] = node
              }}
              type='button'
              data-floor-tab={group.id}
              // Bấm tab của mục đang chọn thì giữ ảnh hiện tại; sang mục khác thì mở ảnh đầu của mục đó.
              onClick={() => {
                const first = group.floors[0]
                if (first && !active) onChange(first.id)
              }}
              aria-pressed={active}
              className={cn(
                'relative z-10 rounded-md px-4 py-1.5 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
                active ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {group.label}
            </button>
          )
        })}
      </div>

      {showThumbnails ? (
        <ul data-floor-thumbnails className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
          {thumbnails.map((floor) => {
            const active = floor.id === activeId
            return (
              <li key={floor.id}>
                <button
                  type='button'
                  data-floor-thumbnail={floor.id}
                  onClick={() => onChange(floor.id)}
                  aria-pressed={active}
                  className={cn(
                    'group/floor block w-full overflow-hidden rounded-lg border-2 transition-[border-color,transform,box-shadow] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
                    active
                      ? 'border-primary shadow-sm'
                      : 'border-transparent hover:border-primary/35 hover:scale-[1.018]'
                  )}
                >
                  <span data-floor-thumbnail-media className='block h-24 overflow-hidden'>
                    <TemplateFigure
                      template={template}
                      floor={floor}
                      className='pointer-events-none h-full w-full transition-transform duration-300 ease-out group-hover/floor:scale-[1.018]'
                      autoHeight={false}
                      sizes='200px'
                    />
                  </span>
                  <span className={cn('block py-1.5 text-center text-xs', active ? 'font-semibold' : 'font-medium')}>
                    {floor.label}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}

/** Tầng đang chọn, có fallback về tầng đầu tiên khi id không còn hợp lệ. */
export function resolveFloor(template: HandbookTemplate, floorId: string): HandbookFloor | undefined {
  return template.floors.find((floor) => floor.id === floorId) ?? template.floors[0]
}
