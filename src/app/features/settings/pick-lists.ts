import { ArCustomFieldsCard } from './custom-fields-card';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { PermissionService } from '@abp/ng.core';

import { grantedPolicy } from '../../core/auth/permission';
import { PickListStore } from '../../core/pick-lists/pick-list.store';
import { ConfirmService } from '../../core/ui/confirm.service';
import { readApiError } from '../../core/util/api-error';
import { ArTopbar } from '../../layout/topbar';
import { PickListDto, PickListKind, PickListValueType } from '../../proxy/pick-lists';
import { ArBanner, ArButton, ArChip } from '../../ui';

/** One option as it is being edited. */
interface Row {
  /** Stable across edits of the label (a text list's value is re-made from the label on save). */
  key: number;
  value: string;
  label: string;
  isActive: boolean;
}

let nextKey = 1;

/**
 * Settings → Pick lists: the drop-down lists the forms offer, kept in the database. A reference list (units, reasons, GST rates)
 * can be added to, renamed, reordered and hidden; the names of fixed options (ticket statuses, lead sources) can only be renamed,
 * because the server's rules depend on the options themselves.
 */
@Component({
  selector: 'ar-pick-lists',
  imports: [ArTopbar, ArBanner, ArButton, ArChip, ArCustomFieldsCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './pick-lists.scss',
  template: `
    <ar-topbar
      title="Pick lists"
      subtitle="The options your forms offer"
      help="Units, reasons, GST rates and the other drop-down lists, and what fixed options such as ticket statuses are called. Changes are your workspace's own; Reset to defaults brings back the standard list."
    />

    <div class="pl ar-scroll">
      @if (store.failed() && !store.lists().length) {
        <ar-banner tone="bad">The pick lists could not be loaded. Try again in a moment.</ar-banner>
      } @else if (store.loading() && !store.lists().length) {
        <p class="pl__note">Loading pick lists…</p>
      } @else {
        @if (!canManage()) {
          <ar-banner tone="teal">
            You can see these lists. Changing them needs the “Edit drop-down lists” permission.
          </ar-banner>
        }
        <div class="pl__layout">
          <nav class="pl__lists" aria-label="Pick lists">
            @for (g of groups(); track g.area) {
              <h2 class="pl__area">{{ g.area }}</h2>
              @for (l of g.lists; track l.key) {
                <button
                  type="button"
                  class="pl__list"
                  [class.pl__list--on]="l.key === selectedKey()"
                  (click)="select(l.key)"
                >
                  <span class="pl__list-name">{{ l.title }}</span>
                  @if (l.isCustomised) {
                    <ar-chip tone="teal">Changed</ar-chip>
                  }
                </button>
              }
            }
          </nav>

          @if (selected(); as l) {
            <section class="pl__editor" [attr.aria-label]="l.title">
              <header class="pl__head">
                <div>
                  <h2 class="pl__title">{{ l.title }}</h2>
                  <p class="pl__note">{{ l.description }}</p>
                </div>
                <ar-chip [tone]="namesOnly() ? 'neutral' : 'good'">
                  {{ namesOnly() ? 'Names only' : 'Editable list' }}
                </ar-chip>
              </header>

              @if (namesOnly()) {
                <p class="pl__note">
                  These options are fixed by the app, so they cannot be added or removed. You can
                  change what each one is called.
                </p>
              }

              <ol class="pl__rows">
                @for (r of rows(); track r.key; let i = $index, first = $first, last = $last) {
                  <li class="pl__row" [class.pl__row--off]="!r.isActive">
                    @if (!namesOnly()) {
                      <span class="pl__move">
                        <button
                          ar-button
                          type="button"
                          variant="quiet"
                          [disabled]="first || !canManage()"
                          [attr.aria-label]="'Move ' + r.label + ' up'"
                          (click)="move(i, -1)"
                        >
                          ↑
                        </button>
                        <button
                          ar-button
                          type="button"
                          variant="quiet"
                          [disabled]="last || !canManage()"
                          [attr.aria-label]="'Move ' + r.label + ' down'"
                          (click)="move(i, 1)"
                        >
                          ↓
                        </button>
                      </span>
                    }
                    @if (isNumber()) {
                      <input
                        class="ar-field__input pl__value"
                        inputmode="decimal"
                        [value]="r.value"
                        [disabled]="!canManage() || namesOnly()"
                        [attr.aria-label]="'Value of ' + (r.label || 'new option')"
                        [placeholder]="valueHint()"
                        (input)="patch(i, { value: $any($event.target).value })"
                      />
                    }
                    <input
                      class="ar-field__input pl__label"
                      [value]="r.label"
                      [disabled]="!canManage()"
                      maxlength="256"
                      [attr.aria-label]="'Name of option ' + (i + 1)"
                      placeholder="Name"
                      (input)="patch(i, { label: $any($event.target).value })"
                    />
                    @if (!namesOnly()) {
                      <label class="pl__shown">
                        <input
                          type="checkbox"
                          [checked]="r.isActive"
                          [disabled]="!canManage()"
                          (change)="patch(i, { isActive: $any($event.target).checked })"
                        />
                        Shown
                      </label>
                      <button
                        ar-button
                        type="button"
                        variant="ghost"
                        [disabled]="!canManage()"
                        [attr.aria-label]="'Remove ' + (r.label || 'this option')"
                        (click)="remove(i)"
                      >
                        Remove
                      </button>
                    }
                  </li>
                }
              </ol>

              @if (problem(); as p) {
                <p class="pl__bad" role="alert">{{ p }}</p>
              }
              @if (error(); as e) {
                <p class="pl__bad" role="alert">{{ e }}</p>
              }

              @if (canManage()) {
                <footer class="pl__actions">
                  @if (!namesOnly()) {
                    <button ar-button type="button" variant="ghost" icon="plus" (click)="add()">
                      Add an option
                    </button>
                  }
                  <span class="pl__spacer"></span>
                  @if (l.isCustomised) {
                    <button
                      ar-button
                      type="button"
                      variant="ghost"
                      [disabled]="busy()"
                      (click)="reset(l)"
                    >
                      Reset to defaults
                    </button>
                  }
                  <button
                    ar-button
                    type="button"
                    variant="primary"
                    [disabled]="busy() || !dirty() || !!problem()"
                    (click)="save(l)"
                  >
                    {{ busy() ? 'Saving…' : 'Save' }}
                  </button>
                </footer>
              }
            </section>
          }
        </div>
      }
      <ar-custom-fields-card style="margin-top: 16px" />
    </div>
  `,
})
export class ArPickLists {
  protected readonly store = inject(PickListStore);
  private readonly dialogs = inject(ConfirmService);
  private readonly permissions = inject(PermissionService);

  protected readonly canManage = grantedPolicy('AutoReach.PickLists', this.permissions);

  protected readonly selectedKey = signal<string | null>(null);
  protected readonly rows = signal<Row[]>([]);
  private readonly saved = signal<string>('');
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly groups = computed(() => {
    const by = new Map<string, PickListDto[]>();
    for (const l of this.store.lists()) by.set(l.area, [...(by.get(l.area) ?? []), l]);
    return [...by]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([area, lists]) => ({
        area,
        lists: [...lists].sort((a, b) => a.title.localeCompare(b.title)),
      }));
  });

  protected readonly selected = computed(() => {
    const lists = this.store.lists();
    return lists.find((l) => l.key === this.selectedKey()) ?? this.groups()[0]?.lists[0] ?? null;
  });

  protected readonly namesOnly = computed(() => this.selected()?.kind === PickListKind.OptionNames);
  protected readonly isNumber = computed(
    () => this.selected()?.valueType === PickListValueType.Number && !this.namesOnly(),
  );
  protected readonly valueHint = computed(() =>
    this.selected()?.key === 'sales.payment-term'
      ? 'Days'
      : this.selected()?.key === 'tax.gst-rate'
        ? '%'
        : 'Value',
  );

  protected readonly dirty = computed(() => JSON.stringify(this.payload()) !== this.saved());

  /** What would stop a save, said before the server is asked. */
  protected readonly problem = computed<string | null>(() => {
    const rows = this.rows();
    if (rows.some((r) => !r.label.trim())) return 'Give every option a name, or remove it.';
    if (this.isNumber() && rows.some((r) => !/^\d+(\.\d+)?$/.test(r.value.trim()))) {
      return 'Each option needs a number of zero or more as its value.';
    }
    const keys = rows.map((r) =>
      (this.isNumber() || this.namesOnly() ? r.value : r.label).trim().toLowerCase(),
    );
    if (new Set(keys).size !== keys.length) return 'The same option is in the list twice.';
    if (!this.namesOnly() && rows.length && rows.every((r) => !r.isActive)) {
      return 'Keep at least one option shown, or the forms that use this list have nothing to pick.';
    }
    return null;
  });

  constructor() {
    // Start editing whichever list is selected, as the database has it.
    effect(() => {
      const l = this.selected();
      if (l) this.load(l);
    });
  }

  protected select(key: string): void {
    this.error.set(null);
    this.selectedKey.set(key);
  }

  protected patch(index: number, change: Partial<Row>): void {
    this.rows.update((rows) => rows.map((r, i) => (i === index ? { ...r, ...change } : r)));
  }

  protected move(index: number, by: -1 | 1): void {
    this.rows.update((rows) => {
      const next = [...rows];
      const [row] = next.splice(index, 1);
      next.splice(index + by, 0, row);
      return next;
    });
  }

  protected add(): void {
    this.rows.update((rows) => [...rows, { key: nextKey++, value: '', label: '', isActive: true }]);
  }

  protected remove(index: number): void {
    this.rows.update((rows) => rows.filter((_, i) => i !== index));
  }

  protected async save(list: PickListDto): Promise<void> {
    if (this.problem()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      const saved = await this.store.save(list.key, { items: this.payload() });
      this.load(saved);
    } catch (e: unknown) {
      this.error.set(readApiError(e, 'The list could not be saved.'));
    } finally {
      this.busy.set(false);
    }
  }

  protected async reset(list: PickListDto): Promise<void> {
    const ok = await this.dialogs.confirm({
      title: 'Reset to defaults',
      message: `Put ${list.title} back to the standard list? Your workspace's changes to it are removed. Records that already use an option keep it.`,
      confirmText: 'Reset',
      cancelText: 'Cancel',
    });
    if (!ok) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      this.load(await this.store.reset(list.key));
    } catch (e: unknown) {
      this.error.set(readApiError(e, 'The list could not be reset.'));
    } finally {
      this.busy.set(false);
    }
  }

  private payload() {
    const text = !this.isNumber() && !this.namesOnly();
    return this.rows().map((r) => ({
      value: text ? null : r.value.trim(),
      label: r.label.trim(),
      isActive: r.isActive,
    }));
  }

  private load(list: PickListDto): void {
    this.rows.set(
      list.items.map((i) => ({
        key: nextKey++,
        value: i.value,
        label: i.label,
        isActive: i.isActive,
      })),
    );
    this.saved.set(JSON.stringify(this.payload()));
  }
}
