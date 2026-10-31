import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ConfirmService } from '../../core/ui/confirm.service';
import { IntegrationKind } from '../../proxy/integrations/integration-kind.enum';
import { IntegrationService } from '../../proxy/integrations/integration.service';
import { IntegrationState } from '../../proxy/integrations/integration-state.enum';
import { IntegrationConnectionDto } from '../../proxy/integrations/models';
import { ArButton } from '../../ui/button';

type HelpdeskShopKind =
  IntegrationKind.Freshdesk | IntegrationKind.Zendesk | IntegrationKind.Shopify;

const KINDS: { kind: HelpdeskShopKind; label: string; credential: string; help: string }[] = [
  {
    kind: IntegrationKind.Freshdesk,
    label: 'Freshdesk',
    credential: 'API key',
    help: 'In Freshdesk: your profile picture, Profile settings, View API key.',
  },
  {
    kind: IntegrationKind.Zendesk,
    label: 'Zendesk',
    credential: 'API token',
    help: 'In Zendesk Admin Center: Apps and integrations, Zendesk API, add an API token. Use the email of the agent it acts as.',
  },
  {
    kind: IntegrationKind.Shopify,
    label: 'Shopify',
    credential: 'Admin API access token',
    help: 'In Shopify: Settings, Apps, Develop apps, create an app with read_orders and read_customers, install it and copy the Admin API access token.',
  },
];

interface ConnectionForm {
  id: string | null;
  kind: HelpdeskShopKind;
  name: string;
  /** acme.freshdesk.com, the Zendesk subdomain, or acme.myshopify.com. */
  address: string;
  email: string;
  credential: string;
}

/**
 * Freshdesk, Zendesk and Shopify connections, used by AI voice agents to look up the caller's tickets and orders and to raise
 * tickets. The key is kept in secret storage; each connection only reaches its vendor's own address.
 */
@Component({
  selector: 'ar-helpdesk-shop-section',
  imports: [FormsModule, ArButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="hs" aria-labelledby="hs-h">
      <div class="hs__head">
        <h2 id="hs-h">Helpdesk and store</h2>
        @if (!form()) {
          <button ar-button type="button" icon="plus" [disabled]="busy()" (click)="edit(null)">
            Connect
          </button>
        }
      </div>
      <p class="hs__intro">
        Let AI voice agents look up a caller's tickets in Freshdesk or Zendesk and raise new ones,
        and look up their orders in Shopify, by the number they call from. Choose the connection on
        the agent's Actions tab.
      </p>
      @if (error()) {
        <p role="alert" class="hs__err">{{ error() }}</p>
      }
      @if (form(); as f) {
        <form class="hs__form" (submit)="$event.preventDefault(); save()">
          <label class="ar-field"
            ><span class="ar-field__label">Service</span>
            <select
              class="ar-field__input"
              name="kind"
              [(ngModel)]="f.kind"
              [disabled]="busy() || f.id !== null"
            >
              @for (k of kinds; track k.kind) {
                <option [ngValue]="k.kind">{{ k.label }}</option>
              }
            </select></label
          >
          <label class="ar-field"
            ><span class="ar-field__label">Name</span>
            <input
              class="ar-field__input"
              name="name"
              maxlength="128"
              [(ngModel)]="f.name"
              [disabled]="busy()"
          /></label>
          <label class="ar-field"
            ><span class="ar-field__label">{{ addressLabel(f.kind) }}</span>
            <input
              class="ar-field__input"
              name="address"
              translate="no"
              [placeholder]="addressPlaceholder(f.kind)"
              [(ngModel)]="f.address"
              [disabled]="busy()"
          /></label>
          @if (f.kind === zendesk) {
            <label class="ar-field"
              ><span class="ar-field__label">Agent email</span>
              <input
                class="ar-field__input"
                type="email"
                name="email"
                [(ngModel)]="f.email"
                [disabled]="busy()"
            /></label>
          }
          <label class="ar-field"
            ><span class="ar-field__label">{{ kindOf(f.kind).credential }}</span>
            <input
              class="ar-field__input"
              type="password"
              name="credential"
              autocomplete="off"
              [placeholder]="f.id ? 'Saved; leave blank to keep' : ''"
              [(ngModel)]="f.credential"
              [disabled]="busy()"
          /></label>
          <p class="hs__help">{{ kindOf(f.kind).help }}</p>
          <div class="hs__actions">
            <button ar-button type="submit" variant="primary" [disabled]="busy()">
              {{ busy() ? 'Saving…' : 'Save and test' }}
            </button>
            <button
              ar-button
              type="button"
              variant="ghost"
              [disabled]="busy()"
              (click)="form.set(null)"
            >
              Cancel
            </button>
          </div>
        </form>
      }
      <ul class="hs__list">
        @for (c of connections(); track c.id) {
          <li>
            <div>
              <strong>{{ c.name }}</strong> · {{ kindOf($any(c.kind)).label }}
              <span translate="no"> · {{ address(c) }}</span>
              <div [class.hs__err]="c.state !== connected">
                {{ c.state === connected ? 'Connected' : c.lastError || 'Not tested yet' }}
              </div>
            </div>
            <div class="hs__actions">
              <button ar-button type="button" variant="ghost" [disabled]="busy()" (click)="test(c)">
                Test
              </button>
              <button ar-button type="button" variant="ghost" [disabled]="busy()" (click)="edit(c)">
                Edit
              </button>
              <button
                ar-button
                type="button"
                variant="ghost"
                [disabled]="busy()"
                (click)="remove(c)"
              >
                Delete
              </button>
            </div>
          </li>
        } @empty {
          <li>No helpdesk or store connected.</li>
        }
      </ul>
    </section>
  `,
  styles: `
    .hs {
      display: grid;
      gap: 10px;
      min-width: 0;
    }
    .hs__head {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      justify-content: space-between;
    }
    .hs__head h2 {
      margin: 0;
      font-size: 1.05em;
    }
    .hs__intro,
    .hs__help {
      margin: 0;
      color: var(--ar-ink-600);
      font-size: 0.9em;
    }
    .hs__err {
      color: var(--ar-danger-600, #b42318);
    }
    .hs__form {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 220px), 1fr));
      gap: 8px 12px;
      align-items: end;
      padding: 12px;
      border: 1px solid var(--ar-line-200);
      border-radius: 8px;
    }
    .hs__help,
    .hs__form .hs__actions {
      grid-column: 1 / -1;
    }
    .hs__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .hs__list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 8px;
    }
    .hs__list li {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--ar-line-200);
      padding: 6px 0;
      min-width: 0;
    }
  `,
})
export class ArHelpdeskShopSection implements OnInit {
  private readonly api = inject(IntegrationService);
  private readonly dialogs = inject(ConfirmService);
  protected readonly kinds = KINDS;
  protected readonly zendesk = IntegrationKind.Zendesk;
  protected readonly connected = IntegrationState.Connected;
  protected readonly connections = signal<IntegrationConnectionDto[]>([]);
  protected readonly form = signal<ConnectionForm | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal('');

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  private async load(): Promise<void> {
    try {
      const page = await firstValueFrom(this.api.getList({ maxResultCount: 100 }));
      this.connections.set((page.items ?? []).filter((c) => KINDS.some((k) => k.kind === c.kind)));
    } catch {
      this.error.set('The connections could not be loaded.');
    }
  }

  protected kindOf(kind: HelpdeskShopKind) {
    return KINDS.find((k) => k.kind === kind) ?? KINDS[0];
  }

  protected addressLabel(kind: HelpdeskShopKind): string {
    return kind === IntegrationKind.Zendesk
      ? 'Zendesk subdomain'
      : kind === IntegrationKind.Shopify
        ? 'Store address'
        : 'Freshdesk address';
  }

  protected addressPlaceholder(kind: HelpdeskShopKind): string {
    return kind === IntegrationKind.Zendesk
      ? 'acme'
      : kind === IntegrationKind.Shopify
        ? 'acme.myshopify.com'
        : 'acme.freshdesk.com';
  }

  protected address(c: IntegrationConnectionDto): string {
    const config = this.config(c.configJson);
    return String(
      config['domain'] ??
        config['shop'] ??
        (config['subdomain'] ? `${config['subdomain']}.zendesk.com` : ''),
    );
  }

  private config(json?: string | null): Record<string, unknown> {
    try {
      const parsed = JSON.parse(json ?? '{}');
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  protected edit(c: IntegrationConnectionDto | null): void {
    this.error.set('');
    if (!c) {
      this.form.set({
        id: null,
        kind: IntegrationKind.Freshdesk,
        name: '',
        address: '',
        email: '',
        credential: '',
      });
      return;
    }
    const config = this.config(c.configJson);
    this.form.set({
      id: c.id ?? null,
      kind: c.kind as HelpdeskShopKind,
      name: c.name ?? '',
      address: String(config['domain'] ?? config['shop'] ?? config['subdomain'] ?? ''),
      email: String(config['email'] ?? ''),
      credential: '',
    });
  }

  protected async save(): Promise<void> {
    const f = this.form();
    if (!f || this.busy()) return;
    const address = f.address
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '');
    const valid =
      f.kind === IntegrationKind.Freshdesk
        ? /^[a-z0-9][a-z0-9-]*\.freshdesk\.com$/.test(address)
        : f.kind === IntegrationKind.Shopify
          ? /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(address)
          : /^[a-z0-9][a-z0-9-]*$/.test(address) && f.email.includes('@');
    if (!f.name.trim() || !valid || (!f.id && !f.credential)) {
      this.error.set(
        `Enter a name, the ${this.addressLabel(f.kind).toLowerCase()} (${this.addressPlaceholder(f.kind)}) and the ${this.kindOf(f.kind).credential}.`,
      );
      return;
    }
    const config =
      f.kind === IntegrationKind.Freshdesk
        ? { domain: address }
        : f.kind === IntegrationKind.Shopify
          ? { shop: address }
          : { subdomain: address, email: f.email.trim() };
    const input = {
      kind: f.kind,
      name: f.name.trim(),
      configJson: JSON.stringify(config),
      credential: f.credential || null,
    };
    this.busy.set(true);
    this.error.set('');
    try {
      const saved = await firstValueFrom(
        f.id ? this.api.update(f.id, input) : this.api.create(input),
      );
      if (saved.id) await firstValueFrom(this.api.test(saved.id));
      this.form.set(null);
      await this.load();
    } catch {
      this.error.set('The connection could not be saved.');
    } finally {
      this.busy.set(false);
    }
  }

  protected async test(c: IntegrationConnectionDto): Promise<void> {
    if (!c.id || this.busy()) return;
    this.busy.set(true);
    try {
      await firstValueFrom(this.api.test(c.id));
      await this.load();
    } catch {
      this.error.set('The connection could not be tested.');
    } finally {
      this.busy.set(false);
    }
  }

  protected async remove(c: IntegrationConnectionDto): Promise<void> {
    if (!c.id || !(await this.dialogs.delete('this connection', c.name ?? ''))) return;
    this.busy.set(true);
    try {
      await firstValueFrom(this.api.delete(c.id));
      await this.load();
    } catch {
      this.error.set('The connection could not be deleted.');
    } finally {
      this.busy.set(false);
    }
  }
}
