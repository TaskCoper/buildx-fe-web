import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import ts from 'typescript'

const directory = new URL('../src/shared/lib/', import.meta.url)
const modules = new Map()
async function load(name) {
  if (modules.has(name)) return modules.get(name)
  let js = ts.transpileModule(await readFile(new URL(`${name}.ts`, directory), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
  }).outputText
  for (const match of [...js.matchAll(/from ['"]\.\/([^'"]+)['"]/g)]) {
    js = js.replace(match[0], `from '${await load(match[1])}'`)
  }
  const url = `data:text/javascript;base64,${Buffer.from(js).toString('base64')}`
  modules.set(name, url)
  return url
}
const { collectImageUrls } = await import(await load('image-urls'))

test('gom ảnh https của host đã khai báo ở mọi độ sâu của JSON, không trùng', () => {
  const urls = collectImageUrls({
    items: [
      {
        cover: 'https://bmt-cdn-vnzdna.cdn.vccloud.vn/news/a.webp',
        gallery: ['https://bmt-cdn-vnzdna.cdn.vccloud.vn/news/b.png']
      },
      { cover: 'https://bmt-cdn-vnzdna.cdn.vccloud.vn/news/a.webp' }
    ],
    deep: { x: { y: [{ thumb: 'https://x.ss.bfcplatform.vn/files/c.jpeg?v=2' }] } }
  })
  assert.deepEqual([...urls].sort(), [
    'https://bmt-cdn-vnzdna.cdn.vccloud.vn/news/a.webp',
    'https://bmt-cdn-vnzdna.cdn.vccloud.vn/news/b.png',
    'https://x.ss.bfcplatform.vn/files/c.jpeg?v=2'
  ])
})

test('bỏ qua host lạ, http thường, đường dẫn trong public, tệp không phải ảnh và giá trị không phải chuỗi', () => {
  const urls = collectImageUrls({
    a: 'https://evil.example.test/a.webp',
    b: 'http://bmt-cdn-vnzdna.cdn.vccloud.vn/b.webp',
    c: '/images/c.avif',
    d: 'https://bmt-cdn-vnzdna.cdn.vccloud.vn/doc.pdf',
    e: 123,
    f: null,
    g: ['https://bmt-cdn-vnzdna.cdn.vccloud.vn/x.dwg']
  })
  assert.equal(urls.size, 0)
})
