import { Link } from 'react-router-dom';
import { cn } from '../../lib/cn';

type BrandProps = {
  to: string;
  className?: string;
};

/** Marca: lupa sobre linhas de código, com um nó em destaque. */
export function Brand({ to, className }: BrandProps) {
  return (
    <Link
      className={cn(
        'inline-flex items-center gap-2.5 text-foreground hover:no-underline',
        className,
      )}
      to={to}
      aria-label="LegacyAI"
    >
      <svg
        className="size-7 shrink-0"
        viewBox="0 0 96 96"
        fill="none"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="40" cy="40" r="27" stroke="currentColor" strokeWidth="7" />
        <line x1="60" y1="60" x2="84" y2="84" stroke="currentColor" strokeWidth="10" />
        <line x1="27" y1="30" x2="47" y2="30" stroke="currentColor" strokeWidth="5" opacity="0.5" />
        <line x1="27" y1="40" x2="41" y2="40" className="stroke-primary" strokeWidth="5" />
        <line x1="27" y1="50" x2="51" y2="50" stroke="currentColor" strokeWidth="5" opacity="0.5" />
        <circle cx="51" cy="40" r="3.5" className="fill-primary" />
      </svg>
      <span className="brand-word text-[1.0625rem] font-semibold tracking-tight">
        Legacy<span className="text-primary">AI</span>
      </span>
    </Link>
  );
}
