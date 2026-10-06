'use client'

import { Building2 } from 'lucide-react'
import { useState } from 'react'

import { cn } from '@/shared/lib/utils'
import type { Contractor } from '../types/contractor.types'

interface ContractorLogoProps {
  contractor: Pick<Contractor, 'name' | 'logoUrl'>
  className?: string
}

/**
 * Ô logo nhà thầu.
 *
 * CHỖ CHỜ ASSET: chưa có logo thật thì để KHUNG NÉT ĐỨT kèm icon, giống mọi chỗ
 * chờ asset khác trong bản dựng. Bản trước dựng chữ viết tắt trên nền thương
 * hiệu ("AC"), trông như đã có logo nên không ai biết là còn thiếu — mà Hình
 * S09/S12 vẽ logo thật của nhà thầu trong ô này.
 */
export function ContractorLogo({ contractor, className }: ContractorLogoProps) {
  // Ảnh logo là URL ngoài (Google Drive có thể trả 429 khi bị hotlink nhiều) — tải lỗi thì rơi về khung chờ
  // thay vì để icon ảnh vỡ. Đổi URL thì thử lại.
  const [failedUrl, setFailedUrl] = useState<string | null>(null)

  if (!contractor.logoUrl || failedUrl === contractor.logoUrl) {
    return (
      <span
        aria-hidden
        className={cn(
          'bg-muted/30 text-muted-foreground/50 flex size-14 shrink-0 items-center justify-center rounded-xl border border-dashed',
          className
        )}
      >
        <Building2 className='size-[45%]' />
      </span>
    )
  }

  return (
    <span
      aria-hidden
      className={cn('flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border', className)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- logo đối tác là URL ngoài, không qua next/image loader */}
      <img
        src={contractor.logoUrl}
        alt=''
        className='size-full object-contain'
        onError={() => setFailedUrl(contractor.logoUrl ?? null)}
      />
    </span>
  )
}
