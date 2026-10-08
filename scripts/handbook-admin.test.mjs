import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import ts from 'typescript'

/** Logic thuần của màn quản lý chủ đề hướng dẫn: lọc chủ đề, đếm bài theo nhánh, điều kiện xóa (TDD-HB-001). */
const source = await readFile(
  new URL('../src/features/admin/services/handbook-topics.service.ts', import.meta.url),
  'utf8'
)
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
}).outputText
const logic = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)

const category = (id, parentId = null, extra = {}) => ({
  id,
  parentId,
  name: id,
  sortOrder: 0,
  hasChildren: false,
  version: 1,
  stageId: null,
  isInstruction: false,
  iconKey: null,
  ...extra
})

const categories = [
  category('label', null),
  category('foundation', null, { isInstruction: true, stageId: 'S1', sortOrder: 2, hasChildren: true }),
  category('pile', 'foundation'),
  category('deep-pile', 'pile'),
  category('woodwork', null, { isInstruction: true, stageId: 'S3', sortOrder: 1 }),
  // Bật cờ nhưng chưa có bước: dữ liệu không hợp lệ, không phải chủ đề.
  category('orphan', null, { isInstruction: true, stageId: null })
]

test('instructionTopics chỉ lấy danh mục gốc bật cờ và đã gắn bước, theo thứ tự', () => {
  assert.deepEqual(
    logic.instructionTopics(categories).map((c) => c.id),
    ['woodwork', 'foundation']
  )
})

test('instructionTopics bỏ danh mục con dù mang cờ', () => {
  const dirty = [...categories, category('child-flag', 'label', { isInstruction: true, stageId: 'S1' })]
  assert.ok(!logic.instructionTopics(dirty).some((c) => c.id === 'child-flag'))
})

test('countArticlesPerTopic tính cả nhánh con và chỉ đếm một lần mỗi bài trong cùng chủ đề', () => {
  const topics = logic.instructionTopics(categories)
  const articles = [
    { categoryIds: ['deep-pile'] },
    { categoryIds: ['foundation', 'pile'] },
    { categoryIds: ['woodwork'] },
    { categoryIds: ['foundation', 'woodwork'] },
    { categoryIds: ['label'] },
    { categoryIds: [] }
  ]

  const counts = logic.countArticlesPerTopic(articles, categories, topics)

  assert.equal(counts.foundation, 3, 'bài gắn cả cha lẫn con vẫn chỉ đếm một lần')
  assert.equal(counts.woodwork, 2)
})

test('canDeleteTopic chặn khi còn danh mục con hoặc còn bài', () => {
  const [woodwork, foundation] = logic.instructionTopics(categories)
  assert.equal(logic.canDeleteTopic(woodwork, 0), true)
  assert.equal(logic.canDeleteTopic(woodwork, 1), false)
  assert.equal(logic.canDeleteTopic(foundation, 0), false, 'còn danh mục con')
})

const newsletterSource = await readFile(
  new URL('../src/features/admin/services/handbook-newsletter.service.ts', import.meta.url),
  'utf8'
)
const newsletter = await import(
  `data:text/javascript;base64,${Buffer.from(
    ts.transpileModule(newsletterSource, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
    }).outputText
  ).toString('base64')}`
)

const slot = (articleId, state) => ({ articleId, state })

test('displayNumbers đánh số bốn bài đang công bố đầu tiên và bỏ qua bài ẩn, các bài sau dồn lên', () => {
  // B1 B2(ẩn) B3 B4 B5 B6: khối hiển thị B1, B3, B4, B5 với số 1..4 — đúng ví dụ ở BR-HB-002.
  const items = [
    slot('B1', 'Published'),
    slot('B2', 'Hidden'),
    slot('B3', 'Published'),
    slot('B4', 'Published'),
    slot('B5', 'Published'),
    slot('B6', 'Published')
  ]
  assert.deepEqual(newsletter.displayNumbers(items), [1, null, 2, 3, 4, null])
})

test('displayNumbers: công bố lại bài đang ẩn thì bài đó về đúng chỗ và đẩy bài cuối ra ngoài khối', () => {
  const items = [
    slot('B1', 'Published'),
    slot('B2', 'Published'),
    slot('B3', 'Published'),
    slot('B4', 'Published'),
    slot('B5', 'Published')
  ]
  assert.deepEqual(newsletter.displayNumbers(items), [1, 2, 3, 4, null])
})

test('hasDisplayedArticle báo khối đang không hiển thị khi rỗng hoặc mọi bài đều ẩn', () => {
  assert.equal(newsletter.hasDisplayedArticle([]), false)
  assert.equal(newsletter.hasDisplayedArticle([slot('a', 'Hidden'), slot('b', 'Draft')]), false)
  assert.equal(newsletter.hasDisplayedArticle([slot('a', 'Hidden'), slot('b', 'Published')]), true)
})

test('moveItem đổi chỗ và giữ nguyên khi ra ngoài biên', () => {
  assert.deepEqual(newsletter.moveItem(['a', 'b', 'c'], 2, -1), ['a', 'c', 'b'])
  assert.deepEqual(newsletter.moveItem(['a', 'b', 'c'], 0, -1), ['a', 'b', 'c'])
  assert.deepEqual(newsletter.moveItem(['a', 'b', 'c'], 2, 1), ['a', 'b', 'c'])
})

test('sameOrder so cả thứ tự lẫn số lượng', () => {
  assert.equal(
    newsletter.sameOrder([{ articleId: 'a' }, { articleId: 'b' }], [{ articleId: 'a' }, { articleId: 'b' }]),
    true
  )
  assert.equal(
    newsletter.sameOrder([{ articleId: 'a' }, { articleId: 'b' }], [{ articleId: 'b' }, { articleId: 'a' }]),
    false
  )
  assert.equal(newsletter.sameOrder([{ articleId: 'a' }], []), false)
})

const sectionsSource = await readFile(
  new URL('../src/features/admin/services/handbook-sections.service.ts', import.meta.url),
  'utf8'
)
const sections = await import(
  `data:text/javascript;base64,${Buffer.from(
    ts.transpileModule(sectionsSource, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
    }).outputText
  ).toString('base64')}`
)

const hero = sections.HANDBOOK_SECTIONS.find((section) => section.key === 'hero')

test('hero không có trường liên kết và ảnh nền là tùy chọn (BR-HB-003 khoản 4)', () => {
  assert.deepEqual(
    hero.fields.map((field) => field.name),
    ['eyebrow', 'title', 'description', 'ctaLabel', 'backgroundImageUrl']
  )
  assert.equal(hero.fields.find((field) => field.name === 'backgroundImageUrl').required, false)
  assert.ok(!hero.fields.some((field) => field.name === 'ctaHref'))
})

test('defaultsFor đọc chữ mặc định theo đường dẫn khóa, thiếu khóa cho chuỗi rỗng', () => {
  const messages = { handbook: { foundation: { kicker: 'Cẩm nang BuildX', title: 'Hiểu rõ từng bước xây nhà' } } }
  const defaults = sections.defaultsFor(hero.fields, messages)
  assert.equal(defaults.eyebrow, 'Cẩm nang BuildX')
  assert.equal(defaults.title, 'Hiểu rõ từng bước xây nhà')
  assert.equal(defaults.description, '')
  assert.equal(defaults.backgroundImageUrl, '')
})

test('buildContent cắt khoảng trắng và bỏ hẳn ảnh để trống', () => {
  const content = sections.buildContent(hero.fields, {
    eyebrow: '  CẨM NANG  ',
    title: 'Tiêu đề',
    description: 'Mô tả',
    ctaLabel: 'Bắt đầu',
    backgroundImageUrl: '   '
  })
  assert.deepEqual(content, { eyebrow: 'CẨM NANG', title: 'Tiêu đề', description: 'Mô tả', ctaLabel: 'Bắt đầu' })
  assert.ok(!('backgroundImageUrl' in content), 'ảnh trống phải bị bỏ, không gửi chuỗi rỗng')
})

test('sameContent phát hiện khi người quản lý chưa đổi gì so với bản mặc định', () => {
  assert.equal(sections.sameContent({ title: 'a' }, { title: 'a' }), true)
  assert.equal(sections.sameContent({ title: 'a', image: '' }, { title: 'a' }), true)
  assert.equal(sections.sameContent({ title: 'a' }, { title: 'b' }), false)
})

test('formValuesFor ưu tiên bản đã lưu, thiếu thì dùng chữ mặc định', () => {
  const values = sections.formValuesFor(
    hero.fields,
    { title: 'Đã sửa' },
    { title: 'Mặc định', eyebrow: 'Kicker mặc định' }
  )
  assert.equal(values.title, 'Đã sửa')
  assert.equal(values.eyebrow, 'Kicker mặc định')
})

const viMessages = JSON.parse(await readFile(new URL('../messages/vi.json', import.meta.url), 'utf8'))
const enMessages = JSON.parse(await readFile(new URL('../messages/en.json', import.meta.url), 'utf8'))
const sectionOf = (key) => sections.HANDBOOK_SECTIONS.find((section) => section.key === key)

test('có đủ sáu khối chữ của trang Cẩm nang, tên hai tab đứng đầu và banner Thư viện mẫu đứng cuối', () => {
  assert.deepEqual(
    sections.HANDBOOK_SECTIONS.map((section) => section.key),
    ['tabs', 'hero', 'stagesHeading', 'articlesHeading', 'newsletterHeading', 'libraryBanner']
  )
})

test('mỗi khối thuộc đúng một nhóm trên màn quản trị: tên hai tab dùng chung, banner ở tab Thư viện mẫu', () => {
  const grouped = Object.values(sections.HANDBOOK_SECTION_GROUPS).flat()
  assert.deepEqual([...grouped].sort(), sections.HANDBOOK_SECTIONS.map((section) => section.key).sort())
  assert.equal(new Set(grouped).size, grouped.length, 'một khối không được nằm ở hai nhóm')
  assert.deepEqual(sections.HANDBOOK_SECTION_GROUPS.shared, ['tabs'])
  assert.deepEqual(sections.HANDBOOK_SECTION_GROUPS.library, ['libraryBanner'])
  assert.deepEqual(sections.HANDBOOK_SECTION_GROUPS.news, [
    'hero',
    'stagesHeading',
    'articlesHeading',
    'newsletterHeading'
  ])
})

test('banner Thư viện mẫu: tiêu đề và mô tả bắt buộc, ảnh nền tùy chọn, không có trường của hero', () => {
  const banner = sectionOf('libraryBanner')
  assert.deepEqual(
    banner.fields.map((field) => [field.name, field.kind, field.required]),
    [
      ['title', 'textarea', true],
      ['description', 'textarea', true],
      ['backgroundImageUrl', 'image', false]
    ]
  )
})

test('tên hai tab: hai nhãn chữ bắt buộc và không có ảnh', () => {
  const tabs = sectionOf('tabs')
  assert.deepEqual(
    tabs.fields.map((field) => [field.name, field.kind, field.required]),
    [
      ['newsLabel', 'text', true],
      ['libraryLabel', 'text', true]
    ]
  )
})

test('chữ mặc định của banner Thư viện mẫu và hai tab đọc đúng từ messages, ở cả hai ngôn ngữ', () => {
  for (const [name, messages] of [
    ['vi', viMessages],
    ['en', enMessages]
  ]) {
    const banner = sections.defaultsFor(sectionOf('libraryBanner').fields, messages)
    assert.ok(banner.title, `${name}: thiếu tiêu đề mặc định của banner`)
    assert.ok(banner.description, `${name}: thiếu mô tả mặc định của banner`)
    assert.equal(banner.backgroundImageUrl, '')
    assert.ok(banner.title.includes('\n'), `${name}: tiêu đề mặc định phải giữ chỗ xuống dòng`)

    const tabs = sections.defaultsFor(sectionOf('tabs').fields, messages)
    assert.ok(tabs.newsLabel, `${name}: thiếu tên tab Tin tức`)
    assert.ok(tabs.libraryLabel, `${name}: thiếu tên tab Thư viện mẫu`)
  }
})

test('buildContent giữ nguyên ký tự xuống dòng bên trong tiêu đề banner', () => {
  const content = sections.buildContent(sectionOf('libraryBanner').fields, {
    title: '  Khám phá các mẫu bản vẽ\nphù hợp cho ngôi nhà của bạn ',
    description: 'Mô tả',
    backgroundImageUrl: ''
  })
  assert.equal(content.title, 'Khám phá các mẫu bản vẽ\nphù hợp cho ngôi nhà của bạn')
})

test('sortedRoots chỉ lấy danh mục gốc theo thứ tự rồi định danh', () => {
  const list = [category('b', null, { sortOrder: 1 }), category('child', 'b'), category('a', null, { sortOrder: 0 })]
  assert.deepEqual(
    logic.sortedRoots(list).map((c) => c.id),
    ['a', 'b']
  )
})

// Dãy gốc chung: r0(nhãn) t1(bước 1) r2(nhãn) t3(bước 1) t4(bước 3) t5(bước 1) r6(nhãn)
const roots = [
  category('r0', null, { sortOrder: 0 }),
  category('t1', null, { sortOrder: 1, isInstruction: true, stageId: 'S1' }),
  category('r2', null, { sortOrder: 2 }),
  category('t3', null, { sortOrder: 3, isInstruction: true, stageId: 'S1' }),
  category('t4', null, { sortOrder: 4, isInstruction: true, stageId: 'S3' }),
  category('t5', null, { sortOrder: 5, isInstruction: true, stageId: 'S1' }),
  category('r6', null, { sortOrder: 6 })
]
const stage1 = roots.filter((r) => r.stageId === 'S1')

test('topicMove lên: đứng ngay trước chủ đề liền trước của cùng bước, bỏ qua danh mục khác bước chen giữa', () => {
  assert.equal(logic.topicMove(roots, stage1, 2, 'up').before.id, 't3')
  assert.equal(logic.topicMove(roots, stage1, 1, 'up').before.id, 't1')
  assert.equal(logic.topicMove(roots, stage1, 0, 'up'), null, 'đã ở đầu bước')
})

test('topicMove xuống: đứng trước danh mục gốc kế tiếp sau chủ đề liền sau, kể cả khi có chủ đề của bước khác chen', () => {
  // t1 xuống: phải đứng sau t3 (chủ đề kế của bước 1), tức trước t4 (gốc kế sau t3), dù t4 thuộc bước 3.
  assert.equal(logic.topicMove(roots, stage1, 0, 'down').before.id, 't4')
  // t3 xuống: sau t5, tức trước r6.
  assert.equal(logic.topicMove(roots, stage1, 1, 'down').before.id, 'r6')
  assert.equal(logic.topicMove(roots, stage1, 2, 'down'), null, 'đã ở cuối bước')
})

test('topicMove xuống: chủ đề liền sau là danh mục gốc cuối cùng thì xuống cuối dãy (before = null)', () => {
  const tail = [
    category('t1', null, { sortOrder: 0, stageId: 'S1' }),
    category('t2', null, { sortOrder: 1, stageId: 'S1' })
  ]
  assert.deepEqual(logic.topicMove(tail, tail, 0, 'down'), { before: null })
})

test('topicMove bỏ qua chỉ số ngoài danh sách', () => {
  assert.equal(logic.topicMove(roots, stage1, -1, 'up'), null)
  assert.equal(logic.topicMove(roots, stage1, 9, 'down'), null)
})
