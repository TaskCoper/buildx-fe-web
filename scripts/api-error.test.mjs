import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import ts from 'typescript'

// Chạy logic thuần chọn câu báo lỗi bằng test runner có sẵn của Node, cùng cách với route-access.test.mjs.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = await readFile(resolve(root, 'src/shared/lib/api/api-error-message.logic.ts'), 'utf8')
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
}).outputText
const { errorCodeOf, hasVietnamese, localizeApiError, statusKeyOf } = await import(
  `data:text/javascript;base64,${Buffer.from(js).toString('base64')}`
)

const messages = {
  vi: JSON.parse(await readFile(resolve(root, 'messages/vi.json'), 'utf8')).apiErrors,
  en: JSON.parse(await readFile(resolve(root, 'messages/en.json'), 'utf8')).apiErrors
}

/** Trình dịch dựng từ chính messages thật, đúng cách `ApiErrorTranslatorBridge` tra khoá. */
const translatorOf = (locale) => ({
  locale,
  text: (key) => key.split('.').reduce((node, part) => node?.[part], messages[locale]) ?? null
})

const unauthorized = {
  status: 401,
  code: 'Unauthorized',
  messageCode: 'MissingAccessToken',
  serverMessage: 'The access token cookie is missing.'
}

test('tiếng Việt: câu BE đã viết tiếng Việt được giữ nguyên vì cụ thể nhất', () => {
  const facts = {
    status: 404,
    code: 'NotFound',
    messageCode: 'ConstructionSiteNotFound',
    serverMessage: 'Không thấy công trình này.'
  }
  assert.equal(localizeApiError(facts, translatorOf('vi')), 'Không thấy công trình này.')
})

test('tiếng Việt: câu BE tiếng Anh kỹ thuật được thay bằng câu theo messageCode', () => {
  assert.equal(
    localizeApiError(unauthorized, translatorOf('vi')),
    'Bạn chưa đăng nhập hoặc phiên đã hết hạn. Vui lòng đăng nhập lại.'
  )
})

test('tiếng Anh: không bao giờ hiện câu tiếng Việt của BE', () => {
  const facts = {
    status: 409,
    code: 'Conflict',
    messageCode: 'ConstructionSiteHasSupervision',
    serverMessage: 'Công trình đang có gói giám sát nên không sửa được.'
  }
  const text = localizeApiError(facts, translatorOf('en'))
  assert.equal(hasVietnamese(text), false)
  assert.match(text, /supervision package/)
})

test('mã lạ rơi về câu theo status, không phải câu chung chung tiếng Anh', () => {
  const facts = { status: 409, messageCode: 'SomeFutureCode', serverMessage: 'Conflict' }
  assert.equal(localizeApiError(facts, translatorOf('vi')), messages.vi.status.conflict)
  assert.equal(localizeApiError({ status: 500 }, translatorOf('vi')), messages.vi.status.server)
  assert.equal(localizeApiError({ status: 502 }, translatorOf('en')), messages.en.status.unavailable)
})

test('mất kết nối và hết thời gian chờ có câu riêng', () => {
  assert.equal(
    localizeApiError({ status: 0, transportCode: 'ERR_NETWORK' }, translatorOf('vi')),
    messages.vi.status.network
  )
  assert.equal(
    localizeApiError({ status: 0, transportCode: 'ECONNABORTED' }, translatorOf('vi')),
    messages.vi.status.timeout
  )
})

test('messageCode được ưu tiên hơn code chung', () => {
  const facts = {
    status: 422,
    code: 'ValidationFailure',
    messageCode: 'InvalidLibraryMatchCriteria',
    serverMessage: 'A validation error occured'
  }
  assert.equal(localizeApiError(facts, translatorOf('vi')), messages.vi.codes.InvalidLibraryMatchCriteria)
})

test('mọi status đều có câu ở cả hai ngôn ngữ', () => {
  for (const status of [0, 400, 401, 403, 404, 409, 410, 413, 422, 429, 500, 502, 503, 504, 418]) {
    const key = status === 0 ? 'network' : statusKeyOf(status)
    for (const locale of ['vi', 'en']) assert.ok(messages[locale].status[key], `${locale}.status.${key}`)
  }
})

test('bảng mã lỗi vi và en khớp khoá, không rỗng, không có ký tự ICU', () => {
  assert.deepEqual(Object.keys(messages.vi.codes).sort(), Object.keys(messages.en.codes).sort())
  for (const locale of ['vi', 'en']) {
    for (const [section, entries] of Object.entries(messages[locale])) {
      for (const [key, value] of Object.entries(entries)) {
        assert.ok(value.trim(), `${locale}.${section}.${key} rỗng`)
        assert.doesNotMatch(value, /[{}<>]/, `${locale}.${section}.${key} chứa ký tự ICU`)
      }
    }
  }
  for (const [code, value] of Object.entries(messages.en.codes)) {
    assert.equal(hasVietnamese(value), false, `en.codes.${code} còn tiếng Việt`)
  }
})

// Thân lỗi THẬT BE trả khi tạo công trình trùng tên (TDD-SITE-001): `code` chung, mã cụ thể nằm ở `messageCode`.
const duplicateName = {
  status: 409,
  code: 'Conflict',
  messageCode: 'ConstructionSiteNameTaken',
  serverMessage: 'Bạn đã có một công trình khác cùng tên.'
}

test('lỗi trùng tên công trình: so khớp theo messageCode, không bị code chung "Conflict" che', () => {
  assert.equal(errorCodeOf(duplicateName), 'ConstructionSiteNameTaken')
  assert.equal(errorCodeOf({ status: 409, code: 'ConstructionSiteNameTaken' }), 'ConstructionSiteNameTaken')
  assert.equal(errorCodeOf({ status: 500, code: 'Conflict' }), 'Conflict')
  assert.equal(errorCodeOf(new Error('x')), undefined)
  assert.equal(errorCodeOf(null), undefined)
})

test('lỗi trùng tên công trình: tiếng Việt giữ câu BE, tiếng Anh có câu riêng', () => {
  assert.equal(localizeApiError(duplicateName, translatorOf('vi')), 'Bạn đã có một công trình khác cùng tên.')
  assert.equal(localizeApiError(duplicateName, translatorOf('en')), messages.en.codes.ConstructionSiteNameTaken)
})
