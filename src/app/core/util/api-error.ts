import { isRawHttpText, plainServerMessage, statusExplanation } from '../http/plain-errors';

/**
 * Pulls a human message out of whatever an ABP endpoint threw — the
 * `error.error.message` envelope, an OAuth `error_description`, a validation
 * `validationErrors` list — in plain words. Framework stock sentences and raw
 * "Http failure response …" text are replaced by an explanation of what to do.
 */
export function readApiError(e: unknown, fallback = 'That didn’t work. Try again.'): string {
  const err = e as {
    status?: number;
    error?: {
      error?: { message?: string; details?: string; validationErrors?: { message: string }[] };
      error_description?: string;
      message?: string;
    };
    message?: string;
  };

  const inner = err?.error?.error;
  if (inner?.validationErrors?.length) {
    return inner.validationErrors.map((v) => v.message).join(' ');
  }

  const server =
    inner?.message || inner?.details || err?.error?.error_description || err?.error?.message;
  if (server) return plainServerMessage(server);

  // No message from the server: explain the status rather than echo the browser's text.
  if (typeof err?.status === 'number' && (err.status === 0 || err.status >= 400)) {
    return statusExplanation(err.status).content;
  }
  if (err?.message && !isRawHttpText(err.message)) return plainServerMessage(err.message);
  return fallback;
}
