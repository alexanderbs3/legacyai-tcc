import { useState } from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

const STORAGE_KEY = 'legacyai.sidebar';

/** Alterna sidebar expandida/compacta via atributo no <html> (evita re-render do layout inteiro). */
export function SidebarToggle() {
  const [collapsed, setCollapsed] = useState(
    () => document.documentElement.getAttribute('data-sidebar') === 'collapsed',
  );

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    if (next) document.documentElement.setAttribute('data-sidebar', 'collapsed');
    else document.documentElement.removeAttribute('data-sidebar');
    try {
      localStorage.setItem(STORAGE_KEY, next ? 'collapsed' : 'expanded');
    } catch {
      /* armazenamento indisponível: a preferência vale só nesta sessão */
    }
  }

  const Icon = collapsed ? PanelLeftOpen : PanelLeftClose;
  const label = collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral';

  return (
    <button
      className="nav-link sidebar-collapse"
      type="button"
      aria-label={label}
      title={label}
      onClick={toggle}
    >
      <Icon className="size-4" aria-hidden="true" />
      <span className="nav-label">{collapsed ? 'Expandir' : 'Recolher'}</span>
    </button>
  );
}
