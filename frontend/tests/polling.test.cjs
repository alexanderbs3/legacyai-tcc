const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function mountPolling(get) {
  let effect;
  let interval;
  let intervalDelay;
  const cleared = [];
  const navigations = [];
  const calls = [];
  const state = [];
  let stateSlot = 0;
  const source = readFileSync('src/pages/ProcessingPage.tsx', 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    require: (name) => {
      if (name === 'react')
        return {
          useEffect: (callback) => {
            effect = callback;
          },
          useState: (initial) => {
            const index = stateSlot++;
            if (!(index in state)) state[index] = initial;
            return [
              state[index],
              (value) => {
                state[index] = typeof value === 'function' ? value(state[index]) : value;
              },
            ];
          },
        };
      if (name === 'react-router-dom')
        return {
          useNavigate: () => (url, options) => navigations.push({ url, options }),
          useParams: () => ({ id: 'test-id' }),
        };
      if (name === '../services/api')
        return {
          api: {
            get: (url, config) => {
              calls.push({ url, config });
              return get(calls.length, config);
            },
          },
        };
      if (name === '../services/httpErrors')
        return {
          httpErrorMessage: (error, fallback) =>
            error?.response?.status === 403
              ? 'Acesso negado. Você não tem permissão para acessar este recurso.'
              : fallback,
        };
      if (name === 'react/jsx-runtime') return { jsx: () => null, jsxs: () => null };
      return { Badge: () => null, Card: () => null, Spinner: () => null };
    },
    setInterval: (callback, delay) => {
      interval = callback;
      intervalDelay = delay;
      return 7;
    },
    clearInterval: (timer) => {
      cleared.push(timer);
    },
    AbortController,
  });
  stateSlot = 0;
  exports.ProcessingPage();
  const cleanup = effect();
  return {
    tick: () => interval(),
    cleanup,
    cleared,
    navigations,
    calls,
    intervalDelay,
    analysis: () => state[0],
    error: () => state[1],
    notice: () => state[2],
  };
}

const flush = () => new Promise(setImmediate);

test('polling stops after FAILED and cleanup still clears the interval', async () => {
  const polling = mountPolling(() =>
    Promise.resolve({ data: { status: 'FAILED', errorMessage: 'falhou' } }),
  );
  await flush();
  assert.deepEqual(polling.cleared, [7]);
  assert.equal(polling.analysis().status, 'FAILED');
  polling.tick();
  assert.equal(polling.calls.length, 1);
  polling.cleanup();
  assert.deepEqual(polling.cleared, [7, 7]);
});

test('polling stops after COMPLETED and navigates to the report', async () => {
  const polling = mountPolling(() => Promise.resolve({ data: { status: 'COMPLETED' } }));
  await flush();
  assert.deepEqual(polling.cleared, [7]);
  assert.equal(polling.navigations[0].url, '/analyses/test-id');
  assert.equal(polling.navigations[0].options.replace, true);
  assert.equal(polling.intervalDelay, 3000);
  assert.equal(polling.calls[0].config.timeout, 10_000);
  assert.equal(polling.calls[0].config.signal.aborted, false);
});

test('polling timeout is retried and recovers through COMPLETED', async () => {
  const timeout = Object.assign(new Error('timeout of 10000ms exceeded'), {
    code: 'ECONNABORTED',
  });
  const outcomes = [
    Promise.reject(timeout),
    Promise.resolve({ data: { status: 'PROCESSING' } }),
    Promise.resolve({ data: { status: 'COMPLETED' } }),
  ];
  const polling = mountPolling(() => outcomes.shift());
  await flush();
  assert.deepEqual(polling.cleared, []);
  assert.equal(polling.error(), '');
  assert.match(polling.notice(), /Falha temporária/);

  polling.tick();
  await flush();
  assert.equal(polling.analysis().status, 'PROCESSING');
  assert.equal(polling.notice(), '');

  polling.tick();
  await flush();
  assert.equal(polling.calls.length, 3);
  assert.equal(polling.navigations[0].url, '/analyses/test-id');
});

test('503 is retried on the next polling tick', async () => {
  const outcomes = [
    Promise.reject({ response: { status: 503 } }),
    Promise.resolve({ data: { status: 'PROCESSING' } }),
  ];
  const polling = mountPolling(() => outcomes.shift());
  await flush();
  assert.deepEqual(polling.cleared, []);
  polling.tick();
  await flush();
  assert.equal(polling.analysis().status, 'PROCESSING');
});

test('successful polling resets the timeout failure limit', async () => {
  const timeout = () =>
    Promise.reject(
      Object.assign(new Error('timeout of 10000ms exceeded'), { code: 'ECONNABORTED' }),
    );
  const outcomes = [
    timeout,
    timeout,
    () => Promise.resolve({ data: { status: 'PROCESSING' } }),
    timeout,
    timeout,
    () => Promise.resolve({ data: { status: 'COMPLETED' } }),
  ];
  const polling = mountPolling(() => outcomes.shift()());

  for (let attempt = 0; attempt < 5; attempt += 1) {
    await flush();
    polling.tick();
  }
  await flush();

  assert.equal(polling.error(), '');
  assert.equal(polling.calls.length, 6);
  assert.equal(polling.navigations[0].url, '/analyses/test-id');
});

test('three consecutive timeouts stop polling with a retry message', async () => {
  const polling = mountPolling(() =>
    Promise.reject(
      Object.assign(new Error('timeout of 10000ms exceeded'), { code: 'ECONNABORTED' }),
    ),
  );
  await flush();
  polling.tick();
  await flush();
  polling.tick();
  await flush();
  assert.deepEqual(polling.cleared, [7]);
  assert.match(polling.error(), /após 3 tentativas/);
  polling.tick();
  assert.equal(polling.calls.length, 3);
});

test('non-retryable 403 stops polling with the safe access-denied message', async () => {
  const polling = mountPolling(() =>
    Promise.reject({ response: { status: 403, data: { message: 'owner id' } } }),
  );
  await flush();
  assert.deepEqual(polling.cleared, [7]);
  assert.equal(polling.error(), 'Acesso negado. Você não tem permissão para acessar este recurso.');
});

test('cleanup clears the timer, aborts the request, and prevents further polling', async () => {
  let resolveRequest;
  const request = new Promise((resolve) => {
    resolveRequest = resolve;
  });
  const polling = mountPolling(() => request);
  assert.equal(polling.calls.length, 1);
  assert.equal(polling.calls[0].config.signal.aborted, false);

  polling.cleanup();
  assert.deepEqual(polling.cleared, [7]);
  assert.equal(polling.calls[0].config.signal.aborted, true);
  polling.tick();
  assert.equal(polling.calls.length, 1);

  resolveRequest({ data: { status: 'COMPLETED' } });
  await flush();
  assert.equal(polling.navigations.length, 0);
});

test('pending request prevents concurrent polling calls', async () => {
  let resolveRequest;
  const request = new Promise((resolve) => {
    resolveRequest = resolve;
  });
  const polling = mountPolling(() => request);
  polling.tick();
  polling.tick();
  assert.equal(polling.calls.length, 1);
  resolveRequest({ data: { status: 'PROCESSING' } });
  await flush();
  polling.tick();
  assert.equal(polling.calls.length, 2);
});
