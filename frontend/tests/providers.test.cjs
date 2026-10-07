const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function mountPage(files = [{ id: 'file-1', fileName: 'example.txt' }]) {
  const state = [];
  const posts = [];
  const requests = [];
  let slot = 0;
  const effects = [];
  const node = (type, props) => ({ type, props });
  const api = {
    get: async (url, config) => {
      requests.push({ url, config });
      return {
        data:
          url === '/ai/providers'
            ? [
                { name: 'OPENAI', displayName: 'OPENAI', available: true },
                { name: 'CLAUDE', displayName: 'CLAUDE', available: true },
                { name: 'DEEPSEEK', displayName: 'DEEPSEEK', available: true },
              ]
            : files,
      };
    },
    post: async (url, body) => {
      posts.push({ url, body });
      return { data: { analysisId: 'new-analysis', status: 'PENDING' } };
    },
  };
  const source = readFileSync('src/pages/NewAnalysisPage.tsx', 'utf8');
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
          useEffect: (fn) => {
            if (effects.length < 2) effects.push(fn);
          },
          useState: (initial) => {
            const index = slot++;
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
          Link: 'Link',
          useNavigate: () => () => {},
          useParams: () => ({ id: 'project-id' }),
        };
      if (name === '../services/api') return { api };
      if (name === '../services/httpErrors')
        return { httpErrorMessage: (_error, fallback) => fallback };
      if (name === 'react/jsx-runtime') return { jsx: node, jsxs: node };
      const component = name.split('/').pop();
      return { [component]: component };
    },
    AbortController,
  });
  const render = () => {
    slot = 0;
    return exports.NewAnalysisPage();
  };
  return {
    render,
    load: () => Promise.all(effects.map((effect) => effect())),
    posts,
    requests,
    effects,
  };
}

function find(node, predicate) {
  if (!node || typeof node !== 'object') return undefined;
  if (Array.isArray(node)) return node.map((item) => find(item, predicate)).find(Boolean);
  if (predicate(node)) return node;
  return find(node.props?.children, predicate);
}

test('providers use native radio semantics and submit the unchanged provider name', async () => {
  const page = mountPage();
  page.render();
  await page.load();
  await new Promise(setImmediate);
  const initial = page.render();
  const group = find(initial, (item) => item.type === 'fieldset');
  assert.ok(group);
  assert.ok(
    find(group, (item) => item.type === 'legend' && item.props.children === 'Provedor de IA'),
  );
  const deepSeek = find(
    initial,
    (item) =>
      item.type === 'input' && item.props?.type === 'radio' && item.props.value === 'DEEPSEEK',
  );
  assert.ok(deepSeek);
  assert.equal(deepSeek.props.disabled, false);
  assert.equal(deepSeek.props.name, 'provider');
  assert.equal(deepSeek.props.checked, false);
  deepSeek.props.onChange();
  const selected = page.render();
  const selectedDeepSeek = find(
    selected,
    (item) =>
      item.type === 'input' && item.props?.type === 'radio' && item.props.value === 'DEEPSEEK',
  );
  assert.equal(selectedDeepSeek.props.checked, true);
  assert.ok(JSON.stringify(selected).includes('DeepSeek V4.1 Flash'));
  const submit = find(selected, (item) => item.props?.children === 'Iniciar análise');
  assert.equal(submit.props.disabled, false);
  await submit.props.onClick();
  assert.equal(page.posts.length, 1);
  assert.equal(page.posts[0].url, '/projects/project-id/analyses');
  assert.equal(page.posts[0].body.provider, 'DEEPSEEK');
});

test('project without files blocks submission and links to adding material', async () => {
  const page = mountPage([]);
  page.render();
  await page.load();
  await new Promise(setImmediate);
  const empty = page.render();
  const submit = find(empty, (item) => item.props?.children === 'Iniciar análise');
  assert.equal(submit.props.disabled, true);
  assert.ok(
    find(empty, (item) => item.type === 'Link' && item.props.to === '/projects/project-id'),
  );
  assert.ok(
    find(
      empty,
      (item) => typeof item.props?.children === 'string' && item.props.children.includes('arquivo'),
    ),
  );
  await submit.props.onClick();
  assert.equal(page.posts.length, 0);
});

test('provider and project-file requests are aborted on unmount', () => {
  const page = mountPage();
  page.render();
  const cleanups = page.effects.map((effect) => effect());
  assert.equal(page.requests.length, 2);
  assert.ok(page.requests.every((request) => !request.config.signal.aborted));
  for (const cleanup of cleanups) cleanup();
  assert.ok(page.requests.every((request) => request.config.signal.aborted));
});
