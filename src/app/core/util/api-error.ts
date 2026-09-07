/**
 * Pulls a human message out of whatever an ABP endpoint threw — the
 * `error.error.message` envelope, an OAuth `error_description`, a validation
 * `validationErrors` list, or the plain HTTP message as a last resort.
 */
export function readApiError(e: unknown, fallback = 'Something went wrong.'): string {
  const err = e as {
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

  return (
    inner?.message ||
    inner?.details ||
    err?.error?.error_description ||
    err?.error?.message ||
    err?.message ||
    fallback
  );
}
