'use client'

import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useLayoutEffect, useRef, useState } from 'react'

import { usePathname, useRouter } from '@/i18n/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { usePageEntrance } from '@/shared/hooks'
import { cn } from '@/shared/lib/utils'
import type { HandbookPageTab } from '../types/handbook.types'
import { ArticleList } from './article-list'
import { FoundationBlock } from './foundation-block'
import { NewsletterBlock } from './newsletter-block'
import { TemplateLibrary } from './template-library'

const TAB_TRANSITION_DURATION = 380
const TAB_TRANSITION_OFFSET = 52
const TAB_ORDER: Record<HandbookPageTab, number> = { news: 0, library: 1 }

/**
 * Trang Cẩm nang — hai tab lớn (Hình 5 và Hình 9).
 *
 * "Tin tức" gom cẩm nang nền tảng (kiến thức có cấu trúc cố định) và dòng bài
 * cập nhật theo thời điểm; "Thư viện mẫu" gom mẫu bản vẽ 2D và mẫu nội thất 3D.
 * Cả hai mở cho mọi người xem, không cần tạo dự án.
 *
 * Thứ tự tab và tab mặc định theo Hình 9. Hình 5/6/11 vẽ ngược lại — bộ ảnh tự
 * mâu thuẫn, chọn theo Hình 9 vì đó là hình mô tả chính trang Cẩm nang.
 *
 * Tab đang mở nằm ở `?tab=` chứ không phải state cục bộ: người dùng gửi link
 * cho nhau phải mở đúng tab, và nút Back của trình duyệt phải quay lại được.
 */
export function HandbookBrowser() {
  const t = useTranslations('handbook.page')
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { rootRef, entranceState, entranceStyle } = usePageEntrance('handbook.home')

  const urlTab: HandbookPageTab = searchParams.get('tab') === 'library' ? 'library' : 'news'
  const [outgoingTab, setOutgoingTab] = useState<HandbookPageTab | null>(null)
  const [transitionDirection, setTransitionDirection] = useState<1 | -1>(1)
  const [requestedTab, setRequestedTab] = useState<HandbookPageTab>(urlTab)
  // During a click transition, render the requested tab immediately instead
  // of waiting for router.replace/searchParams to settle. This makes the
  // old-out/new-in motion begin on the user's click while the URL catches up
  // in parallel. Outside a handoff, the URL remains the source of truth so
  // browser Back/Forward still restores the correct tab.
  const visualTab = outgoingTab ? requestedTab : urlTab

  const tabListRef = useRef<HTMLDivElement>(null)
  const tabIndicatorRef = useRef<HTMLSpanElement>(null)
  const indicatorReadyRef = useRef(false)
  const tabTriggerRefs = useRef<Record<HandbookPageTab, HTMLButtonElement | null>>({ news: null, library: null })
  const contentFrameRef = useRef<HTMLDivElement>(null)
  const contentRefs = useRef<Record<HandbookPageTab, HTMLDivElement | null>>({ news: null, library: null })
  const transitionFinishedRef = useRef(false)

  // URL remains the source of truth. `requestedTab` matters only while a
  // handoff is pending, allowing a rapid reverse click before router.replace
  // has finished updating the search params.

  // One physical underline travels between triggers and resizes to the new
  // label instead of toggling two independent borders on/off.
  useLayoutEffect(() => {
    const list = tabListRef.current
    const indicator = tabIndicatorRef.current
    if (!list || !indicator) return

    let releaseTransitionFrame = 0
    const positionIndicator = () => {
      const trigger = tabTriggerRefs.current[visualTab]
      if (!trigger) return

      const listRect = list.getBoundingClientRect()
      const triggerRect = trigger.getBoundingClientRect()
      const firstMeasurement = !indicatorReadyRef.current

      if (firstMeasurement) indicator.style.transition = 'none'
      indicator.style.left = `${triggerRect.left - listRect.left}px`
      indicator.style.width = `${triggerRect.width}px`

      if (firstMeasurement) {
        releaseTransitionFrame = window.requestAnimationFrame(() => {
          indicator.style.removeProperty('transition')
          indicatorReadyRef.current = true
        })
      }
    }

    positionIndicator()
    const observer = new ResizeObserver(positionIndicator)
    observer.observe(list)
    Object.values(tabTriggerRefs.current).forEach((trigger) => {
      if (trigger) observer.observe(trigger)
    })

    return () => {
      observer.disconnect()
      window.cancelAnimationFrame(releaseTransitionFrame)
    }
  }, [visualTab])

  // Both panels exist only for the duration of a tab handoff. WAAPI starts
  // from the current computed frame when interrupted, so rapid A -> B -> A
  // reverses in place instead of queuing stale transitions.
  useLayoutEffect(() => {
    if (!outgoingTab || outgoingTab === visualTab) return

    const frame = contentFrameRef.current
    const incoming = contentRefs.current[visualTab]
    const outgoing = contentRefs.current[outgoingTab]
    if (!frame || !incoming || !outgoing) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let cancelled = false
    let clearFrame = 0

    transitionFinishedRef.current = false

    const settleWhenUrlIsReady = () => {
      transitionFinishedRef.current = true
      const currentUrlTab: HandbookPageTab =
        new URLSearchParams(window.location.search).get('tab') === 'library' ? 'library' : 'news'
      if (currentUrlTab === requestedTab) setOutgoingTab(null)
    }

    if (reduced) {
      frame.style.removeProperty('height')
      frame.style.removeProperty('overflow')
      clearFrame = window.requestAnimationFrame(() => {
        if (!cancelled) settleWhenUrlIsReady()
      })
      return () => {
        cancelled = true
        window.cancelAnimationFrame(clearFrame)
      }
    }

    const existingIncomingAnimations = incoming.getAnimations()
    const existingOutgoingAnimations = outgoing.getAnimations()
    const existingFrameAnimations = frame.getAnimations()
    const incomingStyle = getComputedStyle(incoming)
    const outgoingStyle = getComputedStyle(outgoing)

    const incomingStart = existingIncomingAnimations.length
      ? { opacity: incomingStyle.opacity, transform: incomingStyle.transform }
      : { opacity: '0', transform: `translateX(${transitionDirection * TAB_TRANSITION_OFFSET}px)` }
    const outgoingStart = existingOutgoingAnimations.length
      ? { opacity: outgoingStyle.opacity, transform: outgoingStyle.transform }
      : { opacity: '1', transform: 'translateX(0px)' }

    const startHeight = existingFrameAnimations.length
      ? frame.getBoundingClientRect().height
      : outgoing.getBoundingClientRect().height
    const targetHeight = incoming.getBoundingClientRect().height

    ;[...existingIncomingAnimations, ...existingOutgoingAnimations, ...existingFrameAnimations].forEach((animation) =>
      animation.cancel()
    )

    frame.style.height = `${startHeight}px`
    frame.style.overflow = 'hidden'

    const timing: KeyframeAnimationOptions = {
      duration: TAB_TRANSITION_DURATION,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      fill: 'both'
    }
    const incomingAnimation = incoming.animate([incomingStart, { opacity: '1', transform: 'translateX(0px)' }], timing)
    const outgoingAnimation = outgoing.animate(
      [outgoingStart, { opacity: '0', transform: `translateX(${-transitionDirection * TAB_TRANSITION_OFFSET}px)` }],
      timing
    )
    const heightAnimation =
      Math.abs(targetHeight - startHeight) > 1
        ? frame.animate([{ height: `${startHeight}px` }, { height: `${targetHeight}px` }], timing)
        : null

    void Promise.allSettled([
      incomingAnimation.finished,
      outgoingAnimation.finished,
      heightAnimation?.finished ?? Promise.resolve()
    ]).then(() => {
      if (cancelled) return
      frame.style.removeProperty('height')
      frame.style.removeProperty('overflow')
      settleWhenUrlIsReady()
    })

    return () => {
      cancelled = true
      incomingAnimation.cancel()
      outgoingAnimation.cancel()
      heightAnimation?.cancel()
    }
  }, [outgoingTab, requestedTab, transitionDirection, visualTab])

  // Router navigation can settle a little after the visual handoff. If the
  // motion already finished, keep the requested panel visible until the URL
  // catches up, then remove the invisible outgoing panel on the next frame.
  // This prevents a brief snap back to the previous tab on slower navigations.
  useLayoutEffect(() => {
    if (!outgoingTab || urlTab !== requestedTab || !transitionFinishedRef.current) return

    const frame = window.requestAnimationFrame(() => setOutgoingTab(null))
    return () => window.cancelAnimationFrame(frame)
  }, [outgoingTab, requestedTab, urlTab])

  function selectTab(value: string) {
    if (value !== 'news' && value !== 'library') return
    const currentTab = outgoingTab ? requestedTab : urlTab
    if (value === currentTab) return

    setTransitionDirection(TAB_ORDER[value] > TAB_ORDER[currentTab] ? 1 : -1)
    setOutgoingTab(currentTab)
    setRequestedTab(value)

    // `news` là tab mặc định (Hình 9) nên không cần nằm trong URL.
    const query = value === 'library' ? '?tab=library' : ''
    router.replace(`${pathname}${query}`, { scroll: false })
  }

  function renderTabContent(value: HandbookPageTab) {
    const mounted = visualTab === value || outgoingTab === value
    if (!mounted) return null

    const active = visualTab === value
    return (
      <TabsContent
        key={value}
        forceMount
        ref={(node) => {
          contentRefs.current[value] = node
        }}
        value={value}
        data-handbook-tab-content={value}
        aria-hidden={!active}
        inert={!active}
        tabIndex={active ? 0 : -1}
        className={cn(
          'w-full min-w-0 outline-none',
          active ? 'relative' : 'pointer-events-none absolute inset-x-0 top-0',
          value === 'news' && 'space-y-5 sm:space-y-6'
        )}
      >
        {value === 'library' ? (
          <TemplateLibrary />
        ) : (
          <>
            <FoundationBlock />
            <NewsletterBlock />
            <ArticleList />
          </>
        )}
      </TabsContent>
    )
  }

  return (
    <div
      ref={rootRef}
      data-page-entrance={entranceState}
      style={entranceStyle}
      className='mx-auto w-full max-w-[90rem] space-y-5 lg:space-y-4 px-4 py-5 lg:px-8'
    >
      <h1 data-entrance-step='0' className='text-3xl font-semibold tracking-tight'>
        {t('title')}
      </h1>

      <Tabs value={visualTab} onValueChange={selectTab}>
        {/* Góp ý BuildX: tab kiểu viên thuốc xanh gradient (cùng nút chọn 2D/3D ở trang chủ); viên xanh là một khối trượt giữa hai tab. */}
        <TabsList
          ref={tabListRef}
          data-entrance-step='1'
          className='bg-muted relative h-auto w-fit justify-start gap-1 rounded-full p-1.5'
        >
          {(['news', 'library'] as const).map((value) => (
            <TabsTrigger
              key={value}
              ref={(node) => {
                tabTriggerRefs.current[value] = node
              }}
              value={value}
              data-handbook-tab={value}
              // `flex-none`: TabsTrigger mặc định `flex-1` nên hai tab sẽ chia
              // đôi bề ngang; ở đây chúng phải bám sát mép trái như Hình 5.
              // Underline là indicator dùng chung bên dưới để nó có thể travel.
              className='text-muted-foreground hover:text-foreground data-[state=active]:text-primary-foreground dark:data-[state=active]:text-primary-foreground relative z-10 h-auto flex-none rounded-full border-0 bg-transparent px-7 py-2.5 text-base font-semibold transition-colors data-[state=active]:bg-transparent data-[state=active]:shadow-none dark:data-[state=active]:border-transparent dark:data-[state=active]:bg-transparent'
            >
              {t(`tabs.${value}`)}
            </TabsTrigger>
          ))}
          <span
            ref={tabIndicatorRef}
            data-handbook-tab-indicator
            data-opening={entranceState === 'play'}
            aria-hidden='true'
            className='brand-green-button pointer-events-none absolute top-1.5 bottom-1.5 left-0 w-0 origin-left rounded-full transition-[left,width] duration-[320ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none'
          />
        </TabsList>

        <div ref={contentFrameRef} data-handbook-content-frame className='relative mt-5 sm:mt-6'>
          {renderTabContent('library')}
          {renderTabContent('news')}
        </div>
      </Tabs>
    </div>
  )
}
