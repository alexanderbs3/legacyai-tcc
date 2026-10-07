import type { ReactNode } from 'react';

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
};

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="grid min-w-0 gap-1.5">
        <h1 className="[overflow-wrap:anywhere]">{title}</h1>
        {subtitle && (
          <p className="max-w-2xl text-muted-foreground [overflow-wrap:anywhere]">{subtitle}</p>
        )}
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </header>
  );
}
