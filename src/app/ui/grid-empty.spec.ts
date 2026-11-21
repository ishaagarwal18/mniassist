import { emptyListHtml } from './grid';

describe('empty list message', () => {
  it('uses the page hint and escapes it', () => {
    const html = emptyListHtml('No quotations yet. Press <New>.');
    expect(html).toContain('No quotations yet. Press &lt;New&gt;.');
    expect(html).toContain('clear it to see everything');
  });

  it('falls back when a page gives no hint', () => {
    expect(emptyListHtml(null)).toContain('Nothing here yet.');
    expect(emptyListHtml('  ')).toContain('Nothing here yet.');
  });
});
