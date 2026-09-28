const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { test } = require('node:test')
const vm = require('node:vm')
const ts = require('typescript')

function mountReport(result) {
  const state = []
  let index = 0
  let effect
  const node = (type, props) => ({ type, props })
  const source = readFileSync('src/pages/AnalysisResultPage.tsx', 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText
  const exports = {}
  vm.runInNewContext(compiled, {
    exports,
    require: (name) => {
      if (name === 'react') return {
        useEffect: (callback) => { effect = callback },
        useState: (initial) => {
          const slot = index++
          if (!(slot in state)) state[slot] = initial
          return [state[slot], (value) => { state[slot] = value }]
        },
      }
      if (name === 'react-router-dom') return { useParams: () => ({ id: 'analysis-id' }) }
      if (name === '../services/api') return { api: { get: async () => ({ data: {
        status: 'COMPLETED', provider: 'OPENAI', createdAt: '2026-09-28T00:00:00Z', result,
      } }) } }
      if (name === 'react/jsx-runtime') return { jsx: node, jsxs: node }
      const component = name.split('/').pop()
      return { [component]: component }
    },
  })
  return {
    load: async () => { index = 0; exports.AnalysisResultPage(); effect(); await new Promise(setImmediate) },
    render: () => { index = 0; return exports.AnalysisResultPage() },
  }
}

function flatten(tree) {
  if (tree == null || typeof tree === 'boolean') return []
  if (Array.isArray(tree)) return tree.flatMap(flatten)
  if (typeof tree !== 'object') return [tree]
  if (typeof tree.type === 'function') return flatten(tree.type(tree.props))
  return [tree, ...flatten(tree.props?.children)]
}

const report = (overrides = {}) => ({
  summary: 'Visão geral', technologies: ['Java'], architecture: 'Camadas',
  problems: [{ title: 'Problema', description: 'Descrição', priority: 'HIGH' }],
  securityRisks: [{ title: 'Risco', description: 'Descrição', priority: 'MEDIUM' }],
  recommendations: [{ title: 'Recomendação', description: 'Descrição', priority: 'LOW' }],
  modernization: ['Modernizar gradualmente'], ...overrides,
})

// Inspects the rendered JSX tree, not the TSX source text.
test('renders seven sections, counts, and localized textual priorities without changing API values', async () => {
  const page = mountReport(report())
  await page.load()
  const rendered = flatten(page.render())
  const headings = rendered.filter((item) => item?.type === 'h2').map((item) => flatten(item.props.children).join(''))
  assert.deepEqual(headings, ['Resumo', 'Tecnologias identificadas', 'Arquitetura',
    'Problemas (1)', 'Riscos de segurança (1)', 'Recomendações (1)', 'Modernização'])
  const badges = rendered.filter((item) => item?.type === 'Badge')
  assert.deepEqual(badges.map((item) => item.props.children), ['Alta', 'Média', 'Baixa'])
  assert.deepEqual(badges.map((item) => item.props.variant), ['high', 'medium', 'low'])
})

test('renders empty technologies, modernization, and report-item counts', async () => {
  const page = mountReport(report({ technologies: [], modernization: [], problems: [], securityRisks: [], recommendations: [] }))
  await page.load()
  const rendered = flatten(page.render())
  const text = rendered.filter((item) => typeof item === 'string').join(' ')
  assert.ok(text.includes('Nenhuma tecnologia identificada no contexto analisado.'))
  assert.ok(text.includes('Nenhuma ação de modernização identificada no contexto analisado.'))
  assert.ok(text.includes('Problemas (0)'))
  assert.ok(text.includes('Riscos de segurança (0)'))
  assert.ok(text.includes('Recomendações (0)'))
})
