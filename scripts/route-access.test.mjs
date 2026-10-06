import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import ts from 'typescript'

// Run the actual pure TypeScript policies with Node's built-in test runner.
// No React/HTTP environment or additional test dependencies are required.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const modules = new Map()
async function moduleUrl(path) {
  if (modules.has(path)) return modules.get(path)
  const source = await readFile(path, 'utf8')
  let js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
  }).outputText
  for (const match of [...js.matchAll(/from ['"]([^'"]+)['"]/g)]) {
    const url = await moduleUrl(resolve(dirname(path), `${match[1]}.ts`))
    js = js.replace(match[0], `from '${url}'`)
  }
  const url = `data:text/javascript;base64,${Buffer.from(js).toString('base64')}`
  modules.set(path, url)
  return url
}
const { canAccessAdminRoute, hasPermission, isProtectedPath, isCustomerRoute, loginDestination } = await import(
  await moduleUrl(resolve(root, 'src/shared/auth/route-access.ts'))
)

const staff = (permissions = [], roles = ['staff']) => ({
  id: 'staff-1',
  email: 'staff@example.test',
  name: 'Staff',
  accountKind: 'Staff',
  roles,
  permissions,
  emailVerified: true,
  mustChangePassword: false
})
const customer = { ...staff(), accountKind: 'Customer', roles: ['customer'] }

test('guests and customers cannot open admin, even with injected permissions', () => {
  assert.equal(canAccessAdminRoute(null, '/admin/orders'), false)
  assert.equal(canAccessAdminRoute({ ...customer, permissions: ['commerce.read'] }, '/admin/orders'), false)
})
test('a custom role opens exactly the sections granted by its effective permissions', () => {
  const reader = staff(['commerce.read', 'audit.read'])
  for (const route of ['/admin/orders', '/admin/customers/id', '/admin/transactions', '/admin/access-audit']) {
    assert.equal(canAccessAdminRoute(reader, route), true, route)
  }
  for (const route of ['/admin/roles', '/admin/staff', '/admin/payment-connections', '/admin/unknown']) {
    assert.equal(canAccessAdminRoute(reader, route), false, route)
  }
})
test('Admin has no bypass for permission-based endpoints', () => {
  const admin = staff([], ['staff', 'admin'])
  assert.equal(canAccessAdminRoute(admin, '/admin/roles'), false)
  assert.equal(canAccessAdminRoute(admin, '/admin/orders'), false)
  assert.equal(canAccessAdminRoute(admin, '/admin/contractors'), true)
  assert.equal(canAccessAdminRoute(staff(['role.manage']), '/admin/contractors'), false)
})
for (const [permission, route] of [
  ['role.manage', '/admin/roles'],
  ['user.manage', '/admin/staff'],
  ['assignment.manage', '/admin/assignments'],
  ['audit.read', '/admin/access-audit'],
  ['plan.manage', '/admin/plans'],
  ['library.manage', '/admin/templates'],
  ['news.manage', '/admin/articles'],
  ['guide.manage', '/admin/guide-videos'],
  ['payment.connection.manage', '/admin/payment-connections'],
  ['consultation.manage', '/admin/bookings'],
  ['estimate.catalog.manage', '/admin/building-types'],
  ['quotation-request.manage', '/admin/invitations']
]) {
  test(`${permission} opens ${route} without granting other sections`, () => {
    assert.equal(canAccessAdminRoute(staff([permission]), route), true)
    assert.equal(canAccessAdminRoute(staff([]), route), false)
  })
}
test('site browsing accepts either scope permission; commerce does not grant scope', () => {
  assert.equal(canAccessAdminRoute(staff(['assignment.manage']), '/admin/construction-sites'), true)
  assert.equal(canAccessAdminRoute(staff(['supervision.complete']), '/admin/construction-sites'), true)
  assert.equal(canAccessAdminRoute(staff(['commerce.read']), '/admin/construction-sites'), false)
})
test('read permission never grants mutation permissions', () => {
  for (const code of ['package.cancel', 'supervision.complete', 'supervision.unassign', 'role.manage']) {
    assert.equal(hasPermission(staff(['commerce.read']), code), false)
  }
})
test('restricted sessions and unavailable account types cannot open admin', () => {
  for (const overrides of [{ mustChangePassword: true }, { emailVerified: false }, { accountKind: null }]) {
    assert.equal(canAccessAdminRoute({ ...staff(['role.manage']), ...overrides }, '/admin/roles'), false)
  }
})
test('private contractor routes are protected; public landing and prefix lookalikes stay public', () => {
  for (const route of [
    '/contractors/project/profile',
    '/contractors/preview/matches',
    '/design/id/input',
    '/admin/roles',
    '/checkout/confirm'
  ]) {
    assert.equal(isProtectedPath(route), true, route)
  }
  for (const route of ['/contractors', '/share/token', '/administrator', '/accounting', '/guide']) {
    assert.equal(isProtectedPath(route), false, route)
  }
  assert.equal(isCustomerRoute('/admin/orders'), false)
})
test('login keeps allowed destinations and queries, and falls back by account type', () => {
  assert.equal(
    loginDestination(customer, '/vi/checkout/confirm?plan=p1&offer=Month'),
    '/checkout/confirm?plan=p1&offer=Month'
  )
  assert.equal(
    loginDestination(staff(['audit.read']), '/admin/access-audit?targetId=123'),
    '/admin/access-audit?targetId=123'
  )
  assert.equal(loginDestination(staff(['audit.read']), '/admin/orders'), '/admin')
  assert.equal(loginDestination(staff(['audit.read']), '/account/projects'), '/admin')
  assert.equal(loginDestination(customer, '/admin/roles'), '/')
  assert.equal(loginDestination(customer, '/forgot-password'), '/')
  assert.equal(loginDestination(customer, '/?auth=login&redirect=%2Faccount'), '/')
})
test('external, encoded, malformed and traversal return URLs cannot bypass route checks', () => {
  for (const path of [
    'https://evil.test',
    '//evil.test',
    '/\\evil.test',
    '/%2Fevil.test',
    '/%5cevil.test',
    '/%ZZ',
    '/\nevil.test',
    '/account/../admin/roles'
  ]) {
    assert.equal(loginDestination(customer, path), '/', path)
  }
  assert.equal(loginDestination(staff(['audit.read']), '/foo/../account'), '/admin')
})
