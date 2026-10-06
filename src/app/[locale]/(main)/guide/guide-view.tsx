'use client'

import { useDesignStore } from '@/features/design'
import { GuideBrowser } from '@/features/guide'

export function GuideView() {
  const openCreateDialog = useDesignStore((state) => state.openCreateDialog)

  return <GuideBrowser onCreateProject={openCreateDialog} />
}
