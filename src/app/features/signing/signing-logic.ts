import { SignatureRequestStatus } from '../../proxy/pipeline';

/** A point on the drawing surface, from where the pointer is on the page. The canvas is drawn at a fixed size and shown scaled. */
export function padPoint(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
  canvasWidth: number,
  canvasHeight: number,
): { x: number; y: number } {
  const w = rect.width || 1;
  const h = rect.height || 1;
  return {
    x: Math.min(canvasWidth, Math.max(0, ((clientX - rect.left) / w) * canvasWidth)),
    y: Math.min(canvasHeight, Math.max(0, ((clientY - rect.top) / h) * canvasHeight)),
  };
}

/** A colour from the workspace's branding is used only if it is a plain hex value; anything else is ignored. */
export function safeColor(value: string | null | undefined, fallback: string): string {
  return value && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

/** The link from the seller, as a full address for sharing. */
export function signingUrl(origin: string, signingPath: string): string {
  return `${origin.replace(/\/+$/, '')}${signingPath}`;
}

/** The text sent with the link when it is shared. */
export function shareText(reference: string, signerName: string, url: string, company?: string | null): string {
  const from = company ? ` from ${company}` : '';
  return `Hello ${signerName}, please review and sign quotation ${reference}${from}: ${url}`;
}

/** A wa.me link for the phone number, digits only. Null when the number has too few digits to be one. */
export function whatsappShareLink(phone: string | null | undefined, text: string): string | null {
  const digits = (phone ?? '').replace(/\D/g, '');
  return digits.length >= 10 ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}` : null;
}

export function mailtoShareLink(email: string | null | undefined, subject: string, text: string): string | null {
  return email?.includes('@') ? `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}` : null;
}

export const SIGNATURE_STATUS_LABEL: Record<SignatureRequestStatus, string> = {
  [SignatureRequestStatus.Pending]: 'Awaiting signature',
  [SignatureRequestStatus.Signed]: 'Signed',
  [SignatureRequestStatus.Declined]: 'Declined',
  [SignatureRequestStatus.Expired]: 'Link expired',
  [SignatureRequestStatus.Voided]: 'Withdrawn',
};

/** The error text an API failure carries, or a fallback. Server messages are already worded for the person. */
export function apiMessage(e: unknown, fallback: string): string {
  const message = (e as { error?: { error?: { message?: string } } })?.error?.error?.message;
  return message && message.length < 400 ? message : fallback;
}
