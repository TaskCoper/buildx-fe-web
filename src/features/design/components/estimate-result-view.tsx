'use client'

import { PackageCheck, Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useCallback, useState } from 'react'

import { Button } from '@/shared/components/ui/button'
import type { DesignInput, EstimateResult } from '../types/design.types'
import { AdvisoryNote } from './advisory-note'
import { ArchitectAvatar } from './architect-avatar'
import { CostDonut } from './cost-donut'
import { EstimateTable } from './estimate-table'

interface EstimateResultViewProps {
  result: EstimateResult
  /** Tên khách hàng — đoạn văn tư vấn xưng hô theo tên (mục IV.5). */
  customerName: string
  /** Tên dự án — in lên đầu file Excel dự toán. */
  projectName: string
  /** Dữ liệu Bước 1: địa chỉ cho file Excel và các biến của đoạn văn tư vấn. */
  input?: DesignInput
  onContinue: () => void
}

/**
 * Màn hình kết quả dự toán (mục IV.5, Hình 08), từ trên xuống:
 * (1) khối "Dự toán" → (2) hàng hai thẻ "Tỷ trọng chi phí" và "Tư vấn từ
 * SAVICO" đứng cạnh nhau → (3) nút "Nhận hồ sơ thi công".
 */
export function EstimateResultView({ result, customerName, projectName, input, onContinue }: EstimateResultViewProps) {
  const t = useTranslations('design.estimate')
  const [summaryReady, setSummaryReady] = useState(false)
  const [advisoryVisible, setAdvisoryVisible] = useState(false)
  const revealDetails = useCallback(() => setSummaryReady(true), [])
  const revealAdvisory = useCallback(() => setAdvisoryVisible(true), [])

  return (
    <div className='space-y-5'>
      {result.isSample ? (
        <p role='note' className='border-warning/40 bg-warning/10 rounded-xl border px-4 py-3 text-sm text-pretty'>
          {result.notice || t('sampleNotice')}
        </p>
      ) : null}

      <EstimateTable
        result={result}
        context={{ projectName, address: input?.address ?? '' }}
        onTotalSettled={revealDetails}
      />

      <div data-estimate-details className='grid gap-5 lg:grid-cols-2'>
        {/* Hai thẻ cao bằng nhau (grid stretch); biểu đồ căn giữa phần còn lại
            để thẻ trái không bị dồn hết lên đầu khi đoạn tư vấn dài. */}
        <section
          data-estimate-chart-stage
          style={{ visibility: summaryReady ? 'visible' : 'hidden' }}
          className='bg-card flex flex-col rounded-2xl border p-5'
        >
          <h2 className='mb-4 font-semibold tracking-tight'>{t('breakdownTitle')}</h2>
          <div className='flex flex-1 items-center'>
            <CostDonut sections={result.sections} enabled={summaryReady} />
          </div>
        </section>

        {/* Đoạn tư vấn cá nhân hóa, xưng tên khách (Phụ lục 02, mục II.3). */}
        <section
          data-advisory-card
          data-advisory-visible={advisoryVisible}
          style={{ visibility: summaryReady ? 'visible' : 'hidden' }}
          className='bg-accent/60 border-primary/20 rounded-2xl border p-5'
        >
          <h2 className='text-primary-strong mb-4 font-semibold tracking-tight'>{t('advisoryTitle')}</h2>
          <div className='flex gap-4'>
            {/* Hai biểu tượng được stage trước nội dung tư vấn; badge Sparkles
                nằm gọn trong footprint cũ nên không làm thay đổi layout. */}
            <div className='relative hidden w-16 shrink-0 self-start sm:block'>
              <ArchitectAvatar data-advisory-icon='architect' className='w-16' />
              <span
                data-advisory-icon='sparkle'
                className='bg-background text-primary-strong border-primary/20 absolute -right-1 -bottom-1 flex size-7 items-center justify-center rounded-full border shadow-sm'
              >
                <Sparkles className='size-3.5' />
              </span>
            </div>
            <div className='min-w-0 flex-1'>
              <AdvisoryNote
                result={result}
                customerName={customerName}
                input={input}
                onVisible={revealAdvisory}
                enabled={summaryReady}
              />
            </div>
          </div>
        </section>
      </div>

      {summaryReady ? (
        <Button data-entrance-step='2' size='lg' className='h-12 w-full text-base' onClick={onContinue}>
          <PackageCheck className='size-5' />
          {t('continue')}
        </Button>
      ) : null}
    </div>
  )
}
