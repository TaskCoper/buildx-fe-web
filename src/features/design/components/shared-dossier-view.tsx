'use client'

import { Fragment } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLocale, useTranslations } from 'next-intl'

import type { Locale } from '@/i18n/routing'
import { EmptyState, LoadingSpinner } from '@/shared/components/common'
import { Download, Loader2 } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { Table, TableBody, TableCell, TableRow } from '@/shared/components/ui/table'
import { formatCurrency, formatDisplayDate, formatNumber } from '@/shared/utils'
import { designApi } from '../api/design.api'
import { designKeys } from '../api/design.keys'
import { COST_SECTIONS } from '../constants/design.constants'
import { useSharedDownload, useSharedImage } from '../hooks/use-shared-files'

/**
 * Xem bộ hồ sơ qua link chia sẻ — chỉ đọc, không cần đăng nhập (mục III.4c).
 *
 * Bản rút gọn: thông tin dự án + toàn bộ bảng dự toán 3 phần. Không hiện số
 * điện thoại hay thao tác chỉnh sửa; người xem muốn làm dự án riêng thì tự tạo.
 */
/** Một ảnh kết quả của link chia sẻ; chưa tải được thì ẩn cả ô. */
function SharedImage({
  shareId,
  token,
  fileId,
  label
}: {
  shareId: string
  token: string
  fileId: string
  label: string
}) {
  const src = useSharedImage(shareId, token, fileId)
  if (!src) return null
  return (
    <figure className='space-y-1.5'>
      <div className='bg-muted aspect-4/3 overflow-hidden rounded-xl border'>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={label} className='size-full object-contain' />
      </div>
      <figcaption className='text-muted-foreground text-center text-xs'>{label}</figcaption>
    </figure>
  )
}

/** Ảnh và nút tải PDF / Excel của hồ sơ, chỉ cho link chia sẻ của BE. */
function SharedFiles({
  shareId,
  token,
  files
}: {
  shareId: string
  token: string
  files: { fileId: string; roleKey: string }[]
}) {
  const t = useTranslations('design.share')
  const { download, pending, failed } = useSharedDownload(shareId, token)
  const roles = [
    ['perspective', t('images.perspective')],
    ['cover-image', t('images.cover')],
    ['floor-plan-2d', t('images.floorPlan')]
  ] as const
  const images = roles.flatMap(([role, label]) => {
    const file = files.find((item) => item.roleKey === role)
    return file ? [{ fileId: file.fileId, label }] : []
  })

  return (
    <>
      {images.length > 0 ? (
        <section className='space-y-3'>
          <h2 className='text-base font-semibold'>{t('imagesTitle')}</h2>
          <div className='grid gap-4 sm:grid-cols-3'>
            {images.map((image) => (
              <SharedImage
                key={image.fileId}
                shareId={shareId}
                token={token}
                fileId={image.fileId}
                label={image.label}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className='space-y-3'>
        <h2 className='text-base font-semibold'>{t('downloadTitle')}</h2>
        <div className='flex flex-wrap gap-3'>
          {(['Pdf', 'Xlsx'] as const).map((format) => (
            <Button
              key={format}
              variant={format === 'Pdf' ? 'default' : 'outline'}
              onClick={() => void download(format)}
              disabled={pending !== null}
            >
              {pending === format ? <Loader2 className='size-4 animate-spin' /> : <Download className='size-4' />}
              {pending === format ? t('downloading') : format === 'Pdf' ? t('downloadPdf') : t('downloadXlsx')}
            </Button>
          ))}
        </div>
        {failed ? <p className='text-destructive text-sm'>{t('downloadFailed')}</p> : null}
      </section>
    </>
  )
}

export function SharedDossierView({ token, share }: { token: string; share?: { shareId: string; token: string } }) {
  const t = useTranslations('design.share')
  const tEstimate = useTranslations('design.estimate')
  const locale = useLocale() as Locale

  const { data, isPending } = useQuery({
    queryKey: [...designKeys.all, 'share', share ? `${share.shareId}` : token],
    queryFn: () => (share ? designApi.getSharedEstimate(share.shareId, share.token) : designApi.getSharedDossier(token))
  })

  if (isPending) {
    return (
      <div className='flex justify-center py-24'>
        <LoadingSpinner />
      </div>
    )
  }

  if (!data) {
    return (
      <div className='mx-auto w-full max-w-md px-4 py-5 lg:py-24'>
        <EmptyState title={t('invalidTitle')} description={t('invalidDescription')} />
      </div>
    )
  }

  const ordered = COST_SECTIONS.map((key) => data.sections.find((section) => section.section === key)).filter(
    (section) => section !== undefined
  )

  return (
    <div className='mx-auto w-full max-w-3xl space-y-8 px-4 py-5 lg:px-8'>
      <header className='space-y-2'>
        <p className='text-muted-foreground text-xs tracking-widest uppercase'>{t('eyebrow')}</p>
        <h1 className='text-3xl font-semibold tracking-tight text-balance'>{data.projectName}</h1>
        <p className='text-muted-foreground text-sm'>
          {[data.address, data.createdAt ? formatDisplayDate(data.createdAt, locale) : ''].filter(Boolean).join(' · ')}
        </p>
      </header>

      <section className='bg-card overflow-hidden rounded-2xl border'>
        <div className='flex items-center justify-between gap-4 border-b p-5'>
          <div>
            <p className='text-muted-foreground text-xs font-medium'>{tEstimate('grandTotal')}</p>
            <p className='text-primary text-2xl font-semibold tabular-nums'>
              {formatCurrency(data.grandTotal, locale)}
            </p>
          </div>
          {data.estimatedFloorArea > 0 ? (
            <p className='text-muted-foreground text-sm'>
              {t('floorArea', { value: formatNumber(data.estimatedFloorArea, locale) })}
            </p>
          ) : null}
        </div>

        <Table>
          <TableBody>
            {ordered.map((section) => (
              <Fragment key={section.section}>
                <TableRow className='bg-muted/40'>
                  <TableCell className='py-3 pl-5 font-semibold'>{tEstimate(`sections.${section.section}`)}</TableCell>
                  <TableCell className='py-3 pr-5 text-right font-semibold tabular-nums'>
                    {formatCurrency(section.total, locale)}
                  </TableCell>
                </TableRow>
                {/* Hợp đồng AI chỉ có số tiền theo nhóm thì mỗi nhóm có một hạng mục trùng tên: không lặp lại dòng đó. */}
                {(section.items.length === 1 && section.items[0]?.amount === section.total ? [] : section.items).map(
                  (item) => (
                    <TableRow key={item.id}>
                      <TableCell className='text-muted-foreground py-2.5 pl-8'>{item.label}</TableCell>
                      <TableCell className='py-2.5 pr-5 text-right tabular-nums'>
                        {formatCurrency(item.amount, locale)}
                      </TableCell>
                    </TableRow>
                  )
                )}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </section>

      {share && data.files ? <SharedFiles shareId={share.shareId} token={share.token} files={data.files} /> : null}

      <p className='text-muted-foreground text-xs'>{tEstimate('xlsx.note')}</p>
    </div>
  )
}
