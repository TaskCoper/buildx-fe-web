import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import ts from 'typescript'

const root = new URL('../src/features/contractors/', import.meta.url)
const modules = new Map()
const owner = { user: { id: 'customer-a', accountKind: 'Customer' } }
globalThis[Symbol.for('project-selection-test-owner')] = owner
const authModule = `data:text/javascript;base64,${Buffer.from(
  "export const useAuthStore = Object.assign(selector => selector(globalThis[Symbol.for('project-selection-test-owner')]), {getState: () => globalThis[Symbol.for('project-selection-test-owner')]})"
).toString('base64')}`

async function loadSource(file) {
  if (modules.has(file.href)) return modules.get(file.href)
  let js = ts.transpileModule(await readFile(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ESNext }
  }).outputText
  for (const match of [...js.matchAll(/from ['"]([^'"]+)['"]/g)]) {
    const path = match[1]
    const resolved = path.startsWith('.')
      ? await loadSource(new URL(path + '.ts', file))
      : path === '@/shared/auth'
        ? authModule
        : path === '@/shared/lib/api'
          ? httpModule
          : path === '@/shared/config/env'
            ? envModule
            : import.meta.resolve(path)
    js = js.replace(match[0], `from '${resolved}'`)
  }
  const url = `data:text/javascript;base64,${Buffer.from(js).toString('base64')}`
  modules.set(file.href, url)
  return url
}

class MemoryStorage {
  values = new Map()
  writes = 0
  blocked = false
  getItem(key) {
    return this.values.get(key) ?? null
  }
  setItem(key, value) {
    if (this.blocked) throw new Error('QuotaExceededError')
    this.writes++
    this.values.set(key, value)
  }
  removeItem(key) {
    this.values.delete(key)
  }
}
globalThis.localStorage = new MemoryStorage()
const storage = globalThis.localStorage
const service = await import(await loadSource(new URL('services/project-selection.service.ts', root)))
const { emptyBrief, isBriefComplete } = await import(await loadSource(new URL('services/brief.service.ts', root)))
const { siteToBrief } = await import(await loadSource(new URL('api/brief-drafts.ts', root)))
const { siteDetailSchema } = await import(await loadSource(new URL('types/construction-site.types.ts', root)))
const transport = {
  selections: new Map(),
  calls: [],
  failure: undefined,
  beforeResponse: undefined,
  malformed: false,
  async get(path, options) {
    this.calls.push({ method: 'GET', path, signal: options?.signal })
    if (this.failure) throw this.failure
    return this.malformed ? {} : { constructionSiteId: this.selections.get(owner.user.id) ?? null }
  },
  async put(path, body) {
    this.calls.push({ method: 'PUT', path, body })
    if (this.failure) throw this.failure
    this.selections.set(owner.user.id, body.constructionSiteId)
    this.beforeResponse?.()
    return body
  }
}
globalThis[Symbol.for('selection-test-http')] = transport
const httpModule = `data:text/javascript;base64,${Buffer.from(
  "export const http = globalThis[Symbol.for('selection-test-http')]"
).toString('base64')}`
const envModule = `data:text/javascript;base64,${Buffer.from(
  'export const env = { NEXT_PUBLIC_USE_MOCK_API: false }'
).toString('base64')}`
const { projectSelectionApi: api } = await import(await loadSource(new URL('api/project-selection.api.ts', root)))
const snapshot = (project) => ({ id: project.id, constructionSiteId: project.constructionSiteId })

function brief(id = 'local-a', overrides = {}) {
  return {
    ...emptyBrief(),
    id,
    userId: 'customer-a',
    ownershipVersion: 1,
    constructionSiteId: 'site-' + id,
    name: 'Project ' + id,
    buildingType: 'House',
    landArea: 120,
    address: { provinceCode: 66, provinceName: 'Province', wardCode: 1, wardName: 'Ward', street: 'Street' },
    scope: 'construction',
    scopeNote: 'Build a home',
    status: 'ready',
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
    ...overrides
  }
}
// BR-SITE-001/Then 14 and BR-RFQ-001/Then 2: persisted SITE is complete;
// browser-only contractor needs must not prevent selecting an owned server profile.
function serverSite(overrides = {}) {
  return siteDetailSchema.parse({
    constructionSiteId: 'b3680d77-123c-4cb4-8787-3fcb963f1caa',
    name: 'Project from API',
    address: 'Street, Ward, Province',
    latitude: 10.84523445800005,
    longitude: 106.78719193600006,
    version: 1,
    createdAtUtc: '2026-10-05T10:32:56.191951+00:00',
    updatedAtUtc: '2026-10-05T10:32:56.191951+00:00',
    profile: {
      areaM2: '150',
      provinceCode: '79',
      wardCode: '26842',
      locationDatasetVersion: 'pov2-37e41027084215f3',
      addressDetail: 'Street',
      buildingTypeId: '4ca47fbd-5481-455d-a110-a8be91202416',
      floorCount: 3,
      hasTum: null,
      architectureStyleId: 'c54f2e8a-65b4-4587-93f8-45e9a6f3ce5c',
      interiorStyleId: '600fdabb-256b-418f-99e5-94d1989f16f7',
      ...overrides
    },
    catalogRevisionId: '06087a5e-dca3-4b61-9728-062a87bf0b38',
    conditionId: 'b5710000-0000-4000-8000-000000000002',
    conditionName: 'Condition',
    budgetVnd: '15000000',
    plannedStart: 'Within1To3Months',
    provinceName: 'Province',
    wardName: 'Ward',
    sourceEstimateId: null,
    buildingTypeName: 'Karaoke',
    architectureStyleName: 'Modern',
    interiorStyleName: 'Luxury',
    files: [],
    canEdit: true,
    canDelete: true,
    lockedFields: []
  })
}

test('owned API profiles remain complete and selectable without browser drafts, including non-applicable fields', () => {
  for (const fields of [{ hasTum: null }, { hasTum: false }, { floorCount: null, hasTum: null }]) {
    const restored = siteToBrief(serverSite(fields))
    assert.equal(restored.scope, '')
    assert.equal(restored.scopeNote, '')
    assert.equal(restored.documents.length, 0)
    assert.equal(isBriefComplete(restored), true)
    assert.equal(service.isSelectableProject(restored, 'customer-a'), true)
    assert.equal(service.resolveSelectedProject([restored], undefined, 'customer-a'), restored)
  }
})

test('an API profile does not bypass ownership or contracted checks', () => {
  const restored = siteToBrief(serverSite())
  assert.equal(service.isSelectableProject(restored, 'customer-b'), false)
  assert.equal(service.isSelectableProject({ ...restored, ownershipVersion: undefined }, 'customer-a'), false)
  assert.equal(service.isSelectableProject({ ...restored, status: 'contracted' }, 'customer-a'), false)
})

test('a server ID alone or a mismatched server profile does not complete an unfinished browser draft', () => {
  const unfinished = brief('unfinished', { scope: '', scopeNote: '' })
  assert.equal(isBriefComplete(unfinished), false)
  assert.equal(isBriefComplete({ ...unfinished, constructionSite: serverSite() }), false)
  assert.equal(isBriefComplete({ ...unfinished, constructionSiteId: undefined, constructionSite: serverSite() }), false)
})

test('the first completed project is selectable; empty, incomplete, contracted and foreign projects are not', () => {
  assert.equal(service.isSelectableProject(brief(), 'customer-a'), true)
  for (const overrides of [
    { scopeNote: '' },
    { landArea: 0 },
    { status: 'contracted' },
    { userId: 'customer-b' },
    { ownershipVersion: undefined }
  ]) {
    assert.equal(service.isSelectableProject(brief('invalid', overrides), 'customer-a'), false)
  }
})

test('a saved choice survives a newer project and refreshes its live summary', () => {
  const chosen = brief('a')
  const updated = { ...chosen, name: 'Updated project', address: { ...chosen.address, street: 'New street' } }
  const newer = brief('b', { updatedAt: '2026-10-06T00:00:00Z' })
  assert.equal(service.resolveSelectedProject([newer, updated], snapshot(chosen), 'customer-a'), updated)
})

test('server/local URL aliases resolve to the same project', () => {
  const local = brief('local-a')
  const server = { ...local, id: local.constructionSiteId }
  assert.equal(service.resolveSelectedProject([local], snapshot(server), 'customer-a'), local)
})

test('a deleted or ineligible choice falls back to the newest eligible owned project', () => {
  const chosen = snapshot(brief('missing'))
  const fallback = brief('b', { updatedAt: '2026-10-06T00:00:00Z' })
  assert.equal(
    service.resolveSelectedProject(
      [brief('a'), fallback, brief('foreign', { userId: 'customer-b' })],
      chosen,
      'customer-a'
    ),
    fallback
  )
  assert.equal(
    service.resolveSelectedProject([brief('missing', { status: 'contracted' })], chosen, 'customer-a'),
    undefined
  )
})

// STORY-SITE-001/AC-039–041: the source of selection is the account API.
test('selection request uses the verified server ID instead of a browser draft URL', () => {
  const restored = siteToBrief(serverSite(), undefined, 'local-alias')
  assert.equal(service.selectedProjectSiteId(restored, 'customer-a'), serverSite().constructionSiteId)
  assert.throws(() => service.selectedProjectSiteId(restored, 'customer-b'), /OwnerMismatch/)
  assert.throws(() => service.selectedProjectSiteId({ ...restored, constructionSiteId: undefined }, 'customer-a'))
})

test('selection survives clearing localStorage and API instances read the account choice', async () => {
  const siteId = serverSite().constructionSiteId
  await api.set('customer-a', siteId)
  storage.values.clear()
  const writes = storage.writes
  assert.deepEqual(await api.get('customer-a'), { constructionSiteId: siteId })
  assert.equal(storage.writes, writes)
  assert.deepEqual(transport.calls.at(-2), {
    method: 'PUT',
    path: '/me/construction-sites/selection',
    body: { constructionSiteId: siteId }
  })
})

test('another account has its own selection and returning to the first restores it', async () => {
  owner.user = { id: 'customer-b', accountKind: 'Customer' }
  assert.deepEqual(await api.get('customer-b'), { constructionSiteId: null })
  const siteId = 'fb063fd8-a1f4-448b-a368-6812ba64587f'
  await api.set('customer-b', siteId)
  assert.equal((await api.get('customer-b')).constructionSiteId, siteId)
  owner.user = { id: 'customer-a', accountKind: 'Customer' }
  assert.equal((await api.get('customer-a')).constructionSiteId, serverSite().constructionSiteId)
})

test('failed PUT propagates its error and preserves the previous account choice', async () => {
  transport.failure = new Error('ServiceUnavailable')
  await assert.rejects(api.set('customer-a', 'fb063fd8-a1f4-448b-a368-6812ba64587f'), /ServiceUnavailable/)
  transport.failure = undefined
  assert.equal((await api.get('customer-a')).constructionSiteId, serverSite().constructionSiteId)
})

test('failed or malformed GET is not converted to an empty choice', async () => {
  transport.failure = new Error('ServiceUnavailable')
  await assert.rejects(api.get('customer-a'), /ServiceUnavailable/)
  transport.failure = undefined
  transport.malformed = true
  await assert.rejects(api.get('customer-a'))
  transport.malformed = false
})

test('a preference changed by another device is read on the next API fetch', async () => {
  const otherSite = 'a8903867-2448-4bf8-81c6-3ae54cbb6031'
  transport.selections.set('customer-a', otherSite)
  const signal = new AbortController().signal
  assert.deepEqual(await api.get('customer-a', signal), { constructionSiteId: otherSite })
  assert.equal(transport.calls.at(-1).signal, signal)
})

test('foreign, staff, malformed and unauthenticated selection requests do not reach HTTP', async () => {
  const calls = transport.calls.length
  await assert.rejects(api.set('customer-b', serverSite().constructionSiteId), /OwnerMismatch/)
  await assert.rejects(api.set('customer-a', 'local-draft'))
  owner.user = { id: 'customer-a', accountKind: 'Staff' }
  await assert.rejects(api.get('customer-a'), /OwnerMismatch/)
  owner.user = null
  await assert.rejects(api.get('customer-a'), /OwnerMismatch/)
  owner.user = { id: 'customer-a', accountKind: 'Customer' }
  assert.equal(transport.calls.length, calls)
})

test('account changes during PUT reject the late result instead of publishing it to the new account', async () => {
  transport.beforeResponse = () => {
    owner.user = { id: 'customer-b', accountKind: 'Customer' }
  }
  await assert.rejects(api.set('customer-a', serverSite().constructionSiteId), /OwnerMismatch/)
  transport.beforeResponse = undefined
  owner.user = { id: 'customer-a', accountKind: 'Customer' }
})

test('a deleted site clears the database preference and permits resolving another complete API project', async () => {
  transport.selections.delete('customer-a')
  storage.values.clear()
  assert.deepEqual(await api.get('customer-a'), { constructionSiteId: null })
  const fresh = siteToBrief(serverSite())
  assert.equal(service.resolveSelectedProject([fresh], undefined, 'customer-a'), fresh)
})
