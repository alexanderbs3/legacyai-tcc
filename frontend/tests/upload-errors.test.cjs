const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function message(error) {
  const httpExports = {};
  vm.runInNewContext(
    ts.transpileModule(readFileSync('src/services/httpErrors.ts', 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    { exports: httpExports },
  );
  const source = readFileSync('src/services/uploadErrors.ts', 'utf8');
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
    { exports, require: () => httpExports },
  );
  return exports.uploadErrorMessage(error, 'Não foi possível enviar o arquivo.');
}

test('shows only known safe upload-validation messages', () => {
  assert.equal(
    message({
      response: {
        status: 400,
        data: { error: 'INVALID_FILE', message: 'Tipo ou extensão de arquivo inválido' },
      },
    }),
    'Tipo ou extensão de arquivo inválido',
  );
  assert.equal(
    message({
      response: {
        status: 400,
        data: { error: 'FILE_TOO_LARGE', message: 'Arquivo excede o limite de 70 MB.' },
      },
    }),
    'Arquivo excede o limite de 70 MB.',
  );
});

test('does not render internal or unexpected response details', () => {
  assert.equal(
    message({
      response: { status: 500, data: { error: 'INVALID_FILE', message: 'secret header' } },
    }),
    'Não foi possível enviar o arquivo.',
  );
  assert.equal(
    message({ response: { status: 400, data: { error: 'UNKNOWN', message: 'stack trace' } } }),
    'Não foi possível enviar o arquivo.',
  );
  assert.equal(message(new Error('network details')), 'Não foi possível enviar o arquivo.');
});

test('reports upload 403 as access denied without exposing backend details', () => {
  assert.equal(
    message({ response: { status: 403, data: { message: 'resource owner id' } } }),
    'Acesso negado. Você não tem permissão para acessar este recurso.',
  );
});
