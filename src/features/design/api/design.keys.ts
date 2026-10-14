/**
 * Hierarchical query-key factory for the design flow.
 * Invalidate a whole branch by passing a shorter prefix.
 */
export const designKeys = {
  all: ['design'] as const,

  quota: () => [...designKeys.all, 'quota'] as const,

  projects: () => [...designKeys.all, 'projects'] as const,
  project: (projectId: string) => [...designKeys.projects(), projectId] as const,

  input: (projectId: string) => [...designKeys.project(projectId), 'input'] as const,
  /** Bản dự toán thật (`GET /estimates/{id}`) và danh mục ghim của nó — Bước 1 nối API. */
  estimateDetail: (projectId: string) => [...designKeys.project(projectId), 'estimate-detail'] as const,
  estimateCatalog: (projectId: string) => [...designKeys.project(projectId), 'estimate-catalog'] as const,
  locations: () => [...designKeys.all, 'locations'] as const,
  estimate: (projectId: string) => [...designKeys.project(projectId), 'estimate'] as const,
  dossier: (projectId: string) => [...designKeys.project(projectId), 'dossier'] as const,
  /** Luồng bốn chặng: trạng thái chặng, kết quả soi ảnh lô hiện tại, kết quả từng chặng. */
  stages: (projectId: string) => [...designKeys.project(projectId), 'stages'] as const,
  lotVerification: (projectId: string) => [...designKeys.project(projectId), 'lot-verification'] as const,
  stageResult: (projectId: string, stage: string) => [...designKeys.project(projectId), 'stage-result', stage] as const
} as const
