import type { HTMLAttributes, ReactNode } from 'react';
import { CircleAlert, Info, TriangleAlert } from 'lucide-react';
import { cn } from '../../lib/cn';

type AlertProps = HTMLAttributes<HTMLParagraphElement> & {
  tone?: 'danger' | 'warning' | 'info';
  children: ReactNode;
};

const icons = { danger: CircleAlert, warning: TriangleAlert, info: Info };

/** Mensagem inline. O texto é sempre passado como filho: nunca exponha detalhes técnicos aqui. */
export function Alert({ tone = 'danger', className, children, ...props }: AlertProps) {
  const Icon = icons[tone];
  return (
    <p className={cn('alert flex items-start gap-2.5', `alert-${tone}`, className)} {...props}>
      <Icon className="mt-0.5 size-4 shrink-0 text-(--tone)" aria-hidden="true" />
      <span className="min-w-0 [overflow-wrap:anywhere]">{children}</span>
    </p>
  );
}
