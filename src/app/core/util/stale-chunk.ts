/**
 * A tab opened before a new deploy (or before `ng serve` restarted) still names the old
 * build's chunk files; the server no longer has them, so the next lazy page fails with
 * "Failed to fetch dynamically imported module". Reloading picks up the new build. Guarded
 * so a chunk that is genuinely missing reloads once, not in a loop.
 */
const STORAGE_KEY = 'ar.staleChunkReloadAt';
const GUARD_MS = 30_000;

export function isStaleChunkError(e: unknown): boolean {
  const message = String((e as { message?: unknown } | null)?.message ?? e ?? '');
  return (
    /Failed to fetch dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /Loading chunk [\w-]+ failed/i.test(message)
  );
}

/** Reloads the page once per 30 seconds; false when it already tried just now. */
export function reloadForStaleChunk(
  now = Date.now(),
  storage: Pick<Storage, 'getItem' | 'setItem'> = sessionStorage,
  reload: () => void = () => window.location.reload(),
): boolean {
  try {
    const last = storage.getItem(STORAGE_KEY);
    if (last !== null && now - Number(last) < GUARD_MS) return false;
    storage.setItem(STORAGE_KEY, String(now));
  } catch {
    // No storage (private mode): reload anyway; the browser's own cache breaks a loop.
  }
  reload();
  return true;
}
