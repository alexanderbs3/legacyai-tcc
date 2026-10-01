import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { Breadcrumb } from '../components/Breadcrumb'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { PageHeader } from '../components/PageHeader'
import { Spinner } from '../components/Spinner'
import { api } from '../services/api'
import type { UploadedFile } from '../types/project'

type Provider = { name: string; displayName: string; available: boolean }

export function NewAnalysisPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [providers, setProviders] = useState<Provider[]>([])
  const [provider, setProvider] = useState('OPENAI')
  const [loadingProviders, setLoadingProviders] = useState(true)
  const [loadingFiles, setLoadingFiles] = useState(true)
  const [hasMaterial, setHasMaterial] = useState(false)
  const [filesError, setFilesError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get<Provider[]>('/ai/providers').then((response) => {
      setProviders(response.data)
      const initialProvider = response.data.find((item) => item.name === 'OPENAI' && item.available) ?? response.data.find((item) => item.available)
      if (initialProvider) setProvider(initialProvider.name)
    }).catch(() => setError('Não foi possível carregar os provedores disponíveis.')).finally(() => setLoadingProviders(false))
  }, [])

  useEffect(() => {
    api.get<UploadedFile[]>(`/projects/${id}/files`)
      .then((response) => setHasMaterial(response.data.length > 0))
      .catch(() => setFilesError('Não foi possível verificar os arquivos deste projeto.'))
      .finally(() => setLoadingFiles(false))
  }, [id])

  const materialReady = !loadingFiles && !filesError && hasMaterial

  async function submit() {
    if (!materialReady || submitting || !providers.some((item) => item.name === provider && item.available)) return
    setError('')
    setSubmitting(true)
    try {
      const { data } = await api.post<{ analysisId: string }>(`/projects/${id}/analyses`, { provider })
      navigate(`/analyses/${data.analysisId}/processing`)
    } catch {
      setError('Não foi possível iniciar a análise.')
    } finally {
      setSubmitting(false)
    }
  }

  return <AppShell><div className="page-enter"><PageHeader title="Nova análise" subtitle="Escolha o provedor que fará a leitura técnica do projeto." /><Breadcrumb items={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Projeto', to: `/projects/${id}` }, { label: 'Nova análise' }]} />{loadingProviders || loadingFiles ? <div className="loading-state"><Spinner /> {loadingProviders ? 'Carregando provedores…' : 'Verificando arquivos do projeto…'}</div> : <Card className="centered-card">{filesError && <p className="alert" role="alert">{filesError} Volte ao projeto e tente novamente.</p>}{!filesError && !hasMaterial && <p role="status">Este projeto ainda não possui arquivo para análise. Adicione um arquivo antes de continuar.</p>}{!materialReady && <Link to={`/projects/${id}`}>Voltar ao projeto e adicionar arquivo</Link>}<div className="provider-grid">{providers.map((item) => <button key={item.name} type="button" className={`provider-card ${provider === item.name ? 'selected' : ''} ${!item.available ? 'unavailable' : ''}`} onClick={() => setProvider(item.name)} disabled={!item.available} aria-pressed={provider === item.name}><strong>{item.name === 'DEEPSEEK' ? 'DeepSeek V4.1 Flash' : item.displayName}</strong><span>{item.available ? item.name === 'AUTO' ? 'Escolha automática' : 'Disponível para análise' : 'Indisponível'}</span></button>)}</div>{providers.length === 0 && <p className="alert" role="alert">Nenhum provedor está disponível no momento.</p>}{error && <p className="alert" role="alert">{error}</p>}<div className="form-actions"><Button type="button" onClick={submit} loading={submitting} disabled={!materialReady || !providers.some((item) => item.name === provider && item.available)}>Iniciar análise</Button></div></Card>}</div></AppShell>
}