import { Link } from 'react-router-dom'

type BrandProps = {
  to: string
  className?: string
}

export function Brand({ to, className = '' }: BrandProps) {
  return (
    <Link className={`brand ${className}`.trim()} to={to} aria-label="LegacyAI">
      <picture>
        <source srcSet="/legacyai-logo-dark.svg" media="(prefers-color-scheme: dark)" />
        <img className="brand-logo" src="/legacyai-logo.svg" alt="LegacyAI" />
      </picture>
    </Link>
  )
}
