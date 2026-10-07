import type { ReactNode } from 'react';
import { NodesGlyph } from '../ui/Glyph';

type EmptyStateProps = {
  title: string;
  subtitle: string;
  action?: ReactNode;
};

export function EmptyState({ title, subtitle, action }: EmptyStateProps) {
  return (
    <div className="grid place-items-center gap-3 rounded-lg border border-dashed border-border-hover px-6 py-12 text-center">
      <NodesGlyph className="h-20 w-28 text-muted-foreground/70" />
      <div className="grid gap-1">
        <h2 className="text-base">{title}</h2>
        <p className="mx-auto max-w-sm text-muted-foreground">{subtitle}</p>
      </div>
      {action && <div className="mt-1 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}
