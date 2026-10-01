const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { test } = require('node:test')
const vm = require('node:vm')
const ts = require('typescript')

function loadApi(pathname) {
  let onError
  let redirectedTo
  const tokens = new Map([['legacyai.auth.token', 'existing-token']])
  const client = {
    interceptors: {
      request: { use() {} },
      response: { use(_success, failure) { onError = failure } },
    },
  }
  const source = readFileSync('src/services/api.ts', 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText
  const exports = {}
  vm.runInNewContext(compiled, {
    exports,
    require: (name) => {
      if (name === './requestActivity') {
        return { requestStarted() {}, requestEnded() {} }
      }
      assert.equal(name, 'axios')
      return { __esModule: true, default: { create: () => client } }
    },
    localStorage: {
      getItem: (key) => tokens.get(key) ?? null,
      setItem: (key, value) => tokens.set(key, value),
      removeItem: (key) => tokens.delete(key),
    },
    window: { location: { pathname, assign: (url) => { redirectedTo = url } } },
  })
  return { reject: onError, token: () => tokens.get('legacyai.auth.token'), redirectedTo: () => redirectedTo }
}

test('401 on login preserves the local error display', async () => {
  const api = loadApi('/login')
  await assert.rejects(api.reject({ response: { status: 401 } }))
  assert.equal(api.redirectedTo(), undefined)
})

test('401 on register does not redirect', async () => {
  const api = loadApi('/register')
  await assert.rejects(api.reject({ response: { status: 401 } }))
  assert.equal(api.redirectedTo(), undefined)
})

test('401 on protected page clears the token and redirects', async () => {
  const api = loadApi('/dashboard')
  await assert.rejects(api.reject({ response: { status: 401 } }))
  assert.equal(api.token(), undefined)
  assert.equal(api.redirectedTo(), '/login')
})
