import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import sharp from 'sharp'
import ts from 'typescript'

const directory = new URL('../src/shared/media/', import.meta.url)
const modules = new Map()
async function load(name) {
  if (modules.has(name)) return modules.get(name)
  let js = ts.transpileModule(await readFile(new URL(`${name}.ts`, directory), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
  }).outputText
  for (const match of [...js.matchAll(/from ['"]\.\/([^'"]+)['"]/g)]) {
    js = js.replace(match[0], `from '${await load(match[1])}'`)
  }
  js = js.replace("from 'sharp'", `from '${import.meta.resolve('sharp')}'`)
  const url = `data:text/javascript;base64,${Buffer.from(js).toString('base64')}`
  modules.set(name, url)
  return url
}
const { createLibraryImageHandler } = await import(await load('library-image.server'))
const versionId = '722c1db2-9d70-46cf-8696-0a0d2c596908'
const assetId = '59b5bce4-1f56-434e-9855-ee7877af2c03'
const context = { params: Promise.resolve({ versionId, assetId }) }
const request = (query = 'w=640', cookie = 'allowed', accept = 'image/webp') =>
  new Request(`https://app.example.test/api/media/library/${versionId}/${assetId}?${query}`, {
    headers: { ...(cookie ? { Cookie: cookie } : {}), Accept: accept }
  })
const picture = await sharp({ create: { width: 1000, height: 1500, channels: 3, background: '#ffffff' } })
  .png()
  .toBuffer()
const source = () => new Response(picture, { headers: { 'Content-Type': 'image/png' } })
// Các test chuyển định dạng/cỡ dùng ảnh trắng nhỏ, nên tắt chế độ trả nguyên file của nguồn nhỏ (có test riêng bên dưới).
const handler = (fetchSource) =>
  createLibraryImageHandler({ apiOrigin: 'https://api.example.test', fetchSource, passThroughMaxBytes: 0 })
const defaultHandler = (fetchSource) =>
  createLibraryImageHandler({ apiOrigin: 'https://api.example.test', fetchSource })
function privateResponse(response, status) {
  assert.equal(response.status, status)
  assert.equal(response.headers.get('cache-control'), 'private, no-store')
  assert.equal(response.headers.get('vary'), 'Cookie, Accept')
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
}

test('each new read checks its own session and converts to the requested format and width', async () => {
  const calls = []
  const run = handler(async (url, options) => {
    calls.push({ url: String(url), options })
    return options.headers.Cookie === 'allowed' ? source() : new Response(null, { status: 403 })
  })
  for (const accept of ['image/webp', 'image/avif,image/webp']) {
    const response = await run(request('w=640', 'allowed', accept), context)
    privateResponse(response, 200)
    const metadata = await sharp(Buffer.from(await response.arrayBuffer())).metadata()
    assert.equal(metadata.width, 640)
    assert.equal(metadata.format, 'webp')
    assert.match(response.headers.get('server-timing') ?? '', /^source;dur=\d+, encode;dur=\d+$/)
  }
  privateResponse(await run(request('w=640', 'denied'), context), 403)
  assert.equal(calls.length, 3)
  // Trình duyệt nhận WebP thì route xin backend bản nhỏ đúng cỡ (`?w=`); backend cũ bỏ qua tham số này và trả file gốc nên vẫn chạy.
  assert.equal(
    calls[0].url,
    `https://api.example.test/api/v1/library-versions/${versionId}/assets/${assetId}/content?w=640`
  )
  assert.equal(calls[0].options.cache, 'no-store')
  assert.equal(calls[0].options.redirect, 'error')
})

test('overlapping reads share only for the same source, width and exact session; later reads recheck', async () => {
  let release
  const gate = new Promise((resolve) => {
    release = resolve
  })
  const reads = []
  const run = handler(async (url, options) => {
    reads.push([new URL(String(url)).search, options.headers.Cookie])
    await gate
    return options.headers.Cookie === 'allowed' ? source() : new Response(null, { status: 403 })
  })
  const large = run(request('w=960'), context)
  const small = run(request('w=640'), context)
  const twin = run(request('w=640'), context)
  const other = run(request('w=640', 'other'), context)
  await new Promise((resolve) => setImmediate(resolve))
  // Mỗi cỡ là một bản nhỏ khác nhau ở backend nên không dùng chung; chỉ yêu cầu y hệt (cùng cỡ, cùng phiên) mới dùng chung một lần đọc.
  assert.deepEqual(reads, [
    ['?w=960', 'allowed'],
    ['?w=640', 'allowed'],
    ['?w=640', 'other']
  ])
  release()
  const responses = await Promise.all([large, small, twin, other])
  assert.deepEqual(
    responses.map((response) => response.status),
    [200, 200, 200, 403]
  )
  assert.equal((await sharp(Buffer.from(await responses[0].arrayBuffer())).metadata()).width, 960)
  assert.equal((await sharp(Buffer.from(await responses[1].arrayBuffer())).metadata()).width, 640)
  privateResponse(await run(request(), context), 200)
  assert.equal(reads.length, 4)
})

test('bad IDs, duplicate or unexpected query fields, and missing sessions never call the backend', async () => {
  const run = handler(() => assert.fail('must not fetch'))
  for (const query of ['w=999', 'w=640&w=960', 'w=640&src=https://evil.test', 'w=640&q=90', '']) {
    privateResponse(await run(request(query), context), 400)
  }
  privateResponse(await run(request(), { params: Promise.resolve({ versionId: '../x', assetId }) }), 400)
  privateResponse(await run(request('w=640', ''), context), 401)
})

test('backend errors and timeouts keep private headers and never leak the source body', async () => {
  for (const status of [401, 403, 404, 429, 503]) {
    const response = await handler(async () => new Response('private error', { status }))(request(), context)
    privateResponse(response, status)
    assert.equal(await response.text(), '')
  }
  privateResponse(
    await handler(async () => {
      throw new DOMException('timeout', 'TimeoutError')
    })(request(), context),
    504
  )
})

test('rejects incorrect content types, disguised SVG and oversized chunked files', async () => {
  privateResponse(
    await handler(async () => new Response('PDF', { headers: { 'Content-Type': 'application/pdf' } }))(
      request(),
      context
    ),
    415
  )
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1"/></svg>'
  privateResponse(
    await handler(async () => new Response(svg, { headers: { 'Content-Type': 'image/png' } }))(request(), context),
    415
  )
  let cancelled = false
  const body = new ReadableStream({
    pull(controller) {
      controller.enqueue(new Uint8Array(1024 * 1024))
    },
    cancel() {
      cancelled = true
    }
  })
  privateResponse(
    await handler(async () => new Response(body, { headers: { 'Content-Type': 'image/png' } }))(request(), context),
    413
  )
  assert.equal(cancelled, true)
})

test('unsupported browser formats keep original bytes after authorization and never ask for a variant', async () => {
  const urls = []
  const response = await handler(async (url) => {
    urls.push(String(url))
    return source()
  })(request('w=640', 'allowed', 'image/png'), context)
  privateResponse(response, 200)
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), picture)
  // Bản nhỏ luôn là WebP nên trình duyệt không nhận WebP phải xin file gốc, không kèm `w`.
  assert.deepEqual(urls, [`https://api.example.test/api/v1/library-versions/${versionId}/assets/${assetId}/content`])
})

const webpPicture = await sharp({ create: { width: 640, height: 960, channels: 3, background: '#22aa66' } })
  .webp()
  .toBuffer()
const variant = (width = '640', extra = {}) =>
  new Response(webpPicture, {
    headers: { 'Content-Type': 'image/webp', 'X-Library-Image-Width': width, ...extra }
  })

test('a backend-made variant is forwarded byte for byte after the backend authorised it, with no decoding or encoding', async () => {
  const urls = []
  const run = handler(async (url, options) => {
    urls.push(String(url))
    return options.headers.Cookie === 'allowed' ? variant() : new Response(null, { status: 403 })
  })
  const response = await run(request('w=640', 'allowed', 'image/avif,image/webp'), context)
  privateResponse(response, 200)
  assert.equal(response.headers.get('content-type'), 'image/webp')
  assert.equal(response.headers.get('content-length'), String(webpPicture.length))
  // Chỉ có phần đọc nguồn, không có phần mã hoá: khẳng định route không đụng tới sharp.
  assert.match(response.headers.get('server-timing') ?? '', /^source;dur=\d+$/)
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), webpPicture)
  assert.deepEqual(urls, [
    `https://api.example.test/api/v1/library-versions/${versionId}/assets/${assetId}/content?w=640`
  ])
  // Bản nhỏ vẫn phải qua kiểm quyền của backend mỗi lần; không có cache hay đường tắt.
  privateResponse(await run(request('w=640', 'denied'), context), 403)
  privateResponse(await run(request('w=640', 'allowed'), context), 200)
  assert.equal(urls.length, 3)
})

test('a variant marker is trusted only when it is a sane width on real WebP bytes', async () => {
  // Header báo bản nhỏ nhưng nội dung là PNG, hoặc kiểu khai là PNG, hoặc cỡ vô lý: coi như file gốc và đi đường mã hoá cũ.
  const cases = [
    () => new Response(picture, { headers: { 'Content-Type': 'image/webp', 'X-Library-Image-Width': '640' } }),
    () => new Response(picture, { headers: { 'Content-Type': 'image/png', 'X-Library-Image-Width': '640' } }),
    () => variant('0'),
    () => variant('-5'),
    () => variant('1e3'),
    () => variant('0640'),
    () => variant('123456'),
    () => variant('abc')
  ]
  for (const make of cases) {
    const response = await handler(async () => make())(request('w=640'), context)
    privateResponse(response, 200)
    assert.match(response.headers.get('server-timing') ?? '', /encode;dur=\d+$/, 'must take the full re-encode path')
  }
})

test('without a marker the backend sent the original, so the route resizes it itself (backend without variants)', async () => {
  const response = await handler(async () => source())(request('w=640'), context)
  privateResponse(response, 200)
  assert.equal((await sharp(Buffer.from(await response.arrayBuffer())).metadata()).width, 640)
})

test('small sources are returned untouched after authorization; wide ones are still resized', async () => {
  const run = defaultHandler(async (_url, options) =>
    options.headers.Cookie === 'allowed' ? source() : new Response(null, { status: 403 })
  )
  // Ảnh trắng 1000px, vài KB, w=960: nhỏ và không rộng quá 1,5 lần cỡ xin → trả nguyên file, không mã hoá lại.
  const small = await run(request('w=960', 'allowed', 'image/avif,image/webp'), context)
  privateResponse(small, 200)
  assert.equal(small.headers.get('content-type'), 'image/png')
  assert.equal(small.headers.get('content-length'), String(picture.length))
  assert.deepEqual(Buffer.from(await small.arrayBuffer()), picture)
  // Trả nguyên vẫn phải qua kiểm quyền của backend.
  privateResponse(await run(request('w=960', 'denied', 'image/avif,image/webp'), context), 403)
  // Ảnh rộng hơn 1,5 lần cỡ xin (1000px so với 640) vẫn được đổi cỡ.
  const resized = await run(request('w=640', 'allowed', 'image/avif,image/webp'), context)
  privateResponse(resized, 200)
  const metadata = await sharp(Buffer.from(await resized.arrayBuffer())).metadata()
  assert.equal(metadata.width, 640)
  assert.equal(metadata.format, 'webp')
})

test('a large source is still converted when pass-through is on', async () => {
  const noise = randomBytes(1200 * 1200 * 3) // nhiễu thật nên PNG không nén được, chắc chắn lớn hơn ngưỡng
  const large = await sharp(noise, { raw: { width: 1200, height: 1200, channels: 3 } })
    .png()
    .toBuffer()
  assert.ok(large.length > 300_000)
  const run = defaultHandler(async () => new Response(large, { headers: { 'Content-Type': 'image/png' } }))
  const response = await run(request('w=1280', 'allowed', 'image/avif,image/webp'), context)
  privateResponse(response, 200)
  assert.equal(response.headers.get('content-type'), 'image/webp')
  assert.ok(Number(response.headers.get('content-length')) < large.length)
})
