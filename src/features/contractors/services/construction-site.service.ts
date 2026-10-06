import { z } from 'zod'
import type {
  CreateSiteRequest,
  SiteCatalog,
  SiteDetail,
  SiteFormValues,
  SiteProfile
} from '../types/construction-site.types'
import { PLANNED_STARTS } from '../types/construction-site.types'

export const SITE_FILE_LIMIT = 9
export const SITE_FILE_MAX_BYTES = 10_000_000
export const SITE_FILE_ACCEPT = {
  Drawing: '.pdf,.dwg,.dxf,.jpg,.jpeg,.png,.webp',
  ConditionPhoto: '.jpg,.jpeg,.png,.webp'
} as const

/** Accept a decimal separator for area, but never silently round or erase fractions. */
export function areaDecimal(text: string): string {
  return text.trim().replace(',', '.')
}
/** Group separators are display-only; keep all 28 allowed digits without Number coercion. */
export function moneyDecimal(text: string): string {
  const clean = text.trim()
  return /^(?:\d+|\d{1,3}(?:[. ,]\d{3})+)$/.test(clean) ? clean.replace(/[. ,]/g, '') : clean
}
function canonicalDecimal(value: string): string {
  return value
    .replace(/^0+(?=\d)/, '')
    .replace(/(\.\d*?)0+$/, '$1')
    .replace(/\.$/, '')
}
export function positiveDecimal(text: string, kind: 'area' | 'money'): boolean {
  const value = kind === 'area' ? areaDecimal(text) : moneyDecimal(text)
  return (kind === 'area' ? /^\d{1,26}(?:\.\d{1,2})?$/ : /^\d{1,28}$/).test(value) && /[1-9]/.test(value)
}
export function siteAddressKey(
  profile: Pick<SiteProfile, 'provinceCode' | 'wardCode' | 'addressDetail' | 'locationDatasetVersion'>
): string {
  return JSON.stringify([
    profile.provinceCode,
    profile.wardCode,
    profile.addressDetail.trim(),
    profile.locationDatasetVersion
  ])
}
export function applicableSiteFields(type: SiteCatalog['types'][number] | undefined) {
  return {
    floor: Boolean(type?.floorsEnabled && type.floorCounts.length),
    tum: Boolean(type?.tumEnabled),
    architecture: Boolean(type?.architectureEnabled && type.architectureStyleIds.length),
    interior: Boolean(type?.interiorEnabled && type.interiorStyleIds.length)
  }
}
export function toSiteProfile(values: SiteFormValues, catalog: SiteCatalog): SiteProfile {
  const applies = applicableSiteFields(catalog.types.find((type) => type.id === values.buildingTypeId))
  return {
    areaM2: areaDecimal(values.areaM2),
    provinceCode: values.provinceCode,
    wardCode: values.wardCode,
    locationDatasetVersion: values.locationDatasetVersion,
    addressDetail: values.addressDetail.trim(),
    buildingTypeId: values.buildingTypeId,
    floorCount: applies.floor ? values.floorCount : null,
    hasTum: applies.tum ? values.hasTum : null,
    architectureStyleId: applies.architecture ? values.architectureStyleId : null,
    interiorStyleId: applies.interior ? values.interiorStyleId : null
  }
}
export function createSiteFormSchema(
  catalog: SiteCatalog | undefined,
  messages: { required: string; area: string; budget: string; max: (n: number) => string },
  scopeIds: readonly string[] = []
) {
  return z
    .object({
      name: z.string().trim().min(1, messages.required).max(200, messages.max(200)),
      conditionId: z.string().min(1, messages.required),
      budgetVnd: z.string().refine((v) => positiveDecimal(v, 'money'), messages.budget),
      plannedStart: z.enum(PLANNED_STARTS),
      sourceEstimateId: z.string(),
      areaM2: z.string().refine((v) => positiveDecimal(v, 'area'), messages.area),
      provinceCode: z.string().min(1, messages.required),
      wardCode: z.string().min(1, messages.required),
      locationDatasetVersion: z.string().min(1, messages.required),
      addressDetail: z.string().trim().min(1, messages.required).max(500, messages.max(500)),
      buildingTypeId: z.string().min(1, messages.required),
      floorCount: z.number().int().nullable(),
      hasTum: z.boolean().nullable(),
      architectureStyleId: z.string().nullable(),
      interiorStyleId: z.string().nullable(),
      scope: z
        .string()
        .min(1, messages.required)
        .refine((id) => scopeIds.includes(id), messages.required),
      scopeNote: z.string().trim().min(1, messages.required).max(1000, messages.max(1000))
    })
    .superRefine((values, context) => {
      const type = catalog?.types.find((item) => item.id === values.buildingTypeId)
      if (!type) context.addIssue({ code: 'custom', path: ['buildingTypeId'], message: messages.required })
      const applies = applicableSiteFields(type)
      const valid = {
        floorCount: !applies.floor || (values.floorCount !== null && type?.floorCounts.includes(values.floorCount)),
        hasTum: !applies.tum || values.hasTum !== null,
        architectureStyleId:
          !applies.architecture ||
          (values.architectureStyleId !== null && type?.architectureStyleIds.includes(values.architectureStyleId)),
        interiorStyleId:
          !applies.interior ||
          (values.interiorStyleId !== null && type?.interiorStyleIds.includes(values.interiorStyleId)),
        conditionId: catalog?.conditions.some((condition) => condition.id === values.conditionId)
      }
      for (const [field, ok] of Object.entries(valid))
        if (!ok) context.addIssue({ code: 'custom', path: [field], message: messages.required })
    })
}
/** Reconciliation must match the submitted profile, not just a coincidentally equal name. */
export function matchesPendingCreation(site: SiteDetail, request: CreateSiteRequest, startedAt: string): boolean {
  const sameFields =
    site.name === request.name.trim().normalize('NFC') &&
    site.conditionId === request.conditionId &&
    canonicalDecimal(site.budgetVnd) === canonicalDecimal(request.budgetVnd) &&
    site.plannedStart === request.plannedStart &&
    site.latitude === request.latitude &&
    site.longitude === request.longitude &&
    Date.parse(site.createdAtUtc) >= Date.parse(startedAt) - 5000 &&
    site.files.length === request.uploadIds.length
  if (!sameFields) return false
  if (request.sourceEstimateId) return site.sourceEstimateId === request.sourceEstimateId
  return (
    site.sourceEstimateId === null &&
    request.profile !== undefined &&
    Object.entries(request.profile).every(([key, value]) =>
      key === 'areaM2'
        ? canonicalDecimal(site.profile.areaM2) === canonicalDecimal(String(value))
        : site.profile[key as keyof SiteProfile] === (typeof value === 'string' ? value.normalize('NFC') : value)
    )
  )
}
