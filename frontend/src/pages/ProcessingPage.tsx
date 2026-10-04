import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Badge } from '../components/Badge';
import { Card } from '../components/Card';
import { Spinner } from '../components/Spinner';
import { api } from '../services/api';
import type { Analysis } from '../types/analysis';

function statusVariant(status: Analysis['status']) {
  return status === 'FAILED'
    ? 'failed'
    : status === 'PROCESSING'
      ? 'processing'
      : ('pending' as const);
}
function statusMessage(analysis?: Analysis) {
  if (!analysis || analysis.status === 'PENDING')
    return 'Sua análise está na fila e será iniciada em breve.';
  if (analysis.status === 'PROCESSING')
    return 'Estamos examinando o código e organizando os principais achados.';
  if (analysis.status === 'FAILED')
    return analysis.errorMessage || 'A análise não pôde ser concluída. Tente novamente mais tarde.';
  return 'Preparando seu relatório.';
}

export function ProcessingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState<Analysis>();
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    let stopped = false;
    let inFlight = false;
    const stop = () => {
      stopped = true;
      clearInterval(timer);
    };
    const load = async () => {
      if (!active || stopped || inFlight) return;
      inFlight = true;
      try {
        const response = await api.get<Analysis>(`/analyses/${id}`);
        if (!active || stopped) return;
        setAnalysis(response.data);
        if (response.data.status === 'FAILED' || response.data.status === 'COMPLETED') {
          stop();
          if (response.data.status === 'COMPLETED') navigate(`/analyses/${id}`, { replace: true });
        }
      } catch {
        if (active && !stopped) {
          stop();
          setError('Não foi possível acompanhar o status da análise.');
        }
      } finally {
        inFlight = false;
      }
    };
    const timer = setInterval(load, 3000);
    void load();
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [id, navigate]);

  const status = analysis?.status || 'PENDING';

  if (status === 'FAILED') {
    return (
      <main className="processing-page">
        <Card className="processing-card page-enter">
          <h1>Não foi possível concluir</h1>
          <Badge variant="failed">FAILED</Badge>
          <p role="alert">{statusMessage(analysis)}</p>
          <div className="form-actions">
            <Link to={`/projects/${analysis!.projectId}`}>Voltar ao projeto</Link>
            <Link to="/history">Ir ao histórico</Link>
          </div>
        </Card>
      </main>
    );
  }

  return (
    <main className="processing-page">
      <Card className="processing-card page-enter">
        <Spinner size="lg" label="Análise em andamento" />
        <h1>Processando análise</h1>
        <Badge variant={statusVariant(status)}>{status}</Badge>
        <p>{error || statusMessage(analysis)}</p>
        {error && (
          <p className="alert" role="alert">
            {error}
          </p>
        )}
      </Card>
    </main>
  );
}
