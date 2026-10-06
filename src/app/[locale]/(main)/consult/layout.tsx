import type { ReactNode } from 'react'

import { ConsultTransition } from './consult-transition'

/** Bọc danh sách (M1) và hồ sơ kiến trúc sư (M3) để chuyển cảnh giữa hai trang (CC-01, CC-02). */
export default function ConsultLayout({ children }: { children: ReactNode }) {
  return <ConsultTransition>{children}</ConsultTransition>
}
