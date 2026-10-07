import { Skeleton } from '../ui/Skeleton';

function Frame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className="grid gap-6">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

function Heading() {
  return (
    <div className="grid gap-2">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-80 max-w-full" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <Frame label="Carregando dashboard…">
      <Heading />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <Skeleton key={item} className="h-[4.5rem] rounded-lg" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {[0, 1, 2, 3].map((item) => (
          <Skeleton key={item} className="h-44 rounded-lg" />
        ))}
      </div>
    </Frame>
  );
}

export function TableSkeleton() {
  return (
    <Frame label="Carregando histórico…">
      <Heading />
      <div className="grid gap-2">
        {[0, 1, 2, 3, 4, 5].map((item) => (
          <Skeleton key={item} className="h-12 rounded-md" />
        ))}
      </div>
    </Frame>
  );
}

export function DetailSkeleton() {
  return (
    <Frame label="Carregando projeto…">
      <Heading />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    </Frame>
  );
}

export function ReportSkeleton() {
  return (
    <Frame label="Carregando relatório…">
      <Heading />
      <Skeleton className="h-28 rounded-lg" />
      <Skeleton className="h-20 rounded-lg" />
      <Skeleton className="h-56 rounded-lg" />
    </Frame>
  );
}

export function FormSkeleton() {
  return (
    <Frame label="Carregando…">
      <Heading />
      <Skeleton className="h-72 rounded-lg" />
    </Frame>
  );
}
