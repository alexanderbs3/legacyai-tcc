const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { test } = require('node:test')
const vm = require('node:vm')
const ts = require('typescript')

function message(error, fallback = 'Não foi possível autenticar.') {
  const source = readFileSync('src/services/authErrors.ts', 'utf8')
  const exports = {}
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports })
  return exports.authErrorMessage(error, fallback)
}

test('reports the API as unreachable when there is no response', () => {
  assert.equal(message(new Error('network details')), 'Não foi possível conectar ao servidor. Verifique sua conexão ou se a API está em execução.')
  assert.equal(message({ code: 'ERR_NETWORK' }), 'Não foi possível conectar ao servidor. Verifique sua conexão ou se a API está em execução.')
})

test('translates invalid credentials into a specific message', () => {
  assert.equal(message({ response: { status: 401, data: { error: 'INVALID_CREDENTIALS', message: 'Credenciais inválidas' } } }), 'E-mail ou senha incorretos.')
})

test('shows known validation messages such as duplicate email', () => {
  assert.equal(message({ response: { status: 400, data: { error: 'VALIDATION_ERROR', message: 'E-mail já cadastrado' } } }), 'E-mail já cadastrado')
})

test('shows a generic server-error message for 5xx responses', () => {
  assert.equal(message({ response: { status: 500, data: {} } }), 'Serviço indisponível. Tente novamente em instantes.')
})

test('falls back to the provided message for unexpected response shapes', () => {
  assert.equal(message({ response: { status: 403, data: { error: 'FORBIDDEN', message: 'secret detail' } } }), 'Não foi possível autenticar.')
  assert.equal(message({ response: { status: 400, data: { error: 'UNKNOWN' } } }), 'Não foi possível autenticar.')
})
