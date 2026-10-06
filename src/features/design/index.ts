/**
 * Public API of the `design` feature — luồng Thiết kế & Dự toán 3 bước (mục III).
 * Other layers import ONLY from this barrel.
 */

// Components
export { CreateProjectDialog } from './components/create-project-dialog'
export { PhonePromptDialog } from './components/phone-prompt-dialog'
export { StepProgress } from './components/step-progress'
export { HelpLink } from './components/help-link'
export { StepInputForm } from './components/step-input-form'
export { StepInputApiForm } from './components/step-input-api-form'
export { EstimateFailed } from './components/estimate-failed'
export { EstimateFlowError } from './services/estimate-result.logic'
export { displayProjectId, isApiEstimateId, type MatchCriteria } from './services/estimate-input.logic'
export { useMatchCriteria } from './hooks/use-match-criteria'
export { GenerationWaiting } from './components/generation-waiting'
export { DossierRenderWaiting } from './components/dossier-render-waiting'
export { useDossierRenderFlow } from './hooks/use-dossier-render-flow'
export { BlueprintIllustration } from './components/blueprint-illustration'
export { ArchitectAvatar } from './components/architect-avatar'
export { RenderProgressBars } from './components/render-progress-bars'
export { DesignStepLayout } from './components/design-step-layout'
export { EstimateResultView } from './components/estimate-result-view'
export { EstimateTable } from './components/estimate-table'
export { AdvisoryNote } from './components/advisory-note'
export { CostDonut } from './components/cost-donut'
export { DossierOverview, type DossierProjectInfo } from './components/dossier-overview'
export { DossierReady } from './components/dossier-ready'
export { DossierShareDialog, type ShareMode } from './components/dossier-share-dialog'
export { SharedDossierView } from './components/shared-dossier-view'
export { MyProjects } from './components/my-projects'
export { ProjectBoard } from './components/project-board'
export { ProjectCard } from './components/project-card'

// Hooks
export { useProjects, useProject, useCreateProject, useRenameProject, useDeleteProject } from './hooks/use-projects'
export { useDesignQuota } from './hooks/use-design-quota'
export { useEstimate } from './hooks/use-estimate'
export { useDownloadEstimate } from './hooks/use-download-estimate'
export {
  useDossier,
  useRenderDossier,
  useCreateShareLink,
  useRevokeShareLink,
  useSendDossierEmail
} from './hooks/use-dossier'
export { useDownloadDossier } from './hooks/use-download-dossier'
export { useAdvisory } from './hooks/use-advisory'
export { useSaveInput } from './hooks/use-save-input'
export { useGenerationProgress } from './hooks/use-generation-progress'
export { useFloorCountLabel } from './hooks/use-floor-count-label'

// Store
export { useDesignStore } from './store/design.store'

// Services (pure — unit-test target)
export {
  EMPTY_DESIGN_INPUT,
  emptyDesignInput,
  composeAddress,
  visibleFields,
  applyBuildingTypeChange,
  missingRequiredFields,
  canSubmitDesignInput,
  type RequiredInputField
} from './services/design-input.service'
export {
  costShares,
  grandTotal,
  rollUpSections,
  sectionTotal,
  subItemAmount,
  unitCostPerSqm,
  type CostShare,
  type DraftLineItem,
  type DraftSection
} from './services/estimate.service'
export { advisoryFacts, type AdvisoryFacts } from './services/advisory.service'
export {
  countProjects,
  filterProjects,
  matchesQuery,
  miniStepState,
  mostRecentActiveProject,
  pageCount,
  paginate,
  projectStatus,
  resumeProjectRoute,
  selectProjects,
  sortProjects,
  type MiniStepState,
  type ProjectCounts,
  type ProjectListFilter
} from './services/project-list.service'
export {
  buildEstimateSheet,
  ESTIMATE_XLSX_COLUMNS,
  type EstimateXlsxContext,
  type EstimateXlsxLabels
} from './services/estimate-xlsx.service'

// Schemas
export {
  createProjectSchema,
  PROJECT_NAME_MAX_LENGTH,
  PROJECT_DESCRIPTION_MAX_LENGTH,
  type CreateProjectFormValues
} from './schemas/create-project.schema'
export { createDesignInputSchema, type DesignInputFormValues } from './schemas/design-input.schema'

// Constants & types
export {
  BUILDING_TYPES,
  DESIGN_STYLES,
  STYLES_BY_BUILDING_TYPE,
  COST_SECTIONS,
  DEFAULT_PACKAGE_TIER,
  DEFAULT_PROJECT_SORT,
  DESIGN_STEPS,
  PROJECT_SORTS,
  PROJECT_STAT_CARDS,
  PROJECT_STATUSES,
  PROJECTS_PAGE_SIZE,
  type ProjectStatCard,
  STEP_HELP_TOPIC,
  FIELDS_BY_BUILDING_TYPE,
  FLOOR_COUNTS,
  LAND_PHOTO_ACCEPT,
  LAND_PHOTO_MAX_BYTES,
  PACKAGE_TIERS,
  WISHES_MAX_LENGTH
} from './constants/design.constants'
export type {
  AddressDetail,
  BuildingType,
  CostSection,
  DesignInput,
  DesignQuota,
  DesignStep,
  DesignStyle,
  Dossier,
  DossierStatus,
  EstimateLineItem,
  EstimateResult,
  EstimateSection,
  EstimateSubItem,
  FloorCount,
  KnownFloorCount,
  GenerationProgress,
  PackageTier,
  Project,
  ProjectSort,
  ProjectStatus,
  SharedDossier
} from './types/design.types'

export { DesignLoadError } from './components/design-load-error'
