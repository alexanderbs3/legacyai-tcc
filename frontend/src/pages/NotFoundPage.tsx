import { Link } from 'react-router-dom'
import { Button } from '../components/Button'
import { Card } from '../components/Card'

export function NotFoundPage() {
  return <main className="processing-page page-enter"><Card className="processing-card"><h1>Página não encontrada</h1><p>O endereço solicitado não corresponde a uma página do LegacyAI.</p><Link to="/dashboard"><Button>Voltar ao início</Button></Link></Card></main>
}
