import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import { inr } from '../../core/util/format';
import { ArTopbar } from '../../layout/topbar';
import {
  PlanCatalogService,
  type PlanDefinitionDto,
  type SavePlanDefinitionInput,
} from '../../proxy/billing/plan-catalog.service';
import { PlanFeature } from '../../proxy/billing/plan-feature.enum';
import { SubscriptionPlan } from '../../proxy/billing/subscription-plan.enum';
import { ArButton, ArChip, ArDialog } from '../../ui';
import { featureLabel } from '../billing/billing';

export const UNLIMITED = 2_147_483_647;

/** Every module a plan can switch on, A–Z by its readable name. */
export const PLAN_MODULES: { value: PlanFeature; name: string; label: string }[] = Object.keys(PlanFeature)
  .filter((k) => Number.isNaN(Number(k)))
  .map((k) => ({ value: PlanFeature[k as keyof typeof PlanFeature], name: k, label: featureLabel(k) }))
  .sort((a, b) => a.label.localeCompare(b.label));

/** The plan form as typed: rupees and counts as text, highlights one per line. */
export interface PlanForm {
  name: string;
  description: string;
  basePlan: SubscriptionPlan;
  rupees: string;
  seats: string;
  channels: string;
  channelsUnlimited: boolean;
  contacts: string;
  contactsUnlimited: boolean;
  features: Set<string>;
  highlights: string;
  isPublic: boolean;
  sortOrder: string;
}

export function emptyPlanForm(): PlanForm {
  return {
    name: '',
    description: '',
    basePlan: SubscriptionPlan.Growth,
    rupees: '4999',
    seats: '10',
    channels: '2',
    channelsUnlimited: false,
    contacts: '25000',
    contactsUnlimited: false,
    features: new Set<string>(),
    highlights: '',
    isPublic: false,
    sortOrder: '50',
  };
}

export function planToForm(p: PlanDefinitionDto): PlanForm {
  return {
    name: p.name,
    description: p.description ?? '',
    basePlan: p.basePlan,
    rupees: String(p.monthlyFeeInPaise / 100),
    seats: String(p.includedAgentSeats),
    channels: p.channelLimit >= UNLIMITED ? '' : String(p.channelLimit),
    channelsUnlimited: p.channelLimit >= UNLIMITED,
    contacts: p.contactLimit >= UNLIMITED ? '' : String(p.contactLimit),
    contactsUnlimited: p.contactLimit >= UNLIMITED,
    features: new Set(p.features),
    highlights: p.highlights.join('\n'),
    isPublic: p.isPublic,
    sortOrder: String(p.sortOrder),
  };
}

const whole = (text: string) => (/^\d+$/.test(text.trim()) ? Number(text.trim()) : NaN);

/** What is wrong with the form, or null with the input to send. */
export function readPlanForm(f: PlanForm): { problem: string } | { input: SavePlanDefinitionInput } {
  const name = f.name.trim();
  if (name.length < 2 || name.length > 48) return { problem: 'Give the plan a name of 2 to 48 characters.' };
  const rupees = Number(f.rupees.replace(/,/g, '').trim());
  if (!Number.isFinite(rupees) || rupees < 0 || rupees > 1_00_00_000)
    return { problem: 'Enter the monthly fee in rupees (0 for a free plan).' };
  const seats = whole(f.seats);
  if (!(seats >= 1 && seats <= 100_000)) return { problem: 'Members must be a whole number from 1.' };
  const channels = f.channelsUnlimited ? UNLIMITED : whole(f.channels);
  if (!(channels >= 1)) return { problem: 'Numbers must be a whole number from 1, or unlimited.' };
  const contacts = f.contactsUnlimited ? UNLIMITED : whole(f.contacts);
  if (!(contacts >= 100)) return { problem: 'Contacts must be at least 100, or unlimited.' };
  const highlights = f.highlights
    .split('\n')
    .map((h) => h.trim())
    .filter(Boolean);
  if (highlights.length > 12) return { problem: 'Keep it to 12 selling points.' };
  if (highlights.some((h) => h.length > 120)) return { problem: 'Each selling point can be up to 120 characters.' };
  const sortOrder = whole(f.sortOrder);
  return {
    input: {
      name,
      description: f.description.trim() || null,
      basePlan: f.basePlan,
      monthlyFeeInPaise: Math.round(rupees * 100),
      includedAgentSeats: seats,
      channelLimit: channels,
      contactLimit: contacts,
      features: PLAN_MODULES.filter((m) => f.features.has(m.name)).map((m) => m.value),
      highlights,
      isPublic: f.isPublic,
      sortOrder: Number.isNaN(sortOrder) ? 50 : sortOrder,
    },
  };
}

/**
 * Platform › Plans: the plans workspaces subscribe to. Each has a price, member/number/contact limits, the modules it switches on
 * and selling points shown on Billing. Public plans are offered on every workspace's Billing page; private ones are assigned by
 * the platform team from a workspace's Manage dialog. The four built-in plans can be edited but not archived.
 */
@Component({
  selector: 'ar-plans-page',
  imports: [ArTopbar, ArButton, ArChip, ArDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './plans-page.scss',
  template: `
    <ar-topbar
      title="Plans"
      [subtitle]="plans().length + ' plans'"
      help="Create and edit the plans workspaces subscribe to: price, limits, the modules each switches on, and the selling points shown on Billing. Public plans appear on every workspace's Billing page; private ones are assigned by the platform team."
    >
      <button ar-button variant="primary" icon="plus" type="button" (click)="openNew()">New plan</button>
    </ar-topbar>

    <div class="pp ar-scroll">
      <label class="pp__toggle">
        <input type="checkbox" [checked]="showArchived()" (change)="showArchived.set($any($event.target).checked)" />
        Show archived plans
      </label>

      @if (loadError(); as e) {
        <p class="pp__err" role="alert">{{ e }}</p>
      }

      <div class="pp__grid">
        @for (p of visible(); track p.id) {
          <article class="pp__card" [class.pp__card--archived]="p.isArchived">
            <header class="pp__head">
              <h2 class="pp__name">{{ p.name }}</h2>
              <div class="pp__chips">
                @if (p.builtIn != null) {
                  <ar-chip tone="neutral">Built-in</ar-chip>
                }
                <ar-chip [tone]="p.isPublic ? 'good' : 'amber'">{{ p.isPublic ? 'Public' : 'Private' }}</ar-chip>
                @if (p.isArchived) {
                  <ar-chip tone="neutral">Archived</ar-chip>
                }
              </div>
            </header>
            <p class="pp__price">{{ money(p.monthlyFeeInPaise) }}<span>/month</span></p>
            @if (p.description) {
              <p class="pp__desc">{{ p.description }}</p>
            }
            <p class="pp__limits">
              {{ limit(p.includedAgentSeats) }} members · {{ limit(p.channelLimit) }} numbers ·
              {{ limit(p.contactLimit) }} contacts
            </p>
            <p class="pp__meta">
              {{ p.features.length }} modules · {{ p.highlights.length }} selling points ·
              {{ p.workspaceCount }} workspace{{ p.workspaceCount === 1 ? '' : 's' }}
              @if (p.builtIn == null) {
                · recorded as {{ baseName(p.basePlan) }}
              }
            </p>
            <div class="pp__actions">
              <button ar-button variant="ghost" type="button" (click)="openEdit(p)">Edit</button>
              @if (p.builtIn == null) {
                <button ar-button variant="quiet" type="button" [disabled]="busy()" (click)="toggleArchive(p)">
                  {{ p.isArchived ? 'Restore' : 'Archive' }}
                </button>
              }
            </div>
          </article>
        }
      </div>
    </div>

    @if (editing(); as ed) {
      <ar-dialog [title]="ed.id ? 'Edit ' + ed.form.name : 'New plan'" width="min(760px, calc(100vw - 32px))" (dismiss)="close()">
        <div class="pf">
          <div class="pf__row">
            <label class="ar-field">
              <span class="ar-field__label">Name</span>
              <input class="ar-field__input" maxlength="48" [value]="ed.form.name" (input)="set('name', $any($event.target).value)" />
            </label>
            <label class="ar-field">
              <span class="ar-field__label">Monthly fee (₹, before GST)</span>
              <input class="ar-field__input" inputmode="decimal" [value]="ed.form.rupees" (input)="set('rupees', $any($event.target).value)" />
            </label>
          </div>
          <label class="ar-field">
            <span class="ar-field__label">Short description <span class="ar-field__opt">optional</span></span>
            <input class="ar-field__input" maxlength="240" [value]="ed.form.description" (input)="set('description', $any($event.target).value)" />
          </label>
          <div class="pf__row pf__row--3">
            <label class="ar-field">
              <span class="ar-field__label">Members</span>
              <input class="ar-field__input" inputmode="numeric" [value]="ed.form.seats" (input)="set('seats', $any($event.target).value)" />
            </label>
            <label class="ar-field">
              <span class="ar-field__label">Connected numbers</span>
              <input class="ar-field__input" inputmode="numeric" [disabled]="ed.form.channelsUnlimited" [value]="ed.form.channels" (input)="set('channels', $any($event.target).value)" />
              <span class="pf__check"><input type="checkbox" [checked]="ed.form.channelsUnlimited" (change)="set('channelsUnlimited', $any($event.target).checked)" /> Unlimited</span>
            </label>
            <label class="ar-field">
              <span class="ar-field__label">Contacts</span>
              <input class="ar-field__input" inputmode="numeric" [disabled]="ed.form.contactsUnlimited" [value]="ed.form.contacts" (input)="set('contacts', $any($event.target).value)" />
              <span class="pf__check"><input type="checkbox" [checked]="ed.form.contactsUnlimited" (change)="set('contactsUnlimited', $any($event.target).checked)" /> Unlimited</span>
            </label>
          </div>

          <fieldset class="pf__mods">
            <legend class="ar-field__label">
              Modules it switches on <span class="ar-field__opt">{{ ed.form.features.size }} chosen</span>
            </legend>
            <div class="pf__mods-grid">
              @for (m of modules; track m.name) {
                <label class="pf__mod">
                  <input type="checkbox" [checked]="ed.form.features.has(m.name)" (change)="toggleModule(m.name, $any($event.target).checked)" />
                  {{ m.label }}
                </label>
              }
            </div>
          </fieldset>

          <label class="ar-field">
            <span class="ar-field__label">Selling points on Billing <span class="ar-field__opt">one per line, up to 12</span></span>
            <textarea class="ar-field__input pf__hl" rows="4" placeholder="Priority support&#10;Onboarding call" [value]="ed.form.highlights" (input)="set('highlights', $any($event.target).value)"></textarea>
            <span class="pf__hint">Shown on the plan's card. They are text only: they do not switch anything on.</span>
          </label>

          <div class="pf__row">
            @if (!ed.builtIn) {
              <label class="ar-field">
                <span class="ar-field__label">Recorded as</span>
                <select class="ar-field__input" (change)="set('basePlan', +$any($event.target).value)">
                  @for (b of bases; track b.value) {
                    <option [value]="b.value" [selected]="b.value === ed.form.basePlan">{{ b.label }}</option>
                  }
                </select>
                <span class="pf__hint">The built-in plan invoices and reports file it under.</span>
              </label>
            }
            <label class="ar-field">
              <span class="ar-field__label">Order on Billing</span>
              <input class="ar-field__input" inputmode="numeric" [value]="ed.form.sortOrder" (input)="set('sortOrder', $any($event.target).value)" />
              <span class="pf__hint">Lower comes first.</span>
            </label>
          </div>
          <label class="pf__check pf__check--big">
            <input type="checkbox" [checked]="ed.form.isPublic" (change)="set('isPublic', $any($event.target).checked)" />
            <span><strong>Show on Billing</strong> — every workspace can pick it. Off: only the platform team assigns it.</span>
          </label>

          @if (formError(); as e) {
            <p class="pp__err" role="alert">{{ e }}</p>
          }
        </div>
        <div dialogActions>
          <button ar-button type="button" variant="ghost" (click)="close()">Cancel</button>
          <button ar-button type="button" variant="primary" [disabled]="busy()" (click)="save()">
            {{ busy() ? 'Saving…' : ed.id ? 'Save plan' : 'Create plan' }}
          </button>
        </div>
      </ar-dialog>
    }
  `,
})
export class ArPlansPage {
  private readonly api = inject(PlanCatalogService);
  private readonly toasts = inject(ToastService);

  protected readonly modules = PLAN_MODULES;
  protected readonly bases = [SubscriptionPlan.Starter, SubscriptionPlan.Growth, SubscriptionPlan.Pro, SubscriptionPlan.Enterprise].map(
    (value) => ({ value, label: SubscriptionPlan[value] }),
  );

  protected readonly plans = signal<PlanDefinitionDto[]>([]);
  protected readonly showArchived = signal(false);
  protected readonly visible = computed(() => this.plans().filter((p) => this.showArchived() || !p.isArchived));
  protected readonly loadError = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly editing = signal<{ id: string | null; builtIn: boolean; form: PlanForm } | null>(null);
  protected readonly formError = signal<string | null>(null);

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      this.plans.set((await firstValueFrom(this.api.getList({ skipHandleError: true }))).items ?? []);
      this.loadError.set(null);
    } catch (e: unknown) {
      this.loadError.set(readApiError(e, 'The plans could not be loaded.'));
    }
  }

  protected money(paise: number): string {
    return inr(paise);
  }

  protected limit(n: number): string {
    return n >= UNLIMITED ? 'Unlimited' : n.toLocaleString('en-IN');
  }

  protected baseName(p: SubscriptionPlan): string {
    return SubscriptionPlan[p];
  }

  protected openNew(): void {
    this.formError.set(null);
    this.editing.set({ id: null, builtIn: false, form: emptyPlanForm() });
  }

  protected openEdit(p: PlanDefinitionDto): void {
    this.formError.set(null);
    this.editing.set({ id: p.id, builtIn: p.builtIn != null, form: planToForm(p) });
  }

  protected close(): void {
    this.editing.set(null);
  }

  protected set<K extends keyof PlanForm>(key: K, value: PlanForm[K]): void {
    this.editing.update((e) => (e ? { ...e, form: { ...e.form, [key]: value } } : e));
  }

  protected toggleModule(name: string, on: boolean): void {
    this.editing.update((e) => {
      if (!e) return e;
      const features = new Set(e.form.features);
      if (on) features.add(name);
      else features.delete(name);
      return { ...e, form: { ...e.form, features } };
    });
  }

  protected async save(): Promise<void> {
    const ed = this.editing();
    if (!ed) return;
    const read = readPlanForm(ed.form);
    if ('problem' in read) {
      this.formError.set(read.problem);
      return;
    }
    this.busy.set(true);
    this.formError.set(null);
    try {
      const saved = await firstValueFrom(
        ed.id ? this.api.update(ed.id, read.input, { skipHandleError: true }) : this.api.create(read.input, { skipHandleError: true }),
      );
      this.toasts.success(`${saved.name} saved.`, 'Plans');
      this.editing.set(null);
      await this.load();
    } catch (e: unknown) {
      this.formError.set(readApiError(e, 'The plan could not be saved.'));
    } finally {
      this.busy.set(false);
    }
  }

  protected async toggleArchive(p: PlanDefinitionDto): Promise<void> {
    this.busy.set(true);
    try {
      await firstValueFrom(this.api.setArchived(p.id, !p.isArchived, { skipHandleError: true }));
      this.toasts.success(p.isArchived ? `${p.name} restored.` : `${p.name} archived. Workspaces on it keep it.`, 'Plans');
      await this.load();
    } catch (e: unknown) {
      this.toasts.error(readApiError(e, 'The plan could not be changed.'), 'Plans');
    } finally {
      this.busy.set(false);
    }
  }
}
