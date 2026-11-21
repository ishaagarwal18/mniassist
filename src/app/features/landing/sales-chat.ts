/** The greeting a visitor's WhatsApp opens with, so sales can see the chat came from the website. */
export const SALES_GREETING = 'Hi, I’d like to know more about MNI Assist.';

/**
 * A wa.me link to the sales team with the greeting typed in, or null when no number is set
 * (or it isn't a plausible international number), so the button is hidden rather than broken.
 * Spaces, dashes, brackets and a leading + are allowed in the setting.
 */
export function salesChatUrl(number: string | null | undefined, text = SALES_GREETING): string | null {
  const digits = (number ?? '').replace(/[\s\-().+]/g, '');
  if (!/^\d{10,15}$/.test(digits)) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
