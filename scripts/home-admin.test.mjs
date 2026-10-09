import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import ts from 'typescript'

/**
 * Logic thuần của màn sửa nội dung trang chủ (`src/features/admin/services/home-sections.service.ts`): hình dạng
 * các khối, chữ có sẵn lấy từ `messages`, và nội dung gửi lên backend.
 */
const source = new URL('../src/features/admin/services/home-sections.service.ts', import.meta.url)
const js = ts.transpileModule(await readFile(source, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
}).outputText
const home = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)

const readJson = async (name) =>
  JSON.parse(await readFile(new URL(`../messages/${name}.json`, import.meta.url), 'utf8'))
const vi = await readJson('vi')
const en = await readJson('en')

const section = (key) => home.HOME_SECTIONS.find((item) => item.key === key)

test('mười hai khối, mã không trùng và đúng thứ tự trang', () => {
  assert.deepEqual(
    home.HOME_SECTIONS.map((item) => item.key),
    [
      'hero',
      'stats',
      'painPoints',
      'journey',
      'services',
      'dossiers',
      'articles',
      'guides',
      'consult',
      'brands',
      'testimonials',
      'cta'
    ]
  )
})

test('mọi chữ có sẵn trỏ đúng khóa trong cả hai ngôn ngữ (bắt lỗi gõ sai khóa)', () => {
  for (const [name, messages] of [
    ['vi', vi],
    ['en', en]
  ]) {
    for (const def of home.HOME_SECTIONS) {
      const scalar = home.scalarDefaults(def, messages)
      for (const field of def.fields) {
        if (field.kind === 'image' || field.kind === 'icon') continue
        if (!field.defaultPath) continue
        assert.notEqual(scalar[field.name], '', `${name}: ${def.key}.${field.name} không có chữ có sẵn`)
      }
      for (const list of def.lists) {
        if (list.type !== 'rows') continue
        home.rowDefaults(list, messages).forEach((row, index) => {
          for (const field of list.fields) {
            if (!field.defaultPath) continue
            assert.notEqual(
              row[field.name],
              '',
              `${name}: ${def.key}.${list.rows[index]}.${field.name} không có chữ có sẵn`
            )
          }
        })
      }
    }
  }
})

test('trường không có khóa mặc định (ảnh, icon, danh sách tự do) cho chuỗi rỗng', () => {
  assert.equal(home.defaultText(vi, undefined), '')
  assert.equal(home.defaultText(vi, ['khong', 'co']), '')
  assert.equal(home.defaultText(vi, ['landing', 'hero']), '', 'khóa trỏ tới đối tượng không phải chuỗi')
})

test('formValuesFor mở form với đúng chữ đang hiển thị khi chưa lưu', () => {
  const values = home.formValuesFor(section('hero'), null, vi)
  assert.equal(values.primaryCta, vi.landing.hero.primaryCta)
  assert.equal(values.cardAreaValue, vi.landing.hero.card.rows.area.value)
  assert.deepEqual(values.slides, [], 'ảnh nền mặc định nằm trong mã nguồn nên danh sách tự do bắt đầu rỗng')

  const stats = home.formValuesFor(section('stats'), null, vi)
  assert.equal(stats.items.length, 5)
  assert.equal(stats.items[0].value, vi.landing.stats.photo.value)
  assert.equal(stats.items[4].label, vi.landing.stats.inspections.label)
  assert.equal(stats.items[0].icon, '')

  const journey = home.formValuesFor(section('journey'), null, vi)
  assert.equal(journey.items[1].buildxDoes, vi.landing.journey.items.design.savicoDoes)
  assert.equal(journey.labelBuildxDoes, vi.landing.journey.detailLabels.savicoDoes)
})

test('formValuesFor ưu tiên bản đã lưu, trường lưu trống thì quay lại chữ có sẵn', () => {
  const values = home.formValuesFor(section('stats'), { items: [{ value: '10 tấm ảnh', label: '   ' }, 'lạ'] }, vi)
  assert.equal(values.items[0].value, '10 tấm ảnh')
  assert.equal(values.items[0].label, vi.landing.stats.photo.label)
  assert.equal(values.items[1].value, vi.landing.stats.steps.value)
  assert.equal(values.items.length, 5)

  const guides = home.formValuesFor(section('guides'), { guideIds: [' a ', '', 7, 'b', 'c', 'd'] }, vi)
  assert.deepEqual(guides.guideIds, ['a', 'b', 'c'].slice(0, 3))
})

test('buildContent: chữ y hệt bản có sẵn thì không ghi gì', () => {
  for (const def of home.HOME_SECTIONS) {
    const values = home.formValuesFor(def, null, vi)
    assert.deepEqual(home.buildContent(def, values, vi), {}, def.key)
  }
})

test('buildContent chỉ ghi trường lẻ đã đổi và cắt khoảng trắng', () => {
  const values = home.formValuesFor(section('cta'), null, vi)
  values.title = '  Bắt đầu ngay  '
  values.action = vi.landing.cta.action
  assert.deepEqual(home.buildContent(section('cta'), values, vi), { title: 'Bắt đầu ngay' })
})

test('buildContent: gõ lại đúng chữ gốc là bỏ sửa đổi', () => {
  const saved = { title: 'Tiêu đề cũ' }
  const values = home.formValuesFor(section('cta'), saved, vi)
  assert.equal(values.title, 'Tiêu đề cũ')
  values.title = vi.landing.cta.title
  assert.deepEqual(home.buildContent(section('cta'), values, vi), {})
})

test('buildContent: danh sách cố định ghi đủ các dòng theo vị trí khi có dòng đổi', () => {
  const values = home.formValuesFor(section('stats'), null, vi)
  values.items[2].value = '12 phương án'
  values.items[0].icon = 'Camera'

  const content = home.buildContent(section('stats'), values, vi)
  assert.equal(content.items.length, 5)
  assert.deepEqual(content.items[0], {
    icon: 'Camera',
    value: vi.landing.stats.photo.value,
    label: vi.landing.stats.photo.label
  })
  assert.equal(content.items[2].value, '12 phương án')
  assert.equal(content.items[3].value, vi.landing.stats.contractors.value)
})

test('buildContent: danh sách thêm bớt bỏ dòng trống, còn dòng nào thì ghi', () => {
  const def = section('testimonials')
  const values = home.formValuesFor(def, null, vi)
  values.reviews = [
    { name: ' Anh A ', meta: 'Nhà phố', quote: 'Rất ổn', avatarUrl: '' },
    { name: '', meta: '  ', quote: '', avatarUrl: '' },
    { name: 'Chị B', meta: '', quote: '', avatarUrl: 'https://cdn.example/b.png' }
  ]
  assert.deepEqual(home.buildContent(def, values, vi), {
    reviews: [
      { name: 'Anh A', meta: 'Nhà phố', quote: 'Rất ổn' },
      { name: 'Chị B', avatarUrl: 'https://cdn.example/b.png' }
    ]
  })

  values.reviews = [{ name: '', meta: '', quote: '', avatarUrl: '' }]
  assert.deepEqual(home.buildContent(def, values, vi), {})
})

test('buildContent: danh sách thêm bớt không vượt quá số tối đa', () => {
  const def = section('testimonials')
  const values = home.formValuesFor(def, null, vi)
  values.reviews = Array.from({ length: 20 }, (_, i) => ({ name: `Khách ${i}`, meta: '', quote: '', avatarUrl: '' }))
  assert.equal(home.buildContent(def, values, vi).reviews.length, 12)
})

test('buildContent: danh sách id bỏ trống và trùng, giữ thứ tự, tối đa số quy định', () => {
  const def = section('dossiers')
  const values = home.formValuesFor(def, null, vi)
  values.templateIds2d = ['t3', ' t1 ', 't3', '', 't2', 't4', 't5']
  values.templateIds3d = []
  assert.deepEqual(home.buildContent(def, values, vi), { templateIds2d: ['t3', 't1', 't2', 't4'] })
})

test('hero: chỉ ảnh nền có dòng thì mới ghi slides', () => {
  const def = section('hero')
  const values = home.formValuesFor(def, null, vi)
  values.slides = [{ imageUrl: '' }, { imageUrl: ' https://cdn.example/1.jpg ' }]
  assert.deepEqual(home.buildContent(def, values, vi), { slides: [{ imageUrl: 'https://cdn.example/1.jpg' }] })
})

test('sameContent so sâu, bỏ qua thứ tự khóa', () => {
  assert.equal(home.sameContent({ a: '1', b: [{ x: 'y' }] }, { b: [{ x: 'y' }], a: '1' }), true)
  assert.equal(home.sameContent({ a: '1' }, { a: '2' }), false)
  assert.equal(home.sameContent({ a: ['1', '2'] }, { a: ['2', '1'] }), false)
  assert.equal(home.sameContent({}, {}), true)
  assert.equal(home.sameContent({ a: '' }, {}), true)
})

test('tên icon hợp lệ: chữ, số, gạch ngang, tối đa 64 ký tự', () => {
  for (const ok of ['Camera', 'pencil-ruler', 'Grid2x2']) assert.equal(home.ICON_NAME_PATTERN.test(ok), true, ok)
  for (const bad of ['', 'a b', '<svg>', 'a'.repeat(65)]) assert.equal(home.ICON_NAME_PATTERN.test(bad), false, bad)
})

test('danh sách id: mỗi tab mẫu tối đa 4, video 3, kiến trúc sư 3, và chỉ chọn từ kho công khai đúng loại', () => {
  const lists = (key) => section(key).lists.map((list) => [list.name, list.max, list.source, list.drawingKind ?? null])
  assert.deepEqual(lists('dossiers'), [
    ['templateIds2d', 4, 'templates', '2D'],
    ['templateIds3d', 4, 'templates', '3D']
  ])
  assert.deepEqual(lists('articles'), [['articleIds', 3, 'articles', null]])
  assert.deepEqual(lists('guides'), [['guideIds', 3, 'guides', null]])
  assert.deepEqual(lists('consult'), [['architectIds', 3, 'architects', null]])
  assert.equal(
    home.HOME_SECTIONS.some((def) => 'idsTotalMax' in def),
    false,
    'không còn giới hạn chung cho tổng số mẫu'
  )
})

test('formValuesForAll dựng giá trị ban đầu cho đủ 12 khối, khối đã lưu lấy bản đã lưu', () => {
  const all = home.formValuesForAll(home.HOME_SECTIONS, { cta: { title: 'Tiêu đề đã sửa' } }, vi)
  assert.deepEqual(
    Object.keys(all),
    home.HOME_SECTIONS.map((def) => def.key)
  )
  assert.equal(all.cta.title, 'Tiêu đề đã sửa')
  assert.equal(all.cta.action, vi.landing.cta.action)
  assert.equal(all.hero.primaryCta, vi.landing.hero.primaryCta)
  assert.equal(all.stats.items.length, 5)
})

test('planSectionSave: chưa lưu và chưa sửa thì không làm gì', () => {
  const def = section('cta')
  const values = home.formValuesFor(def, null, vi)
  assert.deepEqual(home.planSectionSave(def, values, vi, null), { action: 'none' })
  assert.deepEqual(home.planSectionSave(def, values, vi, undefined), { action: 'none' })
})

test('planSectionSave: chưa lưu mà đã sửa thì ghi nội dung mới', () => {
  const def = section('cta')
  const values = home.formValuesFor(def, null, vi)
  values.title = '  Bắt đầu ngay  '
  assert.deepEqual(home.planSectionSave(def, values, vi, null), { action: 'save', content: { title: 'Bắt đầu ngay' } })
})

test('planSectionSave: giống hệt bản đang lưu thì không làm gì, khác thì ghi', () => {
  const def = section('cta')
  const saved = { content: { title: 'Tiêu đề cũ' } }
  const values = home.formValuesFor(def, saved.content, vi)
  assert.deepEqual(home.planSectionSave(def, values, vi, saved), { action: 'none' })

  values.title = 'Tiêu đề mới'
  assert.deepEqual(home.planSectionSave(def, values, vi, saved), { action: 'save', content: { title: 'Tiêu đề mới' } })
})

test('planSectionSave: đưa về đúng bản có sẵn thì gỡ bản đã lưu', () => {
  const def = section('cta')
  const saved = { content: { title: 'Tiêu đề cũ' } }
  const values = home.formValuesFor(def, saved.content, vi)
  values.title = vi.landing.cta.title
  assert.deepEqual(home.planSectionSave(def, values, vi, saved), { action: 'delete' })
})

test('planSectionSave: khối chưa có giá trị trong form coi như chưa đổi, kể cả khi đã có bản lưu', () => {
  const def = section('cta')
  assert.deepEqual(home.planSectionSave(def, undefined, vi, { content: { title: 'x' } }), { action: 'none' })
})

test('planSectionSave: danh sách cố định chỉ ghi khi có thẻ đổi, và ghi đủ số thẻ', () => {
  const def = section('stats')
  const values = home.formValuesFor(def, null, vi)
  assert.deepEqual(home.planSectionSave(def, values, vi, null), { action: 'none' })

  values.items[4].value = '20 lượt'
  const plan = home.planSectionSave(def, values, vi, null)
  assert.equal(plan.action, 'save')
  assert.equal(plan.content.items.length, 5)
  assert.equal(plan.content.items[4].value, '20 lượt')
})
