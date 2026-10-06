'use client'

import type { ReactNode } from 'react'

import { usePageEntrance } from '@/shared/hooks'
import { cn } from '@/shared/lib/utils'

interface DesignStepLayoutProps {
  /** Nội dung chính: tiến độ AI khi đang chờ, kết quả khi đã sinh xong. */
  children: ReactNode
  /**
   * Bảng "Cẩm nang cá nhân hóa" ở cột phải. `features/design` không import
   * `features/handbook`, nên lớp app truyền vào.
   */
  sidePanel?: ReactNode
  /**
   * Panel đang thu nhỏ thành nút nổi — cột phải biến mất và nội dung chính co
   * lại về bề rộng dễ đọc thay vì kéo dài hết khung.
   */
  sidePanelCollapsed?: boolean
  /**
   * Màn hình chờ (mục IV.4 Hình 07, IV.7 Hình 10): panel cẩm nang chiếm cột
   * TRÁI rộng, cột tiến độ AI hẹp bên phải. Màn kết quả thì ngược lại — nội
   * dung chính rộng bên trái.
   */
  waiting?: boolean
  /** Page/state-specific key so waiting -> result can run its own local opening. */
  entranceKey?: string
}

/**
 * Bố cục chung của Bước 2 và Bước 3 (mục III.3a, III.4b).
 *
 * Panel cẩm nang là slot tùy chọn do lớp app quyết định theo từng trạng thái.
 * Các màn đang render có thể truyền panel vào; màn kết quả có thể bỏ panel để
 * nội dung chính tự trải hết bề rộng mà không cần thêm một layout riêng.
 */
export function DesignStepLayout({
  children,
  sidePanel,
  sidePanelCollapsed = false,
  waiting = false,
  entranceKey
}: DesignStepLayoutProps) {
  const twoColumn = Boolean(sidePanel) && !sidePanelCollapsed
  const { rootRef, entranceState, entranceStyle } = usePageEntrance(
    entranceKey ?? `design.step-layout.${waiting ? 'waiting' : 'content'}`,
    { offsetMs: 220 }
  )

  // Cột ngắn hơn là cột dính: màn chờ thì cột tiến độ dính để luôn thấy % khi
  // cuộn danh sách cẩm nang; màn kết quả thì ngược lại.
  const main = (
    <div
      data-entrance-step={waiting ? '1' : undefined}
      data-entrance-from={waiting ? 'right' : undefined}
      className={cn(
        'min-w-0',
        waiting && twoColumn && 'lg:sticky lg:top-40 lg:self-start',
        // Màn chờ: dưới `lg` TIẾN ĐỘ lên trước cẩm nang (DOM vẫn để cẩm nang trước cho bố cục desktop
        // "cẩm nang trái, tiến độ phải"). Nếu không, sau khi bấm gửi ở Bước 1 người dùng rơi vào
        // danh sách cẩm nang rất dài và phải cuộn xuống mới thấy tiến độ.
        waiting && twoColumn && 'max-lg:order-first',
        // Khi panel cẩm nang thu nhỏ, cột nội dung phải TRẢI HẾT khung chung.
        // Bó lại `max-w-4xl` rồi canh giữa làm mép thẻ nội dung thụt vào so với
        // thanh tiến trình ngay phía trên, nhìn như bị lệch.
        !twoColumn && 'w-full'
      )}
    >
      {children}
    </div>
  )
  // Khi thu nhỏ, panel tự render thành nút nổi nên vẫn phải được mount.
  const aside = twoColumn ? (
    <div
      data-entrance-step={waiting ? '0' : undefined}
      data-entrance-from={waiting ? 'left' : undefined}
      // `min-w-0`: ô lưới mặc định `min-width:auto` nên nội dung cẩm nang rộng hơn màn hình sẽ nới cả
      // cột ra ngoài mép màn hình — đó là lỗi "item cẩm nang tràn màn hình".
      className={cn('min-w-0', !waiting && 'lg:sticky lg:top-40 lg:self-start')}
    >
      {sidePanel}
    </div>
  ) : (
    sidePanel
  )

  return (
    <div
      ref={rootRef}
      data-page-entrance={entranceState}
      style={entranceStyle}
      className={cn(
        // `grid-cols-[minmax(0,1fr)]`: cột duy nhất trên mobile phải co được, không thì nó tự nới theo nội dung.
        'mx-auto grid w-full max-w-[90rem] grid-cols-[minmax(0,1fr)] gap-5 lg:gap-6 px-4 pt-5 pb-5 lg:px-8',
        twoColumn && (waiting ? 'lg:grid-cols-[minmax(0,1fr)_22rem]' : 'lg:grid-cols-[minmax(0,1fr)_360px]')
      )}
    >
      {/* Màn chờ: cẩm nang trước (cột trái rộng), tiến độ sau (cột phải hẹp). */}
      {waiting ? (
        <>
          {aside}
          {main}
        </>
      ) : (
        <>
          {main}
          {aside}
        </>
      )}
    </div>
  )
}
