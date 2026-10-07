import { Link } from 'react-router-dom';
import { NodesGlyph } from '../components/ui/Glyph';

export function NotFoundPage() {
  return (
    <main className="ambient page-enter grid min-h-svh place-items-center px-6 py-12">
      <div className="grid max-w-md justify-items-center gap-5 text-center">
        <NodesGlyph className="h-24 w-32 text-muted-foreground/70" />
        <p className="font-mono text-sm text-primary">404</p>
        <h1>Página não encontrada</h1>
        <p className="text-muted-foreground">
          O endereço solicitado não corresponde a uma página do LegacyAI.
        </p>
        <Link className="btn btn-primary btn-md" to="/dashboard">
          Voltar ao início
        </Link>
      </div>
    </main>
  );
}
