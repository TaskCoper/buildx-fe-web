'use client'

import { useAccountPlan, usePurchaseHistory } from '@/features/account'
import { HomeServices } from '@/features/landing'
import { useAuth } from '@/shared/auth'

/** App-layer glue for the purchased design package shown on the public home page. */
export function HomeServicesSection() {
  const { isCustomer } = useAuth()
  const { data: accountPlan } = useAccountPlan(isCustomer)
  const { data: purchases } = usePurchaseHistory(isCustomer)

  return (
    <HomeServices
      ownedDesignRemaining={isCustomer ? accountPlan?.design.remaining : undefined}
      ownsSupervision={isCustomer && Boolean(purchases?.supervisionOrderId)}
    />
  )
}
