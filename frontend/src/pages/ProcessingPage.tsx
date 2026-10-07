import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Check, Circle } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { Alert } from '../components/feedback/Alert';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Progress } from '../components/ui/Progress';
import { Spinner } from '../components/ui/Spinner';
import { StatusBadge } from '../components/ui/StatusBadge';
import { api } from '../services/api';
import { httpErrorMessage } from '../services/httpErrors';
import type { Analysis } from '../types/analysis';

function statusMessage(analysis?: Analysis) {
  if (!analysis || analysis.status === 'PENDING')
    return 'Sua análise está na fila e será iniciada em breve.';
  if (analysis.status === 'PROCESSING')
    return 'Estamos examinando o código e organizando os principais achados.';
  if (analysis.status === 'FAILED')
    return analysis.errorMessage || 'A análise não pôde ser concluída. Tente novamente mais tarde.';
  return 'Preparando seu relatório.';
}

const MAX_CONSECUTIVE_TRANSIENT_FAILURES = 3;

function isTransientPollingError(error: unknown): boolean {
  const status = (error as { response?: { status?: unknown } } | null)?.response?.status;
  return status === undefined || (typeof status === 'number' && status >= 500 && status < 600);
}

export function ProcessingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState<Analysis>();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [retryVersion, setRetryVersion] = useState(0);

  useEffect(() => {
    let active = true;
    let stopped = false;
    let inFlight = false;
    let transientFailures = 0;
    let requestController: AbortController | undefined;
    const stop = () => {
      stopped = true;
      clearInterval(timer);
    };
    const load = async () => {
      if (!active || stopped || inFlight) return;
      inFlight = true;
      const controller = new AbortController();
      requestController = controller;
      try {
        const response = await api.get<Analysis>(`/analyses/${id}`, {
          signal: controller.signal,
        });
        if (!active || stopped) return;
        transientFailures = 0;
        setNotice('');
        setAnalysis(response.data);
        if (response.data.status === 'FAILED' || response.data.status === 'COMPLETED') {
          stop();
          if (response.data.status === 'COMPLETED') navigate(`/analyses/${id}`, { replace: true });
        }
      } catch (cause) {
        if (!active || stopped || controller.signal.aborted) return;
        if (isTransientPollingError(cause)) {
          transientFailures += 1;
          if (transientFailures < MAX_CONSECUTIVE_TRANSIENT_FAILURES) {
            setNotice(
              'Falha temporária ao atualizar. Uma nova tentativa será feita automaticamente.',
            );
          } else {
            stop();
            setNotice('');
            setError(
              'Não foi possível atualizar após 3 tentativas. Verifique sua conexão e tente novamente.',
            );
          }
        } else {
          stop();
          setError(httpErrorMessage(cause, 'Não foi possível acompanhar o status da análise.'));
        }
      } finally {
        if (requestController === controller) requestController = undefined;
        inFlight = false;
      }
    };
    const timer = setInterval(load, 3000);
    void load();
    return () => {
      active = false;
      requestController?.abort();
      clearInterval(timer);
    };
  }, [id, navigate, retryVersion]);

  const status = analysis?.status || 'PENDING';

  if (status === 'FAILED') {
    return (
      <AppShell>
        <Card className="page-enter mx-auto grid max-w-xl justify-items-center gap-4 p-8 text-center">
          <h1>Não foi possível concluir</h1>
          <StatusBadge status="FAILED" />
          <Alert role="alert" className="text-left">
            {statusMessage(analysis)}
          </Alert>
          <div className="flex flex-wrap justify-center gap-3">
            <Link className="btn btn-primary btn-md" to={`/projects/${analysis!.projectId}`}>
              Voltar ao projeto
            </Link>
            <Link className="btn btn-secondary btn-md" to="/history">
              Ir ao histórico
            </Link>
          </div>
        </Card>
      </AppShell>
    );
  }

  const steps = [
    { key: 'PENDING', label: 'Na fila', hint: 'Aguardando o início do processamento.' },
    { key: 'PROCESSING', label: 'Em análise', hint: 'O provedor está examinando o material.' },
    { key: 'COMPLETED', label: 'Relatório pronto', hint: 'Você será levado ao resultado.' },
  ];
  const currentIndex = steps.findIndex((step) => step.key === status);

  return (
    <AppShell>
      <Card className="page-enter mx-auto grid max-w-xl gap-6 p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="grid gap-1.5">
            <h1>Processando análise</h1>
            <p className="text-muted-foreground">
              {error ? 'O acompanhamento foi interrompido.' : statusMessage(analysis)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <StatusBadge status={status} />
            {!error && <Spinner size="md" label="Análise em andamento" />}
          </div>
        </div>

        {!error && <Progress label="Análise em andamento" />}
        {notice && (
          <Alert tone="warning" role="status">
            {notice}
          </Alert>
        )}

        <ol className="grid gap-0" aria-label="Etapas da análise">
          {steps.map((step, index) => {
            const done = index < currentIndex;
            const current = index === currentIndex;
            return (
              <li
                key={step.key}
                className="relative flex gap-3 pb-5 last:pb-0"
                aria-current={current ? 'step' : undefined}
              >
                {index < steps.length - 1 && (
                  <span
                    className={`absolute top-6 left-[0.6875rem] h-[calc(100%-1.5rem)] w-px ${done ? 'bg-primary' : 'bg-border'}`}
                    aria-hidden="true"
                  />
                )}
                <span
                  className={`grid size-[1.375rem] shrink-0 place-items-center rounded-full border ${
                    done
                      ? 'border-primary bg-primary text-primary-foreground'
                      : current
                        ? 'border-primary text-primary'
                        : 'border-border text-muted-foreground'
                  }`}
                  aria-hidden="true"
                >
                  {done ? <Check className="size-3" /> : <Circle className="size-2 fill-current" />}
                </span>
                <div className="grid gap-0.5">
                  <span className={current || done ? 'font-medium' : 'text-muted-foreground'}>
                    {step.label}
                  </span>
                  {current && <span className="text-xs text-muted-foreground">{step.hint}</span>}
                </div>
              </li>
            );
          })}
        </ol>

        {analysis && (
          <p className="mono border-t border-border pt-4 text-xs text-muted-foreground">
            {analysis.provider} · iniciada em {new Date(analysis.createdAt).toLocaleString('pt-BR')}
          </p>
        )}
        {error && (
          <div className="grid justify-items-start gap-3">
            <Alert role="alert">{error}</Alert>
            <Button
              variant="secondary"
              onClick={() => {
                setError('');
                setNotice('');
                setRetryVersion((current) => current + 1);
              }}
            >
              Tentar novamente
            </Button>
          </div>
        )}
        {!error && (
          <p className="text-xs text-muted-foreground">
            Esta página atualiza automaticamente a cada 3 segundos. Você pode navegar para outras
            áreas e voltar pelo histórico.
          </p>
        )}
      </Card>
    </AppShell>
  );
}
