import { MachineScanAction } from '../../../proxy/support/machine-qr.service';

const ACTION_TEXT: Record<MachineScanAction, string> = {
  [MachineScanAction.View]: 'Opened',
  [MachineScanAction.CodeRequest]: 'Asked for a code',
  [MachineScanAction.Verify]: 'Typed a code',
  [MachineScanAction.Breakdown]: 'Reported a breakdown',
  [MachineScanAction.Service]: 'Asked for service',
  [MachineScanAction.Spare]: 'Opened spares',
};

export function scanActionText(action: MachineScanAction): string {
  return ACTION_TEXT[action] ?? 'Scanned';
}

/** "Last scanned 2 days ago", "today", "never": whether the stickers are being used. */
export function lastScannedText(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return 'Never scanned';
  const days = Math.floor((now - Date.parse(iso)) / 86_400_000);
  if (days <= 0) return 'Last scanned today';
  if (days === 1) return 'Last scanned yesterday';
  if (days < 60) return `Last scanned ${days} days ago`;
  return `Last scanned ${Math.round(days / 30)} months ago`;
}

/** Saves a PDF the API sent back under a file name. */
export function savePdf(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
