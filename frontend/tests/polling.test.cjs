const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { test } = require('node:test')
const vm = require('node:vm')
const ts = require('typescript')

function mountPolling(get) {
  let effect
  let interval
  const cleared = []
  const errors = []
  const navigations = []
  let calls = 0
  const source = readFileSync('src/pages/ProcessingPage.tsx', 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText
  const exports = {}
  vm.runInNewContext(compiled, {
    exports,
    require: (name) => {
      if (name === 'react') return { useEffect: (callback) => { effect = callback }, useState: () => [undefined, (value) => errors.push(value)] }
      if (name === 'react-router-dom') return { useNavigate: () => (url) => navigations.push(url), useParams: () => ({ id: 'test-id' }) }
      if (name === '../services/api') return { api: { get: () => { calls++; return get() } } }
      if (name === 'react/jsx-runtime') return { jsx: () => null, jsxs: () => null }
      return { Badge: () => null, Card: () => null, Spinner: () => null }
    },
    setInterval: (callback) => { interval = callback; return 7 },
    clearInterval: (timer) => { cleared.push(timer) },
  })
  exports.ProcessingPage()
  const cleanup = effect()
  return { tick: () => interval(), cleanup, cleared, errors, navigations, calls: () => calls }
}

const flush = () => new Promise(setImmediate)

test('polling stops after FAILED and cleanup still clears the interval', async () => {
  const polling = mountPolling(() => Promise.resolve({ data: { status: 'FAILED', errorMessage: 'falhou' } }))
  await flush()
  assert.deepEqual(polling.cleared, [7])
  polling.cleanup()
  assert.deepEqual(polling.cleared, [7, 7])
})

test('polling stops after COMPLETED and navigates to the report', async () => {
  const polling = mountPolling(() => Promise.resolve({ data: { status: 'COMPLETED' } }))
  await flush()
  assert.deepEqual(polling.cleared, [7])
  assert.deepEqual(polling.navigations, ['/analyses/test-id'])
})

test('polling stops and displays error when the request fails', async () => {
  const polling = mountPolling(() => Promise.reject(new Error('network')))
  await flush()
  assert.deepEqual(polling.cleared, [7])
  assert.ok(polling.errors.includes('Não foi possível acompanhar o status da análise.'))
})
