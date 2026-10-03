import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { Icon } from '../components/Icon'
import { PageHeader } from '../components/PageHeader'
import { Spinner } from '../components/Spinner'
import { api } from '../services/api'
import { deleteProject } from '../services/projects'
import type { AnalysisSummary } from '../types/analysis'
import type { Project } from '../types/project'

type ProjectWithAnalysisCount = Project & { analysisCount: number | null }
type RecentAnalysis = AnalysisSummary & { projectId: string; projectName: string }

export function DashboardPage() {
  const [projects, setProjects] = useState<ProjectWithAnalysisCount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirmingProjectId, setConfirmingProjectId] = useState<string | null>(null)
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null)
  const [projectErrors, setProjectErrors] = useState<Record<string, string>>({})
  const [recent, setRecent] = useState<RecentAnalysis[]>([])
  const [recentError, setRecentError] = useState(false)

  useEffect(() => {
    api.get<Project[]>('/projects').then(async (response) => {
      const histories = await Promise.allSettled(response.data.map((project) => api.get<AnalysisSummary[]>(`/projects/${project.id}/analyses`)))
      setProjects(response.data.map((project, index) => ({
        ...project,
        analysisCount: histories[index].status === 'fulfilled' ? histories[index].value.data.length : null,
      })))
      setRecent(histories.flatMap((history, index) => history.status === 'fulfilled'
        ? history.value.data.map((analysis) => ({ ...analysis, projectId: response.data[index].id, projectName: response.data[index].name }))
        : []).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5))
      setRecentError(histories.some((history) => history.status === 'rejected'))
    }).catch(() => setError('Não foi possível carregar os projetos.')).finally(() => setLoading(false))
  }, [])

  const handleDeleteProject = async (project: ProjectWithAnalysisCount) => {
    setDeletingProjectId(project.id)
    setProjectErrors((current) => ({ ...current, [project.id]: '' }))
    try {
      await deleteProject(project.id)
      setProjects((current) => current.filter((item) => item.id !== project.id))
      setRecent((current) => current.filter((item) => item.projectId !== project.id))
      setConfirmingProjectId(null)
    } catch {
      setConfirmingProjectId(null)
      setProjectErrors((current) => ({ ...current, [project.id]: 'Não foi possível excluir o projeto.' }))
    } finally {
      setDeletingProjectId(null)
    }
  }

  return (
    <AppShell>
      <div className="page-enter">
        <PageHeader
          title="Projetos"
          subtitle="Organize os sistemas que precisam de uma visão técnica mais clara."
          action={<Link to="/projects/new"><Button>Novo projeto</Button></Link>}
        />
        {loading ? (
          <div className="loading-state"><Spinner /> Carregando projetos…</div>
        ) : error ? (
          <p className="alert" role="alert">{error}</p>
        ) : (
          <>
            {projects.length === 0 ? (
              <EmptyState title="Nenhum projeto ainda" subtitle="Crie seu primeiro projeto para enviar arquivos e iniciar uma análise." />
            ) : (
              <div className="project-grid">
                {projects.map((project) => (
                  <Card key={project.id} className="project-card">
                    <div className="project-card-header">
                      <h2>{project.name}</h2>
                      <span className="project-count">
                        {project.analysisCount === null
                          ? 'Contagem indisponível'
                          : `${project.analysisCount} ${project.analysisCount === 1 ? 'análise' : 'análises'}`}
                      </span>
                    </div>
                    <p>{project.description || 'Sem descrição informada.'}</p>
                    <div className="project-meta">
                      <span>Criado em {new Date(project.createdAt).toLocaleDateString('pt-BR')}</span>
                      <Link to={`/projects/${project.id}`}>Ver projeto <Icon name="arrow_forward" className="link-icon" /></Link>
                    </div>
                    {confirmingProjectId === project.id ? (
                      <div>
                        <p>Excluir o projeto '{project.name}'? Esta ação não pode ser desfeita.</p>
                        <div className="confirm-actions">
                          <Button variant="danger" loading={deletingProjectId === project.id} onClick={() => handleDeleteProject(project)}>Sim</Button>
                          <Button variant="secondary" disabled={deletingProjectId === project.id} onClick={() => setConfirmingProjectId(null)}>Cancelar</Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <Button variant="danger" disabled={deletingProjectId !== null} onClick={() => setConfirmingProjectId(project.id)}>Excluir</Button>
                        {projectErrors[project.id] && <p className="alert" role="alert">{projectErrors[project.id]}</p>}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
            <section className="recent-analyses" aria-label="Análises recentes">
              <div className="section-heading">
                <h2>Análises recentes</h2>
                <Link to="/history">Ver histórico <Icon name="arrow_forward" className="link-icon" /></Link>
              </div>
              {recentError && <p className="alert" role="alert">Não foi possível carregar as análises recentes.</p>}
              {recent.length === 0 && !recentError ? (
                <p>Nenhuma análise realizada ainda. <Link to="/projects/new">Criar projeto</Link> para começar.</p>
              ) : (
                <ul className="analysis-list">
                  {recent.map((analysis) => (
                    <li key={analysis.id} className="analysis-row">
                      <div>
                        <strong>{analysis.projectName}</strong>
                        <div className="row-secondary">{analysis.provider} · {new Date(analysis.createdAt).toLocaleDateString('pt-BR')}</div>
                      </div>
                      <Badge variant={analysis.status === 'COMPLETED' ? 'success' : analysis.status === 'FAILED' ? 'failed' : analysis.status === 'PENDING' ? 'pending' : 'processing'}>
                        {analysis.status === 'COMPLETED' ? 'Concluída' : analysis.status === 'FAILED' ? 'Falhou' : analysis.status === 'PENDING' ? 'Pendente' : 'Processando'}
                      </Badge>
                      <Link to={analysis.status === 'COMPLETED' ? `/analyses/${analysis.id}` : `/analyses/${analysis.id}/processing`}>
                        Abrir <Icon name="arrow_forward" className="link-icon" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </AppShell>
  )
}