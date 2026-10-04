type UploadError = {
  response?: { status?: number; data?: { error?: unknown; message?: unknown } };
};

export function uploadErrorMessage(error: unknown, fallback: string): string {
  const response = (error as UploadError | null)?.response;
  const code = response?.data?.error;
  const message = response?.data?.message;
  if (
    response?.status === 400 &&
    (code === 'INVALID_FILE' || code === 'FILE_TOO_LARGE') &&
    typeof message === 'string' &&
    message.trim()
  ) {
    return message;
  }
  return fallback;
}
