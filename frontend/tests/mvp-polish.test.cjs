const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { test } = require('node:test')
const vm = require('node:vm')
const ts = require('typescript')

function mount(path, api = {}) {
  const state = []
  const effects = []
  const calls = []
  let slot = 0
  const element = (type, props) => ({ type, props })
  const source = readFileSync(path, 'utf8')
  const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText
  const exports = {}
  vm.runInNewContext(compiled, {
    exports,
    require: (name) => {
      if (name === 'react') return {
        useState: (initial) => {
          const i = slot++
          if (!(i in state)) state[i] = initial
          return [state[i], (next) => { state[i] = typeof next === 'function' ? next(state[i]) : next }]
        },
        useEffect: (fn) => { if (effects.length === 0) effects.push(fn) },
      }
      if (name === 'react-router-dom') return {
        Link: 'Link', Route: 'Route', Routes: 'Routes', BrowserRouter: 'BrowserRouter', Navigate: 'Navigate',
        useLocation: () => ({ pathname: '/dashboard' }), useNavigate: () => () => {},
      }
      if (name === '../services/api') return { api: {
        get: (url) => api.get(url), post: async (url, payload) => { calls.push({ url, payload }); return { data: {} } },
      }, clearToken: () => {}, hasToken: () => true }
      if (name === 'react/jsx-runtime') return { jsx: element, jsxs: element }
      if (name === '../components/Badge') return { Badge: ({ children }) => element('Badge', { children }) }
      const component = name.split('/').pop()
      return { [component]: component }
    },
  })
  return {
    render: (name, props = {}) => { slot = 0; return (exports[name] ?? exports.default)(props) },
    load: async () => { await Promise.all(effects.map((effect) => effect())); await new Promise(setImmediate) },
    calls,
  }
}

function all(tree, predicate) {
  if (!tree || typeof tree !== 'object') return []
  if (Array.isArray(tree)) return tree.flatMap((item) => all(item, predicate))
  return [...(predicate(tree) ? [tree] : []), ...all(tree.props?.children, predicate)]
}
function text(tree) {
  if (Array.isArray(tree)) return tree.map(text).join(' ')
  if (tree && typeof tree === 'object') return text(tree.props?.children)
  return String(tree ?? '')
}
function analysis(id, status, date) {
  return { id, status, provider: 'DEEPSEEK', createdAt: date }
}

for (const [count, expected] of [[1, '1 análise'], [2, '2 análises']]) {
  test(`Dashboard pluralizes ${count} analyses`, async () => {
    const page = mount('src/pages/DashboardPage.tsx', {
      get: async (url) => ({ data: url === '/projects' ? [{ id: 'p1', name: 'Sistema' }]
        : Array.from({ length: count }, (_, i) => analysis(`a${i}`, 'COMPLETED', '2026-01-01T12:00:00Z')) }),
    })
    page.render('DashboardPage')
    await page.load()
    assert.ok(text(page.render('DashboardPage')).replace(/\s+/g, ' ').includes(expected))
  })
}

test('Dashboard shows up to five recent analyses and routes by status', async () => {
  const page = mount('src/pages/DashboardPage.tsx', { get: async (url) => ({ data: url === '/projects'
    ? [{ id: 'p1', name: 'Sistema' }] : [
      analysis('done', 'COMPLETED', '2026-03-06T12:00:00Z'),
      analysis('running', 'PROCESSING', '2026-03-05T12:00:00Z'),
      analysis('queued', 'PENDING', '2026-03-04T12:00:00Z'),
      analysis('broken', 'FAILED', '2026-03-03T12:00:00Z'),
      analysis('five', 'COMPLETED', '2026-03-02T12:00:00Z'),
      analysis('six', 'COMPLETED', '2026-03-01T12:00:00Z'),
    ] }) })
  page.render('DashboardPage')
  await page.load()
  const view = page.render('DashboardPage')
  assert.ok(text(view).includes('Análises recentes'))
  const links = all(view, (item) => item.type === 'Link').map((item) => item.props.to)
  assert.ok(links.includes('/analyses/done'))
  for (const id of ['running', 'queued', 'broken']) assert.ok(links.includes(`/analyses/${id}/processing`))
  assert.equal(links.filter((url) => url?.startsWith('/analyses/')).length, 5)
  assert.ok(text(view).includes('Sistema'))
  assert.ok(text(view).includes('DEEPSEEK'))
  assert.ok(text(view).includes('06/03/2026'))
})

test('Dashboard has an actionable empty analyses state even without projects', async () => {
  const page = mount('src/pages/DashboardPage.tsx', { get: async () => ({ data: [] }) })
  page.render('DashboardPage')
  await page.load()
  const view = page.render('DashboardPage')
  assert.ok(text(view).includes('Nenhuma análise realizada ainda.'))
  assert.ok(all(view, (item) => item.type === 'Link' && item.props.to === '/projects/new').length)
})

test('Dashboard isolates history errors from project cards', async () => {
  const page = mount('src/pages/DashboardPage.tsx', { get: async (url) => {
    if (url === '/projects') return { data: [{ id: 'p1', name: 'Sistema' }] }
    throw Error('internal client details')
  } })
  page.render('DashboardPage')
  await page.load()
  const view = page.render('DashboardPage')
  assert.ok(text(view).includes('Sistema'))
  assert.ok(text(view).includes('Não foi possível carregar as análises recentes.'))
  assert.ok(!text(view).includes('internal client details'))
  assert.ok(text(view).includes('Contagem indisponível'))
  assert.ok(!text(view).includes('0 análises'))
})

test('mobile navigation has labelled icon controls and a communicating toggle', () => {
  const page = mount('src/components/AppShell.tsx')
  const before = page.render('AppShell', { children: 'conteúdo' })
  const toggle = all(before, (item) => item.type === 'button' && item.props['aria-controls'])[0]
  assert.ok(toggle)
  assert.equal(toggle.props['aria-expanded'], false)
  assert.ok(toggle.props['aria-label'])
  const nav = all(before, (item) => item.type === 'nav' && item.props.id === toggle.props['aria-controls'])[0]
  assert.ok(nav)
  for (const link of all(nav, (item) => item.type === 'Link')) assert.ok(link.props['aria-label'])
  toggle.props.onClick()
  const after = page.render('AppShell', { children: 'conteúdo' })
  const expanded = all(after, (item) => item.type === 'button' && item.props['aria-controls'])[0]
  assert.equal(expanded.props['aria-expanded'], true)
  assert.ok(all(after, (item) => item.type === 'button' && item.props['aria-label'] === 'Sair').length)
})

test('registration requires confirmation, rejects mismatch, omits confirmation in request', async () => {
  const page = mount('src/pages/RegisterPage.tsx')
  let view = page.render('RegisterPage')
  let fields = all(view, (item) => item.type === 'Input')
  const confirmation = fields.find((item) => item.props.label === 'Confirmar senha')
  assert.ok(confirmation)
  assert.equal(confirmation.props.required, true)
  fields.find((item) => item.props.label === 'Nome').props.onChange({ target: { value: 'Test' } })
  fields.find((item) => item.props.label === 'E-mail').props.onChange({ target: { value: 't@example.com' } })
  fields.find((item) => item.props.label === 'Senha').props.onChange({ target: { value: 'test-password' } })
  await all(page.render('RegisterPage'), (item) => item.type === 'form')[0].props.onSubmit({ preventDefault() {} })
  assert.equal(page.calls.length, 0)
  view = page.render('RegisterPage')
  assert.ok(text(view).includes('Confirme sua senha.'))
  fields = all(view, (item) => item.type === 'Input')
  fields.find((item) => item.props.label === 'Confirmar senha').props.onChange({ target: { value: 'other-password' } })
  await all(page.render('RegisterPage'), (item) => item.type === 'form')[0].props.onSubmit({ preventDefault() {} })
  assert.equal(page.calls.length, 0)
  assert.ok(text(page.render('RegisterPage')).includes('As senhas não coincidem.'))
  all(page.render('RegisterPage'), (item) => item.type === 'Input').find((item) => item.props.label === 'Confirmar senha').props.onChange({ target: { value: 'test-password' } })
  await all(page.render('RegisterPage'), (item) => item.type === 'form')[0].props.onSubmit({ preventDefault() {} })
  assert.equal(page.calls.length, 1)
  assert.equal(page.calls[0].url, '/auth/register')
  assert.equal(Object.prototype.hasOwnProperty.call(page.calls[0].payload, 'confirmPassword'), false)
})

test('unknown frontend route has a safe fallback and home link', () => {
  const app = mount('src/App.tsx')
  const routes = all(app.render('App'), (item) => item.type === 'Route')
  assert.ok(routes.find((item) => item.props.path === '*'))
  const fallback = mount('src/pages/NotFoundPage.tsx')
  const view = fallback.render('NotFoundPage')
  assert.ok(text(view).includes('Página não encontrada'))
  assert.ok(all(view, (item) => item.type === 'Link' && item.props.to === '/dashboard').length)
})
