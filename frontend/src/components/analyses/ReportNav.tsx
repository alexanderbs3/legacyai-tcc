import { useEffect, useState } from 'react';

export type ReportNavItem = { id: string; label: string };

/** Navegação por âncoras do relatório, com destaque da seção visível. */
export function ReportNav({ items }: { items: ReportNavItem[] }) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? '');

  useEffect(() => {
    const elements = items
      .map((item) => document.getElementById(item.id))
      .filter((element): element is HTMLElement => element !== null);
    if (elements.length === 0 || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length > 0) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-96px 0px -60% 0px' },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav
      aria-label="Seções do relatório"
      className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:sticky lg:top-20 lg:mx-0 lg:grid lg:gap-0.5 lg:overflow-visible lg:px-0 lg:pb-0"
    >
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          aria-current={activeId === item.id ? 'true' : undefined}
          className={`shrink-0 rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors duration-(--duration-fast) hover:no-underline ${
            activeId === item.id
              ? 'bg-primary/12 font-medium text-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}
