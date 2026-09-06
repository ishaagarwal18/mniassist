import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { AccountStore, CustomerAccount } from '../../core/services/account.store';
import { CustomerAccountRollupDto } from '../../proxy/contacts';
import { ArTopbar } from '../../layout/topbar';
import { ArButton, ArChip, ArDialog, ArSearchBox } from '../../ui';

interface Draft {
  name: string;
  industry: string;
  city: string;
  state: string;
  website: string;
  notes: string;
}

const BLANK: Draft = { name: '', industry: '', city: '', state: '', website: '', notes: '' };

/**
 * Company / plant grouping (M03-11). Several contacts on one deal roll up here, and
 * the rollup answers "how is this account doing" without adding the three
 * half-pictures by hand.
 */
@Component({
  selector: 'ar-accounts',
  imports: [ArTopbar, ArButton, ArChip, ArDialog, ArSearchBox],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './accounts.html',
  styleUrl: './accounts.scss',
})
export class ArAccounts {
  private readonly store = inject(AccountStore);

  protected readonly accounts = this.store.accounts;
  protected readonly loading = this.store.loading;

  protected readonly editorOpen = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly draft = signal<Draft>({ ...BLANK });
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly rollupOpen = signal(false);
  protected readonly rollupFor = signal<CustomerAccount | null>(null);
  protected readonly rollup = signal<CustomerAccountRollupDto | null>(null);

  protected search(term: string): void {
    this.store.filter.set(term);
  }

  protected patch<K extends keyof Draft>(key: K, value: Draft[K]): void {
    this.draft.update((d) => ({ ...d, [key]: value }));
  }

  protected openNew(): void {
    this.editingId.set(null);
    this.draft.set({ ...BLANK });
    this.error.set(null);
    this.editorOpen.set(true);
  }

  protected openEdit(a: CustomerAccount): void {
    this.editingId.set(a.id);
    this.draft.set({
      name: a.name,
      industry: a.industry ?? '',
      city: a.city ?? '',
      state: a.state ?? '',
      website: a.website ?? '',
      notes: a.notes ?? '',
    });
    this.error.set(null);
    this.editorOpen.set(true);
  }

  protected async save(): Promise<void> {
    const d = this.draft();
    if (!d.name.trim()) {
      this.error.set('A name is required.');
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.store.save(this.editingId(), {
        name: d.name.trim(),
        industry: d.industry.trim() || null,
        city: d.city.trim() || null,
        state: d.state.trim() || null,
        website: d.website.trim() || null,
        notes: d.notes.trim() || null,
      });
      this.editorOpen.set(false);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Could not save the account.');
    } finally {
      this.busy.set(false);
    }
  }

  protected async remove(a: CustomerAccount): Promise<void> {
    if (!confirm(`Delete "${a.name}"? Its ${a.contactCount} contact(s) will be ungrouped.`)) return;
    await this.store.remove(a.id);
  }

  protected async openRollup(a: CustomerAccount): Promise<void> {
    this.rollupFor.set(a);
    this.rollup.set(null);
    this.rollupOpen.set(true);
    this.rollup.set(await this.store.rollup(a.id));
  }

  protected inr(paise?: number): string {
    return '₹' + Math.round((paise ?? 0) / 100).toLocaleString('en-IN');
  }

  protected breakdownRows(r: CustomerAccountRollupDto): { stage: string; count: number }[] {
    return Object.entries(r.lifecycleBreakdown ?? {}).map(([stage, count]) => ({ stage, count }));
  }

  protected when(iso?: string | null): string {
    if (!iso) return 'no activity';
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
}
