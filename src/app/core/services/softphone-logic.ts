/** "0:05", "1:30", "12:00" — minutes with no leading zero, seconds always two digits. */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

/** The SIP address to dial: the destination number in place of the workspace line's own user part, on the same domain — the
 *  standard way a SIP trunk routes an outbound call. Null if the stored address of record has no domain to route through. */
export function sipTarget(sipUri: string | null | undefined, number: string): string | null {
  const domain = sipUri?.split('@')[1]?.trim();
  return domain ? `sip:${number}@${domain}` : null;
}
