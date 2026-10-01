import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Input } from '../components/Input'
import { api, setToken } from '../services/api'
import { authErrorMessage } from '../services/authErrors'
import type { AuthResponse, LoginRequest } from '../types/auth'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type FieldErrors = {
  email?: string
  password?: string
}

function validate(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {}
  if (!email.trim()) errors.email = 'Informe seu e-mail.'
  else if (!EMAIL_PATTERN.test(email.trim())) errors.email = 'Informe um e-mail válido.'
  if (!password) errors.password = 'Informe sua senha.'
  return errors
}

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    const errors = validate(email, password)
    setFieldErrors(errors)
    if (errors.email || errors.password) return

    setLoading(true)
    try {
      const { data } = await api.post<AuthResponse, { data: AuthResponse }, LoginRequest>('/auth/login', { email, password })
      setToken(data.token)
      navigate('/dashboard')
    } catch (cause) {
      setError(authErrorMessage(cause, 'Não foi possível autenticar.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page page-enter">
      <Card className="auth-card">
        <Link className="brand" to="/login">
          <span>Legacy</span>
          <strong>AI</strong>
        </Link>

        <div className="auth-heading">
          <h1>Boas-vindas de volta</h1>
          <p>Entre para continuar a análise dos seus sistemas.</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <Input
            label="E-mail"
            type="email"
            placeholder="voce@empresa.com"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
              if (fieldErrors.email) setFieldErrors((current) => ({ ...current, email: undefined }))
            }}
            error={fieldErrors.email}
          />

          <Input
            label="Senha"
            type="password"
            placeholder="Sua senha"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value)
              if (fieldErrors.password) setFieldErrors((current) => ({ ...current, password: undefined }))
            }}
            error={fieldErrors.password}
          />

          <Button type="submit" loading={loading}>Entrar</Button>
        </form>

        {error && <p className="alert" role="alert">{error}</p>}

        <p className="auth-footer">
          Ainda não tem uma conta? <Link to="/register">Criar conta</Link>
        </p>
      </Card>
    </main>
  )
}
