'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'
import { LocationMap } from '@/shared/components/common'
import { Button } from '@/shared/components/ui/button'
import { quotationApi } from './quotation.api'
import type { QuotationDetail } from './quotation.types'

/** The immutable RFQ snapshot, never the current SITE profile or its file URLs. */
export function QuotationDossier({ detail }: { detail: QuotationDetail }) {
  const t = useTranslations('contractors.rfq')
  const s = useTranslations('contractors.rfq.profileFields')
  const locale = useLocale()
  const { profile, attachments } = detail.snapshot
  const decimal = (value: string) => {
    const [whole = '0', fraction] = value.split('.')
    const format = new Intl.NumberFormat(locale)
    const separator = format.formatToParts(1.1).find((part) => part.type === 'decimal')?.value ?? '.'
    return format.format(BigInt(whole)) + (fraction ? separator + fraction : '')
  }
  const fields = [
    [s('site'), detail.snapshot.siteName],
    [s('buildingType'), profile.buildingType.name],
    [s('area'), decimal(profile.areaM2) + ' m²'],
    [s('condition'), profile.condition.name],
    [s('budget'), decimal(profile.budgetVnd) + ' VND'],
    [s('plannedStart'), s(`startOptions.${profile.plannedStart}`)],
    [s('floors'), profile.floorCount === null ? s('notApplicable') : String(profile.floorCount)],
    [s('tum'), profile.hasTum === null ? s('notApplicable') : profile.hasTum ? s('hasTum') : s('noTum')],
    [s('architecture'), profile.architectureStyle?.name ?? s('notApplicable')],
    [s('interior'), profile.interiorStyle?.name ?? s('notApplicable')],
    [s('address'), profile.address.formattedAddress],
    [s('source'), profile.sourceEstimateId ?? s('independent')]
  ]
  return (
    <section className='space-y-4'>
      <h3 className='font-semibold'>
        {t('snapshot', { version: detail.snapshot.siteVersion, count: attachments.length })}
      </h3>
      <p className='text-muted-foreground text-sm'>{t('snapshotHint')}</p>
      <dl className='grid gap-3 text-sm sm:grid-cols-2'>
        {fields.map(([label, value]) => (
          <div key={label}>
            <dt className='text-muted-foreground'>{label}</dt>
            <dd className='break-words'>{value}</dd>
          </div>
        ))}
      </dl>
      <LocationMap latitude={profile.address.latitude} longitude={profile.address.longitude} />
      <ul className='space-y-2'>
        {attachments.map((file) => (
          <QuotationFile key={file.id} requestId={detail.request.id} file={file} />
        ))}
      </ul>
    </section>
  )
}
function QuotationFile({
  requestId,
  file
}: {
  requestId: string
  file: QuotationDetail['snapshot']['attachments'][number]
}) {
  const t = useTranslations('contractors.rfq')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const download = async () => {
    setBusy(true)
    setError(false)
    try {
      const blob = await quotationApi.download(requestId, file.id)
      if (blob.size !== file.sizeBytes) throw new Error('InvalidFileContent')
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = file.originalName.replace(/[/\\\x00-\x1f]/g, '_')
      document.body.append(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }
  return (
    <li className='space-y-1'>
      <Button
        variant='outline'
        disabled={busy}
        onClick={download}
        className='h-auto max-w-full whitespace-normal text-left'
      >
        {file.originalName}
      </Button>
      {error ? (
        <p role='alert' className='text-destructive text-sm'>
          {t('fileFailed')}
        </p>
      ) : null}
    </li>
  )
}
