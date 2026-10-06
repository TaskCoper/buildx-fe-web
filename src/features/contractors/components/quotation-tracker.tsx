'use client'

import { QuotationInvitationTracker } from './quotation-invitation-tracker'
import { QuotationReceipt } from './quotation-receipt'

export function QuotationTracker({ projectId, requestId }: { projectId: string; requestId?: string }) {
  return requestId ? (
    <QuotationReceipt projectId={projectId} requestId={requestId} />
  ) : (
    <QuotationInvitationTracker projectId={projectId} />
  )
}
