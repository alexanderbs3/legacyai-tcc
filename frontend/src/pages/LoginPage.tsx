import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Input } from '../components/Input'
import { api, setToken } from '../services/api'
import type { AuthResponse, LoginRequest } from '../types/auth'

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post<AuthResponse, { data: AuthResponse }, LoginRequest>('/auth/login', { email, password })
      setToken(data.token)
      navigate('/dashboard')
    } catch {
      setError('Não foi possível autenticar.')
    } finally {
      setLoading(false)
    }
  }

  return <main className="auth-page page-enter"><Card className="auth-card"><Link className="brand" to="/login"><span>Legacy</span><strong>AI</strong></Link><div className="auth-heading"><h1>Boas-vindas de volta</h1><p>Entre para continuar a análise dos seus sistemas.</p></div><form onSubmit={handleSubmit}><Input label="E-mail" type="email" placeholder="voce@empresa.com" value={email} onChange={(event) => setEmail(event.target.value)} required /><Input label="Senha" type="password" placeholder="Sua senha" value={password} onChange={(event) => setPassword(event.target.value)} required /><Button type="submit" loading={loading}>Entrar</Button></form>{error && <p className="alert" role="alert">{error}</p>}<p className="auth-footer">Ainda não tem uma conta? <Link to="/register">Criar conta</Link></p></Card></main>
}