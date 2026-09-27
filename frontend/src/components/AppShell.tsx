import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { clearToken } from '../services/api'

type AppShellProps = {
  children: ReactNode
}

const navigation = [
  { to: '/dashboard', label: 'Dashboard', icon: '▦' },
  { to: '/history', label: 'Histórico', icon: '◷' },
]

export function AppShell({ children }: AppShellProps) {
  const location = useLocation()

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand brand-sidebar" to="/dashboard"><span>Legacy</span><strong>AI</strong></Link>
        <nav aria-label="Navegação principal">
          {navigation.map((item) => {
            const active = item.to === '/dashboard'
              ? location.pathname === item.to || location.pathname.startsWith('/projects')
              : location.pathname.startsWith(item.to)
            return <Link key={item.to} to={item.to} className={`nav-link ${active ? 'active' : ''}`}><span aria-hidden="true">{item.icon}</span><span>{item.label}</span></Link>
          })}
        </nav>
        <button className="nav-link nav-logout" type="button" onClick={() => { clearToken(); window.location.assign('/login') }}>
          <span aria-hidden="true">↗</span><span>Sair</span>
        </button>
      </aside>
      <main className="app-content">{children}</main>
    </div>
  )
}
