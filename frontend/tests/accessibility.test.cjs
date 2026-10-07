const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function mountPage(fileName, exportName) {
  const state = [];
  const refs = [];
  const calls = [];
  let stateSlot = 0;
  let refSlot = 0;
  const node = (type, props) => ({ type, props });
  const source = readFileSync(`src/pages/${fileName}.tsx`, 'utf8');
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
          useRef: (initial) => {
            const index = refSlot++;
            if (!(index in refs)) refs[index] = { current: initial };
            return refs[index];
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
        return { Link: 'Link', useNavigate: () => () => {}, useParams: () => ({ id: 'id' }) };
      if (name === '../services/api')
        return {
          api: {
            post: async (url, body) => {
              calls.push({ url, body });
              return { data: { id: 'project-id', token: 'token' } };
            },
          },
          setToken: () => true,
        };
      if (name === '../services/authErrors')
        return { authErrorMessage: (_error, fallback) => fallback };
      if (name === '../services/httpErrors')
        return { httpErrorMessage: (_error, fallback) => fallback };
      if (name === '../services/uploadErrors')
        return { uploadErrorMessage: (_error, fallback) => fallback };
      if (name === '../utils/validation')
        return { isValidEmail: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) };
      if (name === 'react/jsx-runtime') return { jsx: node, jsxs: node };
      const component = name.split('/').pop();
      return { [component]: component };
    },
    FormData: class {
      append() {}
    },
  });

  return {
    calls,
    render: () => {
      stateSlot = 0;
      refSlot = 0;
      return exports[exportName]();
    },
  };
}

function all(tree, predicate) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap((item) => all(item, predicate));
  return [...(predicate(tree) ? [tree] : []), ...all(tree.props?.children, predicate)];
}

test('login focuses the first invalid field and announces the validation summary', async () => {
  const page = mountPage('LoginPage', 'LoginPage');
  const initial = page.render();
  const fields = all(initial, (item) => item.type === 'Input');
  let focused = '';
  for (const field of fields) {
    field.props.ref.current = { focus: () => (focused = field.props.name) };
  }

  await all(initial, (item) => item.type === 'form')[0].props.onSubmit({ preventDefault() {} });
  const invalid = page.render();
  assert.equal(focused, 'email');
  assert.equal(fields[0].props.ref.current !== null, true);
  assert.ok(all(invalid, (item) => item.props?.['aria-live'] === 'polite').length);
  assert.equal(
    all(invalid, (item) => item.type === 'Input' && item.props.name === 'email')[0].props.error,
    'Informe seu e-mail.',
  );
  assert.equal(page.calls.length, 0);
});

test('registration focuses the first invalid field in visual order', async () => {
  const page = mountPage('RegisterPage', 'RegisterPage');
  const initial = page.render();
  const fields = all(initial, (item) => item.type === 'Input');
  let focused = '';
  for (const field of fields) {
    field.props.ref.current = { focus: () => (focused = field.props.name) };
  }

  await all(initial, (item) => item.type === 'form')[0].props.onSubmit({ preventDefault() {} });
  const invalid = page.render();
  assert.equal(focused, 'name');
  assert.ok(all(invalid, (item) => item.props?.['aria-live'] === 'polite').length);
  assert.equal(page.calls.length, 0);
});

test('new project focuses an invalid description and keeps it programmatically described', async () => {
  const page = mountPage('NewProjectPage', 'NewProjectPage');
  const initial = page.render();
  const name = all(initial, (item) => item.type === 'Input')[0];
  const description = all(initial, (item) => item.type === 'textarea')[0];
  let focused = '';
  name.props.ref.current = { focus: () => (focused = 'name') };
  description.props.ref.current = { focus: () => (focused = 'description') };
  name.props.onChange({ target: { value: 'Projeto válido' } });
  description.props.onChange({ target: { value: 'd'.repeat(2001) } });

  await all(page.render(), (item) => item.type === 'form')[0].props.onSubmit({
    preventDefault() {},
  });
  const invalid = page.render();
  const invalidDescription = all(invalid, (item) => item.type === 'textarea')[0];
  assert.equal(focused, 'description');
  assert.equal(invalidDescription.props['aria-invalid'], true);
  assert.equal(invalidDescription.props['aria-describedby'], 'project-description-error');
  assert.ok(all(invalid, (item) => item.props?.['aria-live'] === 'polite').length);
  assert.equal(page.calls.length, 0);
});

test('Input associates its visible error with the native input and forwards its ref', () => {
  const source = readFileSync('src/components/ui/Input.tsx', 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  const exports = {};
  const node = (type, props) => ({ type, props });
  vm.runInNewContext(compiled, {
    exports,
    require: (name) => {
      if (name === 'react/jsx-runtime') return { jsx: node, jsxs: node };
      if (name === '../../lib/cn') return { cn: (...values) => values.filter(Boolean).join(' ') };
      return { CircleAlert: 'CircleAlert' };
    },
  });
  const ref = { current: null };
  const rendered = exports.Input({
    label: 'E-mail',
    name: 'email',
    error: 'E-mail inválido.',
    ref,
  });
  const input = all(rendered, (item) => item.type === 'input')[0];
  const error = all(rendered, (item) => item.type === 'p')[0];
  assert.equal(input.props.ref, ref);
  assert.equal(input.props['aria-invalid'], true);
  assert.equal(input.props['aria-describedby'], 'email-error');
  assert.equal(error.props.id, 'email-error');
});
