type AuthError = { response?: { status?: number; data?: { error?: unknown; message?: unknown } } }

export function authErrorMessage(error: unknown, fallback: string): string {
  const response = (error as AuthError | null)?.response
  if (!response) {
    return 'Não foi possível conectar ao servidor. Verifique sua conexão ou se a API está em execução.'
  }
  const code = response.data?.error
  const message = response.data?.message
  if (response.status === 401 && code === 'INVALID_CREDENTIALS') {
    return 'E-mail ou senha incorretos.'
  }
  if (response.status === 400 && code === 'VALIDATION_ERROR' && typeof message === 'string' && message.trim()) {
    return message
  }
  if (response.status && response.status >= 500) {
    return 'Serviço indisponível. Tente novamente em instantes.'
  }
  return fallback
}
