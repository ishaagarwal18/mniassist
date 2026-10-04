import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import {
  AccountRow,
  AccountStore,
  CustomerAccount,
  MAX_ACCOUNT_DEPTH,
  moveProblem,
} from '../../core/services/account.store';
import { CustomerAccountRollupDto } from '../../proxy/contacts';
import { ArTopbar } from '../../layout/topbar';
import { ArButton, ArChip, ArDialog, ArSearchBox } from '../../ui';
import { ArSelect } from '../../ui/select';
import { ArErpLedger } from './erp-ledger';

interface Draft {
  name: string;
  industry: string;
  city: string;
  state: string;
  website: string;
  notes: string;
  /** The account this one sits under; blank for a top-level account. */
  parentId: string;
}

const BLANK: Draft = {
  name: '',
  industry: '',
  city: '',
  state: '',
  website: '',
  notes: '',
  parentId: '',
};

/**
 * Company / plant grouping (M03-11), as a tree: a group owns companies, a company owns plants, up to five
 * levels. Several contacts on one deal roll up to their account, and a parent's rollup can include every
 * subsidiary beneath it — "how is the whole group doing" without adding the plants up by hand.
 */
@Component({
  selector: 'ar-accounts',
  imports: [ArTopbar, ArButton, ArChip, ArDialog, ArSearchBox, ArErpLedger, ArSelect],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './accounts.html',
  styleUrl: './accounts.scss',
})
export class ArAccounts {
  private readonly store = inject(AccountStore);

  protected readonly rows = this.store.rows;
  protected readonly searching = computed(() => this.store.filter().trim().length > 0);
  protected readonly maxDepth = MAX_ACCOUNT_DEPTH;
  protected readonly loading = this.store.loading;

  protected readonly editorOpen = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly draft = signal<Draft>({ ...BLANK });
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly rollupOpen = signal(false);
  protected readonly rollupFor = signal<CustomerAccount | null>(null);
  protected readonly rollup = signal<CustomerAccountRollupDto | null>(null);
  protected readonly includeSubsidiaries = signal(false);

  /**
   * Accounts the one being edited may sit under: anything that would not create a loop or push the tree past
   * its depth limit. The server checks again — this only keeps the picker from offering a refusal.
   */
  protected readonly parentOptions = computed(() => {
    const id = this.editingId();
    return this.store
      .all()
      .filter((a) => a.id !== id && moveProblem(id, a.id, this.store.all()) === null);
  });

  protected search(term: string): void {
    this.store.filter.set(term);
  }

  protected patch<K extends keyof Draft>(key: K, value: Draft[K]): void {
    this.draft.update((d) => ({ ...d, [key]: value }));
  }

  protected openNew(parentId = ''): void {
    this.editingId.set(null);
    this.draft.set({ ...BLANK, parentId });
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
      parentId: a.parentId ?? '',
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
        parentAccountId: d.parentId || null,
      });
      this.editorOpen.set(false);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Could not save the account.');
    } finally {
      this.busy.set(false);
    }
  }

  protected async remove(a: CustomerAccount): Promise<void> {
    const subs =
      a.childCount > 0
        ? ` Its ${a.childCount} subsidiar${a.childCount === 1 ? 'y moves' : 'ies move'} up a level.`
        : '';
    if (!confirm(`Delete "${a.name}"? Its ${a.contactCount} contact(s) will be ungrouped.${subs}`))
      return;
    await this.store.remove(a.id);
  }

  protected isTopLevel(row: AccountRow): boolean {
    return row.depth === 1;
  }

  protected async openRollup(a: CustomerAccount): Promise<void> {
    this.rollupFor.set(a);
    this.includeSubsidiaries.set(false);
    this.rollupOpen.set(true);
    await this.loadRollup();
  }

  protected async toggleSubsidiaries(on: boolean): Promise<void> {
    this.includeSubsidiaries.set(on);
    await this.loadRollup();
  }

  private async loadRollup(): Promise<void> {
    const a = this.rollupFor();
    if (!a) return;
    this.rollup.set(null);
    this.rollup.set(await this.store.rollup(a.id, this.includeSubsidiaries()));
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
