import { insertAt, variableSnippet } from './email-templates.logic';

describe('inserting a variable', () => {
  it('escapes it in the body and leaves it plain in the subject', () => {
    expect(variableSnippet({ name: 'model.inviter_name' }, false)).toBe(
      '{{ model.inviter_name | html.escape }}',
    );
    expect(variableSnippet({ name: 'model.inviter_name' }, true)).toBe('{{ model.inviter_name }}');
  });

  it('writes the layout slot and the workspace list as they must be used', () => {
    expect(variableSnippet({ name: 'content' }, false)).toBe('{{ content }}');
    expect(variableSnippet({ name: 'model.workspaces' }, false)).toContain(
      '{{ for w in model.workspaces }}',
    );
  });

  it('goes in at the caret, or over the selection, and the caret follows it', () => {
    expect(insertAt('Hello !', 6, 6, 'X')).toEqual({ value: 'Hello X!', caret: 7 });
    expect(insertAt('Hello world', 6, 11, 'you')).toEqual({ value: 'Hello you', caret: 9 });
    expect(insertAt('abc', 99, 99, 'd')).toEqual({ value: 'abcd', caret: 4 });
  });
});
