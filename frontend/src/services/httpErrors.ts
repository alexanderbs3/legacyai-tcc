type HttpError = {
  response?: {
    status?: number;
  };
};

export const ACCESS_DENIED_MESSAGE =
  'Acesso negado. Você não tem permissão para acessar este recurso.';

export function isForbiddenError(error: unknown): boolean {
  return (error as HttpError | null)?.response?.status === 403;
}

export function httpErrorMessage(error: unknown, fallback: string): string {
  return isForbiddenError(error) ? ACCESS_DENIED_MESSAGE : fallback;
}

export function prioritizedHttpErrorMessage(errors: unknown[], fallback: string): string {
  const error = errors.find(isForbiddenError) ?? errors[0];
  return error ? httpErrorMessage(error, fallback) : fallback;
}
