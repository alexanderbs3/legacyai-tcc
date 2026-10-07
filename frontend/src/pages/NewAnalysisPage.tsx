import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { Check, CircleDashed } from 'lucide-react';
import { Alert } from '../components/feedback/Alert';
import { FormSkeleton } from '../components/feedback/Skeletons';
import { Breadcrumb } from '../components/ui/Breadcrumb';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { api } from '../services/api';
import { httpErrorMessage } from '../services/httpErrors';
import type { AnalysisProvider, CreateAnalysisResponse } from '../types/analysis';
import type { UploadedFile } from '../types/project';

export function NewAnalysisPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [providers, setProviders] = useState<AnalysisProvider[]>([]);
  const [provider, setProvider] = useState('OPENAI');
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [hasMaterial, setHasMaterial] = useState(false);
  const [filesError, setFilesError] = useState('');
  const [filesProjectId, setFilesProjectId] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    api
      .get<AnalysisProvider[]>('/ai/providers', { signal: controller.signal })
      .then((response) => {
        if (!active) return;
        setProviders(response.data);
        const initialProvider =
          response.data.find((item) => item.name === 'OPENAI' && item.available) ??
          response.data.find((item) => item.available);
        if (initialProvider) setProvider(initialProvider.name);
      })
      .catch((cause) => {
        if (active && !controller.signal.aborted) {
          setError(httpErrorMessage(cause, 'Não foi possível carregar os provedores disponíveis.'));
        }
      })
      .finally(() => {
        if (active) setLoadingProviders(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    api
      .get<UploadedFile[]>(`/projects/${id}/files`, { signal: controller.signal })
      .then((response) => {
        if (active) {
          setHasMaterial(response.data.length > 0);
          setFilesError('');
        }
      })
      .catch((cause) => {
        if (active && !controller.signal.aborted) {
          setHasMaterial(false);
          setFilesError(
            httpErrorMessage(cause, 'Não foi possível verificar os arquivos deste projeto.'),
          );
        }
      })
      .finally(() => {
        if (active) {
          setFilesProjectId(id);
          setLoadingFiles(false);
        }
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [id]);

  const filesAreCurrent = filesProjectId === id;
  const currentFilesError = filesAreCurrent ? filesError : '';
  const currentHasMaterial = filesAreCurrent && hasMaterial;
  const filesAreLoading = loadingFiles || !filesAreCurrent;
  const materialReady = !filesAreLoading && !currentFilesError && currentHasMaterial;

  async function submit() {
    if (
      !materialReady ||
      submitting ||
      !providers.some((item) => item.name === provider && item.available)
    )
      return;
    setError('');
    setSubmitting(true);
    try {
      const { data } = await api.post<CreateAnalysisResponse>(`/projects/${id}/analyses`, {
        provider,
      });
      navigate(`/analyses/${data.analysisId}/processing`);
    } catch (cause) {
      setError(httpErrorMessage(cause, 'Não foi possível iniciar a análise.'));
    } finally {
      setSubmitting(false);
    }
  }

  const selectedProvider = providers.find((item) => item.name === provider && item.available);

  return (
    <AppShell>
      <div className="page-enter">
        <Breadcrumb
          items={[
            { label: 'Dashboard', to: '/dashboard' },
            { label: 'Projeto', to: `/projects/${id}` },
            { label: 'Nova análise' },
          ]}
        />
        <PageHeader
          title="Nova análise"
          subtitle="Escolha o provedor que fará a leitura técnica do projeto."
        />
        {loadingProviders || filesAreLoading ? (
          <FormSkeleton />
        ) : (
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <Card className="grid gap-5 p-5 sm:p-6">
              {currentFilesError && (
                <Alert role="alert">{currentFilesError} Volte ao projeto e tente novamente.</Alert>
              )}
              {!currentFilesError && !currentHasMaterial && (
                <Alert tone="warning" role="status">
                  Este projeto ainda não possui arquivo para análise. Adicione um arquivo antes de
                  continuar.
                </Alert>
              )}
              {!materialReady && (
                <Link to={`/projects/${id}`}>Voltar ao projeto e adicionar arquivo</Link>
              )}
              <fieldset className="grid gap-3">
                <legend className="mb-2 text-xl font-semibold tracking-tight">
                  Provedor de IA
                </legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {providers.map((item) => (
                    <label
                      key={item.name}
                      className={`group relative grid cursor-pointer gap-1 rounded-lg border p-4 text-left transition-[border-color,background-color,box-shadow] duration-(--duration-fast) has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50 has-[:focus-visible]:shadow-[var(--shadow-focus)] ${
                        provider === item.name
                          ? 'border-primary bg-primary/8 shadow-[var(--shadow-focus)]'
                          : 'border-border bg-surface-secondary hover:border-border-hover'
                      }`}
                    >
                      <input
                        className="sr-only"
                        type="radio"
                        name="provider"
                        value={item.name}
                        checked={provider === item.name}
                        disabled={!item.available}
                        onChange={() => setProvider(item.name)}
                      />
                      <strong className="pr-6 font-medium">
                        {item.name === 'DEEPSEEK' ? 'DeepSeek V4.1 Flash' : item.displayName}
                      </strong>
                      <span className="text-xs text-muted-foreground">
                        {item.available
                          ? item.name === 'AUTO'
                            ? 'Escolha automática'
                            : 'Disponível para análise'
                          : 'Indisponível'}
                      </span>
                      {provider === item.name && (
                        <Check
                          className="absolute top-3.5 right-3.5 size-4 text-primary"
                          aria-hidden="true"
                        />
                      )}
                    </label>
                  ))}
                </div>
              </fieldset>
              {providers.length === 0 && (
                <Alert role="alert">Nenhum provedor está disponível no momento.</Alert>
              )}
              {error && <Alert role="alert">{error}</Alert>}
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="lg"
                  onClick={submit}
                  loading={submitting}
                  disabled={
                    !materialReady ||
                    !providers.some((item) => item.name === provider && item.available)
                  }
                >
                  Iniciar análise
                </Button>
              </div>
            </Card>

            <Card className="grid gap-4 p-5" aria-label="Resumo da análise">
              <h2 className="text-base">Antes de executar</h2>
              <ul className="grid gap-3 text-sm">
                <li className="flex items-start gap-2.5">
                  {materialReady ? (
                    <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                  ) : (
                    <CircleDashed
                      className="mt-0.5 size-4 shrink-0 text-warning"
                      aria-hidden="true"
                    />
                  )}
                  <span>
                    {materialReady
                      ? 'Material do projeto encontrado'
                      : 'Material do projeto pendente'}
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  {selectedProvider ? (
                    <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                  ) : (
                    <CircleDashed
                      className="mt-0.5 size-4 shrink-0 text-warning"
                      aria-hidden="true"
                    />
                  )}
                  <span>
                    {selectedProvider
                      ? `Provedor: ${selectedProvider.name === 'DEEPSEEK' ? 'DeepSeek V4.1 Flash' : selectedProvider.displayName}`
                      : 'Selecione um provedor disponível'}
                  </span>
                </li>
              </ul>
              <p className="text-xs text-muted-foreground">
                Ao iniciar, você acompanha o andamento em tempo real e o relatório fica disponível
                no histórico.
              </p>
            </Card>
          </div>
        )}
      </div>
    </AppShell>
  );
}
