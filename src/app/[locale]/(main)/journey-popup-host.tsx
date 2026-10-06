'use client'

import { useEffect, useRef, useState } from 'react'

import { useAccountPlan } from '@/features/account'
import { useCreateBrief } from '@/features/contractors'
import { useDesignStore } from '@/features/design'
import { PopupStepOne, usePopupStepOneTrigger, type JourneyBranch, type JourneyCustomerState } from '@/features/journey'
import { usePathname } from '@/i18n/navigation'
import { useAuth, useAuthDialogStore } from '@/shared/auth'
import { HOME_REMINDER_WAKE_EVENT } from '@/shared/constants'

/**
 * App-layer coordinator for the cross-feature customer journey.
 *
 * The popup UI/policy lives in `features/journey`, while this host owns the
 * actual destinations because a feature is not allowed to import another
 * feature. Customer state is snapshotted once after its source data is ready,
 * matching the journey rule that state does not change halfway through a page
 * visit.
 */
export function JourneyPopupHost() {
  const pathname = usePathname()
  const { user, isCustomer, isAuthenticated, isInitialized } = useAuth()
  const accountPlan = useAccountPlan(isCustomer)
  const [customerState, setCustomerState] = useState<JourneyCustomerState | null>(null)
  const snapshotIdentityRef = useRef<string | null>(null)

  const authDialogOpen = useAuthDialogStore((state) => state.isOpen)
  const openAuthDialog = useAuthDialogStore((state) => state.open)
  const createProjectOpen = useDesignStore((state) => state.isCreateDialogOpen)
  const openCreateProject = useDesignStore((state) => state.openCreateDialog)
  const createUploadBrief = useCreateBrief({ focus: 'documents' })

  useEffect(() => {
    if (!isInitialized) return

    const identity = isAuthenticated ? 'signed-in' : 'guest'
    if (isAuthenticated && !accountPlan.isFetched) return
    if (snapshotIdentityRef.current === identity && customerState !== null) return

    let nextState: JourneyCustomerState

    if (!isAuthenticated) {
      nextState = 'S0'
    } else {
      const expiresAt = accountPlan.data?.expiresAt ? Date.parse(accountPlan.data.expiresAt) : Number.NaN
      const hasActivePlan = Boolean(accountPlan.data) && (!Number.isFinite(expiresAt) || expiresAt >= Date.now())
      nextState = hasActivePlan ? 'OTHER' : 'S1'
    }

    snapshotIdentityRef.current = identity
    const snapshotTimer = window.setTimeout(() => setCustomerState(nextState), 0)
    return () => window.clearTimeout(snapshotTimer)
  }, [accountPlan.data, accountPlan.isFetched, customerState, isAuthenticated, isInitialized])

  const homeStepOneEnabled =
    user?.accountKind !== 'Staff' && pathname === '/' && (customerState === 'S0' || customerState === 'S1')
  const { open, handleOpenChange, complete } = usePopupStepOneTrigger({
    enabled: homeStepOneEnabled,
    blocked: authDialogOpen || createProjectOpen
  })

  const handleStepOneOpenChange = (nextOpen: boolean) => {
    const dismissed = open && !nextOpen
    handleOpenChange(nextOpen)
    if (dismissed) {
      window.setTimeout(() => window.dispatchEvent(new Event(HOME_REMINDER_WAKE_EVENT)), 120)
    }
  }

  const continueAfterAuth = (action: () => void) => {
    if (isAuthenticated) {
      action()
      return
    }
    openAuthDialog('login', action)
  }

  const chooseBranch = (branch: JourneyBranch) => {
    complete(branch)

    if (branch === 'design') {
      continueAfterAuth(openCreateProject)
      return
    }

    continueAfterAuth(() => createUploadBrief.mutate())
  }

  return (
    <PopupStepOne
      open={open}
      onOpenChange={handleStepOneOpenChange}
      onChoose={chooseBranch}
      uploadPending={createUploadBrief.isPending}
    />
  )
}
