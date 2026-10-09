import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)
function load(path, overrides = {}) {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText
  const loadedModule = { exports: {} }
  new Function('require', 'module', 'exports', js)((name) => overrides[name] ?? require(name), loadedModule, loadedModule.exports)
  return loadedModule.exports
}

const cache = load('src/shared/cms/cms-cache.ts')
const effects = []
const route = load('src/app/api/cms/revalidate/route.ts', {
  '@/shared/cms/cms-cache': cache,
  'next/cache': {
    revalidateTag: (...args) => effects.push(['tag', ...args]),
    revalidatePath: (...args) => effects.push(['path', ...args])
  },
  'next/server': { NextResponse: { json: (body, options) => Response.json(body, options) } }
})

function request(body = { pageKey: 'home', locale: 'vi' }, headers = {}) {
  return new Request('http://localhost:3000/api/cms/revalidate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body)
  })
}

const webhook = { Authorization: 'Bearer fixture-secret' }
const session = { Cookie: 'accessToken=fixture-only', Origin: 'http://localhost:3000' }

async function run(t, operation) {
  const env = { ...process.env }
  const originalFetch = globalThis.fetch
  process.env.CMS_REVALIDATION_SECRET = 'fixture-secret'
  process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
  process.env.BMT_API_ORIGIN = 'https://fixture-api.invalid'
  effects.length = 0
  t.after(() => {
    process.env = env
    globalThis.fetch = originalFetch
  })
  await operation()
}

test('webhook hết hạn ngay đúng trang/ngôn ngữ, không hỏi backend và không cache phản hồi', async (t) =>
  run(t, async () => {
    globalThis.fetch = () => {
      throw new Error('Webhook must not query backend')
    }
    const response = await route.POST(request(undefined, webhook))
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('cache-control'), 'no-store')
    assert.deepEqual(await response.json(), { revalidated: true, pageKey: 'home', locale: 'vi', tags: ['cms:home:vi'] })
    assert.deepEqual(effects, [
      ['tag', 'cms:home:vi', { expire: 0 }],
      ['path', '/vi', 'page']
    ])
  }))

test('footer làm mới layout của ngôn ngữ tương ứng; trang khác không bị gắn tag footer', async (t) =>
  run(t, async () => {
    const response = await route.POST(request({ pageKey: 'footer', locale: 'en' }, webhook))
    assert.equal(response.status, 200)
    assert.deepEqual(effects, [
      ['tag', 'cms:footer:en', { expire: 0 }],
      ['path', '/en', 'layout']
    ])
  }))

test('all/all phủ đủ tám tag CMS và đường dẫn home/footer/contractors/handbook', async (t) =>
  run(t, async () => {
    const response = await route.POST(request({ pageKey: 'all', locale: 'all' }, webhook))
    assert.equal(response.status, 200)
    assert.deepEqual(
      effects
        .filter(([kind]) => kind === 'tag')
        .map(([, tag]) => tag)
        .sort(),
      [
        'cms:contractors:en',
        'cms:contractors:vi',
        'cms:footer:en',
        'cms:footer:vi',
        'cms:handbook:en',
        'cms:handbook:vi',
        'cms:home:en',
        'cms:home:vi'
      ]
    )
    assert.ok(effects.some(([kind, path, type]) => kind === 'path' && path === '/vi/contractors' && type === 'page'))
    assert.ok(effects.some(([kind, path, type]) => kind === 'path' && path === '/en/handbook' && type === 'page'))
  }))

for (const [name, headers, status] of [
  ['khách chưa đăng nhập', {}, 401],
  ['secret sai dù có cookie', { ...session, Authorization: 'Bearer wrong' }, 401],
  ['cookie khác origin', { ...session, Origin: 'https://untrusted.invalid' }, 403],
  ['cookie thiếu origin', { Cookie: session.Cookie }, 403]
]) {
  test(`từ chối ${name} trước khi xoá cache`, async (t) =>
    run(t, async () => {
      globalThis.fetch = () => {
        throw new Error('Must reject before backend')
      }
      assert.equal((await route.POST(request(undefined, headers))).status, status)
      assert.deepEqual(effects, [])
    }))
}

test('chưa cấu hình secret không chấp nhận Bearer', async (t) =>
  run(t, async () => {
    delete process.env.CMS_REVALIDATION_SECRET
    assert.equal((await route.POST(request(undefined, webhook))).status, 401)
    assert.deepEqual(effects, [])
  }))

for (const body of [
  null,
  {},
  { pageKey: 'home' },
  { pageKey: '/admin', locale: 'vi' },
  { pageKey: 'home', locale: 'fr' },
  { pageKey: 'home', locale: 'vi', path: '/' },
  '{invalid'
]) {
  test(`từ chối target sai: ${JSON.stringify(body)}`, async (t) =>
    run(t, async () => {
      assert.equal((await route.POST(request(body, webhook))).status, 400)
      assert.deepEqual(effects, [])
    }))
}

test('không nhận form/text body', async (t) =>
  run(t, async () => {
    assert.equal((await route.POST(request(undefined, { ...webhook, 'Content-Type': 'text/plain' }))).status, 400)
    assert.deepEqual(effects, [])
  }))

test('admin dùng cookie: backend kiểm quyền news.manage bằng request không cache', async (t) =>
  run(t, async () => {
    const calls = []
    globalThis.fetch = async (...args) => {
      calls.push(args)
      return Response.json({ isSuccess: true, value: [] })
    }
    assert.equal((await route.POST(request({ pageKey: 'contractors', locale: 'vi' }, session))).status, 200)
    assert.equal(calls.length, 1)
    assert.equal(calls[0][0], 'https://fixture-api.invalid/api/v1/admin/pages/contractors/sections?locale=vi')
    assert.equal(calls[0][1].headers.Cookie, session.Cookie)
    assert.equal(calls[0][1].cache, 'no-store')
    assert.equal(calls[0][1].redirect, 'error')
    assert.deepEqual(effects[0], ['tag', 'cms:contractors:vi', { expire: 0 }])
  }))

for (const [name, result, expected] of [
  ['hết phiên', () => new Response(null, { status: 401 }), 401],
  ['không có quyền', () => new Response(null, { status: 403 }), 403],
  ['backend lỗi', () => new Response(null, { status: 500 }), 503],
  ['Result thất bại', () => Response.json({ isSuccess: false, value: [] }), 503],
  ['phản hồi sai hình dạng', () => Response.json({ isSuccess: true }), 503],
  [
    'lỗi kết nối',
    () => {
      throw new Error('offline')
    },
    503
  ]
]) {
  test(`không xoá cache khi kiểm quyền ${name}`, async (t) =>
    run(t, async () => {
      globalThis.fetch = async () => result()
      assert.equal((await route.POST(request(undefined, session))).status, expected)
      assert.deepEqual(effects, [])
    }))
}

test('fetch công khai giữ TTL 60 giây và gắn đúng tag riêng cho page/locale', async (t) =>
  run(t, async () => {
    process.env.NEXT_PUBLIC_USE_MOCK_API = 'false'
    const sections = load('src/shared/cms/home-sections.ts')
    const server = load('src/shared/cms/page-sections.server.ts', { './cms-cache': cache, './home-sections': sections })
    const calls = []
    globalThis.fetch = async (...args) => {
      calls.push(args)
      return Response.json({ isSuccess: true, value: [{ sectionKey: 'hero', content: { title: 'New' } }] })
    }
    assert.deepEqual(await server.fetchPageSections('home', 'vi'), { hero: { title: 'New' } })
    await server.fetchPageSections('footer', 'en')
    assert.deepEqual(calls[0][1].next, { revalidate: 60, tags: ['cms:home:vi'] })
    assert.deepEqual(calls[1][1].next, { revalidate: 60, tags: ['cms:footer:en'] })
  }))
