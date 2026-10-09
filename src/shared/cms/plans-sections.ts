/** Chỉ các khối của trang bảng giá được yêu cầu biên tập; giá và quyền lợi vẫn thuộc bản ghi gói. */
export const PLANS_PAGE_KEY = 'plans'

/** Thứ tự hàng dùng chung cho bảng công khai và trình biên tập CMS. */
export const PLANS_COMPARISON_GROUPS = [
  {
    key: 'design',
    rows: [
      'uploadPhoto',
      'siteInfo',
      'buildingType',
      'style',
      'layout',
      'renderImages',
      'structureEstimate',
      'finishingEstimate',
      'interiorEstimate',
      'materialList',
      'boq',
      'exportDossier',
      'contractorPack'
    ]
  },
  {
    key: 'compare',
    rows: ['compareOptions', 'compareCost', 'compareMaterial', 'optimizeBudget', 'costDelta', 'materialAlternatives']
  },
  { key: 'support', rows: ['advisory', 'render3d'] },
  { key: 'proOnly', highlight: true, rows: ['gift', 'giftCondition'] }
] as const

/** Chữ của các mức hiển thị; mỗi mức được lưu một lần, không lưu riêng theo gói. */
export const PLANS_COMPARISON_LEVEL_FIELDS: Record<string, readonly string[]> = {
  layout: ['values.layoutBasic', 'values.layout2d3d', 'values.layout2d3dPlus'],
  interiorEstimate: ['values.estimateRough', 'values.estimateDetailed', 'values.estimateOptimized'],
  advisory: ['values.advisoryOnline', 'values.advisoryPriority', 'values.advisoryExpert']
}

export const PLANS_COPY_KEYS = {
  hero: ['title', 'subtitle'],
  advice: ['title', 'subtitle', 'call', 'chat', 'hotline'],
  comparison: [
    'title',
    'criterion',
    'choosePlanRow',
    'groups.core',
    'groups.design',
    'groups.compare',
    'groups.support',
    'groups.proOnly',
    'core.designOptions',
    'core.libraryCredits',
    'core.optionUnit',
    'core.libraryUnit',
    'rows.uploadPhoto',
    'rows.siteInfo',
    'rows.buildingType',
    'rows.style',
    'rows.layout',
    'rows.renderImages',
    'rows.structureEstimate',
    'rows.finishingEstimate',
    'rows.interiorEstimate',
    'rows.materialList',
    'rows.boq',
    'rows.exportDossier',
    'rows.contractorPack',
    'rows.compareOptions',
    'rows.compareCost',
    'rows.compareMaterial',
    'rows.optimizeBudget',
    'rows.costDelta',
    'rows.materialAlternatives',
    'rows.advisory',
    'rows.render3d',
    'rows.gift',
    'rows.giftCondition',
    'values.layoutBasic',
    'values.layout2d3d',
    'values.layout2d3dPlus',
    'values.estimateRough',
    'values.estimateDetailed',
    'values.estimateOptimized',
    'values.advisoryOnline',
    'values.advisoryPriority',
    'values.advisoryExpert',
    'buttons.basic',
    'buttons.advanced',
    'buttons.pro'
  ],
  value: [
    'title',
    'rows.easy',
    'cells.easy.basic',
    'cells.easy.advanced',
    'cells.easy.pro',
    'rows.time',
    'cells.time.basic',
    'cells.time.advanced',
    'cells.time.pro',
    'rows.budget',
    'cells.budget.basic',
    'cells.budget.advanced',
    'cells.budget.pro',
    'rows.ready',
    'cells.ready.basic',
    'cells.ready.advanced',
    'cells.ready.pro'
  ],
  notes: ['payment', 'estimate', 'gift', 'scope']
} as const

export type PlansSectionKey = keyof typeof PLANS_COPY_KEYS

/** Khóa JSON phẳng để form, API và trang công khai dùng cùng hình dạng. */
export const plansCopyField = (key: string) => key.replaceAll('.', '_')

export const plansCopyPath = (section: PlansSectionKey, key: string): readonly string[] => [
  'plans',
  ...{ hero: [], advice: ['ctaBand'], comparison: ['comparison'], value: ['value'], notes: ['notes'] }[section],
  ...key.split('.')
]

/** Nội dung là chữ thuần; chỉ thay các biến hiển thị đã được bên gọi cung cấp. */
export function formatPlansCopy(text: string, values: Record<string, string | number> = {}) {
  return text.replace(/\{(hotline|count|name)\}/g, (match, key: string) =>
    values[key] === undefined ? match : String(values[key])
  )
}
