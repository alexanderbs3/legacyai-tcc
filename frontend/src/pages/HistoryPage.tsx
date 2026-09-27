import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { Badge } from '../components/Badge'
import { EmptyState } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'
import { Spinner } from '../components/Spinner'
import { api } from '../services/api'
import type { AnalysisSummary } from '../types/analysis'
import type { Project } from '../types/project'

type HistoryRow = AnalysisSummary & { project: Project }
function statusVariant(status: AnalysisSummary['status']) { return status === 'COMPLETED' ? 'success' : status === 'FAILED' ? 'failed' : status === 'PROCESSING' ? 'processing' : 'pending' as const }

export function HistoryPage() {
  const [rows, setRows] = useState<HistoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get<Project[]>('/projects').then(async (response) => {
      const grouped = await Promise.all(response.data.map(async (project) => (await api.get<AnalysisSummary[]>(`/projects/${project.id}/analyses`)).data.map((analysis) => ({ ...analysis, project }))))
      setRows(grouped.flat().sort((first, second) => second.createdAt.localeCompare(first.createdAt)))
    }).catch(() => setError('Não foi possível carregar o histórico.')).finally(() => setLoading(false))
  }, [])

  return <AppShell><div className="page-enter"><PageHeader title="Histórico de análises" subtitle="Acompanhe os diagnósticos realizados em todos os seus projetos." />{loading ? <div className="loading-state"><Spinner /> Carregando histórico…</div> : error ? <p className="alert" role="alert">{error}</p> : rows.length === 0 ? <EmptyState title="Nenhuma análise no histórico" subtitle="Quando uma análise for iniciada, ela aparecerá aqui." /> : <div className="table-wrap"><table><thead><tr><th>Data</th><th>Projeto</th><th>Provedor</th><th>Status</th><th aria-label="Detalhe" /></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td>{new Date(row.createdAt).toLocaleString('pt-BR')}</td><td>{row.project.name}</td><td>{row.provider}</td><td><Badge variant={statusVariant(row.status)}>{row.status}</Badge></td><td><Link to={row.status === 'COMPLETED' ? `/analyses/${row.id}` : `/analyses/${row.id}/processing`}>Abrir →</Link></td></tr>)}</tbody></table></div>}</div></AppShell>
}