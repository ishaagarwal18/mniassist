import type { EmailTemplateVariableDto } from '../../proxy/text-templates/models';

/** A variable as typed into the body: escaped, because its value may come from a person. */
export function variableSnippet(
  v: Pick<EmailTemplateVariableDto, 'name'>,
  inSubject: boolean,
): string {
  if (v.name === 'content') return '{{ content }}';
  if (v.name === 'model.workspaces')
    return '{{ for w in model.workspaces }}{{ w | html.escape }}{{ end }}';
  return inSubject ? `{{ ${v.name} }}` : `{{ ${v.name} | html.escape }}`;
}

/** Inserts text at the caret (or over the selection) and returns the new value and caret. */
export function insertAt(
  value: string,
  start: number,
  end: number,
  text: string,
): { value: string; caret: number } {
  const s = Math.max(0, Math.min(start, value.length));
  const e = Math.max(s, Math.min(end, value.length));
  return { value: value.slice(0, s) + text + value.slice(e), caret: s + text.length };
}
