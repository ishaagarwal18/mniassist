import { JournalEntryDto } from '../../../proxy/finance';

const STORAGE_KEY = 'ar_custom_journal_entries';

export function getStoredJournalEntries(): JournalEntryDto[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as JournalEntryDto[]) : [];
  } catch {
    return [];
  }
}

export function saveStoredJournalEntry(entry: JournalEntryDto): void {
  try {
    const list = getStoredJournalEntries();
    const updated = [entry, ...list.filter((e) => e.id !== entry.id)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore local storage errors
  }
}

export function deleteStoredJournalEntry(id: string): void {
  try {
    const list = getStoredJournalEntries();
    const updated = list.filter((e) => e.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore local storage errors
  }
}
