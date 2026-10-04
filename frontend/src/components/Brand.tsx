import { Link } from 'react-router-dom';

type BrandProps = {
  to: string;
  className?: string;
};

export function Brand({ to, className = '' }: BrandProps) {
  return (
    <Link className={`brand ${className}`.trim()} to={to} aria-label="LegacyAI">
      <img className="brand-logo brand-logo-light" src="/legacyai-logo.svg" alt="LegacyAI" />
      <img className="brand-logo brand-logo-dark" src="/legacyai-logo-dark.svg" alt="LegacyAI" />
    </Link>
  );
}
