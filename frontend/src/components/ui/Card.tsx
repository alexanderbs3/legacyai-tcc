import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  interactive?: boolean;
  children: ReactNode;
};

export function Card({ interactive = false, className, children, ...props }: CardProps) {
  return (
    <div className={cn('card', interactive && 'card-interactive', className)} {...props}>
      {children}
    </div>
  );
}
