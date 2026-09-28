import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { Badge } from '../components/Badge'
import { Card } from '../components/Card'
import { PageHeader } from '../components/PageHeader'
import { Spinner } from '../components/Spinner'
import { api } from '../services/api'
import type { Analysis, ReportItem } from '../types/analysis'

function priorityVariant(priority: ReportItem['priority']) { return priority.toLowerCase() as 'high' | 'medium' | 'low' }
const priorityLabels: Record<ReportItem['priority'], string> = { HIGH: 'Alta', MEDIUM: 'Média', LOW: 'Baixa' }
function ItemSection({ title, items }: { title: string; items: ReportItem[] }) {
  return <Card className="section-card"><h2>{`${title} (${items.length})`}</h2>{items.length === 0 ? <p>Nenhum item identificado.</p> : <div className="issue-list">{items.map((item, index) => <article className={`issue-card priority-${item.priority.toLowerCase()}`} key={`${item.title}-${index}`}><div className="issue-title"><h3>{item.title}</h3><Badge variant={priorityVariant(item.priority)}>{priorityLabels[item.priority]}</Badge></div><p>{item.description}</p></article>)}</div>}</Card>
}

export function AnalysisResultPage() {
  const { id } = useParams()
  const [analysis, setAnalysis] = useState<Analysis>()
  const [error, setError] = useState('')

  useEffect(() => { api.get<Analysis>(`/analyses/${id}`).then((response) => setAnalysis(response.data)).catch(() => setError('Não foi possível carregar o relatório.')) }, [id])

  if (error) return <AppShell><p className="alert page-enter" role="alert">{error}</p></AppShell>
  if (!analysis || analysis.status === 'PENDING' || analysis.status === 'PROCESSING') return <AppShell><div className="loading-state"><Spinner /> Carregando relatório…</div></AppShell>
  if (analysis.status === 'FAILED' || !analysis.result) return <AppShell><p className="alert page-enter" role="alert">{analysis.errorMessage || 'A análise não produziu um relatório.'}</p></AppShell>
  const report = analysis.result
  return <AppShell><div className="page-enter"><p className="alert notice" role="note">Este relatório contém recomendações automatizadas e deve ser validado por uma pessoa técnica antes de qualquer decisão.</p><PageHeader title="Relatório de análise" subtitle={`${analysis.provider} · ${new Date(analysis.completedAt || analysis.createdAt).toLocaleString('pt-BR')}`} /><div className="report-sections"><Card className="section-card summary-card"><h2>Resumo</h2><p>{report.summary}</p></Card><Card className="section-card"><h2>Tecnologias identificadas</h2>{report.technologies.length === 0 ? <p>Nenhuma tecnologia identificada no contexto analisado.</p> : <div className="technology-list">{report.technologies.map((item) => <span className="technology-chip" key={item}>{item}</span>)}</div>}</Card><Card className="section-card"><h2>Arquitetura</h2><p>{report.architecture}</p></Card><ItemSection title="Problemas" items={report.problems} /><ItemSection title="Riscos de segurança" items={report.securityRisks} /><ItemSection title="Recomendações" items={report.recommendations} /><Card className="section-card"><h2>Modernização</h2>{report.modernization.length === 0 ? <p>Nenhuma ação de modernização identificada no contexto analisado.</p> : <ul className="modernization-list">{report.modernization.map((item) => <li key={item}>{item}</li>)}</ul>}</Card></div></div></AppShell>
}