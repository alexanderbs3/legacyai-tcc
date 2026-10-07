import { useState } from 'react';
import { Check, Copy, Download } from 'lucide-react';
import type { ReportItem, ReportResult } from '../../types/analysis';
import { Button } from '../ui/Button';

const priorityLabels: Record<ReportItem['priority'], string> = {
  HIGH: 'Alta',
  MEDIUM: 'Média',
  LOW: 'Baixa',
};

function itemsToMarkdown(title: string, items: ReportItem[]) {
  if (items.length === 0) return `## ${title}\n\nNenhum item identificado.\n`;
  return `## ${title}\n\n${items
    .map(
      (item) =>
        `### ${item.title} (prioridade ${priorityLabels[item.priority]})\n\n${item.description}\n`,
    )
    .join('\n')}`;
}

function reportToMarkdown(report: ReportResult, provider: string, date: string) {
  return [
    `# Relatório de análise LegacyAI\n\nProvedor: ${provider}\nData: ${date}\n`,
    `## Resumo\n\n${report.summary}\n`,
    `## Tecnologias identificadas\n\n${report.technologies.map((item) => `- ${item}`).join('\n') || 'Nenhuma tecnologia identificada.'}\n`,
    `## Arquitetura\n\n${report.architecture}\n`,
    itemsToMarkdown('Problemas', report.problems),
    itemsToMarkdown('Riscos de segurança', report.securityRisks),
    itemsToMarkdown('Recomendações', report.recommendations),
    `## Modernização\n\n${report.modernization.map((item) => `- ${item}`).join('\n') || 'Nenhuma ação identificada.'}\n`,
  ].join('\n');
}

type ReportActionsProps = {
  report: ReportResult;
  provider: string;
  date: string;
  fileName: string;
};

/** Copiar/baixar o relatório em Markdown, usando apenas os dados retornados pelo backend. */
export function ReportActions({ report, provider, date, fileName }: ReportActionsProps) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(reportToMarkdown(report, provider, date));
      setCopyFailed(false);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyFailed(true);
    }
  }

  function download() {
    const blob = new Blob([reportToMarkdown(report, provider, date)], {
      type: 'text/markdown;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <Button variant="secondary" onClick={copy} aria-live="polite">
        {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
        {copied ? 'Copiado' : copyFailed ? 'Falha ao copiar' : 'Copiar'}
      </Button>
      <Button variant="secondary" onClick={download}>
        <Download className="size-4" />
        Baixar .md
      </Button>
    </>
  );
}
