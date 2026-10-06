'use client'

import { useEffect, useRef, useState } from 'react'

import { JOURNEY_HOME_STATS_ID, JOURNEY_STEP_ONE_DELAY_MS } from '../constants/journey.constants'
import { canShowJourneyStepOne } from '../services/popup-policy.service'
import { useJourneyStore } from '../store/journey.store'
import type { JourneyBranch } from '../types/journey.types'

interface UsePopupStepOneTriggerOptions {
  enabled: boolean
  blocked?: boolean
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.matches('input, textarea, select, [contenteditable="true"]') ||
    Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))
  )
}

/**
 * Popup 1/3 trigger: first of (6 seconds on Home | fully scrolled past stats).
 * It never opens over another dialog or while focus is inside an editable field.
 */
export function usePopupStepOneTrigger({ enabled, blocked = false }: UsePopupStepOneTriggerOptions) {
  const [open, setOpen] = useState(false)
  const [delayReached, setDelayReached] = useState(false)
  const [statsPassed, setStatsPassed] = useState(false)
  const [domBusy, setDomBusy] = useState(false)
  const triggeredThisVisit = useRef(false)

  const stepOne = useJourneyStore((state) => state.stepOne)
  const lastDismissedAt = useJourneyStore((state) => state.lastDismissedAt)
  const markStepOneShown = useJourneyStore((state) => state.markStepOneShown)
  const dismissStepOne = useJourneyStore((state) => state.dismissStepOne)
  const completeStepOne = useJourneyStore((state) => state.completeStepOne)

  useEffect(() => {
    if (!enabled) {
      const resetTimer = window.setTimeout(() => {
        setDelayReached(false)
        setStatsPassed(false)
        triggeredThisVisit.current = false
      }, 0)
      return () => window.clearTimeout(resetTimer)
    }

    const timer = window.setTimeout(() => setDelayReached(true), JOURNEY_STEP_ONE_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [enabled])

  useEffect(() => {
    if (!enabled) return

    const checkStats = () => {
      const stats = document.getElementById(JOURNEY_HOME_STATS_ID)
      if (!stats) return
      if (stats.getBoundingClientRect().bottom <= 72) setStatsPassed(true)
    }

    checkStats()
    window.addEventListener('scroll', checkStats, { passive: true })
    window.addEventListener('resize', checkStats)
    return () => {
      window.removeEventListener('scroll', checkStats)
      window.removeEventListener('resize', checkStats)
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) return

    const updateBusy = () => {
      const anotherDialog = Boolean(document.querySelector('[role="dialog"][data-state="open"]'))
      const typing = isEditableTarget(document.activeElement)
      setDomBusy(anotherDialog || typing)
    }

    updateBusy()
    const observer = new MutationObserver(updateBusy)
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['data-state']
    })
    document.addEventListener('focusin', updateBusy)
    document.addEventListener('focusout', updateBusy)

    return () => {
      observer.disconnect()
      document.removeEventListener('focusin', updateBusy)
      document.removeEventListener('focusout', updateBusy)
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled || blocked || domBusy || open || triggeredThisVisit.current) return
    if (!delayReached && !statsPassed) return
    if (!canShowJourneyStepOne({ now: Date.now(), memory: stepOne, lastDismissedAt })) return

    const openTimer = window.setTimeout(() => {
      if (triggeredThisVisit.current) return
      triggeredThisVisit.current = true
      markStepOneShown()
      setOpen(true)
    }, 0)
    return () => window.clearTimeout(openTimer)
  }, [blocked, delayReached, domBusy, enabled, lastDismissedAt, markStepOneShown, open, statsPassed, stepOne])

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setOpen(true)
      return
    }
    if (open) dismissStepOne()
    setOpen(false)
  }

  const complete = (branch: JourneyBranch) => {
    completeStepOne(branch)
    setOpen(false)
  }

  return { open, handleOpenChange, complete }
}
