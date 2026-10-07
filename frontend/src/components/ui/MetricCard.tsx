import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

type MetricCardProps = {
  label: string;
  value: number | string;
  icon: ReactNode;
  tone?: 'default' | 'info' | 'success' | 'danger';
};

const toneClass = {
  default: 'text-muted-foreground',
  info: 'text-info',
  success: 'text-success',
  danger: 'text-danger',
};

export function MetricCard({ label, value, icon, tone = 'default' }: MetricCardProps) {
  return (
    <div className="card flex items-center justify-between gap-3 p-4">
      <div className="grid gap-1">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="font-mono text-2xl font-semibold tabular-nums tracking-tight">
          {value}
        </span>
      </div>
      <span
        className={cn(
          'grid size-9 place-items-center rounded-md border border-border bg-surface-secondary',
          toneClass[tone],
        )}
        aria-hidden="true"
      >
        {icon}
      </span>
    </div>
  );
}
