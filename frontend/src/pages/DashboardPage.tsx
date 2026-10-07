import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import {
  Activity,
  ArrowRight,
  CircleCheck,
  FolderKanban,
  LoaderCircle,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { Alert } from '../components/feedback/Alert';
import { EmptyState } from '../components/feedback/EmptyState';
import { DashboardSkeleton } from '../components/feedback/Skeletons';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { MetricCard } from '../components/ui/MetricCard';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/StatusBadge';
import { api } from '../services/api';
import { loadProjectAnalyses } from '../services/analyses';
import { httpErrorMessage, prioritizedHttpErrorMessage } from '../services/httpErrors';
import { deleteProject } from '../services/projects';
import type { AnalysisSummary } from '../types/analysis';
import type { Project } from '../types/project';

type ProjectWithAnalysisCount = Project & {
  analysisCount: number | null;
  completedCount: number;
  activeCount: number;
};
type RecentAnalysis = AnalysisSummary & { projectId: string; projectName: string };

export function DashboardPage() {
  const [projects, setProjects] = useState<ProjectWithAnalysisCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmingProjectId, setConfirmingProjectId] = useState<string | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [projectErrors, setProjectErrors] = useState<Record<string, string>>({});
  const [recent, setRecent] = useState<RecentAnalysis[]>([]);
  const [recentError, setRecentError] = useState('');
  const [stats, setStats] = useState({ total: 0, completed: 0, active: 0 });
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'recent' | 'name'>('recent');

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
        setProjects(
          response.data.map((project, index) => {
            const history = histories[index];
            const analyses = history.status === 'fulfilled' ? history.value : [];
            return {
              ...project,
              analysisCount: history.status === 'fulfilled' ? analyses.length : null,
              completedCount: analyses.filter((analysis) => analysis.status === 'COMPLETED').length,
              activeCount: analyses.filter(
                (analysis) => analysis.status === 'PENDING' || analysis.status === 'PROCESSING',
              ).length,
            };
          }),
        );
        const allAnalyses = histories.flatMap((history) =>
          history.status === 'fulfilled' ? history.value : [],
        );
        setStats({
          total: allAnalyses.length,
          completed: allAnalyses.filter((analysis) => analysis.status === 'COMPLETED').length,
          active: allAnalyses.filter(
            (analysis) => analysis.status === 'PENDING' || analysis.status === 'PROCESSING',
          ).length,
        });
        setRecent(
          histories
            .flatMap((history, index) =>
              history.status === 'fulfilled'
                ? history.value.map((analysis) => ({
                    ...analysis,
                    projectId: response.data[index].id,
                    projectName: response.data[index].name,
                  }))
                : [],
            )
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 5),
        );
        const rejectedReasons = histories.flatMap((history) =>
          history.status === 'rejected' ? [history.reason] : [],
        );
        setRecentError(
          rejectedReasons.length > 0
            ? prioritizedHttpErrorMessage(
                rejectedReasons,
                'Não foi possível carregar as análises recentes.',
              )
            : '',
        );
      } catch (cause) {
        if (active && !controller.signal.aborted) {
          setError(httpErrorMessage(cause, 'Não foi possível carregar os projetos.'));
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

  const handleDeleteProject = async (project: ProjectWithAnalysisCount) => {
    setDeletingProjectId(project.id);
    setProjectErrors((current) => ({ ...current, [project.id]: '' }));
    try {
      await deleteProject(project.id);
      setProjects((current) => current.filter((item) => item.id !== project.id));
      setRecent((current) => current.filter((item) => item.projectId !== project.id));
      setStats((current) => ({
        total: Math.max(0, current.total - (project.analysisCount ?? 0)),
        completed: Math.max(0, current.completed - project.completedCount),
        active: Math.max(0, current.active - project.activeCount),
      }));
      setConfirmingProjectId(null);
    } catch (cause) {
      setConfirmingProjectId(null);
      setProjectErrors((current) => ({
        ...current,
        [project.id]: httpErrorMessage(cause, 'Não foi possível excluir o projeto.'),
      }));
    } finally {
      setDeletingProjectId(null);
    }
  };

  const visibleProjects = projects
    .filter((project) => project.name.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) =>
      sort === 'name'
        ? a.name.localeCompare(b.name, 'pt-BR')
        : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  return (
    <AppShell>
      <div className="page-enter">
        <PageHeader
          title="Dashboard"
          subtitle="Acompanhe projetos e análises dos seus sistemas legados em um só lugar."
          action={
            <Link className="btn btn-primary btn-md" to="/projects/new">
              <Plus className="size-4" aria-hidden="true" />
              Novo projeto
            </Link>
          }
        />
        {loading ? (
          <DashboardSkeleton />
        ) : error ? (
          <Alert role="alert">{error}</Alert>
        ) : (
          <div className="grid gap-8">
            <section
              className="grid grid-cols-2 gap-3 lg:grid-cols-4"
              aria-label="Resumo das análises"
            >
              <MetricCard
                label="Projetos"
                value={projects.length}
                icon={<FolderKanban className="size-4" />}
              />
              <MetricCard
                label="Análises"
                value={recentError ? '—' : stats.total}
                icon={<Activity className="size-4" />}
              />
              <MetricCard
                label="Concluídas"
                value={recentError ? '—' : stats.completed}
                tone="success"
                icon={<CircleCheck className="size-4" />}
              />
              <MetricCard
                label="Em andamento"
                value={recentError ? '—' : stats.active}
                tone="info"
                icon={<LoaderCircle className="size-4" />}
              />
            </section>

            <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
              <section className="grid gap-4" aria-label="Projetos">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2>Projetos</h2>
                  {projects.length > 1 && (
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative">
                        <Search
                          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <input
                          className="control h-9 min-h-9 w-52 pl-9"
                          type="search"
                          aria-label="Buscar projeto pelo nome"
                          placeholder="Buscar projeto…"
                          value={query}
                          onChange={(event) => setQuery(event.target.value)}
                        />
                      </div>
                      <select
                        className="control h-9 min-h-9 w-auto"
                        aria-label="Ordenar projetos"
                        value={sort}
                        onChange={(event) => setSort(event.target.value as 'recent' | 'name')}
                      >
                        <option value="recent">Mais recentes</option>
                        <option value="name">Nome (A–Z)</option>
                      </select>
                    </div>
                  )}
                </div>

                {projects.length === 0 ? (
                  <EmptyState
                    title="Você ainda não possui projetos"
                    subtitle="Crie seu primeiro projeto para começar a analisar sistemas legados."
                    action={
                      <Link className="btn btn-primary btn-md" to="/projects/new">
                        Criar projeto
                      </Link>
                    }
                  />
                ) : visibleProjects.length === 0 ? (
                  <EmptyState
                    title="Nenhum projeto encontrado"
                    subtitle="Nenhum projeto corresponde à busca. Tente outro nome."
                    action={
                      <Button variant="secondary" onClick={() => setQuery('')}>
                        Limpar busca
                      </Button>
                    }
                  />
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {visibleProjects.map((project) => (
                      <Card key={project.id} interactive className="flex flex-col gap-4 p-5">
                        <div className="grid gap-2">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="min-w-0 [overflow-wrap:anywhere]">{project.name}</h3>
                            <span className="shrink-0 rounded-full border border-border bg-surface-secondary px-2 py-0.5 text-xs text-muted-foreground">
                              {project.analysisCount === null
                                ? 'Contagem indisponível'
                                : `${project.analysisCount} ${project.analysisCount === 1 ? 'análise' : 'análises'}`}
                            </span>
                          </div>
                          <p className="line-clamp-2 text-muted-foreground [overflow-wrap:anywhere]">
                            {project.description || 'Sem descrição informada.'}
                          </p>
                        </div>
                        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                          <span>
                            Criado em {new Date(project.createdAt).toLocaleDateString('pt-BR')}
                          </span>
                          <Link
                            className="inline-flex items-center gap-1 text-sm"
                            to={`/projects/${project.id}`}
                          >
                            Ver projeto <ArrowRight className="size-3.5" aria-hidden="true" />
                          </Link>
                        </div>
                        {confirmingProjectId === project.id ? (
                          <div className="grid gap-3 border-t border-border pt-4">
                            <p>
                              Excluir o projeto '{project.name}'? Esta ação não pode ser desfeita.
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                aria-label={`Confirmar exclusão do projeto ${project.name}`}
                                variant="destructive"
                                loading={deletingProjectId === project.id}
                                onClick={() => handleDeleteProject(project)}
                              >
                                Confirmar
                              </Button>
                              <Button
                                size="sm"
                                aria-label={`Cancelar exclusão do projeto ${project.name}`}
                                variant="secondary"
                                disabled={deletingProjectId === project.id}
                                onClick={() => setConfirmingProjectId(null)}
                              >
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="grid gap-3 border-t border-border pt-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <Link
                                className="btn btn-secondary btn-sm"
                                to={`/projects/${project.id}/analyses/new`}
                              >
                                Nova análise
                              </Link>
                              <Button
                                size="sm"
                                aria-label={`Excluir projeto ${project.name}`}
                                variant="ghost-danger"
                                disabled={deletingProjectId !== null}
                                onClick={() => setConfirmingProjectId(project.id)}
                              >
                                <Trash2 className="size-3.5" aria-hidden="true" />
                                Excluir
                              </Button>
                            </div>
                            {projectErrors[project.id] && (
                              <Alert role="alert">{projectErrors[project.id]}</Alert>
                            )}
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </section>

              <section className="grid gap-4" aria-label="Análises recentes">
                <div className="flex items-center justify-between gap-3">
                  <h2>Análises recentes</h2>
                  <Link className="inline-flex items-center gap-1 text-sm" to="/history">
                    Ver histórico <ArrowRight className="size-3.5" aria-hidden="true" />
                  </Link>
                </div>
                {recentError && <Alert role="alert">{recentError}</Alert>}
                {recent.length === 0 && !recentError ? (
                  <Card className="p-5 text-muted-foreground">
                    Nenhuma análise realizada ainda. <Link to="/projects/new">Criar projeto</Link>{' '}
                    para começar.
                  </Card>
                ) : (
                  <Card>
                    <ul className="divide-y divide-border">
                      {recent.map((analysis) => (
                        <li key={analysis.id} className="grid gap-2 px-4 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <strong className="min-w-0 truncate font-medium">
                              {analysis.projectName}
                            </strong>
                            <StatusBadge status={analysis.status} />
                          </div>
                          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                            <span className="mono">
                              {analysis.provider} ·{' '}
                              {new Date(analysis.createdAt).toLocaleDateString('pt-BR')}
                            </span>
                            <Link
                              className="inline-flex items-center gap-1 text-sm"
                              to={
                                analysis.status === 'COMPLETED'
                                  ? `/analyses/${analysis.id}`
                                  : `/analyses/${analysis.id}/processing`
                              }
                            >
                              Abrir <ArrowRight className="size-3.5" aria-hidden="true" />
                            </Link>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}
              </section>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
