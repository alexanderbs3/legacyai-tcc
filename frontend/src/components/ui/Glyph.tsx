/** Motivo gráfico do LegacyAI: nós e conexões (estrutura de sistema) em traço fino. */
export function NodesGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 160 120"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M30 30 L80 60 L130 28 M80 60 L60 98 M80 60 L124 92" opacity="0.55" />
      <circle cx="30" cy="30" r="7" />
      <circle cx="130" cy="28" r="7" />
      <circle cx="60" cy="98" r="7" />
      <circle cx="124" cy="92" r="7" />
      <circle cx="80" cy="60" r="10" className="fill-primary stroke-primary" />
    </svg>
  );
}
