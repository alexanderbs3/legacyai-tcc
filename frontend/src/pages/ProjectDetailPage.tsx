import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { Badge } from '../components/Badge';
import { Breadcrumb } from '../components/Breadcrumb';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import { Spinner } from '../components/Spinner';
import { api } from '../services/api';
import { uploadErrorMessage } from '../services/uploadErrors';
import type { AnalysisSummary } from '../types/analysis';
import type { Project, UploadedFile } from '../types/project';

function statusVariant(status: AnalysisSummary['status']) {
  return status === 'COMPLETED'
    ? 'success'
    : status === 'FAILED'
      ? 'failed'
      : status === 'PROCESSING'
        ? 'processing'
        : ('pending' as const);
}

export function ProjectDetailPage() {
  const { id } = useParams();
  const [project, setProject] = useState<Project>();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [analyses, setAnalyses] = useState<AnalysisSummary[]>([]);
  const [error, setError] = useState('');
  const [file, setFile] = useState<File>();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const uploadInFlight = useRef(false);

  useEffect(() => {
    Promise.all([
      api.get<Project>(`/projects/${id}`),
      api.get<UploadedFile[]>(`/projects/${id}/files`),
      api.get<AnalysisSummary[]>(`/projects/${id}/analyses`),
    ])
      .then(([projectResponse, filesResponse, analysesResponse]) => {
        setProject(projectResponse.data);
        setFiles(filesResponse.data);
        setAnalyses(analysesResponse.data);
      })
      .catch(() => setError('Não foi possível carregar o projeto.'));
  }, [id]);

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!id || !file || uploadInFlight.current) return;
    uploadInFlight.current = true;
    setUploading(true);
    setUploadError('');
    setUploadProgress(0);
    const formElement = event.currentTarget;
    const form = new FormData();
    form.append('file', file);
    try {
      const { data } = await api.post<UploadedFile>(`/projects/${id}/files`, form, {
        onUploadProgress: (progress) =>
          setUploadProgress(Math.round((progress.loaded / (progress.total || 1)) * 100)),
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

  if (!project && !error)
    return (
      <AppShell>
        <div className="loading-state">
          <Spinner /> Carregando projeto…
        </div>
      </AppShell>
    );
  if (error)
    return (
      <AppShell>
        <p className="alert page-enter" role="alert">
          {error}
        </p>
      </AppShell>
    );
  return (
    <AppShell>
      <div className="page-enter">
        <PageHeader
          title={project!.name}
          subtitle={project!.description || 'Sem descrição informada.'}
          action={
            <Link className="button button-primary" to={`/projects/${id}/analyses/new`}>
              Nova análise
            </Link>
          }
        />
        <Breadcrumb items={[{ label: 'Dashboard', to: '/dashboard' }, { label: project!.name }]} />
        <div className="detail-sections">
          <Card className="section-card">
            <div className="section-heading">
              <h2>Arquivos enviados</h2>
              <span>{files.length}</span>
            </div>
            {files.length === 0 ? (
              <EmptyState
                title="Nenhum arquivo enviado"
                subtitle="Adicione um arquivo abaixo para disponibilizá-lo para análise."
              />
            ) : (
              <ul className="file-list">
                {files.map((item) => (
                  <li className="file-row" key={item.id}>
                    <div className="row-primary">
                      <Icon name="description" className="row-icon" />
                      <span className="mono">{item.fileName}</span>
                    </div>
                    <span className="row-secondary">
                      {(item.fileSize / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}{' '}
                      KB
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <form onSubmit={upload}>
              <div className="field">
                <label htmlFor="additional-file">Adicionar material ao projeto</label>
                <input
                  id="additional-file"
                  type="file"
                  accept=".zip,.txt,.md,text/plain,text/markdown"
                  onChange={(event) => setFile(event.target.files?.[0])}
                  disabled={uploading}
                />
              </div>
              {uploading && <p role="status">Enviando arquivo: {uploadProgress}%</p>}
              {uploadError && (
                <p className="alert" role="alert">
                  {uploadError}
                </p>
              )}
              <div className="form-actions">
                <Button type="submit" loading={uploading} disabled={!file}>
                  Adicionar arquivo
                </Button>
              </div>
            </form>
          </Card>
          <Card className="section-card">
            <div className="section-heading">
              <h2>Análises recentes</h2>
              <span>{analyses.length}</span>
            </div>
            {analyses.length === 0 ? (
              <EmptyState
                title="Nenhuma análise ainda"
                subtitle="Inicie uma análise para gerar um diagnóstico do sistema."
              />
            ) : (
              <ul className="analysis-list">
                {analyses.map((analysis) => (
                  <li className="analysis-row" key={analysis.id}>
                    <div>
                      <div className="row-primary">
                        {analysis.provider}{' '}
                        <Badge variant={statusVariant(analysis.status)}>{analysis.status}</Badge>
                      </div>
                      <span className="row-secondary">
                        {new Date(analysis.createdAt).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <Link
                      to={
                        analysis.status === 'COMPLETED'
                          ? `/analyses/${analysis.id}`
                          : `/analyses/${analysis.id}/processing`
                      }
                    >
                      Abrir <Icon name="arrow_forward" className="link-icon" />
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
