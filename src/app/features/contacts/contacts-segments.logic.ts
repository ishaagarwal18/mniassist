import { IconName } from '../../ui/icon';

/** Format large counts compactly for mini icons: e.g. 12486 -> '12.5k', 1347 -> '1.3k', 284 -> '284', 1200000 -> '1.2M'. */
export function compactCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
}

/** Determine the appropriate icon for a segment based on its ID or name. */
export function segmentIcon(s: { id: string; name: string }): IconName {
  const id = s.id.toLowerCase();
  const name = s.name.toLowerCase();
  if (id === 'all' || name.includes('all')) return 'contacts';
  if (id.includes('amc') || name.includes('amc') || name.includes('expir')) return 'clock';
  if (id.includes('quote') || name.includes('quote')) return 'quotation';
  if (id.includes('dealer') || name.includes('dealer')) return 'channel';
  if (id.includes('expo') || name.includes('expo') || name.includes('lead')) return 'sparkle';
  return 'segment';
}

/** Determine the suppression icon based on the suppression reason. */
export function suppressionIcon(s: { id: string }): IconName {
  const id = s.id.toLowerCase();
  if (id.includes('optout') || id.includes('stop')) return 'close';
  if (id.includes('invalid')) return 'alert';
  if (id.includes('blocked')) return 'shield';
  return 'shield';
}
