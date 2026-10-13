'use client'

import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { designKeys } from '../api/design.keys'
import { estimatePipelineApi } from '../api/estimate-pipeline.api'
import { isStageActive, type StageView } from '../services/pipeline.logic'

export function useRender3dResult(projectId: string, stage: StageView | undefined) {
  const enabled = !!stage && stage.status !== 'Locked'
  const query = useQuery({
    queryKey: designKeys.stageResult(projectId, 'Render3d'),
    queryFn: ({ signal }) => estimatePipelineApi.getRender3dResult(projectId, signal),
    enabled,
    refetchInterval: isStageActive(stage?.status) ? 5000 : false,
    refetchIntervalInBackground: false
  })
  const { refetch } = query
  useEffect(() => {
    if (enabled) void refetch()
  }, [enabled, projectId, stage?.status, stage?.runId, refetch])
  return query
}
