import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { PermissionService } from '@abp/ng.core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { grantedPolicy } from '../../core/auth/permission';
import { ConfirmService } from '../../core/ui/confirm.service';
import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import { ArTopbar } from '../../layout/topbar';
import { ConsentTextService } from '../../proxy/compliance/consent-text.service';
import type { ConsentTextVersionDto } from '../../proxy/compliance/models';
import { ArButton, ArChip } from '../../ui';
import { ChipTone } from '../../ui/chip';

/** The notices most workspaces need; any other key can be typed. */
export const CONSENT_KEYS = [
  { value: 'marketing', label: 'Marketing messages' },
  { value: 'whatsapp-opt-in', label: 'WhatsApp opt-in' },
  { value: 'web-form', label: 'Website forms' },
  { value: 'lead-ad', label: 'Lead ads' },
  { value: 'call-recording', label: 'Call recording' },
];

export const CONSENT_LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'mr', label: 'Marathi' },
  { value: 'gu', label: 'Gujarati' },
  { value: 'ta', label: 'Tamil' },
  { value: 'te', label: 'Telugu' },
  { value: 'kn', label: 'Kannada' },
  { value: 'bn', label: 'Bengali' },
];

export type VersionState = 'draft' | 'current' | 'retired';

export function versionState(v: ConsentTextVersionDto): VersionState {
  if (!v.isPublished) return 'draft';
  return v.retiredAtUtc ? 'retired' : 'current';
}

const STATE: Record<VersionState, { tone: ChipTone; label: string }> = {
  draft: { tone: 'neutral', label: 'Draft' },
  current: { tone: 'good', label: 'Shown to contacts' },
  retired: { tone: 'neutral', label: 'Retired' },
};

interface Draft {
  noticeText: string;
  purposesText: string;
  affirmativeActionLabel: string;
  withdrawalInstructions: string;
}

const EMPTY: Draft = {
  noticeText: '',
  purposesText: '',
  affirmativeActionLabel: '',
  withdrawalInstructions: '',
};

/**
 * DPDP consent wording (M14-1): the exact notice a contact agrees to, per notice and language. Drafts can be
 * edited; publishing makes a version the one contacts see (the previous one is retired automatically) and fixes
 * its text for good, because consents already given point at it. A change means a new version.
 */
@Component({
  selector: 'ar-consent-texts',
  imports: [ArTopbar, ArButton, ArChip, DatePipe, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: '../shared/work-page.scss',
  template: `
    <ar-topbar
      title="Consent wording"
      subtitle="The exact notice contacts agree to"
      help="Once published, a version can't be edited: consents already given stay tied to the words they were shown. To change the wording, write a new version and publish it."
    />
    <div class="wp">
      <p class="wp__muted"><a routerLink="/compliance">← Compliance</a></p>

      <div class="wp__row">
        <label class="wp__field">
          <span>Notice</span>
          <select
            class="ar-field__input"
            [value]="key()"
            (change)="pickKey($any($event.target).value)"
          >
            @for (k of keys; track k.value) {
              <option [value]="k.value">{{ k.label }}</option>
            }
            @if (!isKnownKey()) {
              <option [value]="key()">{{ key() }}</option>
            }
          </select>
        </label>
        <label class="wp__field">
          <span>Or another notice key</span>
          <input
            class="ar-field__input"
            placeholder="e.g. dealer-portal"
            maxlength="64"
            (change)="pickKey($any($event.target).value.trim())"
          />
        </label>
      </div>

      @if (canManage()) {
        <section class="wp__card">
          <h2 class="wp__title">{{ editingId() ? 'Edit draft' : 'Write a new version' }}</h2>
          <div class="wp__grid">
            <label class="wp__field">
              <span>Language</span>
              <select
                class="ar-field__input"
                [disabled]="!!editingId()"
                [value]="language()"
                (change)="language.set($any($event.target).value)"
              >
                @for (l of languages; track l.value) {
                  <option [value]="l.value">{{ l.label }}</option>
                }
              </select>
            </label>
            <label class="wp__field wp__field--wide">
              <span>Notice (what you collect and why)</span>
              <textarea
                class="ar-field__input"
                rows="4"
                maxlength="4000"
                [value]="draft().noticeText"
                (input)="set('noticeText', $any($event.target).value)"
              ></textarea>
            </label>
            <label class="wp__field wp__field--wide">
              <span>Purposes (what the contact is agreeing to)</span>
              <textarea
                class="ar-field__input"
                rows="3"
                maxlength="2000"
                [value]="draft().purposesText"
                (input)="set('purposesText', $any($event.target).value)"
              ></textarea>
            </label>
            <label class="wp__field">
              <span>Agree button wording</span>
              <input
                class="ar-field__input"
                maxlength="64"
                placeholder="I agree"
                [value]="draft().affirmativeActionLabel"
                (input)="set('affirmativeActionLabel', $any($event.target).value)"
              />
            </label>
            <label class="wp__field wp__field--wide">
              <span>How to withdraw</span>
              <input
                class="ar-field__input"
                maxlength="512"
                placeholder="Reply STOP at any time"
                [value]="draft().withdrawalInstructions"
                (input)="set('withdrawalInstructions', $any($event.target).value)"
              />
            </label>
          </div>
          <div class="wp__actions">
            <button
              ar-button
              type="button"
              variant="primary"
              [disabled]="busy() !== null || !canSave()"
              (click)="save()"
            >
              {{ busy() === 'save' ? 'Saving…' : editingId() ? 'Save draft' : 'Save as draft' }}
            </button>
            @if (editingId()) {
              <button ar-button type="button" variant="ghost" (click)="reset()">Cancel</button>
            }
          </div>
        </section>
      }

      <section class="wp__card">
        <h2 class="wp__title">Versions</h2>
        <ul class="wp__list">
          @for (v of versions(); track v.id) {
            <li class="wp__item">
              <span class="wp__grow">
                <span class="wp__name">
                  {{ languageName(v.languageCode) }} · version {{ v.version }}
                  <span class="wp__sub ar-mono" translate="no">{{ v.reference }}</span>
                </span>
                <span class="wp__sub" translate="no">{{ v.noticeText }}</span>
                <span class="wp__sub">
                  @if (v.publishedAtUtc) {
                    Published {{ v.publishedAtUtc | date: 'd MMM y' }}
                  }
                  @if (v.retiredAtUtc) {
                    · retired {{ v.retiredAtUtc | date: 'd MMM y' }}
                  }
                </span>
              </span>
              <ar-chip [tone]="state(v).tone" [dot]="true">{{ state(v).label }}</ar-chip>
              @if (canManage()) {
                @switch (stateOf(v)) {
                  @case ('draft') {
                    <button ar-button type="button" variant="ghost" (click)="edit(v)">Edit</button>
                    <button
                      ar-button
                      type="button"
                      variant="primary"
                      [disabled]="busy() !== null"
                      (click)="publish(v)"
                    >
                      Publish
                    </button>
                  }
                  @case ('current') {
                    <button ar-button type="button" variant="ghost" (click)="copy(v)">
                      New version from this
                    </button>
                    <button
                      ar-button
                      type="button"
                      variant="ghost"
                      [disabled]="busy() !== null"
                      (click)="retire(v)"
                    >
                      Retire
                    </button>
                  }
                }
              }
            </li>
          } @empty {
            <li class="wp__empty">No wording for this notice yet.</li>
          }
        </ul>
      </section>
    </div>
  `,
})
export class ArConsentTexts implements OnInit {
  private readonly api = inject(ConsentTextService);
  private readonly toasts = inject(ToastService);
  private readonly dialogs = inject(ConfirmService);

  protected readonly canManage = grantedPolicy(
    'AutoReach.Compliance.ManageConsentText',
    inject(PermissionService),
  );
  protected readonly keys = CONSENT_KEYS;
  protected readonly languages = CONSENT_LANGUAGES;

  protected readonly key = signal(CONSENT_KEYS[0].value);
  protected readonly language = signal('en');
  protected readonly versions = signal<ConsentTextVersionDto[]>([]);
  protected readonly draft = signal<Draft>({ ...EMPTY });
  protected readonly editingId = signal<string | null>(null);
  protected readonly busy = signal<string | null>(null);

  protected readonly isKnownKey = computed(() => CONSENT_KEYS.some((k) => k.value === this.key()));
  protected readonly canSave = computed(
    () => this.draft().noticeText.trim().length > 0 && this.draft().purposesText.trim().length > 0,
  );

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  protected state(v: ConsentTextVersionDto) {
    return STATE[versionState(v)];
  }

  protected stateOf(v: ConsentTextVersionDto): VersionState {
    return versionState(v);
  }

  protected languageName(code: string | undefined): string {
    return CONSENT_LANGUAGES.find((l) => l.value === code)?.label ?? code ?? '';
  }

  protected async pickKey(key: string): Promise<void> {
    if (!key || key === this.key()) return;
    this.key.set(key);
    this.reset();
    await this.load();
  }

  protected set(field: keyof Draft, value: string): void {
    this.draft.update((d) => ({ ...d, [field]: value }));
  }

  private async load(): Promise<void> {
    try {
      const list = await firstValueFrom(
        this.api.getList(this.key(), false, { skipHandleError: true }),
      );
      this.versions.set(
        [...(list.items ?? [])].sort(
          (a, b) =>
            (a.languageCode ?? '').localeCompare(b.languageCode ?? '') ||
            (b.version ?? 0) - (a.version ?? 0),
        ),
      );
    } catch {
      this.versions.set([]);
    }
  }

  protected reset(): void {
    this.editingId.set(null);
    this.draft.set({ ...EMPTY });
  }

  private fill(v: ConsentTextVersionDto): void {
    this.draft.set({
      noticeText: v.noticeText ?? '',
      purposesText: v.purposesText ?? '',
      affirmativeActionLabel: v.affirmativeActionLabel ?? '',
      withdrawalInstructions: v.withdrawalInstructions ?? '',
    });
    this.language.set(v.languageCode ?? 'en');
  }

  protected edit(v: ConsentTextVersionDto): void {
    this.fill(v);
    this.editingId.set(v.id ?? null);
  }

  /** A published version can't change: start a new draft from its words instead. */
  protected copy(v: ConsentTextVersionDto): void {
    this.fill(v);
    this.editingId.set(null);
  }

  protected async save(): Promise<void> {
    const d = this.draft();
    const body = {
      noticeText: d.noticeText.trim(),
      purposesText: d.purposesText.trim(),
      affirmativeActionLabel: d.affirmativeActionLabel.trim() || null,
      withdrawalInstructions: d.withdrawalInstructions.trim() || null,
    };
    await this.run('save', async () => {
      const id = this.editingId();
      await firstValueFrom(
        id
          ? this.api.update(id, body, { skipHandleError: true })
          : this.api.create(
              { key: this.key(), languageCode: this.language(), ...body },
              { skipHandleError: true },
            ),
      );
      this.reset();
      this.toasts.success('Draft saved. Publish it when the wording is final.', 'Consent wording');
    });
  }

  protected async publish(v: ConsentTextVersionDto): Promise<void> {
    const ok = await this.dialogs.confirm({
      title: `Publish version ${v.version} (${this.languageName(v.languageCode)})?`,
      message: 'Contacts see this wording from now on, and it can no longer be edited.',
      details: ['The version shown until now is retired; consents already given stay tied to it.'],
      confirmText: 'Publish',
    });
    if (!ok) return;
    await this.run(v.id!, async () => {
      await firstValueFrom(this.api.publish(v.id!, { skipHandleError: true }));
    });
  }

  protected async retire(v: ConsentTextVersionDto): Promise<void> {
    const ok = await this.dialogs.confirm({
      title: `Retire version ${v.version} (${this.languageName(v.languageCode)})?`,
      message: 'No wording will be shown in this language until you publish another version.',
      confirmText: 'Retire',
      tone: 'danger',
    });
    if (!ok) return;
    await this.run(v.id!, async () => {
      await firstValueFrom(this.api.retire(v.id!, { skipHandleError: true }));
    });
  }

  private async run(key: string, work: () => Promise<void>): Promise<void> {
    this.busy.set(key);
    try {
      await work();
      await this.load();
    } catch (e: unknown) {
      this.toasts.error(readApiError(e, 'That did not save. Try again.'), 'Consent wording');
    } finally {
      this.busy.set(null);
    }
  }
}
