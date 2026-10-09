import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import ts from 'typescript'

/**
 * Logic thuần của nội dung biên tập trang chủ (`src/shared/cms/home-sections.ts`): đọc khối do backend lưu, rơi về
 * nội dung có sẵn khi admin chưa lưu hoặc để trống, chọn mẫu theo danh sách id và chuẩn hóa tên icon lucide.
 */
const source = new URL('../src/shared/cms/home-sections.ts', import.meta.url)
const js = ts.transpileModule(await readFile(source, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
}).outputText
const cms = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)

test('indexHomeSections bỏ khối không có khóa hoặc nội dung không phải đối tượng', () => {
  const sections = cms.indexHomeSections([
    { sectionKey: ' hero ', content: { title: 'A' } },
    { sectionKey: '', content: { title: 'B' } },
    { sectionKey: 'stats', content: null },
    { sectionKey: 'brands', content: ['x'] },
    { content: { title: 'C' } }
  ])
  assert.deepEqual(Object.keys(sections), ['hero'])
  assert.deepEqual(cms.indexHomeSections(null), {})
  assert.deepEqual(cms.indexHomeSections(undefined), {})
  assert.deepEqual(cms.indexHomeSections({ sectionKey: 'hero' }), {})
})

test('sectionText cắt khoảng trắng và không bao giờ trả chuỗi rỗng để ghi đè nội dung mặc định', () => {
  const sections = cms.indexHomeSections([
    { sectionKey: 'hero', content: { title: '  Xây nhà  ', subtitle: '   ', count: 3 } }
  ])
  assert.equal(cms.sectionText(sections, 'hero', 'title'), 'Xây nhà')
  assert.equal(cms.sectionText(sections, 'hero', 'subtitle'), undefined)
  assert.equal(cms.sectionText(sections, 'hero', 'count'), undefined)
  assert.equal(cms.sectionText(sections, 'hero', 'khong-co'), undefined)
  assert.equal(cms.sectionText(sections, 'khong-co', 'title'), undefined)
  assert.equal(cms.sectionText(cms.EMPTY_HOME_SECTIONS, 'hero', 'title'), undefined)
})

test('sectionItems trả undefined khi chưa lưu hoặc rỗng, phần tử lạ thành đối tượng rỗng', () => {
  const sections = cms.indexHomeSections([
    { sectionKey: 'stats', content: { items: [{ value: '5' }, 'lạ', null] } },
    { sectionKey: 'brands', content: { logos: [] } }
  ])
  const items = cms.sectionItems(sections, 'stats', 'items')
  assert.equal(items.length, 3)
  assert.equal(cms.itemText(items[0], 'value'), '5')
  assert.equal(cms.itemText(items[1], 'value'), undefined)
  assert.equal(cms.itemText(items[2], 'value'), undefined)
  assert.equal(cms.sectionItems(sections, 'brands', 'logos'), undefined)
  assert.equal(cms.sectionItems(sections, 'stats', 'khong-co'), undefined)
  assert.equal(cms.itemText(undefined, 'value'), undefined)
})

test('sectionIds chỉ giữ phần tử là chuỗi có nội dung', () => {
  const sections = cms.indexHomeSections([
    { sectionKey: 'guides', content: { guideIds: [' a ', '', 7, null, 'b'] } },
    { sectionKey: 'dossiers', content: { templateIds2d: ['', '  '] } }
  ])
  assert.deepEqual(cms.sectionIds(sections, 'guides', 'guideIds'), ['a', 'b'])
  assert.equal(cms.sectionIds(sections, 'dossiers', 'templateIds2d'), undefined)
  assert.equal(cms.sectionIds(sections, 'guides', 'khong-co'), undefined)
})

test('pickByIds giữ thứ tự admin chọn, không phân biệt hoa thường, bỏ mục đã mất, không trùng, tối đa max', () => {
  const items = [{ id: 'A' }, { id: 'b' }, { id: 'C' }, { id: 'd' }]
  const id = (item) => item.id

  assert.equal(cms.pickByIds(items, undefined, id, 3), undefined)
  assert.equal(cms.pickByIds(items, [], id, 3), undefined)
  assert.deepEqual(cms.pickByIds(items, ['c', 'a'], id, 3), [items[2], items[0]])
  assert.deepEqual(cms.pickByIds(items, ['B', 'da-xoa', 'b', 'D'], id, 3), [items[1], items[3]])
  assert.deepEqual(cms.pickByIds(items, ['a', 'b', 'c', 'd'], id, 2), [items[0], items[1]])
  // Chọn rồi nhưng mẫu không còn nữa thì danh sách rỗng, không bù thêm mẫu khác.
  assert.deepEqual(cms.pickByIds(items, ['da-xoa'], id, 3), [])
})

test('lucideIconKey nhận cả PascalCase lẫn kebab-case và loại tên sai định dạng', () => {
  assert.equal(cms.lucideIconKey('PencilRuler'), 'pencil-ruler')
  assert.equal(cms.lucideIconKey('pencil-ruler'), 'pencil-ruler')
  assert.equal(cms.lucideIconKey('  Home  '), 'home')
  assert.equal(cms.lucideIconKey('Grid2x2'), 'grid-2x2')
  assert.equal(cms.lucideIconKey(''), undefined)
  assert.equal(cms.lucideIconKey(undefined), undefined)
  assert.equal(cms.lucideIconKey('a b'), undefined)
  assert.equal(cms.lucideIconKey('<script>'), undefined)
  assert.equal(cms.lucideIconKey('a'.repeat(65)), undefined)
})

test('lucideComponentName là phép ngược của lucideIconKey cho tên icon thật', () => {
  for (const name of ['PencilRuler', 'House', 'Grid2x2', 'ArrowRight']) {
    assert.equal(cms.lucideComponentName(cms.lucideIconKey(name)), name)
  }
})

test('collectIconKeys gom icon admin đã đặt trong mọi khối, không trùng, bỏ tên sai', () => {
  const sections = cms.indexHomeSections([
    {
      sectionKey: 'stats',
      content: { items: [{ icon: 'Camera' }, { icon: 'camera' }, { icon: 'x y' }, { value: '1' }] }
    },
    { sectionKey: 'services', content: { items: [{ icon: 'HardHat' }], title: 'Dịch vụ' } },
    { sectionKey: 'hero', content: { slides: ['không phải đối tượng'] } }
  ])
  assert.deepEqual(cms.collectIconKeys(sections).sort(), ['camera', 'hard-hat'])
  assert.deepEqual(cms.collectIconKeys(cms.EMPTY_HOME_SECTIONS), [])
})
