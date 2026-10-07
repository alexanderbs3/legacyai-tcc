import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { ArrowRight, Search, Trash2 } from 'lucide-react';
import { Alert } from '../components/feedback/Alert';
import { EmptyState } from '../components/feedback/EmptyState';
import { TableSkeleton } from '../components/feedback/Skeletons';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/StatusBadge';
import { api } from '../services/api';
import { deleteAnalysis, loadProjectAnalyses } from '../services/analyses';
import {
  httpErrorMessage,
  isForbiddenError,
  prioritizedHttpErrorMessage,
} from '../services/httpErrors';
import { Button } from '../components/ui/Button';
import type { AnalysisSummary } from '../types/analysis';
import type { Project } from '../types/project';

type HistoryRow = AnalysisSummary & { project: Project };
export function HistoryPage() {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [partialError, setPartialError] = useState(false);
  const [confirmingAnalysisId, setConfirmingAnalysisId] = useState<string | null>(null);
  const [deletingAnalysisId, setDeletingAnalysisId] = useState<string | null>(null);
  const [analysisErrors, setAnalysisErrors] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState<'ALL' | AnalysisSummary['status']>('ALL');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const load = async () => {
      try {
        const response = await api.get<Project[]>('/projects', { signal: controller.signal });
        const histories = await loadProjectAnalyses(
          response.data.map((project) => project.id),
          controller.signal,
        );
        if (!active || controller.signal.aborted) return;
        const grouped = histories.map((result, index) =>
          result.status === 'fulfilled'
            ? {
                status: 'fulfilled' as const,
                value: result.value.map((analysis) => ({
                  ...analysis,
                  project: response.data[index],
                })),
              }
            : result,
        );
        const rejectedCount = grouped.filter((result) => result.status === 'rejected').length;
        const rejectedReasons = grouped.flatMap((result) =>
          result.status === 'rejected' ? [result.reason] : [],
        );
        setRows(
          grouped
            .flatMap((result) => (result.status === 'fulfilled' ? result.value : []))
            .sort((first, second) => second.createdAt.localeCompare(first.createdAt)),
        );
        if (rejectedReasons.some(isForbiddenError)) {
          setError(
            prioritizedHttpErrorMessage(rejectedReasons, 'Não foi possível carregar o histórico.'),
          );
        } else if (grouped.length > 0 && rejectedCount === grouped.length) {
          setError('Não foi possível carregar o histórico. Tente novamente em instantes.');
        } else {
          setPartialError(rejectedCount > 0);
        }
      } catch (cause) {
        if (active && !controller.signal.aborted) {
          setError(httpErrorMessage(cause, 'Não foi possível carregar o histórico.'));
        }
      } finally {
        if (active && !controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  const handleDeleteAnalysis = async (analysisId: string) => {
    setDeletingAnalysisId(analysisId);
    setAnalysisErrors((current) => ({ ...current, [analysisId]: '' }));
    try {
      await deleteAnalysis(analysisId);
      setRows((current) => current.filter((row) => row.id !== analysisId));
      setConfirmingAnalysisId(null);
    } catch (cause) {
      setConfirmingAnalysisId(null);
      setAnalysisErrors((current) => ({
        ...current,
        [analysisId]: httpErrorMessage(cause, 'Não foi possível excluir a análise.'),
      }));
    } finally {
      setDeletingAnalysisId(null);
    }
  };

  const visibleRows = rows.filter(
    (row) =>
      (statusFilter === 'ALL' || row.status === statusFilter) &&
      row.project.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const filters: { value: 'ALL' | AnalysisSummary['status']; label: string }[] = [
    { value: 'ALL', label: 'Todas' },
    { value: 'COMPLETED', label: 'Concluídas' },
    { value: 'PROCESSING', label: 'Processando' },
    { value: 'PENDING', label: 'Pendentes' },
    { value: 'FAILED', label: 'Falharam' },
  ];

  return (
    <AppShell>
      <div className="page-enter">
        <PageHeader
          title="Histórico de análises"
          subtitle="Acompanhe os diagnósticos realizados em todos os seus projetos."
        />
        {loading ? (
          <TableSkeleton />
        ) : error ? (
          <Alert role="alert">{error}</Alert>
        ) : (
          <div className="grid min-w-0 max-w-full gap-4">
            {partialError && (
              <Alert tone="warning" role="status">
                O histórico está incompleto porque não foi possível carregar as análises de alguns
                projetos.
              </Alert>
            )}
            {rows.length === 0 ? (
              <EmptyState
                title={
                  partialError
                    ? 'Nenhum resultado disponível nos projetos carregados'
                    : 'Nenhuma análise no histórico'
                }
                subtitle={
                  partialError
                    ? 'Tente novamente para consultar os projetos indisponíveis.'
                    : 'Quando uma análise for iniciada, ela aparecerá aqui.'
                }
                action={
                  partialError ? undefined : (
                    <Link className="btn btn-primary btn-md" to="/dashboard">
                      Ir ao dashboard
                    </Link>
                  )
                }
              />
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div
                    className="flex flex-wrap gap-1.5"
                    role="group"
                    aria-label="Filtrar por status"
                  >
                    {filters.map((filter) => (
                      <button
                        key={filter.value}
                        type="button"
                        aria-pressed={statusFilter === filter.value}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-(--duration-fast) ${
                          statusFilter === filter.value
                            ? 'border-primary/50 bg-primary/12 text-foreground'
                            : 'border-border text-muted-foreground hover:border-border-hover hover:text-foreground'
                        }`}
                        onClick={() => setStatusFilter(filter.value)}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <Search
                      className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <input
                      className="control h-9 min-h-9 w-56 pl-9"
                      type="search"
                      aria-label="Buscar análise pelo nome do projeto"
                      placeholder="Buscar projeto…"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                    />
                  </div>
                </div>

                {visibleRows.length === 0 ? (
                  <EmptyState
                    title="Nenhuma análise encontrada"
                    subtitle="Nenhuma análise corresponde aos filtros atuais."
                    action={
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setStatusFilter('ALL');
                          setQuery('');
                        }}
                      >
                        Limpar filtros
                      </Button>
                    }
                  />
                ) : (
                  <div className="card relative w-full min-w-0 max-w-full overflow-x-auto">
                    <table className="min-w-[46rem] text-left">
                      <thead>
                        <tr className="border-b border-border text-xs text-muted-foreground">
                          <th scope="col" className="px-4 py-3 font-medium">
                            Data
                          </th>
                          <th scope="col" className="px-4 py-3 font-medium">
                            Projeto
                          </th>
                          <th scope="col" className="px-4 py-3 font-medium">
                            Provedor
                          </th>
                          <th scope="col" className="px-4 py-3 font-medium">
                            Status
                          </th>
                          <th scope="col" className="px-4 py-3 font-medium">
                            <span className="sr-only">Detalhe</span>
                          </th>
                          <th scope="col" className="px-4 py-3 font-medium">
                            Ações
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {visibleRows.map((row) => {
                          const analysisLabel = `${row.project.name}, ${new Date(row.createdAt).toLocaleString('pt-BR')}`;
                          return (
                            <tr
                              key={row.id}
                              className="transition-colors duration-(--duration-fast) hover:bg-muted/50"
                            >
                              <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                                {new Date(row.createdAt).toLocaleString('pt-BR')}
                              </td>
                              <td className="px-4 py-3 font-medium">{row.project.name}</td>
                              <td className="mono px-4 py-3 text-xs">{row.provider}</td>
                              <td className="px-4 py-3">
                                <StatusBadge status={row.status} />
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <Link
                                  className="inline-flex items-center gap-1"
                                  to={
                                    row.status === 'COMPLETED'
                                      ? `/analyses/${row.id}`
                                      : `/analyses/${row.id}/processing`
                                  }
                                >
                                  Abrir <ArrowRight className="size-3.5" aria-hidden="true" />
                                </Link>
                              </td>
                              <td className="px-4 py-3">
                                {confirmingAnalysisId === row.id ? (
                                  <div className="grid gap-2">
                                    <p className="text-xs">
                                      Excluir esta análise? Esta ação não pode ser desfeita.
                                    </p>
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        aria-label={`Confirmar exclusão da análise de ${analysisLabel}`}
                                        variant="destructive"
                                        loading={deletingAnalysisId === row.id}
                                        onClick={() => handleDeleteAnalysis(row.id)}
                                      >
                                        Confirmar
                                      </Button>
                                      <Button
                                        size="sm"
                                        aria-label={`Cancelar exclusão da análise de ${analysisLabel}`}
                                        variant="secondary"
                                        disabled={deletingAnalysisId === row.id}
                                        onClick={() => setConfirmingAnalysisId(null)}
                                      >
                                        Cancelar
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="grid gap-2">
                                    <Button
                                      size="sm"
                                      aria-label={`Excluir análise de ${analysisLabel}`}
                                      variant="ghost-danger"
                                      disabled={deletingAnalysisId !== null}
                                      onClick={() => setConfirmingAnalysisId(row.id)}
                                    >
                                      <Trash2 className="size-3.5" aria-hidden="true" />
                                      Excluir
                                    </Button>
                                    {analysisErrors[row.id] && (
                                      <Alert role="alert">{analysisErrors[row.id]}</Alert>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
