const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function mount(fileName, exportName, api) {
  const state = [];
  const refs = [];
  const effects = [];
  const navigations = [];
  let slot = 0;
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
          useEffect: (fn) => {
            if (effects.length === 0) effects.push(fn);
          },
          useRef: (initial) => {
            const index = refSlot++;
            if (!(index in refs)) refs[index] = { current: initial };
            return refs[index];
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
          useNavigate: () => (url) => navigations.push(url),
          useParams: () => ({ id: 'project-id' }),
        };
      if (name === '../services/api') return { api };
      if (name === '../services/uploadErrors') {
        const httpExports = {};
        vm.runInNewContext(
          ts.transpileModule(readFileSync('src/services/httpErrors.ts', 'utf8'), {
            compilerOptions: { module: ts.ModuleKind.CommonJS },
          }).outputText,
          { exports: httpExports },
        );
        const uploadExports = {};
        vm.runInNewContext(
          ts.transpileModule(readFileSync('src/services/uploadErrors.ts', 'utf8'), {
            compilerOptions: { module: ts.ModuleKind.CommonJS },
          }).outputText,
          { exports: uploadExports, require: () => httpExports },
        );
        return uploadExports;
      }
      if (name === '../services/httpErrors')
        return {
          httpErrorMessage: (error, fallback) =>
            error?.response?.status === 403
              ? 'Acesso negado. Você não tem permissão para acessar este recurso.'
              : fallback,
        };
      if (name === 'react/jsx-runtime') return { jsx: node, jsxs: node };
      const component = name.split('/').pop();
      return { [component]: component };
    },
    FormData: class {
      fields = [];
      append(name, value) {
        this.fields.push({ name, value });
      }
    },
    setInterval: () => 7,
    clearInterval: () => {},
    AbortController,
  });
  const render = () => {
    slot = 0;
    refSlot = 0;
    return exports[exportName]();
  };
  return { render, load: () => effects[0](), navigations };
}

function find(node, predicate) {
  if (!node || typeof node !== 'object') return undefined;
  if (Array.isArray(node)) return node.map((item) => find(item, predicate)).find(Boolean);
  if (predicate(node)) return node;
  return find(node.props?.children, predicate);
}
const flush = () => new Promise(setImmediate);

test('existing project uploads once and updates the visible file list', async () => {
  let finishUpload;
  const posts = [];
  const api = {
    get: async (url) => ({
      data: url.endsWith('/files')
        ? []
        : url.endsWith('/analyses')
          ? []
          : { id: 'project-id', name: 'Teste', description: '' },
    }),
    post: (url, data) => {
      posts.push({ url, data });
      return new Promise((resolve) => {
        finishUpload = resolve;
      });
    },
  };
  const page = mount('ProjectDetailPage', 'ProjectDetailPage', api);
  page.render();
  await page.load();
  await flush();
  const file = { name: 'recorte.txt', size: 100 };
  const initial = page.render();
  const picker = find(initial, (item) => item.type === 'input' && item.props?.type === 'file');
  assert.ok(picker);
  picker.props.onChange({ target: { files: [file] } });
  const withFile = page.render();
  const uploadForm = find(withFile, (item) => item.type === 'form' && item.props?.onSubmit);
  assert.ok(uploadForm);
  const event = { preventDefault() {}, currentTarget: { reset() {} } };
  const first = uploadForm.props.onSubmit(event);
  assert.equal(posts.length, 1);
  assert.equal(posts[0].url, '/projects/project-id/files');
  const inProgress = page.render();
  const submit = find(inProgress, (item) => item.props?.children === 'Adicionar arquivo');
  assert.equal(submit.props.loading || submit.props.disabled, true);
  await uploadForm.props.onSubmit(event);
  assert.equal(posts.length, 1);
  finishUpload({ data: { id: 'file-1', fileName: file.name, fileSize: 100 } });
  await first;
  const updated = page.render();
  assert.ok(
    find(updated, (item) => item.type === 'li' && JSON.stringify(item).includes('recorte.txt')),
  );
});

test('existing project accepts an upload exactly at the 70 MiB boundary', async () => {
  const posts = [];
  const page = mount('ProjectDetailPage', 'ProjectDetailPage', {
    get: async (url) => ({
      data: url.endsWith('/files')
        ? []
        : url.endsWith('/analyses')
          ? []
          : { id: 'project-id', name: 'Teste', description: '' },
    }),
    post: async (url) => {
      posts.push(url);
      return { data: { id: 'file-limit', fileName: 'limit.zip', fileSize: 70 * 1024 * 1024 } };
    },
  });
  page.render();
  await page.load();
  await flush();
  const initial = page.render();
  find(initial, (item) => item.type === 'input' && item.props?.type === 'file').props.onChange({
    target: { files: [{ name: 'limit.zip', size: 70 * 1024 * 1024 }] },
  });
  const form = find(page.render(), (item) => item.type === 'form' && item.props?.onSubmit);
  await form.props.onSubmit({ preventDefault() {}, currentTarget: { reset() {} } });
  assert.deepEqual(posts, ['/projects/project-id/files']);
});

test('existing project blocks an upload above 70 MiB without an HTTP request', async () => {
  const posts = [];
  const page = mount('ProjectDetailPage', 'ProjectDetailPage', {
    get: async (url) => ({
      data: url.endsWith('/files')
        ? []
        : url.endsWith('/analyses')
          ? []
          : { id: 'project-id', name: 'Teste', description: '' },
    }),
    post: async (url) => {
      posts.push(url);
      return { data: {} };
    },
  });
  page.render();
  await page.load();
  await flush();
  const initial = page.render();
  find(initial, (item) => item.type === 'input' && item.props?.type === 'file').props.onChange({
    target: { files: [{ name: 'large.zip', size: 70 * 1024 * 1024 + 1 }] },
  });
  const form = find(page.render(), (item) => item.type === 'form' && item.props?.onSubmit);
  await form.props.onSubmit({ preventDefault() {}, currentTarget: { reset() {} } });
  const invalid = page.render();
  assert.equal(posts.length, 0);
  assert.ok(JSON.stringify(invalid).includes('O arquivo deve ter no máximo 70 MB.'));
});

test('new project advertises supported files and displays a safe upload error with a recovery link', async () => {
  const posts = [];
  const page = mount('NewProjectPage', 'NewProjectPage', {
    post: async (url) => {
      posts.push(url);
      if (url === '/projects') return { data: { id: 'project-id' } };
      throw {
        response: {
          status: 400,
          data: { error: 'INVALID_FILE', message: 'Tipo ou extensão de arquivo inválido' },
        },
      };
    },
  });
  const initial = page.render();
  assert.ok(JSON.stringify(initial).includes('70 MB'));
  assert.ok(JSON.stringify(initial).includes('ZIP, TXT, MD ou README'));
  const picker = find(initial, (item) => item.type === 'input' && item.props?.type === 'file');
  assert.ok(picker.props.accept.includes('.txt'));
  assert.ok(!picker.props.accept.includes('.pdf'));
  find(
    initial,
    (item) => item.type === 'Input' && item.props.label === 'Nome do projeto',
  ).props.onChange({ target: { value: 'Projeto Teste' } });
  picker.props.onChange({ target: { files: [{ name: 'invalid.txt', size: 10 }] } });
  const form = find(page.render(), (item) => item.type === 'form');
  await form.props.onSubmit({ preventDefault() {} });
  const failed = page.render();
  assert.ok(JSON.stringify(failed).includes('Tipo ou extensão de arquivo inválido'));
  assert.ok(
    find(failed, (item) => item.type === 'Link' && item.props.to === '/projects/project-id'),
  );
  assert.equal(posts.length, 2);
});

test('new project rejects files above 70 MiB before creating the project', async () => {
  const posts = [];
  const page = mount('NewProjectPage', 'NewProjectPage', {
    post: async (url) => {
      posts.push(url);
      return { data: { id: 'project-id' } };
    },
  });
  const initial = page.render();
  find(
    initial,
    (item) => item.type === 'Input' && item.props.label === 'Nome do projeto',
  ).props.onChange({ target: { value: 'Projeto grande' } });
  find(initial, (item) => item.type === 'input' && item.props?.type === 'file').props.onChange({
    target: { files: [{ name: 'large.zip', size: 70 * 1024 * 1024 + 1 }] },
  });

  await find(page.render(), (item) => item.type === 'form').props.onSubmit({ preventDefault() {} });
  const invalid = page.render();
  const picker = find(invalid, (item) => item.type === 'input' && item.props?.type === 'file');
  assert.equal(posts.length, 0);
  assert.equal(picker.props['aria-invalid'], true);
  assert.equal(picker.props['aria-describedby'], 'project-file-error');
  assert.ok(JSON.stringify(invalid).includes('O arquivo deve ter no máximo 70 MB.'));
});

test('new project accepts a file exactly at the 70 MiB boundary', async () => {
  const posts = [];
  const page = mount('NewProjectPage', 'NewProjectPage', {
    post: async (url) => {
      posts.push(url);
      return { data: url === '/projects' ? { id: 'project-id' } : {} };
    },
  });
  const initial = page.render();
  find(
    initial,
    (item) => item.type === 'Input' && item.props.label === 'Nome do projeto',
  ).props.onChange({ target: { value: 'Projeto limite' } });
  find(initial, (item) => item.type === 'input' && item.props?.type === 'file').props.onChange({
    target: { files: [{ name: 'limit.zip', size: 70 * 1024 * 1024 }] },
  });

  await find(page.render(), (item) => item.type === 'form').props.onSubmit({ preventDefault() {} });
  assert.deepEqual(posts, ['/projects', '/projects/project-id/files']);
});

const validProjectNames = [
  ['LegacyAI', 'LegacyAI'],
  ['Projeto Legacy 2026', 'Projeto Legacy 2026'],
  ['Análise Java', 'Análise Java'],
  ['João Sistema 01', 'João Sistema 01'],
  ['150 unidades', 'Á'.repeat(150)],
  ['Unicode suplementar em 150 unidades', '\u{10400}' + 'A'.repeat(148)],
  ['normalizado', '   Projeto    Legacy   ', 'Projeto Legacy'],
];

for (const [label, input, expected = input] of validProjectNames) {
  test(`new project accepts valid name: ${label}`, async () => {
    const posts = [];
    const page = mount('NewProjectPage', 'NewProjectPage', {
      post: async (url, payload) => {
        posts.push({ url, payload });
        return { data: { id: 'project-id' } };
      },
    });
    const initial = page.render();
    const name = find(
      initial,
      (item) => item.type === 'Input' && item.props.label === 'Nome do projeto',
    );
    assert.equal(name.props.maxLength, 150);
    name.props.onChange({ target: { value: input } });
    await find(page.render(), (item) => item.type === 'form').props.onSubmit({
      preventDefault() {},
    });
    assert.equal(posts.length, 1);
    assert.equal(posts[0].payload.name, expected);
  });
}

const invalidProjectNames = [
  ['vazio', '', /Informe o nome/],
  ['espaços', '  ', /Informe o nome/],
  ['curto', 'ab', /pelo menos 3 caracteres/],
  ['somente números longos', '888888888', /pelo menos uma letra/],
  ['somente números', '123', /pelo menos uma letra/],
  ['arroba', 'Projeto@', /somente letras, números e espaços/],
  ['exclamação', 'Projeto!', /somente letras, números e espaços/],
  ['sublinhado', 'Legacy_AI', /somente letras, números e espaços/],
  ['hífen', 'Legacy-AI', /somente letras, números e espaços/],
  ['especiais mistos', "~~ #'foo", /somente letras, números e espaços/],
  ['tab', '\tProjeto\t', /somente letras, números e espaços/],
  ['newline', '\nProjeto\n', /somente letras, números e espaços/],
  ['carriage return', '\rProjeto\r', /somente letras, números e espaços/],
  ['NBSP', '\u00A0Projeto\u00A0', /somente letras, números e espaços/],
  ['aspas', '"Projeto"', /somente letras, números e espaços/],
  ['151 unidades', 'A'.repeat(151), /150/],
];

for (const [label, input, message] of invalidProjectNames) {
  test(`new project rejects invalid name without losing value: ${label}`, async () => {
    const posts = [];
    const page = mount('NewProjectPage', 'NewProjectPage', {
      post: async (url, payload) => {
        posts.push({ url, payload });
        return { data: { id: 'project-id' } };
      },
    });
    let view = page.render();
    find(
      view,
      (item) => item.type === 'Input' && item.props.label === 'Nome do projeto',
    ).props.onChange({ target: { value: input } });
    await find(page.render(), (item) => item.type === 'form').props.onSubmit({
      preventDefault() {},
    });
    view = page.render();
    const name = find(
      view,
      (item) => item.type === 'Input' && item.props.label === 'Nome do projeto',
    );
    assert.equal(posts.length, 0);
    assert.equal(name.props.value, input);
    assert.match(name.props.error, message);
  });
}

test('new project rejects description 2001 without losing its value', async () => {
  const posts = [];
  const page = mount('NewProjectPage', 'NewProjectPage', {
    post: async (url, payload) => {
      posts.push({ url, payload });
      return { data: { id: 'project-id' } };
    },
  });
  let view = page.render();
  find(
    view,
    (item) => item.type === 'Input' && item.props.label === 'Nome do projeto',
  ).props.onChange({ target: { value: 'Projeto válido' } });
  find(view, (item) => item.type === 'textarea').props.onChange({
    target: { value: 'd'.repeat(2001) },
  });
  await find(page.render(), (item) => item.type === 'form').props.onSubmit({ preventDefault() {} });
  view = page.render();
  const description = find(view, (item) => item.type === 'textarea');
  assert.equal(posts.length, 0);
  assert.equal(description.props.value.length, 2001);
  assert.equal(description.props['aria-invalid'], true);
  assert.ok(JSON.stringify(view).includes('2000'));
});

test('FAILED stops showing the spinner and offers project and history exits', async () => {
  const page = mount('ProcessingPage', 'ProcessingPage', {
    get: async () => ({
      data: {
        status: 'FAILED',
        projectId: 'project-id',
        errorMessage: 'O upload não contém arquivos processáveis.',
      },
    }),
  });
  page.render();
  page.load();
  await flush();
  const failed = page.render();
  assert.equal(
    find(failed, (item) => item.type === 'Spinner'),
    undefined,
  );
  assert.ok(JSON.stringify(failed).includes('O upload não contém arquivos processáveis.'));
  assert.ok(
    find(failed, (item) => item.type === 'Link' && item.props.to === '/projects/project-id'),
  );
  assert.ok(find(failed, (item) => item.type === 'Link' && item.props.to === '/history'));
});
