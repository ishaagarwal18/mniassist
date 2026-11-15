import { routes } from '../../app.routes';
import { exportToken } from './contact-export-page';

describe('exportToken', () => {
  it('reads the token from the API download link', () => {
    expect(exportToken('/api/auto-reach/contact-export/abc/download?token=x%2By')).toBe('x+y');
  });

  it('is null without a link or token', () => {
    expect(exportToken(null)).toBeNull();
    expect(exportToken('/api/auto-reach/contact-export/abc/download')).toBeNull();
  });
});

describe('notification links', () => {
  const shell = routes.flatMap((r) => r.children ?? []);
  const paths = shell.map((r) => r.path);

  it('has a route for every link a notification can carry', () => {
    for (const p of [
      'contacts/:id',
      'enquiries/:id',
      'inbox/:id',
      'contacts/exports/:id',
      'analytics/quality',
    ]) {
      expect(paths, p).toContain(p);
    }
  });

  it('keeps the catch-all contact link after the real contact pages', () => {
    const at = (p: string) => paths.indexOf(p);
    for (const p of [
      'contacts/new',
      'contacts/segments',
      'contacts/accounts',
      'contacts/duplicates',
    ]) {
      expect(at(p), p).toBeLessThan(at('contacts/:id'));
    }
  });
});
