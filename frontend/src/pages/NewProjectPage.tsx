import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Input } from '../components/Input'
import { PageHeader } from '../components/PageHeader'
import { api } from '../services/api'
import type { Project, ProjectRequest } from '../types/project'

export function NewProjectPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File>()
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post<Project, { data: Project }, ProjectRequest>('/projects', { name, description })
      if (file) {
        const form = new FormData()
        form.append('file', file)
        await api.post(`/projects/${data.id}/files`, form, { onUploadProgress: (upload) => setProgress(Math.round((upload.loaded / (upload.total || 1)) * 100)) })
      }
      navigate(`/projects/${data.id}`)
    } catch {
      setError('Falha ao criar o projeto ou enviar o arquivo.')
    } finally {
      setLoading(false)
    }
  }

  return <AppShell><div className="page-enter"><PageHeader title="Novo projeto" subtitle="Adicione contexto e um arquivo para começar a investigação." /><Card className="centered-card"><form onSubmit={submit}><Input label="Nome do projeto" placeholder="Ex.: Modernização do ERP" value={name} onChange={(event) => setName(event.target.value)} required /><div className="field"><label htmlFor="project-description">Descrição</label><textarea id="project-description" placeholder="Descreva brevemente o sistema e seu contexto." value={description} onChange={(event) => setDescription(event.target.value)} /></div><div className="field"><label htmlFor="project-file">Arquivo para análise</label><label className="upload-dropzone" htmlFor="project-file"><span className="upload-icon" aria-hidden="true">⇧</span><strong>Selecione um arquivo para enviar</strong><span>ZIP, TXT, MD ou README</span><input id="project-file" className="file-input" type="file" onChange={(event) => setFile(event.target.files?.[0])} /></label>{file && <div className="selected-file"><strong>{file.name}</strong><span>{(file.size / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} KB</span></div>}</div>{loading && file && <div className="upload-progress"><span>Enviando arquivo: {progress}%</span><div className="progress-track"><div className="progress-value" style={{ width: `${progress}%` }} /></div></div>}<div className="form-actions"><Button type="submit" loading={loading}>Criar e enviar</Button></div></form>{error && <p className="alert" role="alert">{error}</p>}</Card></div></AppShell>
}