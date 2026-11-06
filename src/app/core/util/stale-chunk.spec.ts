import { isMixedDevBuildError, isStaleChunkError, reloadForStaleChunk } from './stale-chunk';

describe('stale chunk recovery', () => {
  it('recognises the browsers’ messages for a missing lazy chunk', () => {
    expect(
      isStaleChunkError(
        new TypeError(
          'Failed to fetch dynamically imported module: http://localhost:4200/chunk-PNYLSEB6.js',
        ),
      ),
    ).toBe(true);
    expect(isStaleChunkError(new TypeError('Importing a module script failed.'))).toBe(true);
    expect(isStaleChunkError(new Error('Http failure response for /api: 500'))).toBe(false);
  });

  it('reloads once, then not again within the guard window', () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    };
    let reloads = 0;
    const reload = () => void reloads++;

    expect(reloadForStaleChunk(1_000, storage, reload)).toBe(true);
    expect(reloadForStaleChunk(5_000, storage, reload)).toBe(false);
    expect(reloadForStaleChunk(40_000, storage, reload)).toBe(true);
    expect(reloads).toBe(2);
  });

  it('treats NG0203 as a dev-server re-bundle only in dev mode', () => {
    const err = new Error(
      'NG0203: The `_RestService` token injection failed. `inject()` function must be called from an injection context',
    );
    expect(isMixedDevBuildError(err, true)).toBe(true);
    expect(isMixedDevBuildError(err, false)).toBe(false);
    expect(isMixedDevBuildError(new Error('NG0100: changed after checked'), true)).toBe(false);
  });
});
