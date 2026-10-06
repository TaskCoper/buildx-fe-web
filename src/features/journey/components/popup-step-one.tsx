'use client'

import { FilePlus2, Upload } from 'lucide-react'
import { useTranslations } from 'next-intl'

import type { JourneyBranch } from '../types/journey.types'
import { JourneyChoiceCard } from './journey-choice-card'
import { JourneyDialogShell } from './journey-dialog-shell'

/** Ảnh hai thẻ chọn (góp ý BuildX: bộ ảnh mới thay ảnh nhà phố / bản vẽ cũ). */
const NO_DRAWING_IMAGE = '/images/journey/popup-no-drawing.jpg'
const HAS_DRAWING_IMAGE = '/images/journey/popup-has-drawing.jpg'

interface PopupStepOneProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onChoose: (branch: JourneyBranch) => void
  uploadPending?: boolean
}

export function PopupStepOne({ open, onOpenChange, onChoose, uploadPending = false }: PopupStepOneProps) {
  const t = useTranslations('common.journey.stepOne')

  const leftBullets = [t('withoutDrawing.bullet1'), t('withoutDrawing.bullet2'), t('withoutDrawing.bullet3')]
  const rightBullets = [t('withDrawing.bullet1'), t('withDrawing.bullet2'), t('withDrawing.bullet3')]

  return (
    <JourneyDialogShell open={open} onOpenChange={onOpenChange} title={t('title')} description={t('subtitle')}>
      <div className='grid gap-4 lg:grid-cols-2'>
        <JourneyChoiceCard
          tone='green'
          imageSrc={NO_DRAWING_IMAGE}
          imageAlt={t('withoutDrawing.imageAlt')}
          Icon={FilePlus2}
          title={t('withoutDrawing.title')}
          description={t('withoutDrawing.description')}
          bullets={leftBullets}
          info={t('withoutDrawing.info')}
          infoTone='orange'
          cta={t('withoutDrawing.cta')}
          onClick={() => onChoose('design')}
          order={0}
        />
        <JourneyChoiceCard
          tone='orange'
          imageSrc={HAS_DRAWING_IMAGE}
          imageAlt={t('withDrawing.imageAlt')}
          Icon={Upload}
          title={t('withDrawing.title')}
          description={t('withDrawing.description')}
          bullets={rightBullets}
          info={t('withDrawing.info')}
          infoTone='green'
          cta={t('withDrawing.cta')}
          onClick={() => onChoose('upload')}
          disabled={uploadPending}
          order={1}
        />
      </div>
    </JourneyDialogShell>
  )
}
