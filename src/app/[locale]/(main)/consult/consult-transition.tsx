'use client'

import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { usePathname } from 'next/navigation'

import { revealEase } from '@/shared/components/common'
import { ConsultTransitionStateProvider } from '@/features/consultation'

/** `/vi/consult/ktsvc-01` có đoạn sau `/consult/` → đang ở hồ sơ (M3); `/vi/consult` thì đang ở danh sách (M1). */
function isProfilePath(pathname: string): boolean {
  return /\/consult\/[^/]+\/?$/.test(pathname)
}

/**
 * CC-01 / CC-02 (mục VIII): chuyển cảnh giữa danh sách (M1) và hồ sơ kiến trúc
 * sư (M3) — bản đơn giản nêu trong tài liệu, vì đây là hai ROUTE khác nhau
 * (không thể "bay" đúng từng phần tử qua một lần điều hướng trang của Next.js
 * mà không nháy trắng): danh sách luôn neo bên TRÁI, hồ sơ luôn neo bên PHẢI —
 * trang nào đang hiện thì trượt vào từ đúng phía nhà của nó, rời đi thì trượt
 * ngược về đúng phía đó. M1 → M3 mờ + trượt trái ra, M3 trượt vào từ phải
 * (CC-01); quay lại thì chạy ngược, NHANH HƠN (CC-02) vì thời lượng của M1
 * ngắn hơn M3 và `AnimatePresence mode='wait'` luôn kết bằng nhịp "vào" của
 * trang sắp hiện. Key chỉ đổi giữa danh sách và hồ sơ; đổi qua lại giữa các KTS
 * vẫn giữ nguyên shell hồ sơ, tránh animate hoặc remount cả trang.
 */
export function ConsultTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const detail = isProfilePath(pathname)
  const offset = detail ? 48 : -48
  const view = detail ? 'profile' : 'directory'

  return (
    <ConsultTransitionStateProvider>
      <div className='bg-background min-h-[60vh] overflow-x-clip'>
        <AnimatePresence mode='wait' initial={false}>
          <motion.div
            key={view}
            initial={{ opacity: 0, x: offset }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: offset }}
            transition={{ duration: detail ? 0.32 : 0.22, ease: revealEase }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </ConsultTransitionStateProvider>
  )
}
