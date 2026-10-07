import { useEffect, useState, useSyncExternalStore } from 'react';
import { isRequestActive, subscribeToRequestActivity } from '../../services/requestActivity';

const SHOW_DELAY_MS = 200;

/** Barra fina de progresso global; só aparece se a requisição durar mais que 200 ms. */
export function GlobalLoader() {
  const active = useSyncExternalStore(subscribeToRequestActivity, isRequestActive);
  const [delayed, setDelayed] = useState(false);

  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => setDelayed(true), SHOW_DELAY_MS);
    return () => {
      clearTimeout(timer);
      setDelayed(false);
    };
  }, [active]);

  if (!active || !delayed) return null;

  return <div className="global-loader" role="status" aria-live="polite" aria-label="Carregando" />;
}
