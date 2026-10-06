'use client'

/**
 * Ring classes toggled on the destination of a same-page "jump" (a stat, a
 * pain-point card…) so it visibly lights up for a beat instead of just
 * silently scrolling — plain Tailwind utilities, added/removed by class name
 * so nothing needs bespoke CSS.
 */
const FLASH_CLASSES = ['ring-2', 'ring-primary', 'ring-offset-2', 'ring-offset-background'] as const

const SCROLL_DURATION_MS = 950
let activeScrollFrame: number | null = null

function flash(el: HTMLElement) {
  el.classList.add(...FLASH_CLASSES, 'transition-shadow', 'duration-300')
  window.setTimeout(() => el.classList.remove(...FLASH_CLASSES), 1100)
}

/** Ease-in-out giữ đầu/cuối chậm, tránh cú dừng gấp của native smooth scroll. */
function easeInOutCubic(progress: number): number {
  return progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2
}

/**
 * Smooth-scrolls to the element with `id` and flashes a ring around it for
 * one beat — the "đích sáng viền" feedback used when a stat (vùng 03) or a
 * pain-point card (vùng 04) points at the section/step it refers to.
 */
export function scrollToAndFlash(id: string) {
  const el = document.getElementById(id)
  if (!el) return

  const destination = Math.min(
    window.scrollY + el.getBoundingClientRect().top - (window.innerHeight - el.offsetHeight) / 2,
    document.documentElement.scrollHeight - window.innerHeight
  )
  const targetY = Math.max(0, destination)

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.scrollTo({ top: targetY })
    flash(el)
    return
  }

  if (activeScrollFrame !== null) window.cancelAnimationFrame(activeScrollFrame)

  const startY = window.scrollY
  const distance = targetY - startY
  const startedAt = performance.now()

  const step = (now: number) => {
    const progress = Math.min(1, (now - startedAt) / SCROLL_DURATION_MS)
    window.scrollTo({ top: startY + distance * easeInOutCubic(progress) })

    if (progress < 1) {
      activeScrollFrame = window.requestAnimationFrame(step)
      return
    }

    activeScrollFrame = null
    flash(el)
  }

  activeScrollFrame = window.requestAnimationFrame(step)
}
