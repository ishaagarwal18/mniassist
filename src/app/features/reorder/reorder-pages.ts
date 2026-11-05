/** The message the API gave for a failed call, else `fallback`. */
export function problem(e: unknown, fallback: string): string {
  return (e as { error?: { error?: { message?: string } } })?.error?.error?.message ?? fallback;
}

/**
 * The Re-orders pages that replace its dialogs (send a link, portal settings, dispatch): the topbar stays put and the page scrolls
 * under it, the form shown as a card (AR_DIALOG_INLINE).
 */
export const REORDER_PAGE_STYLES = `
  :host {
    display: flex;
    flex-direction: column;
    min-height: 0;
    height: 100%;
  }
  .rp {
    flex: 1;
    min-height: 0;
    padding: 1.25rem 1.5rem 2rem;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .ro__hint {
    margin: 0;
    font: 400 13px/1.5 var(--ar-font-sans);
    color: var(--ar-ink-500);
    max-width: 75ch;
  }
  .ro__err {
    margin: 0;
    font: 500 12.5px var(--ar-font-sans);
    color: var(--ar-bad-600, #b42318);
  }
  @media (max-width: 560px) {
    .rp {
      padding-inline: 12px;
    }
  }
`;
