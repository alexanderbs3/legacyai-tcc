import type { ReactNode } from 'react';

export type BadgeVariant =
  | 'high'
  | 'medium'
  | 'low'
  | 'success'
  | 'pending'
  | 'processing'
  | 'failed';

type BadgeProps = {
  variant: BadgeVariant;
  children: ReactNode;
};

export function Badge({ variant, children }: BadgeProps) {
  return <span className={`badge badge-${variant}`}>{children}</span>;
}
