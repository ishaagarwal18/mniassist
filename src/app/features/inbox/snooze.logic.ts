/** The quick snooze choices, worked out from "now" in the browser's own time zone. */
export type SnoozeChoice = '1h' | '4h' | 'tomorrow' | 'monday';

export const SNOOZE_CHOICES: { value: SnoozeChoice; label: string }[] = [
  { value: '1h', label: 'For 1 hour' },
  { value: '4h', label: 'For 4 hours' },
  { value: 'tomorrow', label: 'Until tomorrow, 9:00' },
  { value: 'monday', label: 'Until Monday, 9:00' },
];

/** When a snooze choice ends. "Monday" on a Monday means next week's. */
export function snoozeUntil(choice: SnoozeChoice, now: Date = new Date()): Date {
  const at = new Date(now);
  switch (choice) {
    case '1h':
      return new Date(now.getTime() + 60 * 60_000);
    case '4h':
      return new Date(now.getTime() + 4 * 60 * 60_000);
    case 'tomorrow':
      at.setDate(at.getDate() + 1);
      at.setHours(9, 0, 0, 0);
      return at;
    case 'monday': {
      const days = (8 - at.getDay()) % 7 || 7;
      at.setDate(at.getDate() + days);
      at.setHours(9, 0, 0, 0);
      return at;
    }
  }
}
