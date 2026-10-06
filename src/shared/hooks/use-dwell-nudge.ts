'use client'

import { useEffect, useRef, useState } from 'react'

interface UseDwellNudgeOptions {
  /** Các section theo dõi — dừng lại đủ lâu ở BẤT KỲ section nào thì nhắc. */
  sectionIds: readonly string[]
  /** Đứng yên bao lâu (ms) trong section thì tính là "dừng lại". */
  dwellMs?: number
  /** Trần số lần nhắc — đếm chung cho MỌI section, không phải mỗi section riêng. */
  maxPerSession?: number
  /** Khoá đếm trong `sessionStorage`, đặt riêng cho từng nơi gọi hook. */
  sessionKey: string
}

/**
 * Id của section khách vừa dừng lại đủ lâu — trợ lý AI nổi dùng để nhắc nhẹ
 * (mục II.3, vùng 15: "dừng lâu ở vùng 04 hoặc 06"), tối đa `maxPerSession`
 * lần mỗi phiên bất kể dừng ở bao nhiêu section khác nhau.
 */
export function useDwellNudge({ sectionIds, dwellMs = 4500, maxPerSession = 2, sessionKey }: UseDwellNudgeOptions) {
  const [nudgeSectionId, setNudgeSectionId] = useState<string | null>(null)
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  useEffect(() => {
    const countKey = `${sessionKey}.count`
    const getCount = () => Number(window.sessionStorage.getItem(countKey) ?? '0')
    const bumpCount = () => window.sessionStorage.setItem(countKey, String(getCount() + 1))

    const elements = sectionIds.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => Boolean(el))
    if (elements.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.id
          const existing = timers.current.get(id)

          if (entry.isIntersecting) {
            if (existing) continue
            timers.current.set(
              id,
              setTimeout(() => {
                if (getCount() < maxPerSession) {
                  bumpCount()
                  setNudgeSectionId(id)
                }
              }, dwellMs)
            )
          } else if (existing) {
            clearTimeout(existing)
            timers.current.delete(id)
          }
        }
      },
      { threshold: 0.5 }
    )

    elements.forEach((el) => observer.observe(el))
    const activeTimers = timers.current
    return () => {
      observer.disconnect()
      activeTimers.forEach(clearTimeout)
      activeTimers.clear()
    }
  }, [sectionIds, dwellMs, maxPerSession, sessionKey])

  return { nudgeSectionId, dismiss: () => setNudgeSectionId(null) }
}
