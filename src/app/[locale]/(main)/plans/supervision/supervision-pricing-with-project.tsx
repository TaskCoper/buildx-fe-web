'use client'

import { useSearchParams } from 'next/navigation'

import { SupervisionPricing } from '@/features/supervision'

/** Bảng giá gói giám sát gắn với dự án `?project=` (R8); không có tham số thì như bản công khai. */
export function SupervisionPricingWithProject() {
  const project = useSearchParams().get('project') ?? undefined

  return <SupervisionPricing projectId={project} />
}
