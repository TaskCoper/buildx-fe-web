'use client'

import { useSearchParams } from 'next/navigation'

import { InviteSent } from '@/features/contractors'

export function InviteSentView({ projectId }: { projectId: string }) {
  const requestId = useSearchParams().get('request') ?? ''

  return <InviteSent projectId={projectId} requestId={requestId} />
}
