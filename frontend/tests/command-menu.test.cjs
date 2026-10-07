const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function mountCommandMenu(get) {
  const state = [];
  const effects = [];
  let stateSlot = 0;
  let effectSlot = 0;
  const requests = [];
  const node = (type, props) => ({ type, props });
  const source = readFileSync('src/components/layout/CommandMenu.tsx', 'utf8');
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
            effects[effectSlot++] = callback;
          },
          useEffectEvent: (callback) => callback,
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
      if (name === 'cmdk')
        return {
          Command: {
            Dialog: 'Command.Dialog',
            Input: 'Command.Input',
            List: 'Command.List',
            Empty: 'Command.Empty',
            Group: 'Command.Group',
            Item: 'Command.Item',
          },
        };
      if (name === 'react-router-dom') return { useNavigate: () => () => {} };
      if (name === '../../services/api')
        return {
          api: {
            get: (url, config) => {
              requests.push({ url, config });
              return get(url, config);
            },
          },
        };
      if (name === '../../services/httpErrors')
        return {
          httpErrorMessage: (error, fallback) =>
            error?.response?.status === 403
              ? 'Acesso negado. Você não tem permissão para acessar este recurso.'
              : fallback,
        };
      if (name === 'react/jsx-runtime') return { jsx: node, jsxs: node };
      return {
        FolderKanban: 'FolderKanban',
        History: 'History',
        LayoutDashboard: 'LayoutDashboard',
        Plus: 'Plus',
        Search: 'Search',
      };
    },
    AbortController,
    navigator: { platform: 'Linux' },
    window: { addEventListener() {}, removeEventListener() {} },
  });

  return {
    effects,
    requests,
    render: () => {
      stateSlot = 0;
      effectSlot = 0;
      return exports.CommandMenu();
    },
  };
}

function all(tree, predicate) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap((item) => all(item, predicate));
  return [...(predicate(tree) ? [tree] : []), ...all(tree.props?.children, predicate)];
}

const flush = () => new Promise(setImmediate);

test('command menu distinguishes project loading and failure while preserving fixed actions', async () => {
  const menu = mountCommandMenu(() => Promise.reject(new Error('network detail')));
  const closed = menu.render();
  all(closed, (item) => item.props?.['aria-label'] === 'Abrir busca e comandos')[0].props.onClick();

  const loading = menu.render();
  assert.ok(all(loading, (item) => item.props?.role === 'status').length);
  menu.effects[1]();
  await flush();

  const failed = menu.render();
  const alerts = all(failed, (item) => item.props?.role === 'alert');
  assert.equal(alerts.length, 1);
  assert.match(alerts[0].props.children, /Projetos indisponíveis/);
  assert.ok(
    all(
      failed,
      (item) => item.type === 'Command.Item' && JSON.stringify(item).includes('Novo projeto'),
    ).length,
  );
  assert.ok(!JSON.stringify(failed).includes('network detail'));
});

test('closing the command menu aborts an in-flight project request', () => {
  const menu = mountCommandMenu(() => new Promise(() => {}));
  const closed = menu.render();
  all(closed, (item) => item.props?.['aria-label'] === 'Abrir busca e comandos')[0].props.onClick();
  menu.render();
  const cleanup = menu.effects[1]();
  assert.equal(menu.requests[0].config.signal.aborted, false);
  cleanup();
  assert.equal(menu.requests[0].config.signal.aborted, true);
});
