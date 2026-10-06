'use client'

import { useAdvisory } from '../hooks/use-advisory'
import type { DesignInput, EstimateResult } from '../types/design.types'
import { useEffect, useRef, useState, type CSSProperties } from 'react'

interface AdvisoryNoteProps {
  result: EstimateResult
  /** Xưng hô theo tên khách hàng (mục III.3b, khối 3). */
  customerName: string
  /** Dữ liệu Bước 1 — nguồn của các biến loại công trình / gói / phong cách. */
  input?: DesignInput
  onVisible?: () => void
  enabled?: boolean
}

/**
 * Đoạn văn tư vấn cá nhân hóa — văn mẫu soạn sẵn điền biến theo dự án
 * (mục III.3b, khối 3). Câu cuối là ghi chú bắt buộc nên in nhỏ và mờ hơn.
 */
export function AdvisoryNote({ result, customerName, input, onVisible, enabled = true }: AdvisoryNoteProps) {
  const paragraphs = useAdvisory(result, customerName, input)
  const rootRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!enabled) return
    const node = rootRef.current
    if (!node) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true)
          onVisible?.()
          observer.disconnect()
        }
      },
      { threshold: 0.3 }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [enabled, onVisible])

  return (
    <div ref={rootRef} data-advisory-visible={visible} className='space-y-3 text-sm leading-relaxed'>
      {paragraphs.map((paragraph, index) => (
        <p
          key={index}
          data-advisory-paragraph
          style={{ '--paragraph-delay': `${320 + index * 210}ms` } as CSSProperties}
          className={index === paragraphs.length - 1 ? 'text-muted-foreground text-xs' : undefined}
        >
          {paragraph}
        </p>
      ))}
    </div>
  )
}
