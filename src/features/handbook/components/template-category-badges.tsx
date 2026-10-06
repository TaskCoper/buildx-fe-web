'use client'

import { useTranslations } from 'next-intl'

import { Badge } from '@/shared/components/ui/badge'
import { floorCountOf } from '../services/handbook.service'
import type { HandbookTemplateDetail, HandbookTemplateStyles } from '../types/handbook.types'

/** Cùng một bộ nhãn cho thẻ thư viện và Mẫu tương tự; không tải nội dung chi tiết. */
export function TemplateCategoryBadges({
  template,
  styles,
  stylesPending = false,
  stylesError = false
}: {
  template: HandbookTemplateDetail
  styles?: HandbookTemplateStyles
  stylesPending?: boolean
  stylesError?: boolean
}) {
  const t = useTranslations('handbook.card')
  const tLibrary = useTranslations('handbook.library')
  const floorCount = template.floorCount ?? floorCountOf(template.tags.floorCount)
  const architectureStyles = styles?.architectureStyles ?? template.architectureStyles ?? []
  const interiorStyles = styles?.interiorStyles ?? template.interiorStyles ?? []
  const badgeClassName = 'h-auto max-w-full whitespace-normal wrap-anywhere'

  return (
    <span className='flex min-w-0 flex-wrap items-center gap-2' data-template-categories>
      {template.specs.buildingTypeLabel ? (
        <Badge variant='secondary' className={badgeClassName}>
          {template.specs.buildingTypeLabel}
        </Badge>
      ) : null}
      <Badge variant='outline' className={badgeClassName}>
        {floorCount !== undefined ? tLibrary('floorOption', { count: floorCount }) : t('floorsNotApplicable')}
      </Badge>
      <Badge variant='outline' className={badgeClassName}>
        {template.tags.hasAttic == null
          ? t('tumNotApplicable')
          : tLibrary(template.tags.hasAttic ? 'withTum' : 'withoutTum')}
      </Badge>
      {template.kind === '3d' ? (
        <>
          {architectureStyles.map((style) => (
            <Badge key={`architecture-${style.styleId}`} variant='secondary' className={badgeClassName}>
              {tLibrary('architecturePrefix', { value: style.name })}
            </Badge>
          ))}
          {interiorStyles.map((style) => (
            <Badge key={`interior-${style.styleId}`} variant='secondary' className={badgeClassName}>
              {tLibrary('interiorPrefix', { value: style.name })}
            </Badge>
          ))}
          {template.source !== 'bmt' && !architectureStyles.length && !interiorStyles.length && template.styleLabel ? (
            <Badge variant='secondary' className={badgeClassName}>
              {template.styleLabel}
            </Badge>
          ) : null}
          {stylesError ? (
            <span className='text-destructive text-xs' role='status'>
              {t('stylesError')}
            </span>
          ) : stylesPending ? (
            <span className='text-muted-foreground text-xs' role='status'>
              {t('stylesLoading')}
            </span>
          ) : null}
        </>
      ) : null}
    </span>
  )
}
