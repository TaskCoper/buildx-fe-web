'use client'

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { Building2, House, Layers, Palette, Ruler, Sofa, Square } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { cn } from '@/shared/lib/utils'
import { useTemplateClassification } from '../hooks/use-template-classification'
import type { HandbookTemplateDetail } from '../types/handbook.types'

const DESCRIPTION_ANIMATION_MS = 360

/**
 * Khung "Thông tin bản vẽ" / "Thông tin mẫu" + đoạn mô tả (Hình 2, 7, 8).
 *
 * Các `data-*` ở đây là điểm móc cho animation detail page: từng dòng vào lần
 * lượt, divider vẽ từ trái và hover chỉ đổi màu/icon — không thay đổi layout.
 */
export function TemplateInfo({
  template,
  className,
  transitionActive = false
}: {
  template: HandbookTemplateDetail
  className?: string
  transitionActive?: boolean
}) {
  const t = useTranslations('handbook.info')
  const { specs } = template
  const classification = useTemplateClassification(template)
  const [expanded, setExpanded] = useState(false)
  const descriptionCopyRef = useRef<HTMLDivElement>(null)
  const descriptionContentRef = useRef<HTMLDivElement>(null)
  const descriptionAnimationRef = useRef<Animation | null>(null)
  const descriptionMountedRef = useRef(false)
  const descriptionText = template.description.join('\n')

  const rows =
    template.kind === '2d'
      ? [
          { icon: Building2, label: t('buildingType'), value: specs.buildingTypeLabel },
          { icon: Layers, label: t('floorsPlan'), value: classification.floorLabel },
          { icon: House, label: t('tum'), value: classification.tumLabel },
          { icon: Ruler, label: t('lotSize'), value: specs.lotSize },
          { icon: Square, label: t('floorArea'), value: specs.floorArea }
        ]
      : [
          { icon: Building2, label: t('buildingType'), value: specs.buildingTypeLabel },
          { icon: Layers, label: t('floors'), value: classification.floorLabel },
          { icon: House, label: t('tum'), value: classification.tumLabel },
          ...(classification.groupedStyles
            ? [
                { icon: Palette, label: t('architectureStyle'), value: classification.architectureLabel },
                { icon: Sofa, label: t('interiorStyle'), value: classification.interiorLabel }
              ]
            : [{ icon: Palette, label: t('style'), value: template.styleLabel }])
        ]

  const descriptionLength = template.description.join(' ').length
  const canExpand = template.description.length > 2 || descriptionLength > 220

  useLayoutEffect(() => {
    const copy = descriptionCopyRef.current
    const content = descriptionContentRef.current
    if (!copy || !content) return

    if (!canExpand) {
      descriptionAnimationRef.current?.cancel()
      descriptionAnimationRef.current = null
      copy.style.height = 'auto'
      copy.style.willChange = ''
      descriptionMountedRef.current = true
      return
    }

    if (!descriptionMountedRef.current) {
      descriptionMountedRef.current = true
      copy.style.height = `${content.getBoundingClientRect().height}px`
      return
    }

    const previous = descriptionAnimationRef.current
    if (previous) {
      const currentHeight = copy.getBoundingClientRect().height
      previous.cancel()
      descriptionAnimationRef.current = null
      copy.style.height = `${currentHeight}px`
    }

    const fromHeight = copy.getBoundingClientRect().height
    const toHeight = content.getBoundingClientRect().height
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduceMotion || Math.abs(fromHeight - toHeight) < 0.5) {
      copy.style.height = `${toHeight}px`
      copy.style.willChange = ''
      return
    }

    copy.style.willChange = 'height'
    const animation = copy.animate([{ height: `${fromHeight}px` }, { height: `${toHeight}px` }], {
      duration: DESCRIPTION_ANIMATION_MS,
      easing: 'cubic-bezier(0.22,1,0.36,1)'
    })
    descriptionAnimationRef.current = animation

    animation.onfinish = () => {
      if (descriptionAnimationRef.current !== animation) return
      animation.cancel()
      descriptionAnimationRef.current = null
      copy.style.height = `${toHeight}px`
      copy.style.willChange = ''
    }
  }, [canExpand, expanded])

  useEffect(() => {
    const copy = descriptionCopyRef.current
    const content = descriptionContentRef.current
    if (!copy || !content || !canExpand) return

    const observer = new ResizeObserver(() => {
      if (descriptionAnimationRef.current) return
      copy.style.height = `${content.getBoundingClientRect().height}px`
    })
    observer.observe(content)
    return () => observer.disconnect()
  }, [canExpand, expanded])

  useEffect(
    () => () => {
      descriptionAnimationRef.current?.cancel()
      descriptionAnimationRef.current = null
    },
    []
  )

  return (
    <div data-template-info className={cn('space-y-4', className)}>
      <div>
        <h3
          data-template-info-title
          className='text-base font-semibold'
          style={transitionActive ? { viewTransitionName: 'handbook-detail-info-title' } : undefined}
        >
          {template.kind === '2d' ? t('planTitle') : t('templateTitle')}
        </h3>
        <dl className='mt-3 space-y-0'>
          {rows.map((row, index) =>
            row.value ? (
              <div
                key={row.label}
                data-template-info-row
                style={
                  {
                    '--info-row-delay': `${index * 78}ms`,
                    viewTransitionName: transitionActive ? `handbook-detail-info-row-${index}` : undefined
                  } as CSSProperties
                }
                className='hover:bg-muted/45 group/info relative grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start gap-3 rounded-md px-1 py-2.5 transition-colors'
              >
                <dt data-template-info-label className='text-muted-foreground flex items-start gap-2 text-sm'>
                  <row.icon className='text-muted-foreground group-hover/info:text-primary size-4 shrink-0 transition-colors' />
                  {row.label}
                </dt>
                <dd data-template-info-value className='min-w-0 text-right text-sm font-medium wrap-anywhere'>
                  {row.value}
                </dd>
                {index < rows.filter((item) => item.value).length - 1 ? (
                  <span
                    data-template-info-divider
                    aria-hidden
                    className='bg-border absolute right-1 bottom-0 left-1 h-px origin-left'
                  />
                ) : null}
              </div>
            ) : null
          )}
        </dl>
      </div>

      <div data-template-description>
        <h3
          data-template-description-title
          className='text-base font-semibold'
          style={transitionActive ? { viewTransitionName: 'handbook-detail-description-title' } : undefined}
        >
          {template.kind === '2d' ? t('planDescription') : t('templateDescription')}
        </h3>
        <div
          ref={descriptionCopyRef}
          data-template-description-copy
          data-expanded={expanded}
          className='mt-2 overflow-hidden'
          style={transitionActive ? { viewTransitionName: 'handbook-detail-description-copy' } : undefined}
        >
          {expanded || !canExpand ? (
            <div ref={descriptionContentRef} className='space-y-2'>
              {template.description.map((paragraph) => (
                <p key={paragraph} className='text-muted-foreground text-sm leading-relaxed'>
                  {paragraph}
                </p>
              ))}
            </div>
          ) : (
            <div
              ref={descriptionContentRef}
              data-template-description-preview
              className='text-muted-foreground line-clamp-5 whitespace-pre-line text-sm leading-relaxed'
            >
              {descriptionText}
            </div>
          )}
        </div>
        {canExpand ? (
          <button
            type='button'
            data-template-description-toggle
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
            className='text-primary hover:text-primary/80 mt-2 text-sm font-medium underline-offset-4 hover:underline'
          >
            {expanded ? t('showLess') : t('showMore')}
          </button>
        ) : null}
      </div>
    </div>
  )
}
