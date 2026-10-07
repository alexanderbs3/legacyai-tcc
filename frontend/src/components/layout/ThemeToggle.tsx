import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

const STORAGE_KEY = 'legacyai.theme';
type Theme = 'light' | 'dark';

function currentTheme(): Theme {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(currentTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // The selected theme still applies for the current session.
    }
  }, [theme]);

  const nextTheme = theme === 'dark' ? 'light' : 'dark';
  const Icon = theme === 'dark' ? Sun : Moon;

  return (
    <button
      className="btn btn-ghost btn-icon"
      type="button"
      aria-label={`Ativar modo ${nextTheme === 'dark' ? 'escuro' : 'claro'}`}
      title={`Modo ${nextTheme === 'dark' ? 'escuro' : 'claro'}`}
      onClick={() => setTheme(nextTheme)}
    >
      <Icon className="size-4" aria-hidden="true" />
    </button>
  );
}
