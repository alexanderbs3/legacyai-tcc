import type { InputHTMLAttributes, ReactNode } from 'react'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
  icon?: ReactNode
}

export function Input({ label, error, icon, id, className = '', ...props }: InputProps) {
  const inputId = id ?? props.name ?? label.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="field">
      <label htmlFor={inputId}>{label}</label>
      <div className={`input-wrap ${icon ? 'has-icon' : ''}`}>
        {icon && <span className="input-icon" aria-hidden="true">{icon}</span>}
        <input id={inputId} className={className} aria-invalid={Boolean(error)} aria-describedby={error ? `${inputId}-error` : undefined} {...props} />
      </div>
      {error && <p id={`${inputId}-error`} className="field-error">{error}</p>}
    </div>
  )
}
