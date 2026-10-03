import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { Badge } from '../components/Badge'
import { EmptyState } from '../components/EmptyState'
import { Icon } from '../components/Icon'
import { PageHeader } from '../components/PageHeader'
import { Spinner } from '../components/Spinner'
import { api } from '../services/api'
import { deleteAnalysis } from '../services/analyses'
import { Button } from '../components/Button'
import type { AnalysisSummary } from '../types/analysis'
import type { Project } from '../types/project'

type HistoryRow = AnalysisSummary & { project: Project }
function statusVariant(status: AnalysisSummary['status']) { return status === 'COMPLETED' ? 'success' : status === 'FAILED' ? 'failed' : status === 'PROCESSING' ? 'processing' : 'pending' as const }

export function HistoryPage() {
  const [rows, setRows] = useState<HistoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [partialError, setPartialError] = useState(false)
  const [confirmingAnalysisId, setConfirmingAnalysisId] = useState<string | null>(null)
  const [deletingAnalysisId, setDeletingAnalysisId] = useState<string | null>(null)
  const [analysisErrors, setAnalysisErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    api.get<Project[]>('/projects').then(async (response) => {
      const grouped = await Promise.allSettled(response.data.map(async (project) =>
        (await api.get<AnalysisSummary[]>(`/projects/${project.id}/analyses`)).data.map((analysis) => ({ ...analysis, project }))))
      const rejectedCount = grouped.filter((result) => result.status === 'rejected').length
      setRows(grouped.flatMap((result) => result.status === 'fulfilled' ? result.value : [])
        .sort((first, second) => second.createdAt.localeCompare(first.createdAt)))
      if (grouped.length > 0 && rejectedCount === grouped.length) {
        setError('Não foi possível carregar o histórico. Tente novamente em instantes.')
      } else {
        setPartialError(rejectedCount > 0)
      }
    }).catch(() => setError('Não foi possível carregar o histórico.')).finally(() => setLoading(false))
  }, [])

  const handleDeleteAnalysis = async (analysisId: string) => {
    setDeletingAnalysisId(analysisId)
    setAnalysisErrors((current) => ({ ...current, [analysisId]: '' }))
    try {
      await deleteAnalysis(analysisId)
      setRows((current) => current.filter((row) => row.id !== analysisId))
      setConfirmingAnalysisId(null)
    } catch {
      setConfirmingAnalysisId(null)
      setAnalysisErrors((current) => ({ ...current, [analysisId]: 'Não foi possível excluir a análise.' }))
    } finally {
      setDeletingAnalysisId(null)
    }
  }

  return (
    <AppShell>
      <div className="page-enter">
        <PageHeader title="Histórico de análises" subtitle="Acompanhe os diagnósticos realizados em todos os seus projetos." />
        {loading ? <div className="loading-state"><Spinner /> Carregando histórico…</div> : error ? <p className="alert" role="alert">{error}</p> : <>
          {partialError && <p className="alert notice history-notice" role="status">O histórico está incompleto porque não foi possível carregar as análises de alguns projetos.</p>}
          {rows.length === 0
            ? <EmptyState
                title={partialError ? 'Nenhum resultado disponível nos projetos carregados' : 'Nenhuma análise no histórico'}
                subtitle={partialError ? 'Tente novamente para consultar os projetos indisponíveis.' : 'Quando uma análise for iniciada, ela aparecerá aqui.'}
              />
            : <div className="table-wrap">
                <table>
                  <thead><tr><th>Data</th><th>Projeto</th><th>Provedor</th><th>Status</th><th aria-label="Detalhe" /><th>Ações</th></tr></thead>
                  <tbody>{rows.map((row) => {
                    const analysisLabel = `${row.project.name}, ${new Date(row.createdAt).toLocaleString('pt-BR')}`
                    return <tr key={row.id}>
                      <td>{new Date(row.createdAt).toLocaleString('pt-BR')}</td>
                      <td>{row.project.name}</td>
                      <td>{row.provider}</td>
                      <td><Badge variant={statusVariant(row.status)}>{row.status}</Badge></td>
                      <td><Link to={row.status === 'COMPLETED' ? `/analyses/${row.id}` : `/analyses/${row.id}/processing`}>Abrir <Icon name="arrow_forward" className="link-icon" /></Link></td>
                      <td>{confirmingAnalysisId === row.id
                        ? <div><p>Excluir esta análise? Esta ação não pode ser desfeita.</p><div className="inline-actions"><Button aria-label={`Confirmar exclusão da análise de ${analysisLabel}`} variant="danger" loading={deletingAnalysisId === row.id} onClick={() => handleDeleteAnalysis(row.id)}>Sim</Button><Button aria-label={`Cancelar exclusão da análise de ${analysisLabel}`} variant="secondary" disabled={deletingAnalysisId === row.id} onClick={() => setConfirmingAnalysisId(null)}>Cancelar</Button></div></div>
                        : <div><Button aria-label={`Excluir análise de ${analysisLabel}`} variant="danger" disabled={deletingAnalysisId !== null} onClick={() => setConfirmingAnalysisId(row.id)}>Excluir</Button>{analysisErrors[row.id] && <p className="alert" role="alert">{analysisErrors[row.id]}</p>}</div>}
                      </td>
                    </tr>
                  })}</tbody>
                </table>
              </div>}
        </>}
      </div>
    </AppShell>
  )
}
