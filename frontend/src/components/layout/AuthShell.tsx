import type { ReactNode } from 'react';
import { NodesGlyph } from '../ui/Glyph';
import { Brand } from './Brand';

const steps = [
  'Envie o código (ZIP) ou a documentação do sistema.',
  'Escolha o provedor de IA para a leitura técnica.',
  'Receba um relatório com problemas, riscos e recomendações.',
];

/** Layout das telas de autenticação: painel de marca (desktop) + formulário. */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <aside className="ambient relative hidden flex-col justify-between overflow-hidden border-r border-border bg-surface p-12 lg:flex">
        <Brand to="/login" />
        <div className="grid max-w-md gap-8">
          <NodesGlyph className="h-32 w-44 text-muted-foreground/80" />
          <div className="grid gap-3">
            <h2 className="text-3xl leading-tight tracking-tight">
              Entenda seu sistema legado antes de modernizá-lo.
            </h2>
            <p className="text-muted-foreground">
              Plataforma inteligente para análise de sistemas legados.
            </p>
          </div>
          <ol className="grid gap-3">
            {steps.map((step, index) => (
              <li key={step} className="flex items-start gap-3 text-muted-foreground">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border border-border-hover font-mono text-[0.6875rem] text-foreground">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
        <span className="text-xs text-muted-foreground">LegacyAI</span>
      </aside>
      <main className="page-enter grid place-items-center px-5 py-10 sm:px-8">
        <div className="grid w-full max-w-sm gap-8">
          <Brand to="/login" className="lg:hidden" />
          {children}
        </div>
      </main>
    </div>
  );
}
