import type { Analysis } from '../../types/analysis';
import { Badge } from './Badge';
import type { BadgeVariant } from './Badge';

const statusMeta: Record<Analysis['status'], { variant: BadgeVariant; label: string }> = {
  PENDING: { variant: 'pending', label: 'Pendente' },
  PROCESSING: { variant: 'processing', label: 'Processando' },
  COMPLETED: { variant: 'success', label: 'Concluída' },
  FAILED: { variant: 'failed', label: 'Falhou' },
};

/** Fonte única de verdade para exibir o status de uma análise (traduzido, sem expor o enum). */
export function StatusBadge({ status }: { status: Analysis['status'] }) {
  const meta = statusMeta[status] ?? statusMeta.PENDING;
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}
