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

/**
 * The dev server's version of the same problem. `ng serve` pre-bundles libraries with Vite; when it re-bundles (a
 * library was added or first imported, or the server restarted) a tab that is already open keeps the old copy of
 * @angular/core while the next lazy page brings the new one. `inject()` from one copy cannot see the other's
 * injection context, so a service such as BrandingService fails with NG0203. A production build has one bundle and
 * cannot mix copies, so only a dev build treats it as stale: there a real NG0203 bug still shows after one reload.
 */
export function isMixedDevBuildError(e: unknown, devMode: boolean): boolean {
  if (!devMode) return false;
  const message = String((e as { message?: unknown } | null)?.message ?? e ?? '');
  return /NG0203\b/.test(message);
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
