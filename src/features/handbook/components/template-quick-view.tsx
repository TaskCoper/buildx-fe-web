'use client'

import { useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Link } from '@/i18n/navigation'
import { Badge } from '@/shared/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { handbookTemplateRoute } from '@/shared/constants/routes'
import { FavoriteButton } from '@/shared/favorite'
import { cn } from '@/shared/lib/utils'
import type { HandbookTemplate } from '../types/handbook.types'
import { FloorSwitcher, resolveFloor } from './floor-switcher'
import { TemplateFigure } from './template-figure'
import { TemplateInfo } from './template-info'

interface TemplateQuickViewProps {
  template: HandbookTemplate | null
  onClose: () => void
}

/**
 * Hộp thoại xem nhanh một mẫu (Phần 1.2, Hình 2).
 *
 * Mở ngay trên màn hình đang chờ nên người dùng không phải rời trang. Ai muốn
 * xem kỹ hơn thì bấm "Mở trang đầy đủ" để sang trang chi tiết.
 */
export function TemplateQuickView({ template, onClose }: TemplateQuickViewProps) {
  const t = useTranslations('handbook.quickView')
  // Tầng đang xem được gắn kèm id của mẫu: mở mẫu khác thì `templateId` không
  // khớp nữa và lựa chọn tự quay về tầng đầu tiên, không cần effect đồng bộ.
  const [selection, setSelection] = useState({ templateId: '', floorId: '' })
  const floorId = template && selection.templateId === template.id ? selection.floorId : ''

  const activeFloor = template ? resolveFloor(template, floorId) : undefined

  function selectFloor(nextFloorId: string) {
    if (!template) return
    setSelection({ templateId: template.id, floorId: nextFloorId })
  }

  return (
    <Dialog open={Boolean(template)} onOpenChange={(open) => !open && onClose()}>
      {/* `flex flex-col` chứ không dùng `grid` mặc định: khi nội dung cao hơn
          max-height, grid bóp hàng lại cho vừa, còn ảnh vẫn giữ đúng tỉ lệ nên
          tràn ra ngoài hàng của nó và đè lên phần bên dưới. */}
      <DialogContent className='flex max-h-[90vh] flex-col overflow-y-auto sm:max-w-4xl'>
        {template ? (
          <>
            <DialogHeader className='pr-10'>
              <DialogTitle>{template.name}</DialogTitle>
            </DialogHeader>

            <div className='flex flex-wrap items-center gap-2'>
              <Badge variant='secondary'>{template.specs.buildingTypeLabel}</Badge>
              <Badge variant='secondary'>{template.specs.floorLabel}</Badge>
              {template.specs.lotSize ? (
                <Badge variant='outline'>
                  {template.specs.lotSize}
                  {template.specs.floorArea ? ` · ${template.specs.floorArea}` : ''}
                </Badge>
              ) : null}
              <FavoriteButton
                variant='full'
                item={{
                  templateId: template.id,
                  kind: template.kind,
                  name: template.name,
                  imageUrl: template.imageUrl ?? template.floors[0]?.imageUrl ?? '',
                  tagLabel: template.styleLabel
                }}
                className='ml-auto'
              />
            </div>

            <div className='grid gap-5 md:grid-cols-[1.4fr_1fr]'>
              <div className='space-y-3'>
                <TemplateFigure
                  template={template}
                  floor={activeFloor}
                  /* Mẫu 2D để bản vẽ tự quyết chiều cao (như trang chi tiết) —
                     ép tỉ lệ 4/3 làm bản vẽ ngang lọt thỏm giữa khung trắng. */
                  className={cn('w-full shrink-0 rounded-xl border', template.kind === '3d' && 'aspect-16/9')}
                  sizes='(max-width: 768px) 100vw, 560px'
                  watermark
                />
                {/* Hình 2: dưới nút chuyển tầng còn dải ảnh xem trước, y như trang chi tiết. */}
                <FloorSwitcher
                  template={template}
                  activeId={activeFloor?.id ?? ''}
                  onChange={selectFloor}
                  showThumbnails
                />
              </div>

              <div className='space-y-4'>
                <TemplateInfo template={template} className='bg-muted/40 rounded-xl border p-4' />
                <Link
                  href={handbookTemplateRoute(template.id)}
                  className='text-primary inline-flex items-center gap-1.5 text-sm font-medium hover:underline'
                >
                  {t('openFullPage')}
                  <ArrowUpRight className='size-4' />
                </Link>
              </div>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
