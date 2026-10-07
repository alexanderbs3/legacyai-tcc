# LegacyAI — Design System ("Ink & Ember")

Fonte única de verdade: `src/index.css` (tokens + componentes semânticos) e `src/components/ui|feedback|layout`.

## 1. Filosofia visual

Futurista, minimalista e premium, sem exageros: superfícies de grafite escuro, bordas sutis, uma única cor de marca (âmbar/"ember") e uma cor de sinal fria (ciano) para estados em andamento. Profundidade vem de camadas de superfície e borda, não de sombras grandes. Glow e grade de pontos existem só no topo das páginas (`.ambient`), com baixa opacidade. Glassmorphism apenas na topbar. O motivo gráfico é abstrato: nós e conexões (`NodesGlyph`) e a lupa sobre linhas de código (`Brand`). Dark é o tema padrão; o claro é secundário (toggle persistido em `legacyai.theme`).

## 2. Cores (OKLCH, semânticas)

Declaradas em `:root` (dark) e `[data-theme='light']`; expostas ao Tailwind via `@theme inline`.
`background · surface · surface-secondary · surface-elevated · muted · foreground · muted-foreground · border · border-hover · primary(+hover/foreground) · secondary · accent · success · warning · danger · info · ring`.
Regra: nunca use cor literal em componente; use token (`bg-surface`, `text-muted-foreground`, `var(--primary)`).
Contraste validado por cálculo (WCAG): texto ≥ 7:1, texto secundário ≥ 6,8:1, botão primário ≥ 5,1:1, badges ≥ 4,5:1 nos dois temas.

## 3. Tipografia

Geist (interface) e Geist Mono (metadados, provedores, datas técnicas, código), auto-hospedadas via `@fontsource-variable` (sem CDN). Escala: `text-xs 12 · sm 14 (base do app) · base 16 · lg 18 · xl 22 · 2xl 28 · 3xl 36`. Títulos: peso 600 e tracking negativo (`-0.02em`/`-0.03em` no h1). Use `.mono` para dados técnicos.

## 4. Espaçamento

Escala do Tailwind (múltiplos de 4 px). Padrões: card `p-5/p-6`, gap entre seções `gap-6/gap-8`, formulários `gap-5` (`form { gap: 1.25rem }`), conteúdo `max-w-[76rem]` com padding `clamp(1rem, 3vw, 2rem)`.

## 5. Radius

`sm 6px · md 8px (controles) · lg 12px (cards) · xl 16px (paleta/diálogos) · full (badges)`.

## 6. Sombras

`--shadow-xs · sm · md · floating · focus`. No escuro são sutis (a borda faz o trabalho). `--shadow-focus` é o anel dos campos; use `shadow-[var(--shadow-focus)]`.

## 7. Botões — `Button` ou `<Link className="btn btn-primary btn-md">`

Variantes: `primary · secondary · outline · ghost · destructive · ghost-danger · link`. Tamanhos: `sm · md · lg · icon`. `loading` mostra spinner e desabilita. Para links com aparência de botão use as classes `.btn` (nunca aninhe `<Button>` dentro de `<Link>`).

## 8. Campos

`Input` (label, erro, dica; ids e `aria-describedby` automáticos) e a classe `.control` para `textarea`/`select`/`input` crus. Erros ficam abaixo, com ícone e `text-danger`.

## 9. Cards

`Card` (`interactive` adiciona hover de borda/sombra). `MetricCard` para números-chave. Evite transformar tudo em card: alterne com listas e tabelas.

## 10. Badges e 11. Status

`Badge` (high/medium/low/success/pending/processing/failed) e `StatusBadge`, que é a **única** fonte de tradução dos status (`PENDING → Pendente`, `PROCESSING → Processando`, `COMPLETED → Concluída`, `FAILED → Falhou`). Prioridade usa `Badge` com `high/medium/low`.

## 12. Tabelas

Dentro de `.card.overflow-x-auto`, `min-w` definido, `<th scope="col">`, cabeçalho vazio com texto `sr-only`, linhas com hover discreto, divisores `divide-border`. Em telas pequenas a tabela rola horizontalmente de forma controlada.

## 13. Navegação

`AppShell`: sidebar (expandida/compacta, estado em `data-sidebar` no `<html>` + `legacyai.sidebar`), topbar com `CommandMenu` (Ctrl/Cmd + K) e `ThemeToggle`. No mobile a sidebar vira barra superior com menu recolhível. Item ativo usa `aria-current="page"`. `Breadcrumb` fica **acima** do título.

## 14. Modal

Não há modais próprios: a confirmação de exclusão é inline (e testada). A paleta de comandos usa o diálogo do `cmdk` (foco preso, `Esc` fecha).

## 15. Estados vazios, 16. Erros, 17. Loading

- `EmptyState` (título, texto, CTA opcional, `NodesGlyph`); sempre com próxima ação quando houver.
- `Alert` (inline, texto sempre como filho) e `ErrorState` (página inteira). Mensagens são sempre as amigáveis de `services/*Errors`; detalhes técnicos nunca vão para a UI.
- Skeletons que espelham o layout real (`DashboardSkeleton`, `TableSkeleton`, `DetailSkeleton`, `ReportSkeleton`, `FormSkeleton`), `GlobalLoader` (barra fina após 200 ms) e `Progress` (indeterminado quando não há percentual real).

## 18. Responsividade

Breakpoint de shell em 48rem (mobile: barra superior + menu). Grids adaptativos (`sm/md/lg/xl`), tabelas com scroll controlado, alvos de toque ≥ 40 px, texto com `overflow-wrap:anywhere` para nomes longos. Verificado em 320, 375 e 1440 px.

## 19. Movimento

Durações `120/200/300 ms`; easing `standard` e `emphasized`. Animação só explica estado (hover/press, entrada de página, shimmer, indeterminado, painel de comandos). `prefers-reduced-motion` reduz tudo a ~0 ms.

## 20. Acessibilidade

Foco visível global (`:focus-visible`, anel âmbar); campos com label e `aria-describedby`; `role="alert"/"status"` nos feedbacks; `aria-current`, `aria-pressed`, `aria-expanded` nos controles; nome acessível contém o texto visível (ex.: "Confirmar" / `aria-label="Confirmar exclusão do projeto X"`); nada depende só de hover; tabelas com `scope`.

## Regras de uso (importante para os testes)

Os testes executam as páginas num `vm` que só implementa `useState/useEffect/useRef` e trata imports de módulos como _stubs_. Portanto: páginas **não** importam helpers de outros módulos (apenas componentes), não usam outros hooks e mantêm `<h2>`, `Button` e `Link` literais na árvore da página. Lógica visual reutilizável vai para componentes ou para classes CSS (`.btn`, `.control`, `.badge`).
