import {
  Component,
  ChangeDetectionStrategy,
  inject,
  input,
  output,
  signal,
  effect,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { CampaignService } from '../../proxy/campaigns/campaign.service';
import { CampaignDto } from '../../proxy/campaigns/models';
import { SegmentService } from '../../proxy/contacts/segment.service';
import { SegmentDto } from '../../proxy/contacts/models';
import { TemplateService } from '../../proxy/messaging/template.service';
import { ArButton } from '../../ui/button';
import { readApiError } from '../../core/util/api-error';
import { ChannelKind } from '../../proxy/channels/channel-kind.enum';
import { SmsChannelService } from '../../proxy/sms/sms-channel.service';

@Component({
  selector: 'ar-campaign-setup',
  imports: [FormsModule, ArButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section aria-label="Audience and template variables">
      <h3>Audience and template variables</h3>
      @if (error()) {
        <p role="alert">{{ error() }}</p>
      }
      @if (campaign(); as c) {
        <label class="ar-field">
          <span class="ar-field__label">Audience</span>
          <select
            class="ar-field__input"
            [(ngModel)]="segmentId"
            (ngModelChange)="edited.emit()"
            [disabled]="saving()"
          >
            <option value="">Choose an audience</option>
            @for (s of segments(); track s.id) {
              <option [value]="s.id" translate="no">
                {{ s.name }} ({{ s.cachedMemberCount ?? 0 }})
              </option>
            }
          </select>
        </label>
        <p>Only customers with the required consent will receive this campaign.</p>
        <a href="/contacts/segments">Manage audiences</a>
        @if (preview()) {
          <p translate="no">{{ preview() }}</p>
        }
        @for (v of variables(); track v.key) {
          <fieldset [disabled]="saving()">
            <legend>Variable {{ v.key }}</legend>
            <label class="ar-field"
              ><span class="ar-field__label">Use a customer field or fixed text</span>
              <select
                class="ar-field__input"
                [(ngModel)]="v.source"
                (ngModelChange)="edited.emit()"
              >
                <option value="contact.displayName">Customer name</option>
                <option value="contact.companyName">Company name</option>
                <option value="contact.city">City</option>
                <option value="contact.state">State</option>
                <option value="contact.waId">WhatsApp number</option>
                <option value="literal">Fixed text</option>
                <option value="custom">Custom field path</option>
              </select>
            </label>
            @if (v.source === 'literal' || v.source === 'custom') {
              <input
                class="ar-field__input"
                aria-label="Variable value"
                [(ngModel)]="v.value"
                (ngModelChange)="edited.emit()"
                translate="no"
              />
            }
            <label class="ar-field"
              ><span class="ar-field__label">Fallback when the customer field is empty</span>
              <input
                class="ar-field__input"
                [(ngModel)]="v.fallback"
                (ngModelChange)="edited.emit()"
                translate="no"
              />
            </label>
          </fieldset>
        } @empty {
          <p>This template has no body variables.</p>
        }
        <fieldset class="setup-options" [disabled]="saving()">
          <legend class="ar-field__label">Sending options</legend>
          <label class="ar-field" for="setup-throttle">
            <span class="ar-field__label">Send rate (messages a second)</span>
            <input
              id="setup-throttle"
              class="ar-field__input"
              inputmode="numeric"
              [(ngModel)]="throttle"
              (ngModelChange)="edited.emit()"
            />
          </label>
          @if (c.kind == null || c.kind === K.WhatsApp) {
            <label class="setup-check">
              <input type="checkbox" [(ngModel)]="matchLanguage" (ngModelChange)="edited.emit()" />
              Send in each person's language, when the template has that language
            </label>
            <label class="setup-check">
              <input type="checkbox" [(ngModel)]="marketingLite" (ngModelChange)="edited.emit()" />
              Send through Marketing Messages Lite
            </label>
          }
        </fieldset>
        <button ar-button variant="primary" [disabled]="saving() || !segmentId" (click)="save()">
          {{ saving() ? 'Saving…' : 'Save and check readiness' }}
        </button>
      } @else {
        <p>Loading…</p>
      }
    </section>
  `,
  styles: `
    .setup-options {
      display: grid;
      gap: 8px;
      margin: 0;
      padding: 12px 0 0;
      border: 0;
      border-top: 1px solid var(--ar-line-200);
    }
    .setup-check {
      display: flex;
      gap: 8px;
      align-items: center;
      font: 400 13px var(--ar-font-sans);
    }
    section {
      display: grid;
      gap: 12px;
      padding: 16px;
      border: 1px solid var(--ar-border, #ddd);
      border-radius: 8px;
      margin-bottom: 16px;
    }
    fieldset {
      border: 1px solid var(--ar-border, #ddd);
      border-radius: 6px;
      display: grid;
      gap: 8px;
      padding: 12px;
    }
    h3,
    p {
      margin: 0;
    }
  `,
})
export class ArCampaignSetup {
  readonly campaignId = input.required<string>();
  readonly saved = output<void>();
  readonly edited = output<void>();
  private readonly api = inject(CampaignService);
  private readonly segmentApi = inject(SegmentService);
  private readonly templateApi = inject(TemplateService);
  private readonly smsApi = inject(SmsChannelService);
  readonly campaign = signal<CampaignDto | null>(null);
  readonly segments = signal<SegmentDto[]>([]);
  readonly preview = signal('');
  readonly variables = signal<{ key: string; source: string; value: string; fallback: string }[]>(
    [],
  );
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  segmentId = '';
  /** Messages a second, as typed; the API takes 1 to 1,000. */
  throttle = '10';
  matchLanguage = false;
  marketingLite = false;
  protected readonly K = ChannelKind;
  private mapping: Record<string, string> = {};
  private sequence = 0;

  constructor() {
    effect(() => {
      void this.load(this.campaignId());
    });
  }

  private async load(id: string): Promise<void> {
    const sequence = ++this.sequence;
    this.campaign.set(null);
    this.error.set(null);
    try {
      const [campaign, page] = await Promise.all([
        firstValueFrom(this.api.get(id)),
        firstValueFrom(this.segmentApi.getList({ maxResultCount: 1000 })),
      ]);
      const smsTemplate =
        campaign.kind === ChannelKind.Sms
          ? (await firstValueFrom(this.smsApi.getTemplates())).find(
              (t) => t.id === campaign.templateId,
            )
          : null;
      const template =
        campaign.templateId && campaign.kind !== ChannelKind.Sms
          ? await firstValueFrom(this.templateApi.get(campaign.templateId))
          : null;
      if (sequence !== this.sequence) return;
      this.segmentId = campaign.segmentId ?? '';
      this.throttle = String(campaign.throttlePerSecond ?? 10);
      this.matchLanguage = !!campaign.matchRecipientLanguage;
      this.marketingLite = !!campaign.sendViaMarketingLite;
      let mapping: unknown;
      try {
        mapping = JSON.parse(campaign.variableMappingJson || '{}');
      } catch {
        mapping = {};
      }
      this.mapping =
        mapping && typeof mapping === 'object' && !Array.isArray(mapping)
          ? Object.fromEntries(
              Object.entries(mapping).filter(
                (entry): entry is [string, string] => typeof entry[1] === 'string',
              ),
            )
          : {};
      this.segments.set(page.items ?? []);
      this.preview.set(
        smsTemplate?.content ??
          template?.components?.map((c) => c.text ?? '').join('\n') ??
          campaign.emailTextBody ??
          campaign.instagramMessageText ??
          '',
      );
      const keys =
        smsTemplate?.variableNames ??
        Array.from({ length: template?.variableCount ?? 0 }, (_, i) => String(i + 1));
      this.variables.set(
        keys.map((key) => {
          const path = this.mapping[key] ?? 'literal:';
          const known = [
            'contact.displayName',
            'contact.companyName',
            'contact.city',
            'contact.state',
            'contact.waId',
          ];
          return {
            key,
            source: path.startsWith('literal:')
              ? 'literal'
              : known.includes(path)
                ? path
                : 'custom',
            value: path.startsWith('literal:') ? path.slice(8) : path,
            fallback: this.mapping[key + '.default'] ?? '',
          };
        }),
      );
      this.campaign.set(campaign);
    } catch (e) {
      if (sequence === this.sequence)
        this.error.set(readApiError(e, 'Campaign setup could not be loaded.'));
    }
  }

  async save(): Promise<void> {
    const campaign = this.campaign();
    if (!campaign || this.saving() || !this.segmentId) return;
    const mapping = { ...this.mapping };
    for (const v of this.variables()) {
      mapping[v.key] =
        v.source === 'literal'
          ? 'literal:' + v.value.trim()
          : v.source === 'custom'
            ? v.value.trim()
            : v.source;
      if (!mapping[v.key] || (v.source === 'literal' && !v.value.trim())) {
        this.error.set('Fill every template variable before saving.');
        return;
      }
      if (v.fallback.trim()) mapping[v.key + '.default'] = v.fallback.trim();
      else delete mapping[v.key + '.default'];
    }
    const throttle = this.throttle.trim();
    if (!/^\d+$/.test(throttle) || +throttle < 1 || +throttle > 1000) {
      this.error.set('The send rate is a whole number from 1 to 1,000 messages a second.');
      return;
    }
    const whatsApp = campaign.kind == null || campaign.kind === ChannelKind.WhatsApp;
    this.saving.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(
        this.api.update(this.campaignId(), {
          ...campaign,
          name: campaign.name ?? '',
          segmentId: this.segmentId,
          throttlePerSecond: Number(throttle),
          matchRecipientLanguage: whatsApp && this.matchLanguage,
          sendViaMarketingLite: whatsApp && this.marketingLite,
          variableMappingJson: JSON.stringify(mapping),
        }),
      );
      this.saved.emit();
    } catch (e) {
      this.error.set(readApiError(e, 'Campaign setup could not be saved.'));
    } finally {
      this.saving.set(false);
    }
  }
}
