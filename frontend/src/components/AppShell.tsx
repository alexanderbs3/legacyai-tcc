import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { clearToken } from '../services/api'
import { Brand } from './Brand'
import { Icon } from './Icon'
import { ThemeToggle } from './ThemeToggle'

type AppShellProps = {
  children: ReactNode
}

const navigation = [
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/history', label: 'Histórico', icon: 'history' },
]

export function AppShell({ children }: AppShellProps) {
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand to="/dashboard" className="brand-sidebar" />
        <button className="mobile-menu-toggle nav-link" type="button" aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'} aria-expanded={menuOpen} aria-controls="mobile-navigation" onClick={() => setMenuOpen((open) => !open)}><Icon name={menuOpen ? 'close' : 'menu'} /></button>
        <nav id="mobile-navigation" className={menuOpen ? 'mobile-nav-expanded' : ''} aria-label="Navegação principal">
          {navigation.map((item) => {
            const active = item.to === '/dashboard'
              ? location.pathname === item.to || location.pathname.startsWith('/projects')
              : location.pathname.startsWith(item.to)
            return <Link key={item.to} to={item.to} aria-label={item.label} onClick={() => setMenuOpen(false)} className={`nav-link ${active ? 'active' : ''}`}><Icon name={item.icon} /><span>{item.label}</span></Link>
          })}
        </nav>
        <div className="sidebar-footer">
          <ThemeToggle />
          <button className="nav-link nav-logout" type="button" aria-label="Sair" onClick={() => { clearToken(); window.location.assign('/login') }}>
            <Icon name="logout" /><span>Sair</span>
          </button>
        </div>
      </aside>
      <main className="app-content">{children}</main>
    </div>
  )
}
