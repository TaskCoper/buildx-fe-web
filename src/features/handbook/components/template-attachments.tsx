'use client'

import { useState } from 'react'
import { Download, FileText, LoaderCircle } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { downloadLibraryAsset } from '../api/handbook.library'
import { formatFileSize, type HandbookAttachment } from '../api/handbook.library.logic'
import { templateSections } from '../services/handbook.service'
import type { HandbookTemplate } from '../types/handbook.types'

/**
 * Tệp đính kèm của mẫu (PDF / DWG / DXF), gom theo SECTION đúng như quản trị viên sắp xếp.
 *
 * Mỗi tệp tải qua route nội dung của BMT (cần cookie phiên, backend stream bytes — khách không
 * bao giờ nhận URL kho gốc). Tải không tính thêm lượt: lượt đã trừ lúc mở chi tiết mẫu.
 * Không có tệp đính kèm nào (mẫu mock, hoặc mẫu chỉ có ảnh) thì không hiện gì.
 */
export function TemplateAttachments({ template }: { template: HandbookTemplate }) {
  const t = useTranslations('handbook.detail')
  const locale = useLocale()
  const [busyId, setBusyId] = useState<string | null>(null)

  const groups = templateSections(template).filter((group) => group.attachments.length > 0)
  if (!groups.length) return null

  const download = async (attachment: HandbookAttachment) => {
    if (busyId) return
    setBusyId(attachment.assetId)
    try {
      await downloadLibraryAsset(attachment.contentUrl, attachment.name)
    } catch {
      toast.error(t('attachmentDownloadFailed'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section data-template-attachments className='space-y-3'>
      <h3 className='text-base font-semibold'>{t('attachmentsTitle')}</h3>

      {groups.map((group) => (
        <div key={group.sectionId} className='space-y-2'>
          {/* Một nhóm không tên (BE cũ / nhóm chưa đặt tên) thì không cần tiêu đề nhóm. */}
          {group.name ? <p className='text-muted-foreground text-xs font-medium'>{group.name}</p> : null}

          <ul className='space-y-2'>
            {group.attachments.map((attachment) => {
              const busy = busyId === attachment.assetId
              const meta = [attachment.extension, formatFileSize(attachment.sizeBytes, locale)]
                .filter(Boolean)
                .join(' · ')

              return (
                <li key={attachment.assetId} className='flex items-center gap-3 rounded-lg border px-3 py-2.5'>
                  <span className='bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-md'>
                    <FileText className='size-4' aria-hidden />
                  </span>
                  <span className='min-w-0 flex-1'>
                    <span className='block truncate text-sm font-medium'>
                      {attachment.name || t('attachmentUnnamed')}
                    </span>
                    {meta ? <span className='text-muted-foreground block text-xs'>{meta}</span> : null}
                  </span>
                  <button
                    type='button'
                    onClick={() => void download(attachment)}
                    disabled={busyId !== null}
                    aria-label={`${t('attachmentDownload')}: ${attachment.name}`}
                    className='text-primary hover:bg-primary/10 inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50'
                  >
                    {busy ? (
                      <LoaderCircle className='size-4 animate-spin' aria-hidden />
                    ) : (
                      <Download className='size-4' aria-hidden />
                    )}
                    {busy ? t('attachmentDownloading') : t('attachmentDownload')}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </section>
  )
}
