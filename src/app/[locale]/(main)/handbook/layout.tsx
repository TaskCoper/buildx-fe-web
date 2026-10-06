import type { ReactNode } from 'react'

import { HandbookMotionBoundary } from './handbook-motion-boundary'

export default function HandbookLayout({ children }: { children: ReactNode }) {
  return <HandbookMotionBoundary>{children}</HandbookMotionBoundary>
}
