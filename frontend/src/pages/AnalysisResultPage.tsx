import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { ReportActions } from '../components/analyses/ReportActions';
import { ReportNav } from '../components/analyses/ReportNav';
import { Alert } from '../components/feedback/Alert';
import { ReportSkeleton } from '../components/feedback/Skeletons';
import { Badge } from '../components/ui/Badge';
import { Breadcrumb } from '../components/ui/Breadcrumb';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/StatusBadge';
import { api } from '../services/api';
import { httpErrorMessage } from '../services/httpErrors';
import type { Analysis, ReportItem } from '../types/analysis';

function priorityVariant(priority: ReportItem['priority']) {
  return priority.toLowerCase() as 'high' | 'medium' | 'low';
}
const priorityLabels: Record<ReportItem['priority'], string> = {
  HIGH: 'Alta',
  MEDIUM: 'Média',
  LOW: 'Baixa',
};
const priorityBorder: Record<ReportItem['priority'], string> = {
  HIGH: 'border-l-danger',
  MEDIUM: 'border-l-warning',
  LOW: 'border-l-success',
};
function ItemSection({ id, title, items }: { id: string; title: string; items: ReportItem[] }) {
  return (
    <Card id={id} className="grid scroll-mt-20 gap-4 p-5 sm:p-6">
      <h2>{`${title} (${items.length})`}</h2>
      {items.length === 0 ? (
        <p className="text-muted-foreground">Nenhum item identificado.</p>
      ) : (
        <div className="grid gap-3">
          {items.map((item, index) => (
            <article
              className={`grid gap-2 rounded-md border border-l-[3px] border-border bg-surface-secondary p-4 ${priorityBorder[item.priority]}`}
              key={`${item.title}-${index}`}
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm [overflow-wrap:anywhere]">{item.title}</h3>
                <Badge variant={priorityVariant(item.priority)}>
                  <span className="mono">{priorityLabels[item.priority]}</span>
                </Badge>
              </div>
              <p className="text-muted-foreground [overflow-wrap:anywhere]">{item.description}</p>
            </article>
          ))}
        </div>
      )}
    </Card>
  );
}

export function AnalysisResultPage() {
  const { id } = useParams();
  const [analysis, setAnalysis] = useState<Analysis>();
  const [error, setError] = useState('');
  const [loadedId, setLoadedId] = useState<string>();

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    api
      .get<Analysis>(`/analyses/${id}`, { signal: controller.signal })
      .then((response) => {
        if (active) {
          setAnalysis(response.data);
          setError('');
          setLoadedId(id);
        }
      })
      .catch((cause) => {
        if (active && !controller.signal.aborted) {
          setAnalysis(undefined);
          setError(httpErrorMessage(cause, 'Não foi possível carregar o relatório.'));
          setLoadedId(id);
        }
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [id]);

  const currentAnalysis = loadedId === id ? analysis : undefined;
  const currentError = loadedId === id ? error : '';

  if (currentError) {
    return (
      <AppShell>
        <Alert role="alert" className="page-enter">
          {currentError}
        </Alert>
      </AppShell>
    );
  }
  if (!currentAnalysis) {
    return (
      <AppShell>
        <ReportSkeleton />
      </AppShell>
    );
  }
  if (currentAnalysis.status === 'PENDING' || currentAnalysis.status === 'PROCESSING') {
    return <Navigate to={`/analyses/${id}/processing`} replace />;
  }
  if (currentAnalysis.status === 'FAILED' || !currentAnalysis.result) {
    return (
      <AppShell>
        <Alert role="alert" className="page-enter">
          {currentAnalysis.errorMessage || 'A análise não produziu um relatório.'}
        </Alert>
      </AppShell>
    );
  }

  const report = currentAnalysis.result;
  const reportDate = new Date(
    currentAnalysis.completedAt || currentAnalysis.createdAt,
  ).toLocaleString('pt-BR');
  const sections = [
    { id: 'resumo', label: 'Resumo' },
    { id: 'tecnologias', label: 'Tecnologias' },
    { id: 'arquitetura', label: 'Arquitetura' },
    { id: 'problemas', label: 'Problemas' },
    { id: 'riscos', label: 'Riscos de segurança' },
    { id: 'recomendacoes', label: 'Recomendações' },
    { id: 'modernizacao', label: 'Modernização' },
  ];

  return (
    <AppShell>
      <div className="page-enter">
        <Breadcrumb
          items={[
            { label: 'Dashboard', to: '/dashboard' },
            { label: 'Projeto', to: `/projects/${currentAnalysis.projectId}` },
            { label: 'Relatório' },
          ]}
        />
        <PageHeader
          title="Relatório de análise"
          subtitle={`${currentAnalysis.provider} · ${reportDate}`}
          action={
            <ReportActions
              report={report}
              provider={currentAnalysis.provider}
              date={reportDate}
              fileName={`relatorio-legacyai-${currentAnalysis.id}.md`}
            />
          }
        />
        <Alert tone="info" role="note" className="mb-6">
          Este relatório contém recomendações automatizadas e deve ser validado por uma pessoa
          técnica antes de qualquer decisão.
        </Alert>

        <div className="grid items-start gap-6 lg:grid-cols-[13rem_minmax(0,1fr)]">
          <ReportNav items={sections} />
          <div className="grid gap-6">
            <Card className="flex flex-wrap items-center gap-x-8 gap-y-3 p-5">
              <div className="grid gap-1">
                <span className="text-xs text-muted-foreground">Status</span>
                <StatusBadge status={currentAnalysis.status} />
              </div>
              <div className="grid gap-1">
                <span className="text-xs text-muted-foreground">Provedor</span>
                <span className="mono text-xs">{currentAnalysis.provider}</span>
              </div>
              <div className="grid gap-1">
                <span className="text-xs text-muted-foreground">Concluída em</span>
                <span className="text-sm">{reportDate}</span>
              </div>
              <Link className="ml-auto text-sm" to={`/projects/${currentAnalysis.projectId}`}>
                Ver projeto
              </Link>
            </Card>
            <Card id="resumo" className="grid scroll-mt-20 gap-3 p-5 sm:p-6">
              <h2>Resumo</h2>
              <p className="[overflow-wrap:anywhere]">{report.summary}</p>
            </Card>
            <Card id="tecnologias" className="grid scroll-mt-20 gap-3 p-5 sm:p-6">
              <h2>Tecnologias identificadas</h2>
              {report.technologies.length === 0 ? (
                <p className="text-muted-foreground">
                  Nenhuma tecnologia identificada no contexto analisado.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {report.technologies.map((item) => (
                    <span
                      className="mono rounded-md border border-border bg-surface-secondary px-2.5 py-1 text-xs"
                      key={item}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              )}
            </Card>
            <Card id="arquitetura" className="grid scroll-mt-20 gap-3 p-5 sm:p-6">
              <h2>Arquitetura</h2>
              <p className="[overflow-wrap:anywhere]">{report.architecture}</p>
            </Card>
            <ItemSection id="problemas" title="Problemas" items={report.problems} />
            <ItemSection id="riscos" title="Riscos de segurança" items={report.securityRisks} />
            <ItemSection id="recomendacoes" title="Recomendações" items={report.recommendations} />
            <Card id="modernizacao" className="grid scroll-mt-20 gap-3 p-5 sm:p-6">
              <h2>Modernização</h2>
              {report.modernization.length === 0 ? (
                <p className="text-muted-foreground">
                  Nenhuma ação de modernização identificada no contexto analisado.
                </p>
              ) : (
                <ul className="grid gap-2">
                  {report.modernization.map((item) => (
                    <li key={item} className="flex gap-2.5">
                      <span
                        className="mt-2 size-1.5 shrink-0 rounded-full bg-primary"
                        aria-hidden="true"
                      />
                      <span className="[overflow-wrap:anywhere]">{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
