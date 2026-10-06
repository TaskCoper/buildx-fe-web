'use client'

import { useTranslations } from 'next-intl'
import { useMemo } from 'react'

import { TemplateFigure, useHandbookTemplates, type HandbookTemplate } from '@/features/handbook'
import { HomeDossiers, type HomeTemplateFactKind, type HomeTemplateItem } from '@/features/landing'
import { handbookTemplateRoute } from '@/shared/constants/routes'

/** Số mẫu lấy từ MỖI thư viện: 4 thẻ đầu là bản vẽ 2D, 4 thẻ sau là nội thất 3D. */
const PER_LIBRARY = 4

/**
 * App-layer glue cho dải "Danh sách thư viện mẫu" ở trang chủ: `features/landing` không import được
 * `features/handbook`, nên dữ liệu thư viện 2D/3D và khung hình `TemplateFigure` được dựng ở đây rồi
 * truyền xuống dưới dạng thẻ đã sẵn sàng hiển thị.
 */
export function HomeDossiersSection() {
  const tCard = useTranslations('handbook.card')
  const { data: templates, isPending } = useHandbookTemplates()

  const items = useMemo<HomeTemplateItem[] | undefined>(() => {
    if (isPending) return undefined
    const all = templates ?? []
    const pick = (kind: HandbookTemplate['kind']) =>
      all.filter((template) => template.kind === kind).slice(0, PER_LIBRARY)

    const toItem = (template: HandbookTemplate): HomeTemplateItem => {
      const { specs } = template
      const facts: { kind: HomeTemplateFactKind; text?: string }[] =
        template.kind === '2d'
          ? [
              { kind: 'area', text: specs.floorArea },
              { kind: 'floors', text: specs.floorLabel },
              { kind: 'lot', text: specs.lotSize }
            ]
          : [
              { kind: 'floors', text: specs.floorLabel },
              { kind: 'images', text: specs.imageCount ? tCard('imageCount', { count: specs.imageCount }) : undefined }
            ]

      return {
        id: template.id,
        kind: template.kind,
        href: handbookTemplateRoute(template.id),
        title: template.name,
        badge: `${template.kind === '2d' ? '2D' : '3D'} · ${template.styleLabel}`,
        facts: facts.filter((fact): fact is { kind: HomeTemplateFactKind; text: string } => Boolean(fact.text)),
        cover: (
          <TemplateFigure
            template={template}
            className='size-full'
            sizes='(max-width: 640px) 82vw, (max-width: 1024px) 45vw, 22vw'
          />
        )
      }
    }

    return [...pick('2d'), ...pick('3d')].map(toItem)
  }, [isPending, templates, tCard])

  return <HomeDossiers items={items} />
}
