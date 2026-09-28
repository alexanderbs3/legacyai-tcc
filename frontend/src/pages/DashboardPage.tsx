import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'
import { Spinner } from '../components/Spinner'
import { api } from '../services/api'
import { deleteProject } from '../services/projects'
import type { AnalysisSummary } from '../types/analysis'
import type { Project } from '../types/project'

type ProjectWithAnalysisCount = Project & { analysisCount: number }

export function DashboardPage() {
  const [projects, setProjects] = useState<ProjectWithAnalysisCount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirmingProjectId, setConfirmingProjectId] = useState<string | null>(null)
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null)
  const [projectErrors, setProjectErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    api.get<Project[]>('/projects').then(async (response) => {
      const withCounts = await Promise.all(response.data.map(async (project) => ({ ...project, analysisCount: (await api.get<AnalysisSummary[]>(`/projects/${project.id}/analyses`)).data.length })))
      setProjects(withCounts)
    }).catch(() => setError('Não foi possível carregar os projetos.')).finally(() => setLoading(false))
  }, [])

  const handleDeleteProject = async (project: ProjectWithAnalysisCount) => {
    setDeletingProjectId(project.id)
    setProjectErrors((current) => ({ ...current, [project.id]: '' }))
    try {
      await deleteProject(project.id)
      setProjects((current) => current.filter((item) => item.id !== project.id))
      setConfirmingProjectId(null)
    } catch {
      setConfirmingProjectId(null)
      setProjectErrors((current) => ({ ...current, [project.id]: 'Não foi possível excluir o projeto.' }))
    } finally {
      setDeletingProjectId(null)
    }
  }

  return <AppShell><div className="page-enter"><PageHeader title="Projetos" subtitle="Organize os sistemas que precisam de uma visão técnica mais clara." action={<Link to="/projects/new"><Button>Novo projeto</Button></Link>} />{loading ? <div className="loading-state"><Spinner /> Carregando projetos…</div> : error ? <p className="alert" role="alert">{error}</p> : projects.length === 0 ? <EmptyState title="Nenhum projeto ainda" subtitle="Crie seu primeiro projeto para enviar arquivos e iniciar uma análise." /> : <div className="project-grid">{projects.map((project) => <Card key={project.id} className="project-card"><div className="project-card-header"><h2>{project.name}</h2><span className="project-count">{project.analysisCount} análises</span></div><p>{project.description || 'Sem descrição informada.'}</p><div className="project-meta"><span>Criado em {new Date(project.createdAt).toLocaleDateString('pt-BR')}</span><Link to={`/projects/${project.id}`}>Ver projeto →</Link></div>{confirmingProjectId === project.id ? <div><p>Excluir o projeto '{project.name}'? Esta ação não pode ser desfeita.</p><Button variant="danger" loading={deletingProjectId === project.id} onClick={() => handleDeleteProject(project)}>Sim</Button><Button variant="secondary" disabled={deletingProjectId === project.id} onClick={() => setConfirmingProjectId(null)}>Cancelar</Button></div> : <div><Button variant="danger" disabled={deletingProjectId !== null} onClick={() => setConfirmingProjectId(project.id)}>Excluir</Button>{projectErrors[project.id] && <p className="alert" role="alert">{projectErrors[project.id]}</p>}</div>}</Card>)}</div>}</div></AppShell>
}