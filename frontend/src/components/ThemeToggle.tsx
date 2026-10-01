import { useEffect, useState } from 'react'
import { Icon } from './Icon'

const STORAGE_KEY = 'legacyai.theme'
type Theme = 'light' | 'dark'

function systemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function initialTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === 'light' || stored === 'dark' ? stored : systemTheme()
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(initialTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const nextTheme = theme === 'dark' ? 'light' : 'dark'

  return (
    <button
      className="nav-link theme-toggle"
      type="button"
      aria-label={`Ativar modo ${nextTheme === 'dark' ? 'escuro' : 'claro'}`}
      onClick={() => setTheme(nextTheme)}
    >
      <Icon name={theme === 'dark' ? 'brightness_7' : 'brightness_4'} />
      <span>Modo {nextTheme === 'dark' ? 'escuro' : 'claro'}</span>
    </button>
  )
}
