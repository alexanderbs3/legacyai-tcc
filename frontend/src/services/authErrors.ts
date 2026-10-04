type ResponseHeaders = Record<string, unknown> & { get?: (name: string) => unknown };
type AuthError = {
  response?: {
    status?: number;
    data?: { error?: unknown; message?: unknown };
    headers?: ResponseHeaders;
  };
};

function retryAfterSeconds(headers?: ResponseHeaders): number | undefined {
  const value =
    headers?.get?.('retry-after') ?? headers?.['retry-after'] ?? headers?.['Retry-After'];
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;

  const seconds =
    typeof value === 'number' || /^\d+$/.test(value.trim())
      ? Number(value)
      : Math.ceil((Date.parse(value) - Date.now()) / 1000);
  return Number.isFinite(seconds) && seconds > 0 && seconds <= 86_400
    ? Math.ceil(seconds)
    : undefined;
}

function rateLimitMessage(headers?: ResponseHeaders): string {
  const seconds = retryAfterSeconds(headers);
  if (!seconds)
    return 'Muitas tentativas de login. Aguarde alguns minutos antes de tentar novamente.';
  if (seconds < 60) return `Muitas tentativas de login. Tente novamente em ${seconds} segundos.`;
  const minutes = Math.ceil(seconds / 60);
  return `Muitas tentativas de login. Tente novamente em ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}.`;
}

export function authErrorMessage(error: unknown, fallback: string): string {
  const response = (error as AuthError | null)?.response;
  if (!response) {
    return 'Não foi possível conectar ao servidor. Verifique sua conexão ou se a API está em execução.';
  }
  const code = response.data?.error;
  const message = response.data?.message;
  if (response.status === 401 && code === 'INVALID_CREDENTIALS') {
    return 'E-mail ou senha incorretos.';
  }
  if (response.status === 429) {
    return rateLimitMessage(response.headers);
  }
  if (
    response.status === 400 &&
    code === 'VALIDATION_ERROR' &&
    typeof message === 'string' &&
    message.trim()
  ) {
    return message;
  }
  if (response.status && response.status >= 500) {
    return 'Serviço indisponível. Tente novamente em instantes.';
  }
  return fallback;
}
