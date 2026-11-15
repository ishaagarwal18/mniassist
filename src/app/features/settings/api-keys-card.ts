import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';

import { ConfirmService } from '../../core/ui/confirm.service';
import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import type { ApiKeyDto } from '../../proxy/integrations/models';
import { IntegrationService } from '../../proxy/integrations/integration.service';
import { ArButton, ArChip } from '../../ui';

/**
 * API keys for the workspace's own systems to call the public API. A key's secret is shown once, when it is made;
 * after that only its prefix is listed. Revoking stops it at once.
 */
@Component({
  selector: 'ar-api-keys-card',
  imports: [ArButton, ArChip, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: '../shared/work-page.scss',
  styles: `
    :host {
      display: block;
      height: auto;
    }
  `,
  template: `
    <section class="wp__card">
      <h2 class="wp__title">API keys</h2>
      <p class="wp__muted">
        For your own systems to call the API. Each key is shown once, when it is made.
      </p>

      <div class="wp__row">
        <input
          class="ar-field__input wp__grow"
          placeholder="What the key is for, such as ERP sync"
          maxlength="128"
          [value]="name()"
          (input)="name.set($any($event.target).value)"
        />
        <button
          ar-button
          type="button"
          variant="primary"
          [disabled]="busy() !== null || !name().trim()"
          (click)="create()"
        >
          {{ busy() === 'create' ? 'Creating…' : 'Create key' }}
        </button>
      </div>

      @if (created(); as c) {
        <div class="wp__card" role="status" style="margin-top: 12px">
          <p class="ar-label">New key for {{ c.name }} (shown once; copy it now)</p>
          <div class="wp__row">
            <code class="ar-mono wp__grow" translate="no" style="overflow-wrap: anywhere">{{
              c.secret
            }}</code>
            <button ar-button type="button" variant="ghost" (click)="copy(c.secret)">Copy</button>
            <button ar-button type="button" variant="ghost" (click)="created.set(null)">
              Done
            </button>
          </div>
        </div>
      }

      <ul class="wp__list" style="margin-top: 12px">
        @for (k of keys(); track k.id) {
          <li class="wp__item">
            <span class="wp__grow">
              <span class="wp__name" translate="no">{{ k.name }}</span>
              <span class="wp__sub ar-mono" translate="no">{{ k.prefix }}…</span>
              <span class="wp__sub">
                Made {{ k.createdAtUtc | date: 'd MMM y' }} ·
                {{
                  k.lastUsedAtUtc
                    ? 'last used ' + (k.lastUsedAtUtc | date: 'd MMM y, HH:mm')
                    : 'never used'
                }}
              </span>
            </span>
            @if (k.revokedAtUtc) {
              <ar-chip tone="neutral">Revoked {{ k.revokedAtUtc | date: 'd MMM y' }}</ar-chip>
            } @else {
              <ar-chip tone="good" [dot]="true">Active</ar-chip>
              <button
                ar-button
                type="button"
                variant="ghost"
                [disabled]="busy() !== null"
                (click)="revoke(k)"
              >
                {{ busy() === k.id ? 'Revoking…' : 'Revoke' }}
              </button>
            }
          </li>
        } @empty {
          <li class="wp__empty">No API keys yet.</li>
        }
      </ul>
    </section>
  `,
})
export class ArApiKeysCard implements OnInit {
  private readonly api = inject(IntegrationService);
  private readonly toasts = inject(ToastService);
  private readonly dialogs = inject(ConfirmService);

  protected readonly keys = signal<ApiKeyDto[]>([]);
  protected readonly name = signal('');
  protected readonly busy = signal<string | null>(null);
  protected readonly created = signal<{ name: string; secret: string } | null>(null);

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  private async load(): Promise<void> {
    try {
      this.keys.set(
        (await firstValueFrom(this.api.getApiKeys({ skipHandleError: true }))).items ?? [],
      );
    } catch {
      this.keys.set([]);
    }
  }

  protected async create(): Promise<void> {
    this.busy.set('create');
    try {
      const k = await firstValueFrom(
        this.api.createApiKey({ name: this.name().trim() }, { skipHandleError: true }),
      );
      this.created.set({ name: k.name ?? '', secret: k.secret ?? '' });
      this.name.set('');
      await this.load();
    } catch (e: unknown) {
      this.toasts.error(readApiError(e, 'The key could not be created.'), 'API keys');
    } finally {
      this.busy.set(null);
    }
  }

  protected async revoke(k: ApiKeyDto): Promise<void> {
    const ok = await this.dialogs.confirm({
      title: `Revoke ${k.name}?`,
      message: 'Anything still using this key is refused from now on. This cannot be undone.',
      confirmText: 'Revoke key',
      tone: 'danger',
    });
    if (!ok) return;
    this.busy.set(k.id ?? null);
    try {
      await firstValueFrom(this.api.revokeApiKey(k.id!, { skipHandleError: true }));
      await this.load();
    } catch (e: unknown) {
      this.toasts.error(readApiError(e, 'The key could not be revoked.'), 'API keys');
    } finally {
      this.busy.set(null);
    }
  }

  protected async copy(secret: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(secret);
      this.toasts.success('Key copied.', 'API keys');
    } catch {
      this.toasts.warning('Copy failed. Select the key and copy it by hand.', 'API keys');
    }
  }
}
