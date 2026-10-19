/** WhatsApp's reply buttons: at most three on a message, each title at most 20 characters. */
export const MAX_BUTTONS = 3;
export const MAX_BUTTON_TITLE = 20;

export interface ReplyButton {
  id: string;
  title: string;
}

/** A button's id, made from its title: what a "Button reply" trigger matches, and unique on the message. */
export function buttonId(title: string, taken: readonly string[]): string {
  const base =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 32) || 'option';
  let id = base;
  for (let n = 2; taken.includes(id); n++) id = `${base}_${n}`;
  return id;
}

/** What is wrong with a message's buttons, in the builder's "Step 2 (Send a message): …" voice. */
export function buttonProblems(buttons: readonly ReplyButton[]): string[] {
  const out: string[] = [];
  if (buttons.length > MAX_BUTTONS) out.push(`WhatsApp allows at most ${MAX_BUTTONS} buttons.`);
  if (buttons.some((b) => !b.title.trim())) out.push('give every button a title, or remove it.');
  if (buttons.some((b) => b.title.trim().length > MAX_BUTTON_TITLE))
    out.push(`keep button titles to ${MAX_BUTTON_TITLE} characters.`);
  const titles = buttons.map((b) => b.title.trim().toLowerCase()).filter(Boolean);
  if (new Set(titles).size !== titles.length) out.push('give each button a different title.');
  return out;
}
