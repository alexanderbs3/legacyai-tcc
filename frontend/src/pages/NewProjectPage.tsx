import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { FileUp } from 'lucide-react';
import { Alert } from '../components/feedback/Alert';
import { Breadcrumb } from '../components/ui/Breadcrumb';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Progress } from '../components/ui/Progress';
import { PageHeader } from '../components/ui/PageHeader';
import { api } from '../services/api';
import { httpErrorMessage } from '../services/httpErrors';
import { MAX_UPLOAD_FILE_SIZE, uploadErrorMessage } from '../services/uploadErrors';
import type { Project, ProjectRequest } from '../types/project';

type FieldErrors = {
  name?: string;
  description?: string;
  file?: string;
};

const MAX_PROJECT_NAME_LENGTH = 150;
const MAX_PROJECT_DESCRIPTION_LENGTH = 2000;
function normalizeProjectName(value: string): string {
  let start = 0;
  let end = value.length;
  while (start < end && value.charCodeAt(start) === 0x20) start += 1;
  while (end > start && value.charCodeAt(end - 1) === 0x20) end -= 1;
  return value.slice(start, end).replace(/ +/g, ' ');
}

function validate(name: string, description: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!name) errors.name = 'Informe o nome do projeto.';
  else if (name.length < 3) errors.name = 'Digite um nome com pelo menos 3 caracteres.';
  else if (name.length > MAX_PROJECT_NAME_LENGTH)
    errors.name = `O nome deve ter no máximo ${MAX_PROJECT_NAME_LENGTH} caracteres.`;
  else if (!/^[\p{L}\p{N} ]+$/u.test(name)) errors.name = 'Use somente letras, números e espaços.';
  else if (!/\p{L}/u.test(name)) errors.name = 'O nome deve conter pelo menos uma letra.';
  if (description.length > MAX_PROJECT_DESCRIPTION_LENGTH)
    errors.description = `A descrição deve ter no máximo ${MAX_PROJECT_DESCRIPTION_LENGTH} caracteres.`;
  return errors;
}

export function NewProjectPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File>();
  const [progress, setProgress] = useState<number>();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdProjectId, setCreatedProjectId] = useState('');
  const [validationMessage, setValidationMessage] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || createdProjectId) return;

    const normalizedName = normalizeProjectName(name);
    const errors = validate(normalizedName, description);
    if (file && file.size > MAX_UPLOAD_FILE_SIZE) {
      errors.file = 'O arquivo deve ter no máximo 70 MB.';
    }
    setFieldErrors(errors);
    if (errors.name || errors.description || errors.file) {
      const orderedErrors = [
        [errors.name, nameRef],
        [errors.description, descriptionRef],
        [errors.file, fileRef],
      ] as const;
      const firstInvalid = orderedErrors.find(([message]) => message);
      setValidationMessage(`Corrija os campos destacados. ${firstInvalid![0]}`);
      firstInvalid![1].current?.focus();
      return;
    }

    setValidationMessage('');
    setError('');
    setLoading(true);
    let projectCreated = false;
    try {
      const { data } = await api.post<Project, { data: Project }, ProjectRequest>('/projects', {
        name: normalizedName,
        description,
      });
      projectCreated = true;
      setCreatedProjectId(data.id);
      if (file) {
        const form = new FormData();
        form.append('file', file);
        await api.post(`/projects/${data.id}/files`, form, {
          onUploadProgress: (upload) =>
            setProgress(
              upload.total && upload.total > 0
                ? Math.min(100, Math.round((upload.loaded / upload.total) * 100))
                : undefined,
            ),
        });
      }
      navigate(`/projects/${data.id}`);
    } catch (cause) {
      const limitMessage =
        `Arquivo selecionado excede o limite de tamanho permitido. ` +
        `Remova pastas geradas (node_modules, target, dist, build, .git) antes de compactar, ` +
        `ou divida o projeto em mais de um ZIP e envie cada parte separadamente. Tente novamente no projeto.`;
      setError(
        projectCreated
          ? uploadErrorMessage(cause, limitMessage)
          : httpErrorMessage(cause, 'Não foi possível criar o projeto.'),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="page-enter">
        <Breadcrumb items={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Novo projeto' }]} />
        <PageHeader
          title="Novo projeto"
          subtitle="Adicione contexto e um arquivo para começar a investigação."
        />
        <Card className="mx-auto max-w-2xl p-6 sm:p-8">
          <form onSubmit={submit} noValidate>
            <Input
              label="Nome do projeto"
              ref={nameRef}
              name="name"
              placeholder="Ex.: Modernização do ERP"
              value={name}
              maxLength={MAX_PROJECT_NAME_LENGTH}
              onChange={(event) => {
                setName(event.target.value);
                if (fieldErrors.name)
                  setFieldErrors((current) => ({ ...current, name: undefined }));
              }}
              error={fieldErrors.name}
            />

            <div className="grid gap-1.5">
              <label htmlFor="project-description">Descrição</label>
              <textarea
                id="project-description"
                ref={descriptionRef}
                className="control"
                placeholder="Descreva brevemente o sistema e seu contexto."
                value={description}
                maxLength={MAX_PROJECT_DESCRIPTION_LENGTH}
                aria-invalid={Boolean(fieldErrors.description)}
                aria-describedby={fieldErrors.description ? 'project-description-error' : undefined}
                onChange={(event) => {
                  setDescription(event.target.value);
                  if (fieldErrors.description)
                    setFieldErrors((current) => ({ ...current, description: undefined }));
                }}
              />
              {fieldErrors.description && (
                <p id="project-description-error" className="text-xs text-danger">
                  {fieldErrors.description}
                </p>
              )}
            </div>

            <div className="grid gap-1.5">
              <label htmlFor="project-file">
                Arquivo para análise (opcional; pode adicionar depois)
              </label>
              <label className="dropzone" htmlFor="project-file">
                <FileUp className="size-6 text-primary" aria-hidden="true" />
                <strong>Selecione um arquivo para enviar</strong>
                <span className="text-xs">
                  ZIP, TXT, MD ou README — até 70 MB por arquivo; conteúdo textual UTF-8
                </span>
                <input
                  id="project-file"
                  ref={fileRef}
                  type="file"
                  accept=".zip,.txt,.md,text/plain,text/markdown"
                  aria-invalid={Boolean(fieldErrors.file)}
                  aria-describedby={fieldErrors.file ? 'project-file-error' : undefined}
                  onChange={(event) => {
                    setFile(event.target.files?.[0]);
                    if (fieldErrors.file)
                      setFieldErrors((current) => ({ ...current, file: undefined }));
                  }}
                />
              </label>
              {fieldErrors.file && (
                <p id="project-file-error" className="text-xs text-danger">
                  {fieldErrors.file}
                </p>
              )}
              {file && (
                <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface-secondary px-3 py-2">
                  <strong className="mono min-w-0 truncate text-xs font-medium">{file.name}</strong>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {(file.size / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} KB
                  </span>
                </div>
              )}
            </div>

            {loading && file && (
              <div className="grid gap-2" role="status">
                <span className="text-xs text-muted-foreground">
                  {progress === undefined ? 'Enviando arquivo…' : `Enviando arquivo: ${progress}%`}
                </span>
                <Progress value={progress} label="Progresso do envio" />
              </div>
            )}

            <div className="flex justify-end">
              <Button type="submit" loading={loading} disabled={Boolean(createdProjectId)}>
                Criar e enviar
              </Button>
            </div>
            <p className="sr-only" aria-live="polite" aria-atomic="true">
              {validationMessage}
            </p>
          </form>

          {error && (
            <Alert role="alert" className="mt-5">
              {error}
            </Alert>
          )}
          {error && createdProjectId && (
            <Link className="mt-3 inline-block" to={`/projects/${createdProjectId}`}>
              Abrir projeto para adicionar arquivo
            </Link>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
