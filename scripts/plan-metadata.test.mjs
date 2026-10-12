import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, normalize } from 'node:path'
import { test } from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)
function load(path, overrides = {}) {
  const js = ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText
  const loaded = { exports: {} }
  new Function('require', 'module', 'exports', js)(
    (name) => {
      if (Object.hasOwn(overrides, name)) return overrides[name]
      if (name.startsWith('./')) return load(normalize(dirname(path) + '/' + name + '.ts'), overrides)
      return require(name)
    },
    loaded,
    loaded.exports
  )
  return loaded.exports
}
const metadata = load('src/shared/cms/plan-metadata.ts')
const merge = load('src/shared/cms/plans-merge.ts').mergeApiIntoPlans
const cycle = load('src/features/plans/services/plan-cycle.ts').planForCycle
const checkoutBenefits = load('src/features/checkout/api/checkout.map.ts', {
  '@/shared/cms': metadata
}).planBenefits

test('paid supervision benefits use visible metadata in order rather than the legacy description', () => {
  const visible = { id: crypto.randomUUID(), text: '<b>Nội dung nguyên văn</b>', visible: true }
  const next = { id: crypto.randomUUID(), text: 'Báo cáo sau kiểm tra', visible: true }
  const hidden = { id: crypto.randomUUID(), text: 'Ẩn', visible: false }
  assert.deepEqual(
    checkoutBenefits({
      kind: 'Supervision',
      revision: {
        description: '- Nội dung cũ',
        metadata: { displayBenefits: [visible, hidden, next] }
      }
    }),
    [visible.text, next.text]
  )
})

test('configured empty or hidden supervision benefits never restore the legacy description after payment', () => {
  for (const displayBenefits of [[], [{ id: crypto.randomUUID(), text: 'Ẩn', visible: false }]]) {
    assert.deepEqual(
      checkoutBenefits({
        kind: 'Supervision',
        revision: {
          description: '- Nội dung cũ',
          metadata: { displayBenefits }
        }
      }),
      []
    )
  }
})

test('legacy supervision without metadata keeps its old payment display', () => {
  for (const metadata of [null, undefined]) {
    assert.deepEqual(
      checkoutBenefits({
        kind: 'Supervision',
        revision: {
          description: 'Giới thiệu\n- Dịch vụ cũ\n- Kiểm tra',
          metadata
        }
      }),
      ['Dịch vụ cũ', 'Kiểm tra']
    )
  }
})

// Exercise the form's actual request builder without mounting the admin framework.
const managerSource = readFileSync(
  new URL('../src/features/admin/components/business/plan-manager.tsx', import.meta.url),
  'utf8'
)
const managerAst = ts.createSourceFile(
  'plan-manager.tsx',
  managerSource,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX
)
const draftDeclaration = managerAst.statements.find(
  (node) => ts.isFunctionDeclaration(node) && node.name?.text === 'toDraft'
)
assert.ok(draftDeclaration, 'Admin form request builder must exist')
const draftJs = ts.transpileModule(`export ${draftDeclaration.getText(managerAst)}`, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText
const draftExports = {}
new Function('exports', draftJs)(draftExports)

test('supervision form sends an explicit empty quota array for both create and save content', () => {
  const metadataBenefits = [{ id: crypto.randomUUID(), text: ' Hỗ trợ online ', visible: true }]
  const content = draftExports.toDraft({
    kind: 'Supervision',
    name: ' Giám sát ',
    description: ' Dịch vụ ',
    sitePrice: 100000,
    metadataBenefits
  })
  const payload = JSON.parse(JSON.stringify(content))
  assert.deepEqual(payload.offers, [{ offerKey: 'ConstructionSite', price: 100000, currency: 'VND', quotas: [] }])
  assert.deepEqual(payload.displayBenefits, [])
  assert.equal(payload.consultationText, '')
  assert.equal(payload.description, 'Dịch vụ')
  assert.deepEqual(payload.metadata.displayBenefits, [{ ...metadataBenefits[0], text: 'Hỗ trợ online' }])
})
const labels = {
  row: (key) => `Row ${key}`,
  level: (key) => `Level ${key}`,
  quota: (key, count) => `${key}: ${count}`,
  unlimited: (key) => `${key}: unlimited`
}
const line = (text = 'Text', visible = true) => ({ id: crypto.randomUUID(), text, visible })
const base = () => ({
  id: 'basic',
  code: 'BASIC',
  name: 'Basic',
  price: 10,
  designCredits: 999,
  libraryCredits: 888,
  benefits: {
    layout: { level: 'basic' },
    interiorEstimate: { level: 'rough' },
    advisory: { level: 'online' },
    toggles: { exportDossier: { enabled: true }, render3d: { enabled: false } }
  },
  highlights: ['designCredits', 'libraryCredits', 'interiorEstimate', 'exportDossier', 'advisory', 'render3d']
})
const item = (content) => ({
  code: 'BASIC',
  kind: 'Design',
  planId: crypto.randomUUID(),
  revision: {
    name: 'Published',
    offers: [
      {
        offerKey: 'Month',
        price: 100,
        quotas: [
          { code: 'catalog.detail', isUnlimited: false, limit: 20 },
          { code: 'design.generate', isUnlimited: false, limit: 3 }
        ]
      },
      { offerKey: 'Year', price: 1100, quotas: [{ code: 'design.generate', isUnlimited: true, limit: null }] }
    ],
    metadata: content
  }
})

test('configured metadata preserves ids, order, duplicates, hidden and literal text', () => {
  const lines = [line(' <b>A</b> ', false), line('<b>A</b>')]
  assert.deepEqual(metadata.readPlanMetadata({ displayBenefits: lines }), {
    displayBenefits: [{ ...lines[0], text: '<b>A</b>' }, lines[1]]
  })
})
test('null/missing legacy differs from explicitly configured empty list', () => {
  assert.equal(metadata.readPlanMetadata(undefined), null)
  assert.equal(metadata.readPlanMetadata(null), null)
  assert.deepEqual(metadata.readPlanMetadata({ displayBenefits: [] }), { displayBenefits: [] })
})
test('rejects malformed configured data, overflow, duplicate UUIDs, missing visibility and entitlement fields', () => {
  const id = crypto.randomUUID()
  const invalid = [
    {},
    [],
    false,
    { displayBenefits: null },
    { displayBenefits: [null] },
    { displayBenefits: [line(' ')] },
    { displayBenefits: [line('a'.repeat(1001), false)] },
    { displayBenefits: [{ ...line(), id: 'invalid' }] },
    { displayBenefits: [{ ...line(), id: '00000000-0000-0000-0000-000000000000' }] },
    {
      displayBenefits: [
        { id, text: 'A', visible: true },
        { id: id.toUpperCase(), text: 'B', visible: false }
      ]
    },
    { displayBenefits: [{ id, text: 'A' }] },
    { displayBenefits: [line()], quota: 100 },
    { displayBenefits: [{ ...line(), code: 'design.generate' }] },
    { displayBenefits: Array.from({ length: 21 }, () => line()) }
  ]
  for (const value of invalid) assert.throws(() => metadata.readPlanMetadata(value), /metadata/)
  assert.equal(
    metadata.readPlanMetadata({ displayBenefits: [line('😀'.repeat(500))] }).displayBenefits[0].text.length,
    1000
  )
  assert.throws(() => metadata.readPlanMetadata({ displayBenefits: [line('😀'.repeat(501))] }))
  assert.equal(
    metadata.readPlanMetadata({ displayBenefits: Array.from({ length: 20 }, () => line()) }).displayBenefits.length,
    20
  )
})
test('customer uses actual quota order, then visible metadata; month/year share metadata but keep independent quotas', () => {
  const lines = [line('Second'), line('Hidden', false), line('First')]
  const plan = merge([base()], [item({ displayBenefits: lines })])[0]
  assert.deepEqual(metadata.planHighlightLines(cycle(plan, 'Month'), 'Month', labels), [
    'designCredits: 3',
    'libraryCredits: 20',
    'Second',
    'First'
  ])
  assert.deepEqual(metadata.planHighlightLines(cycle(plan, 'Year'), 'Year', labels), [
    'designCredits: unlimited',
    'Second',
    'First'
  ])
  assert.deepEqual(
    lines.map((x) => x.text),
    ['Second', 'Hidden', 'First']
  )
})
test('configured empty/all-hidden never borrow legacy content; missing quotas never borrow CMS or another cycle', () => {
  for (const content of [{ displayBenefits: [] }, { displayBenefits: [line('Hidden', false)] }]) {
    const api = item(content)
    api.revision.offers[0].quotas = []
    const plan = merge([base()], [api])[0]
    assert.deepEqual(metadata.planHighlightLines(plan, 'Month', labels), [])
    assert.deepEqual(metadata.planHighlightLines(plan, 'Year', labels), ['designCredits: unlimited'])
  }
})
test('legacy API never borrows descriptive rows or consultation from CMS', () => {
  for (const content of [null, undefined]) {
    const api = item(content)
    api.revision.consultationText = 'Consult now'
    const plan = merge([base()], [api])[0]
    assert.deepEqual(metadata.planHighlightLines(plan, 'Month', labels), ['designCredits: 3', 'libraryCredits: 20'])
    assert.equal(plan.fitLine, '')
    assert.equal(plan.imageUrl, '')
    assert.equal(plan.gift, undefined)
  }
})
test('mock-only plans keep their existing highlights', () => {
  assert.deepEqual(metadata.planHighlightLines(base(), 'Month', labels).slice(0, 2), [
    'designCredits: 999',
    'libraryCredits: 888'
  ])
})
test('malformed metadata from matched API plan fails instead of restoring CMS', () => {
  assert.throws(() => merge([base()], [item({})]), /metadata/)
})
test('real API failure propagates; successful empty result is a genuine empty response and configured empty stays empty', async () => {
  let response = { items: [] }
  let fail = true
  const { bmtPlansApi } = load('src/features/plans/api/plans.bmt.ts', {
    '@/shared/lib/api': {
      http: {
        get: async () => {
          if (fail) throw new Error('HTTP 503')
          return response
        }
      }
    },
    '@/shared/cms': metadata,
    './supervision.merge': supervision,
    './plans.mock': { mockPlansApi: { listPlans: async () => [base()] } },
    './plans.merge': { mergeApiIntoPlans: merge }
  })
  await assert.rejects(bmtPlansApi.listPlans(), /HTTP 503/)
  fail = false
  assert.deepEqual(await bmtPlansApi.listPlans(), [])
  response = { items: [item({ displayBenefits: [] })] }
  assert.deepEqual((await bmtPlansApi.listPlans())[0].metadata, { displayBenefits: [] })
  fail = true
  await assert.rejects(bmtPlansApi.listPlans(), /HTTP 503/)
  fail = false
  response = { items: [item({ displayBenefits: null })] }
  await assert.rejects(bmtPlansApi.listPlans(), /metadata/)
})

const supervision = load('src/shared/cms/supervision-merge.ts')
const siteBase = () => ({
  id: 'check',
  tier: 'check',
  name: 'Legacy',
  price: 10,
  durationMonths: 6,
  inspections: 4,
  fitLine: 'Fit',
  benefits: ['Legacy A', 'Legacy B']
})
const siteItem = (content) => ({
  planId: crypto.randomUUID(),
  code: 'CHECK',
  kind: 'Supervision',
  revision: { name: 'Live', offers: [{ offerKey: 'ConstructionSite', price: 1000 }], metadata: content }
})

test('supervision form preserves and clears optional cover without changing quotas or metadata', () => {
  const values = {
    kind: 'Supervision',
    name: 'Giám sát',
    description: 'Dịch vụ',
    sitePrice: 100000,
    metadataBenefits: []
  }
  for (const [input, expected] of [
    [' https://files.example.test/cover.jpg ', 'https://files.example.test/cover.jpg'],
    ['', null],
    [undefined, null]
  ]) {
    const payload = JSON.parse(JSON.stringify(draftExports.toDraft({ ...values, coverImageUrl: input })))
    assert.equal(payload.coverImageUrl, expected)
    assert.deepEqual(payload.offers, [{ offerKey: 'ConstructionSite', price: 100000, currency: 'VND', quotas: [] }])
    assert.deepEqual(payload.metadata, { displayBenefits: [], supervisionCard: { recommended: false } })
  }
})

test('supervision published cover overrides CMS; explicit removal clears image and omitted legacy field retains it', () => {
  const base = { ...siteBase(), imageUrl: 'https://cms.example.test/old.jpg' }
  for (const [cover, expected] of [
    [' https://files.example.test/new.jpg ', 'https://files.example.test/new.jpg'],
    [null, undefined],
    ['', undefined],
    [undefined, base.imageUrl]
  ]) {
    const api = siteItem({ displayBenefits: [] })
    api.revision.coverImageUrl = cover
    const view = supervision.mergeApiIntoPackages([base], [api])[0]
    assert.equal(view.imageUrl, expected)
    assert.equal(view.durationMonths, base.durationMonths)
    assert.equal(view.inspections, base.inspections)
    assert.deepEqual(view.benefits, [])
    assert.equal(base.imageUrl, 'https://cms.example.test/old.jpg')
  }
})

test('Supervision metadata replaces card benefits only, preserves order/duplicates/literal text and excludes hidden', () => {
  const base = siteBase()
  const snapshot = structuredClone(base)
  const api = siteItem({ displayBenefits: [line('<b>A</b>'), line('Hidden', false), line('<b>A</b>')] })
  const view = supervision.mergeApiIntoPackages([base], [api])[0]
  assert.deepEqual(view.benefits, ['<b>A</b>', '<b>A</b>'])
  assert.equal(view.name, 'Live')
  assert.equal(view.price, 1000)
  assert.equal(view.id, api.planId)
  assert.equal(view.offerKey, 'ConstructionSite')
  assert.equal(view.durationMonths, 6)
  assert.equal(view.inspections, 4)
  assert.equal(view.fitLine, 'Fit')
  assert.deepEqual(base, snapshot)
})
test('Supervision null/missing keeps legacy; empty/all-hidden never restores mock; self-managed CMS stays intact', () => {
  const base = siteBase()
  const self = { ...base, id: 'self', tier: 'self', price: 0 }
  for (const content of [null, undefined])
    assert.deepEqual(supervision.mergeApiIntoPackages([base], [siteItem(content)])[0].benefits, base.benefits)
  for (const content of [{ displayBenefits: [] }, { displayBenefits: [line('hidden', false)] }]) {
    const views = supervision.mergeApiIntoPackages([self, base], [siteItem(content)])
    assert.equal(views.length, 1)
    assert.deepEqual(views[0].benefits, [])
    assert.equal(self.price, 0)
  }
})
test('Supervision legacy Admin seed includes exactly current benefits without changing input or copying inspection band', () => {
  const base = siteBase()
  const snapshot = structuredClone(base)
  const seed = supervision.seedSupervisionPlanMetadata(base)
  assert.deepEqual(
    seed.displayBenefits.map((x) => x.text),
    base.benefits
  )
  assert.equal(new Set(seed.displayBenefits.map((x) => x.id)).size, 2)
  assert.ok(seed.displayBenefits.every((x) => x.visible))
  assert.deepEqual(base, snapshot)
})
test('Supervision corrupt metadata fails at merge instead of becoming legacy', () => {
  assert.throws(() => supervision.mergeApiIntoPackages([siteBase()], [siteItem({})]), /metadata/)
})
test('Supervision HTTP errors and malformed metadata propagate; genuine empty response stays valid', async () => {
  let response = { items: [] }
  let failure = true
  const api = load('src/features/supervision/api/supervision-plans.api.ts', {
    '@/shared/cms': metadata,
    './supervision.merge': supervision,
    '@/shared/lib/api': {
      http: {
        get: async () => {
          if (failure) throw new Error('HTTP 503')
          return response
        }
      }
    }
  })
  await assert.rejects(api.fetchPublishedSupervisionPlans(), /HTTP 503/)
  failure = false
  assert.deepEqual(await api.fetchPublishedSupervisionPlans(), [])
  response = { items: [siteItem({ displayBenefits: [] })] }
  assert.deepEqual((await api.fetchPublishedSupervisionPlans())[0].revision.metadata, { displayBenefits: [] })
  response = { items: [siteItem({ displayBenefits: null })] }
  await assert.rejects(api.fetchPublishedSupervisionPlans(), /metadata/)
})

// UT-SUB-147..150: metadata card, explicit clears and API-only card identity.
test('arbitrary supervision names/codes render once per API plan including zero price, with no CMS ghost', () => {
  const rows = [0, 8900000, 18900000].map((price, i) => {
    const row = siteItem({
      displayBenefits: [],
      supervisionCard: {
        tagline: '  Label  ',
        fitLine: 'Fit new',
        durationText: '12 months',
        inspectionText: 'Custom inspection',
        recommended: i === 2,
        recommendedLabel: 'Recommended',
        buttonLabel: 'Register'
      }
    })
    row.code = `ARBITRARY_${i}`
    row.revision.name = `New name ${i}`
    row.revision.offers[0].price = price
    return row
  })
  const views = supervision.mergeApiIntoPackages([siteBase()], rows)
  assert.deepEqual(
    views.map((x) => x.id),
    rows.map((x) => x.planId)
  )
  assert.deepEqual(
    views.map((x) => x.price),
    [0, 8900000, 18900000]
  )
  assert.deepEqual(
    views.map((x) => x.name),
    ['New name 0', 'New name 1', 'New name 2']
  )
  assert.equal(views[2].card.tagline, 'Label')
  assert.equal(views[2].card.inspectionText, 'Custom inspection')
  assert.equal(views[2].recommended, true)
  assert.deepEqual(supervision.mergeApiIntoPackages([siteBase()], []), [])
})
test('configured blank card never restores CMS fit, recommendation or benefit content', () => {
  const base = { ...siteBase(), recommended: true }
  const view = supervision.mergeApiIntoPackages(
    [base],
    [siteItem({ displayBenefits: [], supervisionCard: { recommended: false } })]
  )[0]
  assert.equal(view.fitLine, '')
  assert.equal(view.card.tagline, '')
  assert.equal(view.card.inspectionText, '')
  assert.equal(view.recommended, false)
  assert.deepEqual(view.benefits, [])
})
test('card text boundaries and strict shape reject corrupt data without a legacy fallback', () => {
  const read = (card) => metadata.readPlanMetadata({ displayBenefits: [], supervisionCard: card })
  assert.equal(read({ tagline: 'a'.repeat(1000) }).supervisionCard.tagline.length, 1000)
  for (const card of [{ tagline: 'a'.repeat(1001) }, { recommended: 'true' }, { quota: 999 }, []])
    assert.throws(() => read(card))
  for (const price of [-1, 0.5, undefined]) {
    const row = siteItem(null)
    row.revision.offers[0].price = price
    assert.throws(() => supervision.mergeApiIntoPackages([siteBase()], [row]), /Invalid published/)
  }
})
test('Admin payload sends zero price and card metadata while leaving system benefits empty', () => {
  const card = { tagline: 'Self', recommended: false, inspectionText: 'No visit' }
  const payload = draftExports.toDraft({
    kind: 'Supervision',
    name: 'Any free plan',
    sitePrice: 0,
    metadataBenefits: [],
    supervisionCard: card,
    isHighlighted: true,
    highlightLabel: 'Old'
  })
  assert.equal(payload.offers[0].price, 0)
  assert.deepEqual(payload.metadata.supervisionCard, card)
  assert.equal(payload.isHighlighted, false)
  assert.equal(payload.highlightLabel, null)
  assert.deepEqual(payload.displayBenefits, [])
})

// STORY-SUB-002/AC-049, AC-052: published card order is independent of price/name/recommendation.
test('supervision cards sort by published order, retaining ties and legacy API order without mutating input', () => {
  const make = (order, price = 0) => {
    const row = siteItem({ displayBenefits: [], supervisionCard: { recommended: false, displayOrder: order } })
    row.revision.offers[0].price = price
    return row
  }
  const unset = make(null)
  const third = make(3)
  const first = make(1, 18900000)
  const tied = make(1)
  first.revision.metadata.supervisionCard.recommended = true
  const legacy = siteItem(null)
  const rows = [unset, third, first, tied, legacy]
  const before = structuredClone(rows)
  assert.deepEqual(
    supervision.mergeApiIntoPackages([], rows).map((x) => x.id),
    [first, tied, third, unset, legacy].map((x) => x.planId)
  )
  assert.deepEqual(rows, before)
  assert.deepEqual(
    supervision.mergeApiIntoPackages([], [legacy, unset]).map((x) => x.id),
    [legacy.planId, unset.planId]
  )
})
test('supervision display order accepts integer boundaries and clears, rejecting corrupt API values', () => {
  for (const order of [1, 9999]) {
    const result = metadata.readPlanMetadata({ displayBenefits: [], supervisionCard: { displayOrder: order } })
    assert.equal(result.supervisionCard.displayOrder, order)
  }
  for (const order of [null, undefined]) {
    const result = metadata.readPlanMetadata({ displayBenefits: [], supervisionCard: { displayOrder: order } })
    assert.equal(result.supervisionCard.displayOrder, undefined)
  }
  for (const order of [0, -1, 10000, 1.5, '1', true, Infinity, NaN])
    assert.throws(() => metadata.readPlanMetadata({ displayBenefits: [], supervisionCard: { displayOrder: order } }))
})
test('Admin draft sends and clears supervision display order along with the card', () => {
  for (const order of [1, 9999, null]) {
    const card = { recommended: false, displayOrder: order }
    const result = draftExports.toDraft({
      kind: 'Supervision',
      name: 'Plan',
      sitePrice: 0,
      metadataBenefits: [],
      supervisionCard: card
    })
    assert.equal(result.metadata.supervisionCard.displayOrder, order)
    assert.equal(result.offers[0].price, 0)
  }
})

test('published arbitrary codes and UUIDs create every card; CMS-only plans never render', () => {
  const first = { ...item({ displayBenefits: [] }), code: 'CUSTOM-X' }
  const second = { ...item({ displayBenefits: [] }), code: 'CUSTOM-Y' }
  assert.deepEqual(
    merge([base()], [first, second]).map((plan) => plan.id),
    [first.planId, second.planId]
  )
  assert.deepEqual(merge([base()], []), [])
})
test('design card order is ascending, unset last and ties stable without mutating API data', () => {
  const entries = [5, null, 2, 2, 1].map((displayOrder) => item({ displayBenefits: [], designCard: { displayOrder } }))
  const snapshot = structuredClone(entries)
  assert.deepEqual(
    merge([], entries).map((plan) => plan.id),
    [entries[4], entries[2], entries[3], entries[0], entries[1]].map((entry) => entry.planId)
  )
  assert.deepEqual(entries, snapshot)
})
test('configured presentation and gift comes entirely from the published revision; clearing never restores CMS', () => {
  const api = item({
    displayBenefits: [],
    designCard: {
      tagline: ' New tag ',
      fitLine: ' New fit ',
      featuresTitle: 'New heading',
      buttonLabel: 'Choose me',
      giftTitle: 'New gift',
      giftValue: 100000000,
      giftExtraBody: 'Extra',
      giftConditionsShort: 'Short',
      giftImageUrl: 'https://assets.example.test/gift.webp'
    }
  })
  api.revision.giftDescription = 'Full description'
  api.revision.giftConditions = 'Full conditions'
  api.revision.highlightLabel = 'Custom ribbon'
  api.revision.isHighlighted = true
  const view = merge([{ ...base(), gift: { title: 'Legacy gift' }, imageUrl: 'Legacy cover' }], [api])[0]
  assert.equal(view.metadata.designCard.tagline, 'New tag')
  assert.equal(view.fitLine, 'New fit')
  assert.equal(view.ctaLabel, 'Choose me')
  assert.equal(view.shortLabel, 'Custom ribbon')
  assert.equal(view.imageUrl, '')
  assert.deepEqual(view.gift, {
    title: 'New gift',
    description: '',
    value: 100000000,
    extraBody: 'Extra',
    conditionsShort: 'Short',
    conditions: 'Short',
    imageUrl: 'https://assets.example.test/gift.webp'
  })
  assert.equal(merge([base()], [item({ displayBenefits: [], designCard: {} })])[0].gift, undefined)
})
test('design form sends the complete card only for Design, retains blanks and removes hidden supervision content', () => {
  const designCard = { tagline: '', displayOrder: 2, giftTitle: 'Gift', giftValue: 100 }
  const content = draftExports.toDraft({
    kind: 'Design',
    name: 'Design',
    monthPrice: 100,
    designCard,
    supervisionCard: { recommended: true }
  })
  assert.deepEqual(content.metadata.designCard, designCard)
  assert.equal(content.metadata.supervisionCard, undefined)
  assert.equal(
    draftExports.toDraft({ kind: 'Supervision', name: 'Site', sitePrice: 0, designCard }).metadata.designCard,
    undefined
  )
})
test('design card rejects malformed presentation and field limits at the response boundary', () => {
  for (const designCard of [
    [],
    { quota: 1 },
    { displayOrder: 0 },
    { displayOrder: 10000 },
    { displayOrder: 1.5 },
    { giftValue: -1 },
    { giftValue: '100' },
    { giftValue: 0.5 },
    { giftValue: Number.MAX_SAFE_INTEGER + 1 },
    { tagline: 'a'.repeat(1001) },
    { giftImageUrl: 'javascript:alert(1)' }
  ])
    assert.throws(() => metadata.readPlanMetadata({ displayBenefits: [], designCard }))
  assert.equal(
    metadata.readPlanMetadata({ displayBenefits: [], designCard: { tagline: 'a'.repeat(1000) } }).designCard.tagline
      .length,
    1000
  )
})
test('published plan rejects missing UUID, name, offer or invalid quota instead of mocking checkout', () => {
  for (const change of [
    { planId: '' },
    { revision: {} },
    { revision: { name: 'Broken', offers: [] } },
    {
      revision: {
        name: 'Broken',
        offers: [
          { offerKey: 'Month', price: 100, quotas: [{ code: 'design.generate', isUnlimited: false, limit: -1 }] }
        ]
      }
    }
  ])
    assert.throws(() => merge([], [{ ...item(null), ...change }]))
})

test('configured gift uses one condition on card and popup; clearing never revives legacy gift fields', () => {
  const api = item({ displayBenefits: [], designCard: { giftTitle: 'Configured gift', giftConditionsShort: '' } })
  api.revision.giftDescription = 'Hidden old description'
  api.revision.giftConditions = 'Hidden old conditions'
  const gift = merge([], [api])[0].gift
  assert.equal(gift.description, '')
  assert.equal(gift.conditionsShort, '')
  assert.equal(gift.conditions, '')
  api.revision.metadata.designCard.giftTitle = ''
  assert.equal(merge([], [api])[0].gift, undefined)
  api.revision.metadata.designCard = undefined
  const legacy = merge([], [api])[0].gift
  assert.equal(legacy.title, 'Hidden old description')
  assert.equal(legacy.conditions, 'Hidden old conditions')
})
