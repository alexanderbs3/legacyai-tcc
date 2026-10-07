import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export type BreadcrumbItem = {
  label: string;
  to?: string;
};

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="mb-4" aria-label="Trilha de navegação">
      <ol className="flex flex-wrap items-center gap-1 text-xs">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1">
              {item.to && !isLast ? (
                <Link className="text-muted-foreground hover:text-foreground" to={item.to}>
                  {item.label}
                </Link>
              ) : (
                <span
                  className="max-w-[16rem] truncate font-medium text-foreground"
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}
              {!isLast && (
                <ChevronRight className="size-3.5 text-muted-foreground/60" aria-hidden="true" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
