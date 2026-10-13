'use client'

import { useStages } from './use-stages'
import { pipelineStepStates, type PipelineStep } from '../services/pipeline.logic'

/** Trạng thái năm nấc của thanh tiến trình luồng bốn chặng cho màn đang mở (`current`). */
export function usePipelineSteps(projectId: string, current: PipelineStep) {
  const stages = useStages(projectId)
  return { current, states: pipelineStepStates(stages.data, current), stages }
}
