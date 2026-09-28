const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { test } = require('node:test')
const vm = require('node:vm')
const ts = require('typescript')

function mountPage() {
  const state = []
  const posts = []
  let slot = 0
  let effect
  const node = (type, props) => ({ type, props })
  const api = {
    get: async () => ({ data: [
      { name: 'OPENAI', displayName: 'OPENAI', available: true },
      { name: 'CLAUDE', displayName: 'CLAUDE', available: true },
      { name: 'DEEPSEEK', displayName: 'DEEPSEEK', available: true },
    ] }),
    post: async (url, body) => { posts.push({ url, body }); return { data: { analysisId: 'new-analysis' } } },
  }
  const source = readFileSync('src/pages/NewAnalysisPage.tsx', 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText
  const exports = {}
  vm.runInNewContext(compiled, {
    exports,
    require: (name) => {
      if (name === 'react') return {
        useEffect: (fn) => { if (!effect) effect = fn },
        useState: (initial) => {
          const index = slot++
          if (!(index in state)) state[index] = initial
          return [state[index], (value) => { state[index] = typeof value === 'function' ? value(state[index]) : value }]
        },
      }
      if (name === 'react-router-dom') return { useNavigate: () => () => {}, useParams: () => ({ id: 'project-id' }) }
      if (name === '../services/api') return { api }
      if (name === 'react/jsx-runtime') return { jsx: node, jsxs: node }
      const component = name.split('/').pop()
      return { [component]: component }
    },
  })
  const render = () => { slot = 0; return exports.NewAnalysisPage() }
  return { render, load: () => effect(), posts }
}

function find(node, predicate) {
  if (!node || typeof node !== 'object') return undefined
  if (Array.isArray(node)) return node.map((item) => find(item, predicate)).find(Boolean)
  if (predicate(node)) return node
  return find(node.props?.children, predicate)
}

test('DeepSeek V4.1 Flash is selectable and submitted by provider name', async () => {
  const page = mountPage()
  page.render()
  await page.load()
  await new Promise(setImmediate)
  const initial = page.render()
  const deepSeek = find(initial, (item) => item.type === 'button' && item.props?.children?.[0]?.props?.children === 'DeepSeek V4.1 Flash')
  assert.ok(deepSeek)
  assert.equal(deepSeek.props.disabled, false)
  deepSeek.props.onClick()
  const selected = page.render()
  const selectedDeepSeek = find(selected, (item) => item.type === 'button' && item.props?.children?.[0]?.props?.children === 'DeepSeek V4.1 Flash')
  assert.equal(selectedDeepSeek.props['aria-pressed'], true)
  const submit = find(selected, (item) => item.props?.children === 'Iniciar análise')
  assert.equal(submit.props.disabled, false)
  await submit.props.onClick()
  assert.equal(page.posts.length, 1)
  assert.equal(page.posts[0].url, '/projects/project-id/analyses')
  assert.equal(page.posts[0].body.provider, 'DEEPSEEK')
})
