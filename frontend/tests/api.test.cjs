const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function loadApi(pathname, storageThrows = false) {
  let onError;
  let redirectedTo;
  const tokens = new Map([['legacyai.auth.token', 'existing-token']]);
  const client = {
    interceptors: {
      request: { use() {} },
      response: {
        use(_success, failure) {
          onError = failure;
        },
      },
    },
  };
  const source = readFileSync('src/services/api.ts', 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    require: (name) => {
      if (name === './requestActivity') {
        return { requestStarted() {}, requestEnded() {} };
      }
      assert.equal(name, 'axios');
      return { __esModule: true, default: { create: () => client } };
    },
    localStorage: {
      getItem: (key) => {
        if (storageThrows) throw new DOMException('Blocked', 'SecurityError');
        return tokens.get(key) ?? null;
      },
      setItem: (key, value) => {
        if (storageThrows) throw new DOMException('Blocked', 'SecurityError');
        tokens.set(key, value);
      },
      removeItem: (key) => {
        if (storageThrows) throw new DOMException('Blocked', 'SecurityError');
        tokens.delete(key);
      },
    },
    window: {
      location: {
        pathname,
        assign: (url) => {
          redirectedTo = url;
        },
      },
    },
  });
  return {
    reject: onError,
    token: () => tokens.get('legacyai.auth.token'),
    redirectedTo: () => redirectedTo,
    getToken: exports.getToken,
    setToken: exports.setToken,
    clearToken: exports.clearToken,
  };
}

test('401 on login preserves the local error display', async () => {
  const api = loadApi('/login');
  await assert.rejects(api.reject({ response: { status: 401 } }));
  assert.equal(api.redirectedTo(), undefined);
});

test('401 on register does not redirect', async () => {
  const api = loadApi('/register');
  await assert.rejects(api.reject({ response: { status: 401 } }));
  assert.equal(api.redirectedTo(), undefined);
});

test('401 on protected page clears the token and redirects', async () => {
  const api = loadApi('/dashboard');
  await assert.rejects(api.reject({ response: { status: 401 } }));
  assert.equal(api.token(), undefined);
  assert.equal(api.redirectedTo(), '/login');
});

test('403 preserves the authenticated session and does not redirect', async () => {
  const api = loadApi('/projects/restricted');
  await assert.rejects(api.reject({ response: { status: 403 } }));
  assert.equal(api.token(), 'existing-token');
  assert.equal(api.redirectedTo(), undefined);
});

test('blocked browser storage does not crash auth or 401 handling', async () => {
  const api = loadApi('/dashboard', true);
  assert.equal(api.getToken(), null);
  assert.equal(api.setToken('new-token'), false);
  assert.doesNotThrow(() => api.clearToken());
  await assert.rejects(api.reject({ response: { status: 401 } }));
  assert.equal(api.redirectedTo(), '/login');
});
