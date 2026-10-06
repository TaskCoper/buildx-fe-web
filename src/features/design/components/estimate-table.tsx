'use client'

import { Check, FileSpreadsheet } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { useLocale, useTranslations } from 'next-intl'

import type { Locale } from '@/i18n/routing'
import { Button } from '@/shared/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'
import { cn } from '@/shared/lib/utils'
import { formatCurrency } from '@/shared/utils'
import { COST_SECTIONS } from '../constants/design.constants'
import { useDownloadEstimate } from '../hooks/use-download-estimate'
import type { EstimateXlsxContext } from '../services/estimate-xlsx.service'
import type { CostSection, EstimateResult } from '../types/design.types'
import { AnimatedNumber } from './animated-number'

interface EstimateTableProps {
  result: EstimateResult
  /** Tên dự án + địa chỉ in lên đầu file Excel. */
  context: EstimateXlsxContext
  onTotalSettled?: () => void
}

/**
 * Khối bảng dự toán (mục IV.5, Hình 08).
 *
 * Hàng trên: tiêu đề "Dự toán" bên trái, ô "Tổng dự toán" nền xanh nhạt bên phải.
 * Rồi 3 tab Phần thô / Phần hoàn thiện / Phần nội thất, bảng 2 cột
 * Hạng mục — Thành tiền, dòng tổng của tab, và hai lối tải Excel.
 * Thân bảng chỉ liệt kê hạng mục LỚN; hạng mục con nằm trong file Excel.
 */
export function EstimateTable({ result, context, onTotalSettled }: EstimateTableProps) {
  const t = useTranslations('design.estimate')
  const locale = useLocale() as Locale
  const [tab, setTab] = useState<CostSection>('structure')
  const [downloaded, setDownloaded] = useState(false)
  const [totalSettled, setTotalSettled] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const tableViewportRef = useRef<HTMLDivElement>(null)
  const { download, isPending } = useDownloadEstimate(result, context)

  async function runDownload() {
    try {
      await download()
      setDownloaded(true)
      window.setTimeout(() => setDownloaded(false), 900)
    } catch {
      setDownloaded(false)
    }
  }

  const settleGrandTotal = useCallback(() => {
    setTotalSettled(true)
    onTotalSettled?.()
  }, [onTotalSettled])

  function selectTab(section: CostSection) {
    if (section === tab) return
    setDetailOpen(false)
    setTab(section)
  }

  function toggleDetail() {
    setDetailOpen((open) => {
      if (!open) {
        window.setTimeout(() => tableViewportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 180)
      }
      return !open
    })
  }

  const active = result.sections.find((section) => section.section === tab)
  const items = active?.items ?? []
  const totalDelay = items.length * 55 + 360

  return (
    <section data-entrance-step='0' data-entrance-from='soft-scale' className='bg-card rounded-2xl border p-5 sm:p-6'>
      <header className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
        <h2 className='text-xl font-semibold tracking-tight'>{t('title')}</h2>

        {/* Ô tổng luôn hiển thị, nhãn trên số dưới như Hình 08. */}
        <div
          data-estimate-grand-total
          data-total-settled={totalSettled}
          className='bg-accent border-primary/30 rounded-xl border px-5 py-2.5 sm:text-right'
        >
          <p className='text-muted-foreground text-xs font-medium'>{t('grandTotal')}</p>
          <AnimatedNumber
            value={result.grandTotal}
            format={(value) => formatCurrency(value, locale)}
            duration={1_800}
            delay={180}
            onSettled={settleGrandTotal}
            startImmediately
            className='text-primary-strong text-2xl font-bold'
          />
        </div>
      </header>

      <div
        data-estimate-table-reveal={totalSettled}
        style={{ visibility: totalSettled ? 'visible' : 'hidden' }}
        inert={!totalSettled}
      >
        {/* Tab dạng nút chữ nhật kề nhau: tab đang chọn nền xanh đậm chữ trắng. */}
        <LayoutGroup id='estimate-tabs'>
          <div role='tablist' aria-label={t('title')} className='mt-5 flex flex-wrap gap-1.5'>
            {COST_SECTIONS.map((section) => {
              const selected = section === tab
              return (
                <button
                  key={section}
                  type='button'
                  role='tab'
                  aria-selected={selected}
                  onClick={() => selectTab(section)}
                  className={cn(
                    'relative overflow-hidden rounded-lg border px-5 py-2 text-sm font-medium transition-colors',
                    selected
                      ? 'border-primary-strong text-primary-foreground'
                      : 'bg-card text-muted-foreground hover:bg-accent/40 hover:text-foreground'
                  )}
                >
                  {selected ? (
                    <motion.span
                      layoutId='estimate-tab-bg'
                      className='bg-primary-strong absolute inset-0'
                      transition={{ type: 'spring', stiffness: 420, damping: 38 }}
                    />
                  ) : null}
                  <span className='relative z-10'>{t(`sections.${section}`)}</span>
                </button>
              )
            })}
          </div>
        </LayoutGroup>

        <motion.div
          ref={tableViewportRef}
          layout
          className='mt-4 overflow-hidden rounded-xl border'
          transition={{ layout: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } }}
        >
          <AnimatePresence mode='wait' initial={false}>
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 2 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -2 }}
              transition={{ duration: 0.16 }}
            >
              <Table>
                <TableHeader>
                  <TableRow className='bg-muted/50 hover:bg-muted/50'>
                    <TableHead className='py-2.5 pl-4 text-xs font-semibold'>{t('columns.item')}</TableHead>
                    <TableHead className='py-2.5 pr-4 text-right text-xs font-semibold'>
                      {t('columns.amount')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody data-estimate-table-body>
                  {items.map((item, index) => (
                    <TableRow
                      key={item.id}
                      data-estimate-row
                      style={{ '--row-delay': `${index * 55}ms` } as React.CSSProperties}
                    >
                      <TableCell className='py-3 pl-4'>{item.label}</TableCell>
                      <TableCell className='py-3 pr-4 text-right tabular-nums'>
                        <AnimatedNumber
                          value={item.amount}
                          format={(value) => formatCurrency(value, locale)}
                          duration={360}
                          delay={index * 45}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {detailOpen
                    ? items.flatMap((item, itemIndex) =>
                        item.children.map((child, childIndex) => (
                          <TableRow
                            key={`${item.id}-${child.id}`}
                            data-estimate-detail-row
                            style={
                              {
                                '--detail-row-delay': `${itemIndex * 90 + childIndex * 45}ms`
                              } as React.CSSProperties
                            }
                            className='bg-muted/20'
                          >
                            <TableCell className='text-muted-foreground py-2.5 pl-8 text-sm'>{child.label}</TableCell>
                            <TableCell className='text-muted-foreground py-2.5 pr-4 text-right text-sm tabular-nums'>
                              {formatCurrency(child.amount, locale)}
                            </TableCell>
                          </TableRow>
                        ))
                      )
                    : null}
                  <TableRow
                    data-estimate-total-row
                    style={{ '--total-row-delay': `${totalDelay}ms` } as React.CSSProperties}
                  >
                    <TableCell colSpan={2} data-estimate-total-cell className='relative overflow-hidden py-3 pr-4 pl-4'>
                      <span className='relative z-10 flex items-center justify-end gap-5'>
                        <span className='font-semibold'>
                          {t('sectionTotal', { section: t(`sections.${tab}`).toLowerCase() })}
                        </span>
                        <span className='text-primary-strong font-bold tabular-nums'>
                          {formatCurrency(active?.total ?? 0, locale)}
                        </span>
                      </span>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        <div className='mt-4 flex flex-wrap items-center gap-x-5 gap-y-3'>
          <Button variant='outline' className='tracking-wide' onClick={toggleDetail} aria-expanded={detailOpen}>
            {t('viewDetail')}
          </Button>

          <button
            type='button'
            onClick={() => void runDownload()}
            disabled={isPending}
            className='text-primary hover:text-primary/80 flex items-center gap-2 text-sm underline-offset-4 transition-colors hover:underline disabled:opacity-60'
          >
            {downloaded ? <Check className='size-4' /> : <FileSpreadsheet className='size-4' />}
            {isPending ? (
              <span data-submit-dots className='flex items-center gap-1' aria-hidden>
                {[0, 1, 2].map((index) => (
                  <span
                    key={index}
                    className='bg-current size-1 rounded-full'
                    style={{ '--dot-delay': `${index * 120}ms` } as React.CSSProperties}
                  />
                ))}
              </span>
            ) : null}
            {t('downloadXlsx')}
          </button>
        </div>
      </div>
    </section>
  )
}
