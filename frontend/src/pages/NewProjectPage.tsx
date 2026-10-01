import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { Breadcrumb } from '../components/Breadcrumb'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Icon } from '../components/Icon'
import { Input } from '../components/Input'
import { PageHeader } from '../components/PageHeader'
import { api } from '../services/api'
import { uploadErrorMessage } from '../services/uploadErrors'
import type { Project, ProjectRequest } from '../types/project'

type FieldErrors = {
  name?: string
}

function validate(name: string): FieldErrors {
  const errors: FieldErrors = {}
  if (!name.trim()) errors.name = 'Informe o nome do projeto.'
  return errors
}

export function NewProjectPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File>()
  const [progress, setProgress] = useState(0)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [createdProjectId, setCreatedProjectId] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading || createdProjectId) return

    const errors = validate(name)
    setFieldErrors(errors)
    if (errors.name) return

    setError('')
    setLoading(true)
    let projectCreated = false
    try {
      const { data } = await api.post<Project, { data: Project }, ProjectRequest>('/projects', { name, description })
      projectCreated = true
      setCreatedProjectId(data.id)
      if (file) {
        const form = new FormData()
        form.append('file', file)
        await api.post(`/projects/${data.id}/files`, form, { onUploadProgress: (upload) => setProgress(Math.round((upload.loaded / (upload.total || 1)) * 100)) })
      }
      navigate(`/projects/${data.id}`)
    } catch (cause) {
      setError(projectCreated ? uploadErrorMessage(cause, 'Não foi possível enviar o arquivo. Tente novamente no projeto.') : 'Não foi possível criar o projeto.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppShell>
      <div className="page-enter">
        <PageHeader title="Novo projeto" subtitle="Adicione contexto e um arquivo para começar a investigação." />
        <Breadcrumb items={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Novo projeto' }]} />
        <Card className="centered-card">
          <form onSubmit={submit} noValidate>
            <Input
              label="Nome do projeto"
              placeholder="Ex.: Modernização do ERP"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                if (fieldErrors.name) setFieldErrors({})
              }}
              error={fieldErrors.name}
            />

            <div className="field">
              <label htmlFor="project-description">Descrição</label>
              <textarea
                id="project-description"
                placeholder="Descreva brevemente o sistema e seu contexto."
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="project-file">Arquivo para análise (opcional; pode adicionar depois)</label>
              <label className="upload-dropzone" htmlFor="project-file">
                <Icon name="upload_file" className="upload-icon" />
                <strong>Selecione um arquivo para enviar</strong>
                <span>ZIP, TXT, MD ou README — até 70 MB por arquivo; conteúdo textual UTF-8</span>
                <input
                  id="project-file"
                  className="file-input"
                  type="file"
                  accept=".zip,.txt,.md,text/plain,text/markdown"
                  onChange={(event) => setFile(event.target.files?.[0])}
                />
              </label>
              {file && (
                <div className="selected-file">
                  <strong>{file.name}</strong>
                  <span>{(file.size / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} KB</span>
                </div>
              )}
            </div>

            {loading && file && (
              <div className="upload-progress">
                <span>Enviando arquivo: {progress}%</span>
                <div className="progress-track"><div className="progress-value" style={{ width: `${progress}%` }} /></div>
              </div>
            )}

            <div className="form-actions">
              <Button type="submit" loading={loading} disabled={Boolean(createdProjectId)}>Criar e enviar</Button>
            </div>
          </form>

          {error && <p className="alert" role="alert">{error}</p>}
          {error && createdProjectId && <Link to={`/projects/${createdProjectId}`}>Abrir projeto para adicionar arquivo</Link>}
        </Card>
      </div>
    </AppShell>
  )
}
