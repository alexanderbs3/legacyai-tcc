const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function mount(path, api = {}) {
  const state = [];
  const effects = [];
  const calls = [];
  const refs = [];
  let slot = 0;
  let refSlot = 0;
  const element = (type, props) => ({ type, props });
  const source = readFileSync(path, 'utf8');
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
          useState: (initial) => {
            const i = slot++;
            if (!(i in state)) state[i] = initial;
            return [
              state[i],
              (next) => {
                state[i] = typeof next === 'function' ? next(state[i]) : next;
              },
            ];
          },
          useRef: (initial) => {
            const i = refSlot++;
            if (!(i in refs)) refs[i] = { current: initial };
            return refs[i];
          },
          useEffect: (fn) => {
            if (effects.length === 0) effects.push(fn);
          },
          lazy: () => 'LazyPage',
          Suspense: 'Suspense',
        };
      if (name === 'react-router-dom')
        return {
          Link: 'Link',
          Route: 'Route',
          Routes: 'Routes',
          BrowserRouter: 'BrowserRouter',
          Navigate: 'Navigate',
          useLocation: () => ({ pathname: '/dashboard' }),
          useNavigate: () => () => {},
        };
      if (name === '../services/api')
        return {
          api: {
            get: (url, config) => api.get(url, config),
            post: async (url, payload) => {
              calls.push({ url, payload });
              return { data: {} };
            },
          },
          clearToken: () => {},
          hasToken: () => true,
        };
      if (name === '../services/analyses')
        return {
          deleteAnalysis: async () => {},
          loadProjectAnalyses: (projectIds, signal) =>
            Promise.all(
              projectIds.map(async (projectId) => {
                try {
                  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
                  const response = await api.get(`/projects/${projectId}/analyses`, { signal });
                  return { status: 'fulfilled', value: response.data };
                } catch (reason) {
                  return { status: 'rejected', reason };
                }
              }),
            ),
        };
      if (name === '../services/httpErrors') {
        const httpExports = {};
        vm.runInNewContext(
          ts.transpileModule(readFileSync('src/services/httpErrors.ts', 'utf8'), {
            compilerOptions: { module: ts.ModuleKind.CommonJS },
          }).outputText,
          { exports: httpExports },
        );
        return httpExports;
      }
      if (name === 'react/jsx-runtime') return { jsx: element, jsxs: element };
      if (name === '../components/Badge')
        return { Badge: ({ children }) => element('Badge', { children }) };
      if (name === '../utils/validation')
        return { isValidEmail: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) };
      const component = name.split('/').pop();
      return { [component]: component };
    },
    AbortController,
    DOMException,
  });
  return {
    render: (name, props = {}) => {
      slot = 0;
      refSlot = 0;
      return (exports[name] ?? exports.default)(props);
    },
    load: async () => {
      await Promise.all(effects.map((effect) => effect()));
      await new Promise(setImmediate);
    },
    startEffect: () => effects[0](),
    calls,
  };
}

function all(tree, predicate) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap((item) => all(item, predicate));
  return [...(predicate(tree) ? [tree] : []), ...all(tree.props?.children, predicate)];
}
function text(tree) {
  if (Array.isArray(tree)) return tree.map(text).join(' ');
  if (tree && typeof tree === 'object') return text(tree.props?.children);
  return String(tree ?? '');
}
function analysis(id, status, date) {
  return { id, status, provider: 'DEEPSEEK', createdAt: date };
}

for (const [count, expected] of [
  [1, '1 análise'],
  [2, '2 análises'],
]) {
  test(`Dashboard pluralizes ${count} analyses`, async () => {
    const page = mount('src/pages/DashboardPage.tsx', {
      get: async (url) => ({
        data:
          url === '/projects'
            ? [{ id: 'p1', name: 'Sistema' }]
            : Array.from({ length: count }, (_, i) =>
                analysis(`a${i}`, 'COMPLETED', '2026-01-01T12:00:00Z'),
              ),
      }),
    });
    page.render('DashboardPage');
    await page.load();
    assert.ok(text(page.render('DashboardPage')).replace(/\s+/g, ' ').includes(expected));
  });
}

test('Dashboard shows up to five recent analyses and routes by status', async () => {
  const page = mount('src/pages/DashboardPage.tsx', {
    get: async (url) => ({
      data:
        url === '/projects'
          ? [{ id: 'p1', name: 'Sistema' }]
          : [
              analysis('done', 'COMPLETED', '2026-03-06T12:00:00Z'),
              analysis('running', 'PROCESSING', '2026-03-05T12:00:00Z'),
              analysis('queued', 'PENDING', '2026-03-04T12:00:00Z'),
              analysis('broken', 'FAILED', '2026-03-03T12:00:00Z'),
              analysis('five', 'COMPLETED', '2026-03-02T12:00:00Z'),
              analysis('six', 'COMPLETED', '2026-03-01T12:00:00Z'),
            ],
    }),
  });
  page.render('DashboardPage');
  await page.load();
  const view = page.render('DashboardPage');
  assert.ok(text(view).includes('Análises recentes'));
  const links = all(view, (item) => item.type === 'Link').map((item) => item.props.to);
  assert.ok(links.includes('/analyses/done'));
  for (const id of ['running', 'queued', 'broken'])
    assert.ok(links.includes(`/analyses/${id}/processing`));
  assert.equal(links.filter((url) => url?.startsWith('/analyses/')).length, 5);
  assert.ok(text(view).includes('Sistema'));
  assert.ok(text(view).includes('DEEPSEEK'));
  assert.ok(text(view).includes('06/03/2026'));
});

test('Dashboard has an actionable empty analyses state even without projects', async () => {
  const page = mount('src/pages/DashboardPage.tsx', { get: async () => ({ data: [] }) });
  page.render('DashboardPage');
  await page.load();
  const view = page.render('DashboardPage');
  assert.ok(text(view).includes('Nenhuma análise realizada ainda.'));
  assert.ok(all(view, (item) => item.type === 'Link' && item.props.to === '/projects/new').length);
});

test('Dashboard uses the generic message when analysis requests fail only by network', async () => {
  const page = mount('src/pages/DashboardPage.tsx', {
    get: async (url) => {
      if (url === '/projects') return { data: [{ id: 'p1', name: 'Sistema' }] };
      throw Error('internal client details');
    },
  });
  page.render('DashboardPage');
  await page.load();
  const view = page.render('DashboardPage');
  assert.ok(text(view).includes('Sistema'));
  assert.ok(text(view).includes('Não foi possível carregar as análises recentes.'));
  assert.ok(!text(view).includes('internal client details'));
  assert.ok(text(view).includes('Contagem indisponível'));
  assert.ok(!text(view).includes('0 análises'));
});

for (const [label, firstFailure, secondFailure] of [
  [
    'network before 403',
    new Error('network detail'),
    { response: { status: 403, data: { message: 'owner id' } } },
  ],
  [
    '403 before network',
    { response: { status: 403, data: { message: 'owner id' } } },
    new Error('network detail'),
  ],
]) {
  test(`Dashboard prioritizes access denied when failures combine ${label}`, async () => {
    const page = mount('src/pages/DashboardPage.tsx', {
      get: async (url) => {
        if (url === '/projects')
          return {
            data: [
              { id: 'first', name: 'Primeiro' },
              { id: 'second', name: 'Segundo' },
            ],
          };
        throw url.includes('/first/') ? firstFailure : secondFailure;
      },
    });
    page.render('DashboardPage');
    await page.load();
    const view = page.render('DashboardPage');
    assert.ok(
      text(view).includes('Acesso negado. Você não tem permissão para acessar este recurso.'),
    );
    assert.ok(!text(view).includes('network detail'));
    assert.ok(!text(view).includes('owner id'));
    assert.ok(text(view).includes('Primeiro'));
    assert.ok(text(view).includes('Segundo'));
  });
}

test('Dashboard preserves valid partial data when another analysis request fails', async () => {
  const page = mount('src/pages/DashboardPage.tsx', {
    get: async (url) => {
      if (url === '/projects')
        return {
          data: [
            { id: 'ok', name: 'Projeto disponível' },
            { id: 'failed', name: 'Projeto indisponível' },
          ],
        };
      if (url.includes('/ok/'))
        return { data: [analysis('valid-analysis', 'COMPLETED', '2026-03-06T12:00:00Z')] };
      throw new Error('network detail');
    },
  });
  page.render('DashboardPage');
  await page.load();
  const view = page.render('DashboardPage');
  assert.ok(text(view).includes('Projeto disponível'));
  assert.ok(text(view).includes('Projeto indisponível'));
  assert.ok(
    all(view, (item) => item.type === 'Link' && item.props.to === '/analyses/valid-analysis')
      .length,
  );
  assert.ok(text(view).includes('Não foi possível carregar as análises recentes.'));
  assert.ok(text(view).includes('Contagem indisponível'));
});

test('Dashboard aborts obsolete loading and only applies data from the new load', async () => {
  const projectRequests = [];
  const analysisSignals = [];
  const page = mount('src/pages/DashboardPage.tsx', {
    get: (url, config) => {
      if (url === '/projects')
        return new Promise((resolve) => projectRequests.push({ resolve, signal: config.signal }));
      analysisSignals.push(config.signal);
      return Promise.resolve({
        data: [analysis(`analysis-${url}`, 'COMPLETED', '2026-03-06T12:00:00Z')],
      });
    },
  });
  page.render('DashboardPage');
  const firstCleanup = page.startEffect();
  const firstSignal = projectRequests[0].signal;
  firstCleanup();
  assert.equal(firstSignal.aborted, true);

  const secondCleanup = page.startEffect();
  const secondSignal = projectRequests[1].signal;
  assert.notEqual(secondSignal, firstSignal);
  assert.equal(secondSignal.aborted, false);

  projectRequests[1].resolve({ data: [{ id: 'new', name: 'Projeto novo' }] });
  await new Promise(setImmediate);
  await new Promise(setImmediate);
  projectRequests[0].resolve({ data: [{ id: 'old', name: 'Projeto obsoleto' }] });
  await new Promise(setImmediate);
  await new Promise(setImmediate);

  const view = page.render('DashboardPage');
  assert.ok(text(view).includes('Projeto novo'));
  assert.ok(!text(view).includes('Projeto obsoleto'));
  assert.equal(all(view, (item) => item.type === 'Alert').length, 0);
  assert.ok(analysisSignals.length > 0);
  assert.ok(analysisSignals.every((signal) => signal === secondSignal));
  secondCleanup();
});

test('mobile navigation has labelled icon controls and a communicating toggle', () => {
  const page = mount('src/components/AppShell.tsx');
  const before = page.render('AppShell', { children: 'conteúdo' });
  const toggle = all(before, (item) => item.type === 'button' && item.props['aria-controls'])[0];
  assert.ok(toggle);
  assert.equal(toggle.props['aria-expanded'], false);
  assert.ok(toggle.props['aria-label']);
  const nav = all(
    before,
    (item) => item.type === 'nav' && item.props.id === toggle.props['aria-controls'],
  )[0];
  assert.ok(nav);
  assert.equal(nav.props.className, '');
  for (const link of all(nav, (item) => item.type === 'Link')) assert.ok(link.props['aria-label']);
  toggle.props.onClick();
  const after = page.render('AppShell', { children: 'conteúdo' });
  const expanded = all(after, (item) => item.type === 'button' && item.props['aria-controls'])[0];
  assert.equal(expanded.props['aria-expanded'], true);
  assert.equal(
    all(
      after,
      (item) => item.type === 'nav' && item.props.id === expanded.props['aria-controls'],
    )[0].props.className,
    'mobile-nav-expanded',
  );
  assert.ok(
    all(after, (item) => item.type === 'button' && item.props['aria-label'] === 'Sair').length,
  );
});

test('registration requires confirmation, rejects mismatch, omits confirmation in request', async () => {
  const page = mount('src/pages/RegisterPage.tsx');
  let view = page.render('RegisterPage');
  let fields = all(view, (item) => item.type === 'Input');
  const confirmation = fields.find((item) => item.props.label === 'Confirmar senha');
  assert.ok(confirmation);
  fields.find((item) => item.props.label === 'Nome').props.onChange({ target: { value: 'Test' } });
  fields
    .find((item) => item.props.label === 'E-mail')
    .props.onChange({ target: { value: 't@example.com' } });
  fields
    .find((item) => item.props.label === 'Senha')
    .props.onChange({ target: { value: 'test-password' } });
  await all(page.render('RegisterPage'), (item) => item.type === 'form')[0].props.onSubmit({
    preventDefault() {},
  });
  assert.equal(page.calls.length, 0);
  view = page.render('RegisterPage');
  fields = all(view, (item) => item.type === 'Input');
  assert.equal(
    fields.find((item) => item.props.label === 'Confirmar senha').props.error,
    'Confirme sua senha.',
  );
  fields
    .find((item) => item.props.label === 'Confirmar senha')
    .props.onChange({ target: { value: 'other-password' } });
  await all(page.render('RegisterPage'), (item) => item.type === 'form')[0].props.onSubmit({
    preventDefault() {},
  });
  assert.equal(page.calls.length, 0);
  view = page.render('RegisterPage');
  assert.equal(
    all(view, (item) => item.type === 'Input').find(
      (item) => item.props.label === 'Confirmar senha',
    ).props.error,
    'As senhas não coincidem.',
  );
  all(page.render('RegisterPage'), (item) => item.type === 'Input')
    .find((item) => item.props.label === 'Confirmar senha')
    .props.onChange({ target: { value: 'test-password' } });
  await all(page.render('RegisterPage'), (item) => item.type === 'form')[0].props.onSubmit({
    preventDefault() {},
  });
  assert.equal(page.calls.length, 1);
  assert.equal(page.calls[0].url, '/auth/register');
  assert.equal(
    Object.prototype.hasOwnProperty.call(page.calls[0].payload, 'confirmPassword'),
    false,
  );
});

test('registration accepts backend DTO boundaries and exposes matching input limits', async () => {
  const page = mount('src/pages/RegisterPage.tsx');
  const fields = all(page.render('RegisterPage'), (item) => item.type === 'Input');
  const maxEmail = `${'e'.repeat(64)}@${'d'.repeat(63)}.${'d'.repeat(63)}.${'d'.repeat(62)}`;
  const values = {
    Nome: 'n'.repeat(100),
    'E-mail': maxEmail,
    Senha: 'p'.repeat(128),
    'Confirmar senha': 'p'.repeat(128),
  };
  for (const field of fields)
    field.props.onChange({ target: { value: values[field.props.label] } });
  assert.equal(fields.find((item) => item.props.label === 'Nome').props.maxLength, 100);
  assert.equal(fields.find((item) => item.props.label === 'E-mail').props.maxLength, 255);
  assert.equal(fields.find((item) => item.props.label === 'Senha').props.maxLength, 128);
  await all(page.render('RegisterPage'), (item) => item.type === 'form')[0].props.onSubmit({
    preventDefault() {},
  });
  assert.equal(page.calls.length, 1);
});

test('registration rejects values above backend DTO limits', async () => {
  const page = mount('src/pages/RegisterPage.tsx');
  const fields = all(page.render('RegisterPage'), (item) => item.type === 'Input');
  const password = 'p'.repeat(129);
  const maxEmail = `${'e'.repeat(64)}@${'d'.repeat(63)}.${'d'.repeat(63)}.${'d'.repeat(62)}`;
  fields
    .find((item) => item.props.label === 'Nome')
    .props.onChange({ target: { value: 'n'.repeat(101) } });
  fields
    .find((item) => item.props.label === 'E-mail')
    .props.onChange({ target: { value: `${maxEmail}d` } });
  fields
    .find((item) => item.props.label === 'Senha')
    .props.onChange({ target: { value: password } });
  fields
    .find((item) => item.props.label === 'Confirmar senha')
    .props.onChange({ target: { value: password } });
  await all(page.render('RegisterPage'), (item) => item.type === 'form')[0].props.onSubmit({
    preventDefault() {},
  });
  const invalid = all(page.render('RegisterPage'), (item) => item.type === 'Input');
  assert.equal(page.calls.length, 0);
  assert.match(invalid.find((item) => item.props.label === 'Nome').props.error, /100/);
  assert.match(invalid.find((item) => item.props.label === 'E-mail').props.error, /255/);
  assert.match(invalid.find((item) => item.props.label === 'Senha').props.error, /128/);
});

test('history preserves successful rows and warns when project results are partial', async () => {
  const page = mount('src/pages/HistoryPage.tsx', {
    get: async (url) => {
      if (url === '/projects')
        return {
          data: [
            { id: 'ok', name: 'Disponível' },
            { id: 'failed', name: 'Indisponível' },
          ],
        };
      if (url.includes('/ok/'))
        return { data: [analysis('a1', 'COMPLETED', '2026-03-06T12:00:00Z')] };
      throw Error('internal client details');
    },
  });
  page.render('HistoryPage');
  await page.load();
  const view = page.render('HistoryPage');
  assert.ok(text(view).includes('Disponível'));
  assert.ok(text(view).includes('histórico está incompleto'));
  assert.ok(!text(view).includes('internal client details'));
  const tableScroller = all(
    view,
    (item) => item.type === 'div' && item.props.className?.includes('overflow-x-auto'),
  )[0];
  assert.match(tableScroller.props.className, /\brelative\b/);
  const tableScrollerClasses = tableScroller.props.className.split(/\s+/);
  for (const className of ['w-full', 'min-w-0', 'max-w-full'])
    assert.ok(tableScrollerClasses.includes(className));
  const historyGrid = all(
    view,
    (item) => item.type === 'div' && item.props.className?.includes('grid min-w-0 max-w-full'),
  )[0];
  assert.ok(historyGrid);
  const remove = all(
    view,
    (item) =>
      item.type === 'Button' &&
      item.props['aria-label']?.startsWith('Excluir análise de Disponível'),
  )[0];
  assert.ok(remove);
  remove.props.onClick();
  const confirmation = page.render('HistoryPage');
  assert.ok(
    all(
      confirmation,
      (item) =>
        item.type === 'Button' &&
        item.props['aria-label']?.startsWith('Confirmar exclusão da análise de Disponível'),
    ).length,
  );
  assert.ok(
    all(
      confirmation,
      (item) =>
        item.type === 'Button' &&
        item.props['aria-label']?.startsWith('Cancelar exclusão da análise de Disponível'),
    ).length,
  );
});

test('history reports total analysis-query failure without an empty state', async () => {
  const page = mount('src/pages/HistoryPage.tsx', {
    get: async (url) => {
      if (url === '/projects')
        return {
          data: [
            { id: 'failed-1', name: 'Um' },
            { id: 'failed-2', name: 'Dois' },
          ],
        };
      throw Error('internal client details');
    },
  });
  page.render('HistoryPage');
  await page.load();
  const view = page.render('HistoryPage');
  assert.ok(
    text(view).includes('Não foi possível carregar o histórico. Tente novamente em instantes.'),
  );
  assert.ok(!text(view).includes('alguns projetos'));
  assert.ok(!text(view).includes('internal client details'));
  assert.equal(all(view, (item) => item.type === 'EmptyState').length, 0);
});

test('history distinguishes a successful empty result from request failures', async () => {
  const page = mount('src/pages/HistoryPage.tsx', {
    get: async (url) => ({
      data: url === '/projects' ? [{ id: 'empty', name: 'Sem análises' }] : [],
    }),
  });
  page.render('HistoryPage');
  await page.load();
  const view = page.render('HistoryPage');
  const empty = all(view, (item) => item.type === 'EmptyState')[0];
  assert.equal(empty.props.title, 'Nenhuma análise no histórico');
  assert.ok(!text(view).includes('Não foi possível carregar o histórico'));
});

test('history does not present a partial empty result as complete absence', async () => {
  const page = mount('src/pages/HistoryPage.tsx', {
    get: async (url) => {
      if (url === '/projects')
        return {
          data: [
            { id: 'empty', name: 'Disponível' },
            { id: 'failed', name: 'Indisponível' },
          ],
        };
      if (url.includes('/empty/')) return { data: [] };
      throw Error('unavailable');
    },
  });
  page.render('HistoryPage');
  await page.load();
  const view = page.render('HistoryPage');
  const empty = all(view, (item) => item.type === 'EmptyState')[0];
  assert.equal(empty.props.title, 'Nenhum resultado disponível nos projetos carregados');
  assert.ok(text(view).includes('histórico está incompleto'));
});

test('history aborts loading on unmount without rendering cancellation as an error', async () => {
  let resolveProjects;
  let requestSignal;
  const page = mount('src/pages/HistoryPage.tsx', {
    get: (_url, config) => {
      requestSignal = config.signal;
      return new Promise((resolve) => {
        resolveProjects = resolve;
      });
    },
  });
  page.render('HistoryPage');
  const cleanup = page.startEffect();
  assert.equal(requestSignal.aborted, false);
  cleanup();
  assert.equal(requestSignal.aborted, true);

  resolveProjects({ data: [{ id: 'old', name: 'Resultado obsoleto' }] });
  await new Promise(setImmediate);
  await new Promise(setImmediate);
  const view = page.render('HistoryPage');
  assert.equal(all(view, (item) => item.type === 'Alert').length, 0);
  assert.equal(all(view, (item) => item.type === 'EmptyState').length, 0);
  assert.ok(!text(view).includes('Resultado obsoleto'));
});

test('repeated delete actions identify their project', async () => {
  const page = mount('src/pages/DashboardPage.tsx', {
    get: async (url) => ({
      data:
        url === '/projects'
          ? [
              {
                id: 'p1',
                name: 'Sistema crítico',
                description: '',
                createdAt: '2026-01-01T00:00:00Z',
              },
            ]
          : [],
    }),
  });
  page.render('DashboardPage');
  await page.load();
  let view = page.render('DashboardPage');
  const remove = all(
    view,
    (item) =>
      item.type === 'Button' && item.props['aria-label'] === 'Excluir projeto Sistema crítico',
  )[0];
  assert.ok(remove);
  remove.props.onClick();
  view = page.render('DashboardPage');
  assert.ok(
    all(
      view,
      (item) =>
        item.type === 'Button' &&
        item.props['aria-label'] === 'Confirmar exclusão do projeto Sistema crítico',
    ).length,
  );
  assert.ok(
    all(
      view,
      (item) =>
        item.type === 'Button' &&
        item.props['aria-label'] === 'Cancelar exclusão do projeto Sistema crítico',
    ).length,
  );
});

test('navigation links styled as buttons do not contain Button controls', () => {
  for (const file of [
    'src/pages/DashboardPage.tsx',
    'src/pages/ProjectDetailPage.tsx',
    'src/pages/NotFoundPage.tsx',
  ]) {
    assert.doesNotMatch(readFileSync(file, 'utf8'), /<Link\b[^>]*>\s*<Button\b/);
  }
});

test('unknown frontend route has a safe fallback and home link', () => {
  const app = mount('src/App.tsx');
  const routes = all(app.render('App'), (item) => item.type === 'Route');
  const root = routes.find((item) => item.props.path === '/');
  assert.ok(root);
  assert.equal(root.props.element.type, 'Navigate');
  assert.equal(root.props.element.props.to, '/dashboard');
  assert.ok(routes.find((item) => item.props.path === '*'));
  const fallback = mount('src/pages/NotFoundPage.tsx');
  const view = fallback.render('NotFoundPage');
  assert.ok(text(view).includes('Página não encontrada'));
  assert.ok(all(view, (item) => item.type === 'Link' && item.props.to === '/dashboard').length);
});
