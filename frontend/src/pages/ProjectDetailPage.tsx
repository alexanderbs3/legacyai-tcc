import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { ArrowRight, FileText, FileUp, Plus } from 'lucide-react';
import { Alert } from '../components/feedback/Alert';
import { EmptyState } from '../components/feedback/EmptyState';
import { DetailSkeleton } from '../components/feedback/Skeletons';
import { Breadcrumb } from '../components/ui/Breadcrumb';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/StatusBadge';
import { api } from '../services/api';
import { httpErrorMessage, isForbiddenError } from '../services/httpErrors';
import { MAX_UPLOAD_FILE_SIZE, uploadErrorMessage } from '../services/uploadErrors';
import type { AnalysisSummary } from '../types/analysis';
import type { Project, UploadedFile } from '../types/project';

export function ProjectDetailPage() {
  const { id } = useParams();
  const [project, setProject] = useState<Project>();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [analyses, setAnalyses] = useState<AnalysisSummary[]>([]);
  const [error, setError] = useState('');
  const [detailsError, setDetailsError] = useState('');
  const [loadedProjectId, setLoadedProjectId] = useState<string>();
  const [file, setFile] = useState<File>();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>();
  const [uploadError, setUploadError] = useState('');
  const uploadInFlight = useRef(false);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    Promise.allSettled([
      api.get<Project>(`/projects/${id}`, { signal: controller.signal }),
      api.get<UploadedFile[]>(`/projects/${id}/files`, { signal: controller.signal }),
      api.get<AnalysisSummary[]>(`/projects/${id}/analyses`, { signal: controller.signal }),
    ]).then(([projectResult, filesResult, analysesResult]) => {
      if (!active) return;
      if (projectResult.status === 'rejected') {
        setProject(undefined);
        setFiles([]);
        setAnalyses([]);
        setError(httpErrorMessage(projectResult.reason, 'Não foi possível carregar o projeto.'));
        setDetailsError('');
        setLoadedProjectId(id);
        return;
      }
      setProject(projectResult.value.data);
      setFiles(filesResult.status === 'fulfilled' ? filesResult.value.data : []);
      setAnalyses(analysesResult.status === 'fulfilled' ? analysesResult.value.data : []);
      setError('');
      if (filesResult.status === 'rejected' || analysesResult.status === 'rejected') {
        const forbiddenResult = [filesResult, analysesResult].find(
          (result) => result.status === 'rejected' && isForbiddenError(result.reason),
        );
        setDetailsError(
          forbiddenResult?.status === 'rejected'
            ? httpErrorMessage(forbiddenResult.reason, '')
            : 'Parte dos dados do projeto não pôde ser carregada. Tente novamente.',
        );
      } else {
        setDetailsError('');
      }
      setLoadedProjectId(id);
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, [id]);

  const currentProject = loadedProjectId === id ? project : undefined;
  const currentError = loadedProjectId === id ? error : '';
  const currentDetailsError = loadedProjectId === id ? detailsError : '';

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!id || !file || uploadInFlight.current) return;
    if (file.size > MAX_UPLOAD_FILE_SIZE) {
      setUploadError('O arquivo deve ter no máximo 70 MB.');
      return;
    }
    uploadInFlight.current = true;
    setUploading(true);
    setUploadError('');
    setUploadProgress(undefined);
    const formElement = event.currentTarget;
    const form = new FormData();
    form.append('file', file);
    try {
      const { data } = await api.post<UploadedFile>(`/projects/${id}/files`, form, {
        onUploadProgress: (progress) =>
          setUploadProgress(
            progress.total && progress.total > 0
              ? Math.min(100, Math.round((progress.loaded / progress.total) * 100))
              : undefined,
          ),
      });
      setFiles((current) => [data, ...current]);
      setFile(undefined);
      formElement.reset();
    } catch (cause) {
      setUploadError(
        uploadErrorMessage(cause, 'Não foi possível enviar o arquivo. Tente novamente.'),
      );
    } finally {
      uploadInFlight.current = false;
      setUploading(false);
    }
  }

  if (currentError)
    return (
      <AppShell>
        <div className="page-enter">
          <Breadcrumb items={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Projeto' }]} />
          <Alert role="alert">{currentError}</Alert>
        </div>
      </AppShell>
    );
  if (!currentProject)
    return (
      <AppShell>
        <DetailSkeleton />
      </AppShell>
    );
  return (
    <AppShell>
      <div className="page-enter">
        <Breadcrumb
          items={[{ label: 'Dashboard', to: '/dashboard' }, { label: currentProject.name }]}
        />
        <PageHeader
          title={currentProject.name}
          subtitle={currentProject.description || 'Sem descrição informada.'}
          action={
            <Link className="btn btn-primary btn-md" to={`/projects/${id}/analyses/new`}>
              <Plus className="size-4" aria-hidden="true" />
              Nova análise
            </Link>
          }
        />
        {currentDetailsError && (
          <Alert tone="warning" role="alert" className="mb-6">
            {currentDetailsError}
          </Alert>
        )}
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <Card className="grid gap-5 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2>Arquivos enviados</h2>
              <span className="mono rounded-full border border-border bg-surface-secondary px-2 py-0.5 text-xs text-muted-foreground">
                {files.length}
              </span>
            </div>
            {files.length === 0 ? (
              <EmptyState
                title="Nenhum arquivo enviado"
                subtitle="Adicione um arquivo abaixo para disponibilizá-lo para análise."
              />
            ) : (
              <ul className="divide-y divide-border rounded-md border border-border">
                {files.map((item) => (
                  <li className="flex items-center justify-between gap-3 px-3 py-2.5" key={item.id}>
                    <div className="flex min-w-0 items-center gap-2.5">
                      <FileText
                        className="size-4 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <span className="mono truncate text-xs">{item.fileName}</span>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {(item.fileSize / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}{' '}
                      KB
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <form onSubmit={upload}>
              <div className="grid gap-1.5">
                <label htmlFor="additional-file">Adicionar material ao projeto</label>
                <label className="dropzone" htmlFor="additional-file">
                  <FileUp className="size-5 text-primary" aria-hidden="true" />
                  <strong>{file ? file.name : 'Selecione um arquivo'}</strong>
                  <span className="text-xs">ZIP, TXT ou MD</span>
                  <input
                    id="additional-file"
                    type="file"
                    accept=".zip,.txt,.md,text/plain,text/markdown"
                    onChange={(event) => {
                      setFile(event.target.files?.[0]);
                      setUploadError('');
                    }}
                    disabled={uploading}
                  />
                </label>
              </div>
              {uploading && (
                <p role="status" className="text-xs text-muted-foreground">
                  {uploadProgress === undefined
                    ? 'Enviando arquivo…'
                    : `Enviando arquivo: ${uploadProgress}%`}
                </p>
              )}
              {uploadError && <Alert role="alert">{uploadError}</Alert>}
              <div className="flex justify-end">
                <Button type="submit" loading={uploading} disabled={!file}>
                  Adicionar arquivo
                </Button>
              </div>
            </form>
          </Card>
          <Card className="grid gap-5 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2>Análises recentes</h2>
              <span className="mono rounded-full border border-border bg-surface-secondary px-2 py-0.5 text-xs text-muted-foreground">
                {analyses.length}
              </span>
            </div>
            {analyses.length === 0 ? (
              <EmptyState
                title="Nenhuma análise ainda"
                subtitle="Inicie uma análise para gerar um diagnóstico do sistema."
                action={
                  <Link className="btn btn-primary btn-md" to={`/projects/${id}/analyses/new`}>
                    Nova análise
                  </Link>
                }
              />
            ) : (
              <ul className="divide-y divide-border rounded-md border border-border">
                {analyses.map((analysis) => (
                  <li
                    className="flex items-center justify-between gap-3 px-3 py-3"
                    key={analysis.id}
                  >
                    <div className="grid min-w-0 gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="mono text-xs">{analysis.provider}</span>
                        <StatusBadge status={analysis.status} />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(analysis.createdAt).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <Link
                      className="inline-flex shrink-0 items-center gap-1"
                      to={
                        analysis.status === 'COMPLETED'
                          ? `/analyses/${analysis.id}`
                          : `/analyses/${analysis.id}/processing`
                      }
                    >
                      Abrir <ArrowRight className="size-3.5" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
