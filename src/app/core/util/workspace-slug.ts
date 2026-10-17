/**
 * A workspace's sign-in name: lowercase letters, digits and hyphens. People type their
 * company's name ("Sun Energy Automation"); this is the "sun-energy-automation" they sign
 * in with. The API's WorkspaceSlug does exactly the same, so what signup shows is what
 * it creates.
 */
export const WORKSPACE_SLUG_MIN = 3;
export const WORKSPACE_SLUG_MAX = 30;

export function workspaceSlug(name: string | null | undefined): string {
  let slug = '';
  for (const ch of (name ?? '').trim().toLowerCase()) {
    if ((ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9')) {
      slug += ch;
    } else if (ch === '-' || ch === '_' || ch === '.' || /\s/.test(ch)) {
      // One hyphen for any run of separators, and none at the start.
      if (slug && !slug.endsWith('-')) slug += '-';
    }
  }
  return slug.replace(/-+$/, '');
}

/** Why a name cannot be a workspace, or null when its sign-in name is fine. */
export function workspaceNameProblem(name: string | null | undefined): string | null {
  if (!(name ?? '').trim()) return 'Enter a workspace name.';
  const slug = workspaceSlug(name);
  if (!slug) return 'Enter a workspace name using letters (a–z) or digits.';
  if (slug.length < WORKSPACE_SLUG_MIN)
    return `The workspace name needs at least ${WORKSPACE_SLUG_MIN} letters or digits.`;
  if (slug.length > WORKSPACE_SLUG_MAX)
    return `The workspace name can be at most ${WORKSPACE_SLUG_MAX} characters (it becomes “${slug}”).`;
  return null;
}
