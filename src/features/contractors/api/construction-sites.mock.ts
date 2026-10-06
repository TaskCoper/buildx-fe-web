import { useAuthStore } from '@/shared/auth'
import type { bmtConstructionSitesApi } from './construction-sites.api'
import type { SiteCatalog, SiteDetail, PendingSiteFile } from '../types/construction-site.types'

const ids = {
  revision: '10000000-0000-4000-8000-000000000001',
  type: '20000000-0000-4000-8000-000000000001',
  apartment: '20000000-0000-4000-8000-000000000002',
  architecture: '30000000-0000-4000-8000-000000000001',
  interior: '30000000-0000-4000-8000-000000000002'
}
const conditions = ['Đất trống', 'Có nhà cũ cần phá dỡ', 'Cải tạo'].map((name, i) => ({
  id: `40000000-0000-4000-8000-00000000000${i + 1}`,
  name,
  displayOrder: i,
  isSelectable: true,
  version: 1
}))
const catalog: SiteCatalog = {
  catalogRevisionId: ids.revision,
  types: [
    {
      id: ids.type,
      name: 'Nhà phố',
      floorsEnabled: true,
      tumEnabled: true,
      architectureEnabled: true,
      interiorEnabled: true,
      floorCounts: [1, 2, 3, 4, 5, 6],
      architectureStyleIds: [ids.architecture],
      interiorStyleIds: [ids.interior]
    },
    {
      id: ids.apartment,
      name: 'Căn hộ',
      floorsEnabled: false,
      tumEnabled: false,
      architectureEnabled: false,
      interiorEnabled: true,
      floorCounts: [],
      architectureStyleIds: [],
      interiorStyleIds: [ids.interior]
    }
  ],
  styles: [
    { id: ids.architecture, group: 'Architecture', name: 'Hiện đại', imageUrl: '' },
    { id: ids.interior, group: 'Interior', name: 'Tối giản', imageUrl: '' }
  ],
  conditions,
  plannedStarts: ['ASAP', 'Within1To3Months', 'Within3To6Months', 'Undecided']
}
const uploads = new Map<string, PendingSiteFile>()
const key = () => `savico.mock-construction-sites.${useAuthStore.getState().user?.id ?? 'guest'}`
function customer() {
  const user = useAuthStore.getState().user
  if (!user) fail('Unauthorized', 401)
  if (!user.roles.includes('customer') || user.roles.includes('admin')) fail('AccessForbidden', 403)
}
const read = (): SiteDetail[] => {
  customer()
  return JSON.parse(localStorage.getItem(key()) ?? '[]') as SiteDetail[]
}
const write = (sites: SiteDetail[]) => localStorage.setItem(key(), JSON.stringify(sites))
function fail(code: string, status = 409): never {
  throw { code, status, message: code }
}
function find(id: string) {
  return read().find((site) => site.constructionSiteId === id) ?? fail('ConstructionSiteNotFound', 404)
}

export const mockConstructionSitesApi: typeof bmtConstructionSitesApi = {
  options: async () => {
    customer()
    return catalog
  },
  catalog: async () => catalog,
  sources: async (pageIndex) => ({ items: [], pageIndex, pageSize: 20, totalCount: 0, hasNextPage: false }),
  source: async () => fail('ConstructionSiteSourceNotFound', 404),
  create: async (request) => {
    customer()
    if (!request.profile) return fail('ConstructionSiteSourceNotFound', 404)
    if (read().some((site) => site.name.trim().toLocaleLowerCase() === request.name.trim().toLocaleLowerCase()))
      return fail('ConstructionSiteNameTaken')
    const now = new Date().toISOString()
    const type = catalog.types.find((item) => item.id === request.profile?.buildingTypeId)
    const site: SiteDetail = {
      constructionSiteId: crypto.randomUUID(),
      name: request.name,
      address: `${request.profile.addressDetail}, Phường Ba Đình, Thành phố Hà Nội`,
      latitude: request.latitude,
      longitude: request.longitude,
      version: 1,
      createdAtUtc: now,
      updatedAtUtc: now,
      profile: request.profile,
      catalogRevisionId: catalog.catalogRevisionId,
      conditionId: request.conditionId,
      conditionName: conditions.find((item) => item.id === request.conditionId)?.name ?? '',
      budgetVnd: request.budgetVnd,
      plannedStart: request.plannedStart,
      provinceName: 'Thành phố Hà Nội',
      wardName: 'Phường Ba Đình',
      sourceEstimateId: null,
      buildingTypeName: type?.name ?? '',
      architectureStyleName: request.profile.architectureStyleId ? 'Hiện đại' : null,
      interiorStyleName: request.profile.interiorStyleId ? 'Tối giản' : null,
      files: request.uploadIds.map((id) => {
        const file = uploads.get(id) ?? fail('ConstructionSiteUploadUnavailable')
        return {
          id,
          attachmentGroup: file.attachmentGroup,
          originalName: file.name,
          mediaType: file.mediaType,
          sizeBytes: file.sizeBytes,
          createdAtUtc: now,
          contentPath: ''
        }
      }),
      canEdit: true,
      canDelete: true,
      lockedFields: []
    }
    write([...read(), site])
    return site
  },
  update: async (id, request) => {
    const current = find(id)
    if (request.expectedVersion !== current.version) return fail('ConstructionSiteVersionConflict')
    const profile = request.profile ?? current.profile
    const site = {
      ...current,
      ...request,
      profile,
      conditionName: catalog.conditions.find((item) => item.id === request.conditionId)?.name ?? current.conditionName,
      buildingTypeName:
        catalog.types.find((item) => item.id === profile.buildingTypeId)?.name ?? current.buildingTypeName,
      architectureStyleName: catalog.styles.find((item) => item.id === profile.architectureStyleId)?.name ?? null,
      interiorStyleName: catalog.styles.find((item) => item.id === profile.interiorStyleId)?.name ?? null,
      address: `${profile.addressDetail}, ${current.wardName}, ${current.provinceName}`,
      version: current.version + 1,
      updatedAtUtc: new Date().toISOString()
    }
    write(read().map((item) => (item.constructionSiteId === id ? site : item)))
    return site
  },
  detail: async (id) => find(id),
  list: async (pageIndex) => ({
    items: read().slice((pageIndex - 1) * 100, pageIndex * 100),
    pageIndex,
    pageSize: 100,
    totalCount: read().length,
    hasNextPage: read().length > pageIndex * 100
  }),
  provinces: async () => ({ datasetVersion: 'mock-v1', provinces: [{ code: '1', name: 'Thành phố Hà Nội' }] }),
  wards: async (provinceCode) => ({
    datasetVersion: 'mock-v1',
    provinceCode,
    wards: [{ code: '4', name: 'Phường Ba Đình' }]
  }),
  search: async (address) => [{ refId: 'mock-place', name: address, address, display: address }],
  place: async (refId) => ({ refId, display: 'Phường Ba Đình, Hà Nội', latitude: 21.04, longitude: 105.83 }),
  upload: async (file, attachmentGroup) => {
    customer()
    const result = {
      uploadId: crypto.randomUUID(),
      attachmentGroup,
      name: file.name,
      sizeBytes: file.size,
      mediaType: file.type || 'application/pdf'
    }
    uploads.set(result.uploadId, result)
    return result
  },
  attach: async (id, uploadId, expectedVersion) => {
    const current = find(id)
    if (expectedVersion !== current.version) return fail('ConstructionSiteVersionConflict')
    if (current.files.length >= 9) return fail('ConstructionSiteAttachmentLimitExceeded')
    const file = uploads.get(uploadId) ?? fail('ConstructionSiteUploadUnavailable')
    const attachment = {
      id: uploadId,
      attachmentGroup: file.attachmentGroup,
      originalName: file.name,
      mediaType: file.mediaType,
      sizeBytes: file.sizeBytes,
      createdAtUtc: new Date().toISOString(),
      contentPath: ''
    }
    write(
      read().map((site) =>
        site.constructionSiteId === id
          ? { ...site, files: [...site.files, attachment], version: site.version + 1 }
          : site
      )
    )
    return { attachment, siteVersion: current.version + 1 }
  },
  removeFile: async (id, attachmentId, expectedVersion) => {
    const current = find(id)
    if (expectedVersion !== current.version) return fail('ConstructionSiteVersionConflict')
    write(
      read().map((site) =>
        site.constructionSiteId === id
          ? { ...site, files: site.files.filter((file) => file.id !== attachmentId), version: site.version + 1 }
          : site
      )
    )
  },
  download: async () => new Blob()
}
