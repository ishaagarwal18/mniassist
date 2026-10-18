import { NAV } from '../../layout/nav.model';
import { FRAME_TEXTS } from './frame-texts';
import { toAppLanguage, translate } from './language.service';

describe('app language', () => {
  it('reads ABP culture names as one of the three languages', () => {
    expect(toAppLanguage('hi')).toBe('hi');
    expect(toAppLanguage('mr-IN')).toBe('mr');
    expect(toAppLanguage('en-GB')).toBe('en');
    expect(toAppLanguage('fr')).toBe('en');
    expect(toAppLanguage(null)).toBe('en');
  });

  it('translates frame text and fills in values', () => {
    expect(translate('hi', 'Contacts')).toBe('संपर्क');
    expect(translate('mr', 'Sign in with {0}', 'Google')).toBe('Google ने साइन इन करा');
    expect(translate('en', 'Sign in with {0}', 'Google')).toBe('Sign in with Google');
  });

  it('falls back to the English for text with no entry', () => {
    expect(translate('hi', 'Something new')).toBe('Something new');
  });

  // A menu item added without Hindi and Marathi would quietly show English in the middle of a
  // translated menu.
  it('has Hindi and Marathi for every menu item and heading', () => {
    const missing = NAV.flatMap((g) => [g.heading, ...g.items.map((i) => i.label)])
      .filter((t): t is string => !!t)
      .filter((t) => !FRAME_TEXTS[t]?.hi || !FRAME_TEXTS[t]?.mr);
    expect(missing).toEqual([]);
  });
});
