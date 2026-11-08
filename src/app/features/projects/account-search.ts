import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { CustomerAccountService } from '../../proxy/contacts/customer-account.service';

export interface PickedAccount {
  id: string;
  name: string;
  place?: string;
}

/** Find a customer account by name and pick it. Used for a project's end-user and parties. */
@Component({
  selector: 'ar-account-search',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './account-search.html',
  styleUrl: './account-search.scss',
})
export class ArAccountSearch {
  readonly placeholder = input('Search accounts by name');
  readonly picked = output<PickedAccount>();

  private readonly api = inject(CustomerAccountService);
  protected readonly term = signal('');
  protected readonly results = signal<PickedAccount[]>([]);
  protected readonly searching = signal(false);
  private timer: ReturnType<typeof setTimeout> | null = null;
  private seq = 0;

  protected type(value: string): void {
    this.term.set(value);
    if (this.timer) clearTimeout(this.timer);
    if (value.trim().length < 2) {
      this.results.set([]);
      return;
    }
    this.timer = setTimeout(() => void this.search(value.trim()), 250);
  }

  private async search(term: string): Promise<void> {
    const seq = ++this.seq;
    this.searching.set(true);
    try {
      const page = await firstValueFrom(
        this.api.getList({ filter: term, skipCount: 0, maxResultCount: 8 }),
      );
      if (seq !== this.seq) return;
      this.results.set(
        (page.items ?? []).map((a) => ({
          id: a.id!,
          name: a.name ?? '',
          place: [a.city, a.state].filter(Boolean).join(', '),
        })),
      );
    } catch {
      if (seq === this.seq) this.results.set([]);
    } finally {
      if (seq === this.seq) this.searching.set(false);
    }
  }

  protected pick(a: PickedAccount): void {
    this.picked.emit(a);
    this.term.set('');
    this.results.set([]);
  }
}
