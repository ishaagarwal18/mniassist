import { ScreenTranslator } from './screen-translator';

const HINDI = new Map<string, string>([
  ['Save changes', 'बदलाव सहेजें'],
  ['Showing {0} of {1}', '{1} में से {0} दिखा रहे हैं'],
  ['Search contacts', 'संपर्क खोजें'],
]);
const MARATHI = new Map<string, string>([['Save changes', 'बदल जतन करा']]);

/** MutationObserver callbacks run as microtasks. */
const settle = () => new Promise((r) => setTimeout(r));

describe('screen translator', () => {
  let root: HTMLElement;
  let translator: ScreenTranslator;

  beforeEach(() => {
    root = document.createElement('div');
    document.body.appendChild(root);
    translator = new ScreenTranslator(root);
  });

  afterEach(() => {
    translator.stop();
    root.remove();
  });

  it('translates exact text and keeps the spaces around it', () => {
    root.innerHTML = '<button> Save changes </button><p>Something new</p>';
    translator.use(HINDI);
    expect(root.querySelector('button')!.textContent).toBe(' बदलाव सहेजें ');
    expect(root.querySelector('p')!.textContent).toBe('Something new');
  });

  it('fills values into a pattern, in the translation’s own order', () => {
    root.innerHTML = '<span>Showing 5 of 20</span>';
    translator.use(HINDI);
    expect(root.textContent).toBe('20 में से 5 दिखा रहे हैं');
  });

  it('switches language and back to English from the English it kept', () => {
    root.innerHTML = '<button>Save changes</button>';
    translator.use(HINDI);
    translator.use(MARATHI);
    expect(root.textContent).toBe('बदल जतन करा');
    translator.stop();
    expect(root.textContent).toBe('Save changes');
  });

  it('translates what renders later, and text the app changes afterwards', async () => {
    translator.use(HINDI);
    const span = document.createElement('span');
    span.textContent = 'Showing 1 of 2';
    root.appendChild(span);
    await settle();
    expect(span.textContent).toBe('2 में से 1 दिखा रहे हैं');

    // The app (Angular) writes new English into the same node.
    span.firstChild!.nodeValue = 'Showing 3 of 4';
    await settle();
    expect(span.textContent).toBe('4 में से 3 दिखा रहे हैं');
  });

  it('leaves anything marked translate="no" alone', () => {
    root.innerHTML = '<div translate="no"><b>Save changes</b></div>';
    translator.use(HINDI);
    expect(root.textContent).toBe('Save changes');
  });

  it('translates placeholders and titles', () => {
    root.innerHTML = '<input placeholder="Search contacts" title="Save changes" />';
    translator.use(HINDI);
    const input = root.querySelector('input')!;
    expect(input.placeholder).toBe('संपर्क खोजें');
    expect(input.title).toBe('बदलाव सहेजें');
    translator.stop();
    expect(input.placeholder).toBe('Search contacts');
  });
});
