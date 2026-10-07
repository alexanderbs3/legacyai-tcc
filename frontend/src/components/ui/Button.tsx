import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'outline'
  | 'destructive'
  | 'ghost-danger'
  | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: ReactNode;
};

/** Botão do design system. Para links com aparência de botão use `className="btn btn-primary btn-md"`. */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  type = 'button',
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn('btn', `btn-${variant}`, `btn-${size}`, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <span className="spinner size-3.5" aria-hidden="true" />}
      {children}
    </button>
  );
}
