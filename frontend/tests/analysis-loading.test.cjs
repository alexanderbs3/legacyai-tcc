const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function loadService(get) {
  const source = readFileSync('src/services/analyses.ts', 'utf8');
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
    {
      exports,
      require: () => ({ api: { get, delete: async () => {} } }),
    },
  );
  return exports;
}

const flush = () => new Promise(setImmediate);

test('project analysis loading limits fan-out concurrency to four and preserves order', async () => {
  let active = 0;
  let maximum = 0;
  const pending = new Map();
  const service = loadService(
    (url) =>
      new Promise((resolve) => {
        active += 1;
        maximum = Math.max(maximum, active);
        pending.set(url, () => {
          pending.delete(url);
          active -= 1;
          resolve({ data: [url] });
        });
      }),
  );

  const loading = service.loadProjectAnalyses(['1', '2', '3', '4', '5', '6']);
  await flush();
  assert.equal(active, 4);
  pending.get('/projects/2/analyses')();
  pending.get('/projects/1/analyses')();
  await flush();
  assert.equal(active, 4);
  for (const finish of pending.values()) finish();
  const results = await loading;

  assert.equal(maximum, 4);
  assert.deepEqual(
    Array.from(results, (result) => result.value[0]),
    [
      '/projects/1/analyses',
      '/projects/2/analyses',
      '/projects/3/analyses',
      '/projects/4/analyses',
      '/projects/5/analyses',
      '/projects/6/analyses',
    ],
  );
});

test('project analysis loading preserves partial failures for page-level feedback', async () => {
  const service = loadService(async (url) => {
    if (url.includes('/failed/')) throw new Error('unavailable');
    return { data: [{ id: url }] };
  });
  const results = await service.loadProjectAnalyses(['ok', 'failed', 'also-ok']);
  assert.equal(results[0].status, 'fulfilled');
  assert.equal(results[1].status, 'rejected');
  assert.equal(results[2].status, 'fulfilled');
});

test('aborting project analysis loading cancels active requests and schedules no new work', async () => {
  const controller = new AbortController();
  const requestSignals = [];
  const service = loadService(
    (_url, config) =>
      new Promise((_resolve, reject) => {
        requestSignals.push(config.signal);
        config.signal.addEventListener('abort', () =>
          reject(new DOMException('Aborted', 'AbortError')),
        );
      }),
  );
  const loading = service.loadProjectAnalyses(['1', '2', '3', '4', '5', '6'], controller.signal);
  await flush();
  assert.equal(requestSignals.length, 4);
  controller.abort();
  const results = await loading;
  assert.equal(requestSignals.length, 4);
  assert.ok(requestSignals.every((signal) => signal === controller.signal && signal.aborted));
  assert.ok(results.slice(0, 4).every((result) => result.status === 'rejected'));
});
