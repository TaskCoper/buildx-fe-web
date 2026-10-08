import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
import { test } from 'node:test'
import ts from 'typescript'

/**
 * Chế độ dựng trang của hai nửa ứng dụng, giữ cho không ai vô tình làm hỏng:
 * - Site của khách (mọi route ngoài `(admin)`): dựng sẵn và làm mới theo chu kỳ (ISR). Một trang đọc `searchParams`,
 *   `cookies()`, `headers()`... ở server là thành trang động, không còn được lưu đệm.
 * - Khu quản trị `(admin)`: chỉ chạy ở trình duyệt (CSR), không dựng HTML ở server.
 * - Webhook `/api/revalidate` để backend làm mới trang ngay khi admin sửa nội dung.
 *
 * Kiểm bằng cách đọc mã nguồn (nhanh, chạy trong CI); việc dựng thật được kiểm bằng `next build` ở bước build.
 */
const APP = new URL('../src/app/[locale]/', import.meta.url)
const appPath = (...parts) => join(APP.pathname.replace(/^\/([A-Za-z]:)/, '$1'), ...parts)

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(
    entries.map((entry) => (entry.isDirectory() ? walk(join(directory, entry.name)) : [join(directory, entry.name)]))
  )
  return files.flat()
}

const stripComments = (code) =>
  code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, (_, before) => before)

const root = decodeURIComponent(appPath())
const all = await walk(root)
const rel = (file) => relative(root, file).split(sep).join('/')

/** Trang và layout của khách: mọi `page.tsx` và `layout.tsx` ngoài nhóm `(admin)`. */
const customerFiles = all.filter(
  (file) => /(^|\/)(page|layout)\.tsx$/.test(rel(file)) && !rel(file).startsWith('(admin)/')
)
const customerPages = customerFiles.filter((file) => rel(file).endsWith('page.tsx'))

const source = async (file) => stripComments(await readFile(file, 'utf8'))

test('đủ trang của khách để kiểm (không quét nhầm thư mục rỗng)', () => {
  assert.ok(customerPages.length > 30, `chỉ thấy ${customerPages.length} trang`)
  assert.ok(customerFiles.some((file) => rel(file) === '(main)/layout.tsx'))
})

test('site của khách: không trang hay layout nào dùng API động của server', async () => {
  const forbidden = [
    [/\bsearchParams\b/, 'đọc searchParams ở server (đọc bằng useSearchParams ở client trong Suspense)'],
    [/from\s+['"]next\/headers['"]/, 'cookies()/headers()/draftMode()'],
    [/\bunstable_noStore\b/, 'unstable_noStore'],
    [/\bconnection\s*\(/, 'connection()'],
    [/export\s+const\s+dynamic\b/, 'export const dynamic'],
    [/cache\s*:\s*['"]no-store['"]/, "fetch cache: 'no-store'"]
  ]
  const problems = []
  for (const file of customerFiles) {
    const code = await source(file)
    for (const [pattern, label] of forbidden) {
      if (pattern.test(code)) problems.push(`${rel(file)}: ${label}`)
    }
  }
  assert.deepEqual(problems, [])
})

test('site của khách: layout dùng Link của next-intl ở server phải tự gọi setRequestLocale', async () => {
  // `Link` dựng ở server hỏi ngôn ngữ của request; layout con chạy trước khi trang đặt ngôn ngữ, nên thiếu bước này thì
  // next-intl đọc headers() và cả nhóm trang thành động (từng làm /forgot-password mất ISR).
  const problems = []
  for (const file of customerFiles.filter((item) => rel(item).endsWith('layout.tsx'))) {
    const code = await source(file)
    const serverComponent = !/^\s*['"]use client['"]/.test(await readFile(file, 'utf8'))
    if (serverComponent && /from\s+['"]@\/i18n\/navigation['"]/.test(code) && !/\bsetRequestLocale\s*\(/.test(code)) {
      problems.push(rel(file))
    }
  }
  assert.deepEqual(problems, [])
})

test('site của khách: trang có đoạn đường dẫn động đều có generateStaticParams (ISR theo yêu cầu)', async () => {
  const missing = []
  for (const file of customerPages) {
    const path = rel(file)
    // Bỏ qua [locale] (layout gốc đã khai báo) và catch-all 404, vốn cố ý để động để không lưu đệm vô hạn đường dẫn lạ.
    const dynamicSegments = (path.match(/\[[^\]]+\]/g) ?? []).filter((segment) => segment !== '[...rest]')
    if (dynamicSegments.length === 0) continue
    if (!/export\s+(async\s+)?function\s+generateStaticParams\b/.test(await source(file))) missing.push(path)
  }
  assert.deepEqual(missing, [])
})

test('site của khách: mỗi cụm trang khai báo revalidate là số viết thẳng', async () => {
  // Layout của ba nhóm phủ mọi trang bên trong; các trang đứng ngoài nhóm tự khai báo.
  const entries = [
    '(main)/layout.tsx',
    '(auth)/layout.tsx',
    '(checkout)/layout.tsx',
    ...customerPages.map(rel).filter((path) => !/^\((main|auth|checkout)\)\//.test(path))
  ]
  const problems = []
  for (const entry of entries) {
    const code = await source(join(root, entry))
    const match = code.match(/export\s+const\s+revalidate\s*=\s*(\d+)\s*$/m)
    if (!match) problems.push(`${entry}: thiếu "export const revalidate = <số>"`)
    else if (Number(match[1]) <= 0) problems.push(`${entry}: revalidate phải > 0`)
  }
  assert.deepEqual(problems, [])
})

test('khu quản trị là CSR: layout không dựng bộ khung ở server, bộ khung nạp bằng dynamic ssr:false', async () => {
  const layout = await source(join(root, '(admin)/layout.tsx'))
  assert.match(layout, /AdminClientRoot/)
  for (const heavy of ['antd', '@/shared/providers', '@/features/admin', 'ProtectedRoute', 'AdminShell']) {
    assert.ok(!layout.includes(heavy), `layout admin không được kéo ${heavy} vào phần server`)
  }

  const clientRoot = await readFile(join(root, '(admin)/admin-client-root.tsx'), 'utf8')
  assert.match(clientRoot, /^'use client'/, 'ssr:false chỉ dùng được trong client component')
  assert.match(clientRoot, /dynamic\(/)
  assert.match(clientRoot, /ssr:\s*false/)

  const app = await readFile(join(root, '(admin)/admin-app.tsx'), 'utf8')
  for (const piece of ['AntdProvider', 'ProtectedRoute', 'AdminGuard', 'AdminShell']) {
    assert.ok(app.includes(piece), `admin-app thiếu ${piece}`)
  }
})

test('trang admin không tự lấy dữ liệu ở server', async () => {
  const adminPages = all.filter((file) => rel(file).startsWith('(admin)/') && rel(file).endsWith('page.tsx'))
  assert.ok(adminPages.length > 30)
  const problems = []
  for (const file of adminPages) {
    const code = await source(file)
    if (/\bfetch\s*\(/.test(code) || /from\s+['"]next\/headers['"]/.test(code)) problems.push(rel(file))
  }
  assert.deepEqual(problems, [])
})

// ---- Webhook làm mới theo yêu cầu

const revalidationJs = ts.transpileModule(
  await readFile(new URL('../src/shared/cms/revalidation.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }
).outputText
const revalidation = await import(`data:text/javascript;base64,${Buffer.from(revalidationJs).toString('base64')}`)

test('thẻ làm mới của khối chữ khớp backend', async () => {
  assert.equal(revalidation.pageSectionsTag('home'), 'page-sections:home')
  assert.equal(revalidation.REVALIDATE_SECRET_HEADER, 'x-revalidate-secret')

  const be = await readFile(
    new URL('../../../bmt-be/src/bmt-be.infrastructure/web/FrontendRevalidator.cs', import.meta.url),
    'utf8'
  ).catch(() => null)
  if (!be) return // không có bmt-be cạnh frontend (CI riêng của frontend)

  assert.match(be, /PageSectionsTag\(string pageKey\)\s*=>\s*\$"page-sections:\{pageKey\}"/, 'thẻ phía backend')
  assert.match(be, /SecretHeader\s*=\s*"x-revalidate-secret"/, 'tên header phía backend')
  assert.match(be, /Endpoint\s*=\s*"api\/revalidate"/, 'đường dẫn webhook phía backend')
})

test('parseRevalidationBody nhận thẻ và đường dẫn đúng khuôn, bỏ trùng', () => {
  const parsed = revalidation.parseRevalidationBody({
    tags: ['page-sections:home', 'page-sections:home', 'page-sections:footer'],
    paths: ['/vi/contractors', '/en/handbook/bai-viet/[slug]']
  })
  assert.equal(parsed.ok, true)
  assert.deepEqual(parsed.value.tags, ['page-sections:home', 'page-sections:footer'])
  assert.deepEqual(parsed.value.paths, ['/vi/contractors', '/en/handbook/bai-viet/[slug]'])

  assert.deepEqual(revalidation.parseRevalidationBody({ tags: ['page-sections:home'] }).value, {
    tags: ['page-sections:home'],
    paths: []
  })
})

test('parseRevalidationBody từ chối nội dung sai', () => {
  const bad = [
    null,
    'chuoi',
    [],
    {},
    { tags: [], paths: [] },
    { tags: 'page-sections:home' },
    { tags: [1] },
    { tags: ['co khoang trang'] },
    { tags: ['<script>'] },
    { tags: [''] },
    { tags: ['a'.repeat(65)] },
    { paths: ['vi/khong-co-gach-dau'] },
    { paths: ['/vi/../admin'] },
    { paths: ['//evil.example.com'] },
    { paths: ['/vi/a?b=1'] },
    { paths: ['/vi/a b'] },
    { tags: Array.from({ length: 21 }, (_, i) => `t${i}`) }
  ]
  for (const body of bad) {
    assert.equal(revalidation.parseRevalidationBody(body).ok, false, `phải từ chối: ${JSON.stringify(body)}`)
  }
})

test('route /api/revalidate: chỉ POST, kiểm khóa bằng so sánh thời gian không đổi, tắt khi chưa đặt khóa', async () => {
  const route = await readFile(new URL('../src/app/api/revalidate/route.ts', import.meta.url), 'utf8')
  assert.match(route, /export\s+async\s+function\s+POST\b/)
  assert.ok(!/export\s+async\s+function\s+GET\b/.test(route), 'không cho GET làm mới')
  assert.match(route, /process\.env\.REVALIDATE_SECRET/)
  assert.match(route, /timingSafeEqual/)
  assert.match(route, /status:\s*503/, 'chưa đặt khóa thì tắt webhook')
  assert.match(route, /status:\s*401/, 'khóa sai trả 401')
  assert.match(route, /revalidateTag\(tag,\s*\{\s*expire:\s*0\s*\}\)/)
})

test('lời gọi lấy khối chữ ở server gắn thẻ để webhook làm mới được', async () => {
  const server = await readFile(new URL('../src/shared/cms/page-sections.server.ts', import.meta.url), 'utf8')
  assert.match(server, /tags:\s*\[pageSectionsTag\(pageKey\)\]/)
  assert.match(server, /revalidate:\s*REVALIDATE_SECONDS/)
})
