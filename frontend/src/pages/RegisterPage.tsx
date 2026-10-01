import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Input } from '../components/Input'
import { api } from '../services/api'
import { authErrorMessage } from '../services/authErrors'
import type { RegisterRequest } from '../types/auth'

export function RegisterPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (!confirmPassword) { setError('Confirme sua senha.'); return }
    if (password !== confirmPassword) { setError('As senhas não coincidem.'); return }
    setLoading(true)
    try {
      await api.post<unknown, unknown, RegisterRequest>('/auth/register', { name, email, password })
      navigate('/login')
    } catch (cause) {
      setError(authErrorMessage(cause, 'Não foi possível criar a conta.'))
    } finally {
      setLoading(false)
    }
  }

  return <main className="auth-page page-enter"><Card className="auth-card"><Link className="brand" to="/login"><span>Legacy</span><strong>AI</strong></Link><div className="auth-heading"><h1>Crie sua conta</h1><p>Centralize diagnósticos para evoluir seu legado com clareza.</p></div><form onSubmit={handleSubmit}><Input label="Nome" placeholder="Seu nome" value={name} onChange={(event) => setName(event.target.value)} required /><Input label="E-mail" type="email" placeholder="voce@empresa.com" value={email} onChange={(event) => setEmail(event.target.value)} required /><Input label="Senha" type="password" minLength={8} placeholder="Mínimo de 8 caracteres" value={password} onChange={(event) => setPassword(event.target.value)} required /><Input label="Confirmar senha" type="password" minLength={8} placeholder="Repita sua senha" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /><Button type="submit" loading={loading}>Criar conta</Button></form>{error && <p className="alert" role="alert">{error}</p>}<p className="auth-footer">Já tem uma conta? <Link to="/login">Entrar</Link></p></Card></main>
}