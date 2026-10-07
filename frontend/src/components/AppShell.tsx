import { useState } from 'react';
import type { ReactNode } from 'react';
import { History, LayoutDashboard, LogOut, Menu, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { clearToken } from '../services/api';
import { Brand } from './layout/Brand';
import { CommandMenu } from './layout/CommandMenu';
import { SidebarToggle } from './layout/SidebarToggle';
import { ThemeToggle } from './layout/ThemeToggle';

type AppShellProps = {
  children: ReactNode;
};

const navigation = [
  { to: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { to: '/history', label: 'Histórico', Icon: History },
];

export function AppShell({ children }: AppShellProps) {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="app-shell">
      <aside className="sidebar" data-open={menuOpen}>
        <div className="sidebar-brand">
          <Brand to="/dashboard" />
        </div>
        <button
          className="btn btn-ghost mobile-menu-toggle"
          type="button"
          aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
        <nav
          id="mobile-navigation"
          className={menuOpen ? 'mobile-nav-expanded' : ''}
          aria-label="Navegação principal"
        >
          {navigation.map(({ to, label, Icon }) => {
            const active =
              to === '/dashboard'
                ? location.pathname === to || location.pathname.startsWith('/projects')
                : location.pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                aria-label={label}
                aria-current={active ? 'page' : undefined}
                title={label}
                onClick={() => setMenuOpen(false)}
                className="nav-link"
              >
                <Icon className="size-4" aria-hidden="true" />
                <span className="nav-label">{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <SidebarToggle />
          <button
            className="nav-link"
            type="button"
            aria-label="Sair"
            title="Sair"
            onClick={() => {
              clearToken();
              window.location.assign('/login');
            }}
          >
            <LogOut className="size-4" aria-hidden="true" />
            <span className="nav-label">Sair</span>
          </button>
        </div>
      </aside>
      <div className="app-main ambient">
        <header className="topbar">
          <CommandMenu />
          <ThemeToggle />
        </header>
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
