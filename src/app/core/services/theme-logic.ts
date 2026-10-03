/** The two themes a user can pick. Light is the default. */
export type Theme = 'light' | 'dark';

/** localStorage key. index.html reads the same key before Angular starts. */
export const THEME_KEY = 'ar.theme';

export function parseTheme(raw: string | null | undefined): Theme {
  return raw === 'dark' ? 'dark' : 'light';
}

/**
 * Whether a path follows the user's theme choice. Public pages a customer opens
 * (the front page, pay, sign a quote, re-order, catalogue, ticket and form pages,
 * privacy) and the offline field app have fixed light designs and always stay
 * light. The app, sign-in and sign-up follow the choice.
 *
 * index.html repeats this rule inline to apply the theme before Angular boots;
 * change both together.
 */
export function isThemedPath(path: string): boolean {
  const p = path.split(/[?#]/)[0] || '/';
  if (p === '/' || p === '') return false;
  if (/^\/(sign|f|pay|t|r|reorder|catalogue)\//.test(p)) return false;
  if (/^\/(privacy|field)(\/|$)/.test(p)) return false;
  return true;
}
