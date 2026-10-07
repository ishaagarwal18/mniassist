import { describe, expect, it } from 'vitest';

import { routes } from '../../app.routes';
import { HELP_TOPICS, helpTopicFor } from './help-topics';

/** Every screen inside the app shell or declared at top-level. */
const topPaths = routes.map((r) => r.path ?? '').filter((p) => p !== '' && p !== '**');
const shellPaths = (routes.find((r) => r.path === '' && r.children)?.children ?? [])
  .map((r) => r.path ?? '')
  .filter((p) => p !== '' && p !== '**');
const allDeclaredPaths = [...shellPaths, ...topPaths];

describe('help topics', () => {
  it('finds the app shell screens', () => {
    expect(shellPaths.length).toBeGreaterThan(50);
  });

  it('gives every app shell screen a topic', () => {
    const missing = shellPaths.filter((p) => !helpTopicFor(p));
    expect(missing).toEqual([]);
  });

  it('keys every topic by a route that exists', () => {
    const orphans = Object.keys(HELP_TOPICS).filter((k) => !allDeclaredPaths.includes(k));
    expect(orphans).toEqual([]);
  });

  it('gives every topic benefits and steps', () => {
    for (const [path, t] of Object.entries(HELP_TOPICS)) {
      expect(t.benefits.length, path).toBeGreaterThanOrEqual(2);
      expect(t.steps.length, path).toBeGreaterThanOrEqual(2);
    }
  });

  it('returns null for an unknown or missing path', () => {
    expect(helpTopicFor('no-such-screen')).toBeNull();
    expect(helpTopicFor(undefined)).toBeNull();
    expect(helpTopicFor(null)).toBeNull();
  });
});
