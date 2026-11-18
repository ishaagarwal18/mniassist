import { routes } from '../../app.routes';
import { CaseInsensitiveUrlSerializer, collectStaticSegments } from './case-insensitive-url-serializer';

describe('CaseInsensitiveUrlSerializer', () => {
  const serializer = new CaseInsensitiveUrlSerializer(collectStaticSegments(routes));
  const norm = (url: string) => serializer.serialize(serializer.parse(url));

  it('lowercases route names', () => {
    expect(norm('/Channels')).toBe('/channels');
    expect(norm('/SETTINGS/Channels?tab=X')).toBe('/settings/channels?tab=X');
  });

  it('keeps ids, tokens and query values as typed', () => {
    expect(norm('/contacts/Accounts/AbC-12/360')).toBe('/contacts/accounts/AbC-12/360');
  });

  it('every static route path works in any case', () => {
    for (const route of routes.flatMap((r) => [r, ...(r.children ?? [])])) {
      const path = route.path ?? '';
      if (!path || path.includes(':') || path === '**') continue;
      expect(norm('/' + path.toUpperCase())).toBe('/' + path.toLowerCase());
    }
  });
});
