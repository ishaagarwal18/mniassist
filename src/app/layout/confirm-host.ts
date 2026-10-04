import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  effect,
  inject,
  signal,
} from '@angular/core';

import { ConfirmService, PromptOptions } from '../core/ui/confirm.service';
import { ArButton, ArDialog, ArIcon } from '../ui';
import { ArSelect } from '../ui/select';

/** Renders ConfirmService's requests: confirmations (delete and others) and short forms. */
@Component({
  selector: 'ar-confirm-host',
  imports: [ArDialog, ArButton, ArIcon, ArSelect],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (service.current(); as req) {
      @if (req.kind === 'confirm') {
        <ar-dialog [title]="req.options.title" (dismiss)="req.resolve(false)">
          <div class="cf" [class.cf--danger]="(req.options.tone ?? 'primary') === 'danger'">
            <span class="cf__icon" aria-hidden="true">
              <ar-icon
                [name]="(req.options.tone ?? 'primary') === 'danger' ? 'alert' : 'help'"
                [size]="20"
              />
            </span>
            <div class="cf__text">
              @if (req.options.message) {
                <p class="cf__msg">{{ req.options.message }}</p>
              }
              @if (req.options.details?.length) {
                <ul class="cf__details">
                  @for (d of req.options.details; track $index) {
                    <li>{{ d }}</li>
                  }
                </ul>
              }
            </div>
          </div>
          <div dialogActions>
            <button ar-button type="button" variant="ghost" (click)="req.resolve(false)">
              {{ req.options.cancelText ?? 'Cancel' }}
            </button>
            <button
              ar-button
              type="button"
              data-autofocus
              [variant]="(req.options.tone ?? 'primary') === 'danger' ? 'danger' : 'primary'"
              (click)="req.resolve(true)"
            >
              {{ req.options.confirmText ?? 'OK' }}
            </button>
          </div>
        </ar-dialog>
      } @else {
        <ar-dialog [title]="req.options.title" (dismiss)="req.resolve(null)">
          @if (req.options.message) {
            <p class="cf__msg">{{ req.options.message }}</p>
          }
          @for (f of req.options.fields; track f.key; let first = $first) {
            <label class="ar-field">
              <span class="ar-field__label"
                >{{ f.label }}
                @if (!f.required) {
                  <span class="ar-field__opt">optional</span>
                }
              </span>
              @if (f.options) {
                <select
                  class="ar-field__input"
                  [attr.data-autofocus]="first ? '' : null"
                  [required]="!!f.required"
                  (change)="set(f.key, $any($event.target).value)"
                >
                  @if (!f.required) {
                    <option value="" [selected]="!values()[f.key]">—</option>
                  } @else {
                    <option value="" disabled hidden [selected]="!values()[f.key]">
                      {{ f.placeholder ?? 'Choose…' }}
                    </option>
                  }
                  @for (o of f.options; track o.value) {
                    <option [value]="o.value" [selected]="o.value === values()[f.key]">
                      {{ o.label }}
                    </option>
                  }
                </select>
              } @else if (f.multiline) {
                <textarea
                  class="ar-field__input"
                  rows="3"
                  [attr.data-autofocus]="first ? '' : null"
                  [required]="!!f.required"
                  [attr.maxlength]="f.maxLength ?? null"
                  [placeholder]="f.placeholder ?? ''"
                  [value]="values()[f.key] ?? ''"
                  (input)="set(f.key, $any($event.target).value)"
                ></textarea>
              } @else {
                <input
                  class="ar-field__input"
                  [type]="f.type ?? 'text'"
                  [attr.data-autofocus]="first ? '' : null"
                  [required]="!!f.required"
                  [attr.maxlength]="f.maxLength ?? null"
                  [attr.min]="f.min ?? null"
                  [attr.max]="f.max ?? null"
                  [placeholder]="f.placeholder ?? ''"
                  [value]="values()[f.key] ?? ''"
                  (input)="set(f.key, $any($event.target).value)"
                  (keydown.enter)="submitFrom($event)"
                />
              }
              @if (f.hint) {
                <span class="ar-field__hint">{{ f.hint }}</span>
              }
            </label>
          }
          <div dialogActions>
            <button ar-button type="button" variant="ghost" (click)="req.resolve(null)">
              {{ req.options.cancelText ?? 'Cancel' }}
            </button>
            <button ar-button type="button" variant="primary" (click)="submit(req.options)">
              {{ req.options.confirmText ?? 'Save' }}
            </button>
          </div>
        </ar-dialog>
      }
    }
  `,
  styles: `
    .cf {
      display: flex;
      gap: 14px;
      align-items: flex-start;
    }
    .cf__icon {
      flex: none;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: var(--ar-blue-100, var(--ar-bg-100));
      color: var(--ar-blue-600, var(--ar-primary));
    }
    .cf--danger .cf__icon {
      background: var(--ar-red-100);
      color: var(--ar-red-600);
    }
    .cf__text {
      min-width: 0;
      padding-top: 2px;
    }
    .cf__msg {
      margin: 0;
      font: 400 13.5px/1.55 var(--ar-font-sans);
      color: var(--ar-ink-700);
      overflow-wrap: anywhere;
    }
    .cf__details {
      margin: 10px 0 0;
      padding: 10px 12px 10px 28px;
      border-radius: var(--ar-radius-inset);
      background: var(--ar-bg-50);
      font: 400 12.5px/1.5 var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
  `,
})
export class ArConfirmHost implements OnDestroy {
  protected readonly service = inject(ConfirmService);
  protected readonly values = signal<Partial<Record<string, string>>>({});

  constructor() {
    this.service.hostAttached = true;
    // Each new prompt starts from its own defaults.
    effect(() => {
      const req = this.service.current();
      if (req?.kind === 'prompt') {
        this.values.set(Object.fromEntries(req.options.fields.map((f) => [f.key, f.value ?? ''])));
      }
    });
  }

  ngOnDestroy(): void {
    this.service.hostAttached = false;
  }

  protected set(key: string, value: string): void {
    this.values.update((v) => ({ ...v, [key]: value }));
  }

  /** Validation runs in the dialog (required, type, length) before this is reached. */
  protected submit(options: PromptOptions): void {
    const req = this.service.current();
    if (req?.kind !== 'prompt') return;
    const v = this.values();
    req.resolve(Object.fromEntries(options.fields.map((f) => [f.key, (v[f.key] ?? '').trim()])));
  }

  /** Enter in a one-line field presses the dialog's main button, so validation still runs. */
  protected submitFrom(event: Event): void {
    event.preventDefault();
    const dialog = (event.target as HTMLElement).closest('.e-dialog');
    dialog
      ?.querySelector<HTMLButtonElement>('.dlg__foot [variant="primary"], .dlg__foot .e-primary')
      ?.click();
  }
}
