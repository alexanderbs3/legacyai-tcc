import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { clearToken } from '../services/api'
import { Brand } from './Brand'

type AppShellProps = {
  children: ReactNode
}

const navigation = [
  { to: '/dashboard', label: 'Dashboard', icon: '▦' },
  { to: '/history', label: 'Histórico', icon: '◷' },
]

export function AppShell({ children }: AppShellProps) {
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand to="/dashboard" className="brand-sidebar" />
        <button className="mobile-menu-toggle nav-link" type="button" aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'} aria-expanded={menuOpen} aria-controls="mobile-navigation" onClick={() => setMenuOpen((open) => !open)}><span aria-hidden="true">☰</span></button>
        <nav id="mobile-navigation" className={menuOpen ? 'mobile-nav-expanded' : ''} aria-label="Navegação principal">
          {navigation.map((item) => {
            const active = item.to === '/dashboard'
              ? location.pathname === item.to || location.pathname.startsWith('/projects')
              : location.pathname.startsWith(item.to)
            return <Link key={item.to} to={item.to} aria-label={item.label} onClick={() => setMenuOpen(false)} className={`nav-link ${active ? 'active' : ''}`}><span aria-hidden="true">{item.icon}</span><span>{item.label}</span></Link>
          })}
        </nav>
        <button className="nav-link nav-logout" type="button" aria-label="Sair" onClick={() => { clearToken(); window.location.assign('/login') }}>
          <span aria-hidden="true">↗</span><span>Sair</span>
        </button>
      </aside>
      <main className="app-content">{children}</main>
    </div>
  )
}
