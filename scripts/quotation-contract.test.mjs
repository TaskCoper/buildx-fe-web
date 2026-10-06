import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import ts from 'typescript'

const source = await readFile(new URL('../src/shared/quotations/quotation.types.ts', import.meta.url), 'utf8')
const js = ts
  .transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } })
  .outputText.replace("from 'zod'", `from '${import.meta.resolve('zod')}'`)
const { quotationAdminDetailSchema } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)
const detail = JSON.parse(await readFile(new URL('./fixtures/quotation-admin-detail.json', import.meta.url), 'utf8'))

test('admin detail accepts the fixed .NET GUID of the bootstrap admin updater', () => {
  // SeedIds.BootstrapAdminUserId; a valid .NET Guid without an RFC UUID variant.
  const parsed = quotationAdminDetailSchema.parse(detail)
  assert.equal(parsed.updatedBy, '00000000-0000-0000-0000-0000000000f1')
  assert.equal(parsed.request.request.status, 'Completed')
  assert.deepEqual(parsed.request.snapshot, detail.request.snapshot)
})

test('admin detail accepts nullable updater before staff processing', () => {
  assert.equal(quotationAdminDetailSchema.parse({ ...detail, updatedBy: null }).updatedBy, null)
})

test('user references accept both fixed .NET GUIDs and generated UUIDs', () => {
  for (const userId of ['00000000-0000-0000-0000-0000000000f1', '3205832b-f9c2-40bb-9f05-d46a764e36c3']) {
    assert.equal(
      quotationAdminDetailSchema.parse({ ...detail, customerId: userId, updatedBy: userId }).customerId,
      userId
    )
  }
})

test('malformed user IDs still fail validation at the affected field', () => {
  for (const field of ['customerId', 'updatedBy']) {
    const result = quotationAdminDetailSchema.safeParse({ ...detail, [field]: 'invalid-user-id' })
    assert.equal(result.success, false)
    assert.deepEqual(result.error.issues[0].path, [field])
  }
})

test('required user references and unknown quotation states remain rejected', () => {
  assert.equal(quotationAdminDetailSchema.safeParse({ ...detail, customerId: null }).success, false)
  const invalid = structuredClone(detail)
  invalid.request.request.status = 'Canceled'
  assert.equal(quotationAdminDetailSchema.safeParse(invalid).success, false)
})
