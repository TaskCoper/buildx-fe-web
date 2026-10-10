import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { once } from 'node:events'
import { constants } from 'node:fs'
import { cp, mkdtemp, readFile, rm } from 'node:fs/promises'
import { createServer } from 'node:http'
import { createServer as createPortReservation } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'

// Test the production output in an isolated cache with a read-only fixture API.
// Run after `pnpm build`; no source-pattern assertions or real backend writes.
const root = fileURLToPath(new URL('../', import.meta.url))
const secret = randomUUID()
const fixture = { home: 'ISR_HOME_A', footer: 'ISR_FOOTER_A', reads: [] }
let backend, instance, runtime, base
const htmlContent = (html) => html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
const post = (pageKey) =>
  fetch(`${base}/api/cms/revalidate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
    body: JSON.stringify({ pageKey, locale: 'vi' }),
    signal: AbortSignal.timeout(10000)
  })
const page = async (path, cookie) => {
  const response = await fetch(`${base}${path}`, {
    headers: cookie ? { Cookie: cookie } : {},
    redirect: 'manual',
    signal: AbortSignal.timeout(15000)
  })
  assert.equal(response.status, 200, path)
  return { response, html: htmlContent(await response.text()) }
}
const assertIsr = (response) => assert.match(response.headers.get('cache-control') ?? '', /s-maxage=60(?:,|$)/)

before(
  async () => {
    runtime = await mkdtemp(join(tmpdir(), 'buildx-rendering-test-'))
    await cp(join(root, '.next/standalone'), runtime, { recursive: true, mode: constants.COPYFILE_FICLONE })
    backend = createServer((request, response) => {
      const url = new URL(request.url, 'http://fixture.invalid')
      fixture.reads.push({ path: url.pathname, cookie: request.headers.cookie })
      response.setHeader('Content-Type', 'application/json')
      const value =
        url.pathname === '/api/v1/pages/home/sections'
          ? [{ sectionKey: 'hero', schemaVersion: 1, content: { titleLead: fixture.home } }]
          : url.pathname === '/api/v1/pages/footer/sections'
            ? [{ sectionKey: 'contact', schemaVersion: 1, content: { address: fixture.footer } }]
            : []
      response.end(JSON.stringify({ isSuccess: true, value }))
    })
    backend.listen(0, '127.0.0.1')
    await once(backend, 'listening')
    const reservation = createPortReservation()
    reservation.listen(0, '127.0.0.1')
    await once(reservation, 'listening')
    const port = reservation.address().port
    await new Promise((resolve) => reservation.close(resolve))
    base = `http://127.0.0.1:${port}`
    instance = spawn(process.execPath, ['server.js'], {
      cwd: runtime,
      env: {
        ...process.env,
        HOSTNAME: '127.0.0.1',
        PORT: String(port),
        BMT_API_ORIGIN: `http://127.0.0.1:${backend.address().port}`,
        CMS_REVALIDATION_SECRET: secret
      },
      stdio: ['ignore', 'pipe', 'pipe']
    })
    // Consume both streams; report exit status without dumping environment or secrets.
    instance.stdout.resume()
    instance.stderr.resume()
    for (let attempt = 0; attempt < 100; attempt++) {
      assert.equal(instance.exitCode, null, 'Next production instance exited before ready')
      try {
        const response = await fetch(`${base}/api/cms/revalidate`, { signal: AbortSignal.timeout(250) })
        if (response.status === 405) return
      } catch {
        /* Server has not bound its port yet. */
      }
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    assert.fail('Next production instance did not become ready')
  },
  { timeout: 30000 }
)

after(async () => {
  if (instance && instance.exitCode === null) {
    const exited = once(instance, 'exit')
    instance.kill('SIGTERM')
    await exited
  }
  if (backend) {
    backend.closeAllConnections()
    await new Promise((resolve) => backend.close(resolve))
  }
  if (runtime) await rm(runtime, { recursive: true, force: true })
})

test('production manifest caches the public pages and auth/checkout frames for 60 seconds', async () => {
  const manifest = JSON.parse(await readFile(join(root, '.next/prerender-manifest.json'), 'utf8'))
  for (const path of [
    '/vi',
    '/vi/contractors',
    '/vi/handbook',
    '/vi/plans',
    '/vi/plans/supervision',
    '/vi/forgot-password',
    '/vi/checkout/confirm'
  ]) {
    assert.equal(manifest.routes[path]?.initialRevalidateSeconds, 60, path)
  }
})

test('ISR serves cached home content until the CMS webhook expires it', async () => {
  assert.equal((await post('home')).status, 200)
  assert.equal((await post('footer')).status, 200)
  const first = await page('/vi')
  assertIsr(first.response)
  assert.ok(first.html.includes('ISR_HOME_A'))
  assert.ok(first.html.includes('ISR_FOOTER_A'))
  fixture.home = 'ISR_HOME_B'
  const cached = await page('/vi')
  assert.ok(cached.html.includes('ISR_HOME_A'))
  assert.ok(!cached.html.includes('ISR_HOME_B'))
  assert.equal(cached.response.headers.get('x-nextjs-cache'), 'HIT')
  assert.equal((await post('home')).status, 200)
  const refreshed = await page('/vi')
  assert.ok(refreshed.html.includes('ISR_HOME_B'))
  assert.ok(!refreshed.html.includes('ISR_HOME_A'))
})

test('footer invalidation updates other cached public pages as well as home', async () => {
  assert.ok((await page('/vi/plans')).html.includes('ISR_FOOTER_A'))
  fixture.footer = 'ISR_FOOTER_B'
  assert.equal((await post('footer')).status, 200)
  for (const path of ['/vi', '/vi/plans']) {
    assert.ok((await page(path)).html.includes('ISR_FOOTER_B'), path)
  }
})

test('supervision pricing retains its public HTML and cache for different project queries', async () => {
  const first = await page('/vi/plans/supervision?project=fixture-project-a')
  const second = await page('/vi/plans/supervision?project=fixture-project-b')
  for (const result of [first, second]) {
    assertIsr(result.response)
    assert.match(result.html, /<h1\b/)
    assert.match(result.html, /supervision-comparison/)
    assert.match(result.html, /data-tier="control"/)
    assert.ok(!result.html.includes('fixture-project-'))
  }
  assert.equal(first.response.headers.get('etag'), second.response.headers.get('etag'))
})

test('runtime-generated private frames are cached without fetching a session on the server', async () => {
  const path = `/vi/design/${randomUUID()}/dossier`
  const first = await page(path, 'bmt.auth=1; accessToken=fixture-a')
  const second = await page(path, 'bmt.auth=1; accessToken=fixture-b')
  assertIsr(first.response)
  assertIsr(second.response)
  assert.equal(second.response.headers.get('x-nextjs-cache'), 'HIT')
  assert.equal(first.response.headers.get('etag'), second.response.headers.get('etag'))
  assert.ok(!fixture.reads.some((read) => read.path === '/api/v1/users/me'))
  assert.ok(
    fixture.reads.every((read) => !read.cookie),
    'Public SSR fetches must not forward session cookies'
  )
})

test('admin returns a noindex loading frame without forms or user data before client authorization', async () => {
  const { html } = await page('/vi/admin/home-content', 'bmt.auth=1; accessToken=fixture-a')
  assert.match(html, /name="robots" content="noindex, nofollow"/)
  assert.match(html, /Đang tải/)
  assert.doesNotMatch(html, /<form\b|<input\b|<h1\b/)
  assert.ok(!fixture.reads.some((read) => read.path.startsWith('/api/v1/admin/')))
})

test('guests are redirected before reaching a private cached frame', async () => {
  const response = await fetch(`${base}/vi/admin/home-content`, { redirect: 'manual' })
  assert.equal(response.status, 307)
  const target = new URL(response.headers.get('location'), base)
  assert.equal(target.pathname, '/vi')
  assert.equal(target.searchParams.get('auth'), 'login')
  assert.equal(target.searchParams.get('redirect'), '/admin/home-content')
})
