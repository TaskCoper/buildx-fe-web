import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import ts from 'typescript'

function compile(source) {
  return ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText
}

function navigation(params = 'act=new&rid=123&tab=plans', href = `https://local.test/vi/admin/plans?${params}#plans`) {
  const calls = []
  const loaded = { exports: {} }
  new Function(
    'require',
    'module',
    'exports',
    'window',
    compile(readFileSync('src/features/admin/hooks/use-form-page.ts', 'utf8'))
  )(
    (name) => {
      if (name === 'next/navigation') return { useSearchParams: () => new URLSearchParams(params) }
      if (name === '@/i18n/navigation')
        return {
          usePathname: () => '/admin/plans',
          useRouter: () => ({
            replace: (href) => calls.push(['replace', href]),
            push: (href) => calls.push(['push', href]),
            back: () => calls.push(['back'])
          })
        }
      throw new Error(`Unexpected import: ${name}`)
    },
    loaded,
    loaded.exports,
    {
      location: { href },
      history: { replaceState: (_, __, href) => calls.push(['history', href]) }
    }
  )
  return { page: loaded.exports.useFormPage(), calls }
}

test('closing new, edit and view returns to the list without loading a route or going back', () => {
  for (const mode of ['new', 'edit', 'view']) {
    const { page, calls } = navigation(`act=${mode}&rid=123&tab=plans`)
    page.close()
    assert.deepEqual(calls, [['history', '/vi/admin/plans?tab=plans#plans']])
  }
})

test('closing preserves unrelated URL parameters and hash', () => {
  const { page, calls } = navigation('act=edit&rid=42&kind=Supervision&page=2')
  page.close()
  assert.deepEqual(calls, [['history', '/vi/admin/plans?kind=Supervision&page=2#plans']])
})

test('cancel after opening a form goes straight to the list regardless of the previous history entry', () => {
  const opened = navigation()
  opened.page.open('new')
  opened.calls.length = 0
  opened.page.close()
  assert.deepEqual(opened.calls, [['history', '/vi/admin/plans?tab=plans#plans']])
})

test('closing uses the current localized URL even if its query changed after the hook rendered', () => {
  const { page, calls } = navigation('act=new', 'https://local.test/en/admin/plans?act=edit&rid=42&tab=latest#row')
  page.close()
  assert.deepEqual(calls, [['history', '/en/admin/plans?tab=latest#row']])
})

test('closing without other query parameters does not leave a trailing question mark', () => {
  const { page, calls } = navigation('act=new&rid=42')
  page.close()
  assert.deepEqual(calls, [['history', '/vi/admin/plans#plans']])
})

// Execute the component's real submit function with controlled API/validation promises.
const source = readFileSync('src/features/admin/components/common/api-resource-manager.tsx', 'utf8')
const ast = ts.createSourceFile('manager.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const session = ast.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === 'FormSession')
const requestClose = session.body.statements.find(
  (node) => ts.isFunctionDeclaration(node) && node.name?.text === 'requestClose'
)
const requestCloseJs = compile(`export ${requestClose.getText(ast)}`)

function cancelling(dirty) {
  const events = []
  let confirmation
  const exports = {}
  new Function('exports', 'dirty', 'onClose', 'modal', 't', 'setDirty', requestCloseJs)(
    exports,
    dirty,
    () => events.push(['close']),
    {
      confirm: (options) => {
        confirmation = options
      }
    },
    (key) => key,
    (value) => events.push(['dirty', value])
  )
  exports.requestClose()
  return { events, confirmation }
}

test('cancel on an unchanged form closes immediately without a confirmation', () => {
  const run = cancelling(false)
  assert.deepEqual(run.events, [['close']])
  assert.equal(run.confirmation, undefined)
})

test('cancel on a changed form only clears dirty state and closes after confirming discard', () => {
  const run = cancelling(true)
  assert.deepEqual(run.events, [])
  assert.equal(run.confirmation.cancelText, 'actions.keepEditing')
  assert.equal(run.confirmation.okText, 'actions.discard')
  run.confirmation.onOk()
  assert.deepEqual(run.events, [['dirty', false], ['close']])
})

const submit = session.body.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === 'submit')
const submitJs = compile(`export ${submit.getText(ast)}`)

function saving(overrides = {}) {
  const events = []
  const state = { current: false }
  const dependencies = {
    submitting: state,
    setSaving: (value) => events.push(['saving', value]),
    setCompleted: (value) => events.push(['completed', value]),
    form: { validateFields: async () => ({ code: 'TEST' }) },
    onValidationFailed: () => events.push(['invalid']),
    mode: 'new',
    item: { id: 'plan' },
    onCreate: async () => events.push(['create']),
    onUpdate: async () => events.push(['update']),
    message: { success: () => events.push(['success']), error: () => events.push(['error']) },
    t: (key) => key,
    setDirty: (value) => events.push(['dirty', value]),
    onSaved: () => events.push(['close']),
    refresh: async () => events.push(['refresh']),
    formatError: undefined,
    isApiError: () => false,
    ...overrides
  }
  const exports = {}
  new Function('exports', ...Object.keys(dependencies), submitJs)(exports, ...Object.values(dependencies))
  return { submit: exports.submit, events, state }
}

test('create closes immediately when list refresh is still pending and blocks another save', async () => {
  const run = saving({ refresh: () => new Promise(() => {}) })
  await run.submit()
  await run.submit()
  assert.deepEqual(run.events, [
    ['saving', true],
    ['create'],
    ['completed', true],
    ['success'],
    ['dirty', false],
    ['close'],
    ['saving', false]
  ])
  assert.equal(run.state.current, true)
})

test('edit also closes after the write without waiting for list refresh', async () => {
  const run = saving({ mode: 'edit', refresh: () => new Promise(() => {}) })
  await run.submit('publish')
  assert.deepEqual(run.events, [
    ['saving', true],
    ['update'],
    ['completed', true],
    ['success'],
    ['dirty', false],
    ['close'],
    ['saving', false]
  ])
})

test('conflict keeps the form, does not refresh, and allows correction and retry', async () => {
  let attempts = 0
  const run = saving({
    onCreate: async () => {
      if (++attempts === 1) throw new Error('HTTP 409')
    }
  })
  await run.submit()
  assert.deepEqual(run.events, [['saving', true], ['error'], ['saving', false]])
  assert.equal(run.state.current, false)
  await run.submit()
  assert.equal(attempts, 2)
  assert.equal(run.events.filter(([event]) => event === 'close').length, 1)
})

test('invalid form does not write or close and releases the submit lock', async () => {
  const run = saving({
    form: {
      validateFields: async () => {
        throw new Error('Required')
      }
    }
  })
  await run.submit()
  assert.deepEqual(run.events, [['saving', true], ['invalid'], ['saving', false]])
  assert.equal(run.state.current, false)
})

test('rapid saves share one submission while validation is pending', async () => {
  let finish
  const run = saving({
    form: {
      validateFields: () =>
        new Promise((resolve) => {
          finish = resolve
        })
    }
  })
  const first = run.submit()
  await run.submit()
  finish({ code: 'TEST' })
  await first
  assert.equal(run.events.filter(([event]) => event === 'create').length, 1)
  assert.equal(run.events.filter(([event]) => event === 'close').length, 1)
})

test('list refresh failure cannot undo successful navigation or allow duplicate creation', async () => {
  const run = saving({
    refresh: async () => {
      throw new Error('HTTP 503')
    }
  })
  await run.submit()
  await run.submit()
  assert.deepEqual(run.events, [
    ['saving', true],
    ['create'],
    ['completed', true],
    ['success'],
    ['dirty', false],
    ['close'],
    ['saving', false],
    ['error']
  ])
  assert.equal(run.state.current, true)
})

test('a navigation exception stops the spinner but cannot submit an already created plan again', async () => {
  const run = saving({
    onSaved: () => {
      throw new Error('Navigation failed')
    }
  })
  await run.submit()
  await run.submit()
  assert.deepEqual(run.events, [
    ['saving', true],
    ['create'],
    ['completed', true],
    ['success'],
    ['dirty', false],
    ['error'],
    ['saving', false]
  ])
  assert.equal(run.state.current, true)
})
