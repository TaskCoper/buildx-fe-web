import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import ts from 'typescript'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const cache = new Map()
async function load(file) {
  if (cache.has(file)) return cache.get(file)
  let js = ts.transpileModule(await readFile(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
  }).outputText
  for (const match of [...js.matchAll(/from ['"]([^'"]+)['"]/g)]) {
    const path = match[1]
    const url = path.startsWith('.')
      ? await load(resolve(dirname(file), path + '.ts'))
      : path.startsWith('@/')
        ? await load(resolve(root, 'src', path.slice(2) + '.ts'))
        : import.meta.resolve(path)
    js = js.replace(match[0], `from '${url}'`)
  }
  const url = `data:text/javascript;base64,${Buffer.from(js).toString('base64')}`
  cache.set(file, url)
  return url
}
const { dossierResultSchema, dossierContentSchema } = await import(
  await load(resolve(root, 'src/features/design/schemas/pipeline-api.schema.ts'))
)
const { resumeProjectRoute } = await import(
  await load(resolve(root, 'src/features/design/services/project-list.service.ts'))
)
const { dossierEstimate } = await import(await load(resolve(root, 'src/features/design/services/dossier.logic.ts')))
const id = '11111111-1111-4111-8111-111111111111'
const result = () => ({
  schemaVersion: 1,
  runId: id,
  projectName: 'Tên mới',
  printedProjectName: 'Tên in',
  projectCode: 'BUILDX-1',
  documents: ['dossier-pdf', 'render3d-pdf', 'architecture-pdf', 'estimate-xlsx'].map((role) => ({
    role,
    fileUrl: `/api/v1/estimates/${id}/stage-files/${id}?download=true`,
    sizeBytes: 1234,
    contentType:
      role === 'estimate-xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf',
    pageCount: role === 'estimate-xlsx' ? null : 12
  }))
})

test('UT-PROJ-507: đủ bốn vai trò riêng biệt, giữ tên in và tên hiện tại', () => {
  const parsed = dossierResultSchema.parse(result())
  assert.equal(parsed.printedProjectName, 'Tên in')
  assert.equal(parsed.projectName, 'Tên mới')
  assert.equal(parsed.documents[3].pageCount, null)
  for (const count of [0, 1, 3])
    assert.equal(
      dossierResultSchema.safeParse({ ...result(), documents: result().documents.slice(0, count) }).success,
      false
    )
  const duplicate = result()
  duplicate.documents[3] = duplicate.documents[0]
  assert.equal(dossierResultSchema.safeParse(duplicate).success, false)
})

test('UT-PROJ-507: từ chối URL nguồn, PDF sai MIME, tệp rỗng và số trang sai', () => {
  for (const patch of [
    { fileUrl: 'https://bucket.example/private?signed=secret' },
    { fileUrl: 'javascript:alert(1)' },
    { contentType: 'text/html' },
    { sizeBytes: 0 },
    { pageCount: 0 },
    { pageCount: null }
  ]) {
    const invalid = result()
    Object.assign(invalid.documents[0], patch)
    assert.equal(dossierResultSchema.safeParse(invalid).success, false, JSON.stringify(patch))
  }
})

test('UT-PROJ-509: mở tiếp đúng chặng, chỉ Hồ sơ xong mới mở trạng thái hoàn tất', () => {
  for (const [state, last, suffix] of [
    ['Draft', null, 'input'],
    ['Processing', null, 'plan'],
    ['InProgress', 'Plan2d', 'estimate'],
    ['Failed', 'Estimate', 'render3d'],
    ['InProgress', 'Render3d', 'dossier'],
    ['Completed', 'Dossier', 'dossier']
  ]) {
    assert.equal(
      resumeProjectRoute({ id, status: 'inProgress', pipeline: { state, lastSucceededStage: last } }),
      `/design/${id}/${suffix}`
    )
  }
})

test('Hợp đồng bản chia sẻ: giữ chi tiết và tổng nguồn, bỏ nội bộ', () => {
  const content = dossierContentSchema.parse({
    schemaVersion: 1,
    project: { projectName: 'Nhà', projectCode: 'B1', address: 'Huế', quoteDate: '2026-10-12' },
    drawings: [{ fileId: id, label: 'Tầng 1 — kỹ thuật', kind: '2d', floorIndex: 1, sheetCode: 'MB-01' }],
    estimate: {
      convertedFloorAreaM2: 100,
      totals: { structure: 120, finishing: 20, interior: 30, grandTotal: 175 },
      parts: [
        {
          part: 'Structure',
          total: 120,
          groups: [
            {
              name: 'Móng',
              items: [
                { name: 'Bê tông', unit: 'm³', quantity: 2, unitPrice: 60, amount: 120, material: 'secret brand' }
              ]
            }
          ]
        }
      ]
    },
    objectKey: 'private/secret',
    source: { internal: 'secret' }
  })
  const mapped = dossierEstimate(id, content.estimate)
  assert.equal(mapped.grandTotal, 175, 'không tự cộng lại thay tổng nguồn')
  assert.equal(mapped.sections[0].items[0].children[0].quantity, 2)
  assert.equal(content.objectKey, undefined)
  assert.equal(content.source, undefined)
})
