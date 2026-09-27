import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'
import { Spinner } from '../components/Spinner'
import { api } from '../services/api'
import type { AnalysisSummary } from '../types/analysis'
import type { Project, UploadedFile } from '../types/project'

function statusVariant(status: AnalysisSummary['status']) { return status === 'COMPLETED' ? 'success' : status === 'FAILED' ? 'failed' : status === 'PROCESSING' ? 'processing' : 'pending' as const }

export function ProjectDetailPage() {
  const { id } = useParams()
  const [project, setProject] = useState<Project>()
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [analyses, setAnalyses] = useState<AnalysisSummary[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([api.get<Project>(`/projects/${id}`), api.get<UploadedFile[]>(`/projects/${id}/files`), api.get<AnalysisSummary[]>(`/projects/${id}/analyses`)]).then(([projectResponse, filesResponse, analysesResponse]) => { setProject(projectResponse.data); setFiles(filesResponse.data); setAnalyses(analysesResponse.data) }).catch(() => setError('Não foi possível carregar o projeto.'))
  }, [id])

  if (!project && !error) return <AppShell><div className="loading-state"><Spinner /> Carregando projeto…</div></AppShell>
  if (error) return <AppShell><p className="alert page-enter" role="alert">{error}</p></AppShell>
  return <AppShell><div className="page-enter"><PageHeader title={project!.name} subtitle={project!.description || 'Sem descrição informada.'} action={<Link to={`/projects/${id}/analyses/new`}><Button>Nova análise</Button></Link>} /><div className="detail-sections"><Card className="section-card"><div className="section-heading"><h2>Arquivos enviados</h2><span>{files.length}</span></div>{files.length === 0 ? <EmptyState title="Nenhum arquivo enviado" subtitle="Envie um arquivo ao criar o projeto para disponibilizá-lo para análise." /> : <ul className="file-list">{files.map((file) => <li className="file-row" key={file.id}><div className="row-primary"><span className="row-icon" aria-hidden="true">▤</span>{file.fileName}</div><span className="row-secondary">{(file.fileSize / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} KB</span></li>)}</ul>}</Card><Card className="section-card"><div className="section-heading"><h2>Análises recentes</h2><span>{analyses.length}</span></div>{analyses.length === 0 ? <EmptyState title="Nenhuma análise ainda" subtitle="Inicie uma análise para gerar um diagnóstico do sistema." /> : <ul className="analysis-list">{analyses.map((analysis) => <li className="analysis-row" key={analysis.id}><div><div className="row-primary">{analysis.provider} <Badge variant={statusVariant(analysis.status)}>{analysis.status}</Badge></div><span className="row-secondary">{new Date(analysis.createdAt).toLocaleString('pt-BR')}</span></div><Link to={analysis.status === 'COMPLETED' ? `/analyses/${analysis.id}` : `/analyses/${analysis.id}/processing`}>Abrir →</Link></li>)}</ul>}</Card></div></div></AppShell>
}