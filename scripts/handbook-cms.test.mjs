import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import ts from 'typescript'

/**
 * Logic thuần của nội dung biên tập trang Cẩm nang: ba bước, chủ đề của bài, chip lọc và khối chữ cố định
 * (TDD-HB-001, TDD-HB-002, TDD-HB-003; BR-HB-001 khoản 3, 4, 7; BR-HB-003 khoản 6).
 */
const root = new URL('../src/features/handbook/api/', import.meta.url)
const cache = new Map()

async function load(name) {
  if (cache.has(name)) return cache.get(name)
  let js = ts.transpileModule(await readFile(new URL(`${name}.ts`, root), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
  }).outputText
  for (const match of [...js.matchAll(/from ['"]\.\/([^'"]+)['"]/g)]) {
    const dependency = await load(match[1])
    js = js.replace(match[0], `from '${dependency.url}'`)
  }
  const url = `data:text/javascript;base64,${Buffer.from(js).toString('base64')}`
  const loaded = { url, module: await import(url) }
  cache.set(name, loaded)
  return loaded
}

const news = (await load('handbook.news.logic')).module
const cms = (await load('handbook.cms.logic')).module

const node = (id, parentId, extra = {}) => ({
  id,
  parentId,
  name: id,
  sortOrder: 0,
  hasChildren: false,
  stageId: null,
  isInstruction: false,
  iconKey: null,
  ...extra
})

test('normalizeStages sắp theo số bước, giữ định danh thật và bỏ bước lạ', () => {
  const stages = cms.normalizeStages([
    { id: 'S3', code: 'interior', stepNumber: 3, title: 'Trang trí nội thất', description: 'd', coverImageUrl: 'c' },
    { id: 'S1', code: 'structure', stepNumber: 1, title: 'Phần thô', description: 'd', coverImageUrl: 'c' },
    { id: 'S9', code: 'khong-ton-tai', stepNumber: 9, title: 'Lạ', description: 'd', coverImageUrl: 'c' },
    { code: 'finishing', stepNumber: 2, title: 'Thiếu id' }
  ])

  assert.deepEqual(
    stages.map((stage) => [stage.id, stage.remoteId, stage.order]),
    [
      ['structure', 'S1', 1],
      ['interior', 'S3', 3]
    ]
  )
})

test('normalizeStage sắp chủ đề theo thứ tự, gắn mã bước và bỏ chủ đề thiếu tên', () => {
  const stage = cms.normalizeStage({
    id: 'S1',
    code: 'structure',
    stepNumber: 1,
    title: 'Phần thô',
    description: 'd',
    coverImageUrl: 'c',
    topics: [
      { id: 'T2', name: 'Móng', iconKey: 'foundation', sortOrder: 1 },
      { id: 'T1', name: 'Ép cọc', iconKey: null, sortOrder: 0 },
      { id: 'T3', name: '   ', sortOrder: 2 }
    ]
  })

  assert.deepEqual(
    stage.topics.map((topic) => [topic.id, topic.stage, topic.icon]),
    [
      ['T1', 'structure', undefined],
      ['T2', 'structure', 'foundation']
    ]
  )
})

test('excludeInstructionBranches bỏ cả nhánh chủ đề, kể cả các danh mục con của nó', () => {
  const nodes = [
    node('all', null),
    node('experience', 'all'),
    node('foundation', null, { isInstruction: true, stageId: 'S1' }),
    node('pile', 'foundation'),
    node('deep-pile', 'pile')
  ]

  const kept = news.excludeInstructionBranches(nodes).map((n) => n.id)
  assert.deepEqual(kept, ['all', 'experience'])

  const chips = news.chipNodes(news.excludeInstructionBranches(nodes)).map((n) => n.id)
  assert.deepEqual(chips, ['experience'])

  // Đối chứng: không lọc thì `chipNodes` lấy con của nút gốc làm chip, nên "pile" (con của chủ đề "foundation")
  // lọt vào bộ lọc bài viết. Đây là lý do phải loại cả nhánh chứ không chỉ cờ trên nút gốc.
  const unfiltered = news.chipNodes(nodes).map((n) => n.id)
  assert.ok(unfiltered.includes('pile'))
})

test('nhãn tin tức thuộc một bước nhưng không bật cờ hướng dẫn vẫn là chip', () => {
  const nodes = [node('material', null, { stageId: 'S1', isInstruction: false })]
  assert.deepEqual(
    news.chipNodes(news.excludeInstructionBranches(nodes)).map((n) => n.id),
    ['material']
  )
})

test('withTopicIds gắn bài vào mọi chủ đề mà nhánh của nó chứa danh mục của bài', () => {
  const nodes = [
    node('foundation', null, { isInstruction: true }),
    node('pile', 'foundation'),
    node('woodwork', null, { isInstruction: true }),
    node('material', null)
  ]
  const stages = [{ topics: [{ id: 'foundation' }] }, { topics: [{ id: 'woodwork' }] }]
  const articles = [
    { id: 'a', categoryIds: ['pile'] },
    { id: 'b', categoryIds: ['foundation', 'woodwork'] },
    { id: 'c', categoryIds: ['material'] },
    { id: 'd', categoryIds: [] },
    { id: 'mock', topicId: 'old-topic' }
  ]

  const result = Object.fromEntries(cms.withTopicIds(articles, stages, nodes).map((a) => [a.id, a.topicIds]))

  assert.deepEqual(result.a, ['foundation'], 'bài gắn danh mục con vẫn thuộc chủ đề cha')
  assert.deepEqual(result.b, ['foundation', 'woodwork'], 'bài gắn nhiều chủ đề thì thuộc nhiều chủ đề')
  assert.deepEqual(result.c, [], 'nhãn tin tức không thuộc chủ đề nào')
  assert.deepEqual(result.d, [], 'bài không gắn danh mục nào không thuộc chủ đề nào')
  assert.equal(result.mock, undefined, 'bài mock không có categoryIds giữ nguyên để dùng topicId cũ')
})

test('articleSlugOf dùng đường dẫn hiện tại, rơi về định danh với bài cũ chưa có đường dẫn', () => {
  assert.equal(cms.articleSlugOf('gia-vat-lieu', 'id-1'), 'gia-vat-lieu')
  assert.equal(cms.articleSlugOf(null, 'id-1'), 'id-1')
  assert.equal(cms.articleSlugOf('   ', 'id-1'), 'id-1')
  assert.equal(cms.articleSlugOf(undefined, 'id-1'), 'id-1')
})

test('sectionText trả undefined khi khối chưa biên tập hoặc trường trống để giao diện dùng bản dịch', () => {
  const sections = cms.indexPageSections([
    { sectionKey: 'hero', schemaVersion: 1, content: { title: '  Hiểu rõ từng bước  ', eyebrow: '   ', count: 3 } },
    { sectionKey: 'broken', content: ['không-phải-đối-tượng'] },
    { sectionKey: '', content: { title: 'thiếu mã' } }
  ])

  assert.equal(cms.sectionText(sections, 'hero', 'title'), 'Hiểu rõ từng bước')
  assert.equal(cms.sectionText(sections, 'hero', 'eyebrow'), undefined, 'chuỗi trống không được xóa chữ dự phòng')
  assert.equal(cms.sectionText(sections, 'hero', 'count'), undefined, 'trường không phải chuỗi bị bỏ qua')
  assert.equal(cms.sectionText(sections, 'stagesHeading', 'title'), undefined, 'khối chưa biên tập')
  assert.equal(cms.sectionText(sections, 'broken', 'title'), undefined)
  assert.equal(cms.sectionText(undefined, 'hero', 'title'), undefined)
  assert.equal(sections.size, 1)
})
