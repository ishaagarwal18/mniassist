import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ConfirmService } from '../../core/ui/confirm.service';
import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import { ArTopbar } from '../../layout/topbar';
import {
  SmsChannelDto,
  SmsChannelService,
  SmsTemplateCategory,
  SmsTemplateDto,
  SmsTemplateStatus,
} from '../../proxy/sms/sms-channel.service';
import { ArButton, ArChip } from '../../ui';
import { ChipTone } from '../../ui/chip';

const CATEGORIES: { value: SmsTemplateCategory; label: string }[] = [
  { value: SmsTemplateCategory.Transactional, label: 'Transactional' },
  { value: SmsTemplateCategory.ServiceImplicit, label: 'Service (implicit)' },
  { value: SmsTemplateCategory.ServiceExplicit, label: 'Service (explicit)' },
  { value: SmsTemplateCategory.Promotional, label: 'Promotional' },
];

const STATUS: Record<SmsTemplateStatus, { tone: ChipTone; label: string }> = {
  [SmsTemplateStatus.Pending]: { tone: 'warn', label: 'Waiting for DLT' },
  [SmsTemplateStatus.Approved]: { tone: 'good', label: 'Approved' },
  [SmsTemplateStatus.Rejected]: { tone: 'bad', label: 'Rejected' },
};

/** How many {#var#} placeholders a DLT body has: each one needs a variable name, in order. */
export function countDltVariables(content: string): number {
  return (content.match(/\{#var#\}/gi) ?? []).length;
}

/**
 * SMS set-up (MSG91 + India's DLT): the sender ID the messages come from, and the DLT templates the operator
 * registered. Templates are approved on the DLT portal, not here; this page records the result so only approved
 * ones can be sent.
 */
@Component({
  selector: 'ar-sms-setup',
  imports: [ArTopbar, ArButton, ArChip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: '../shared/work-page.scss',
  template: `
    <ar-topbar
      title="SMS set-up"
      subtitle="Sender ID and DLT templates"
      help="Every SMS in India must use a sender ID and a template registered on the DLT portal. Add them here exactly as registered."
    />
    <div class="wp">
      <section class="wp__card">
        <h2 class="wp__title">Sender ID</h2>
        <p class="wp__muted">
          The 6-character header registered on DLT (for example MNIAUT), and your MSG91 auth key.
          @if (channel(); as c) {
            Current: <strong translate="no">{{ c.senderId || 'not set' }}</strong
            >.
          }
        </p>
        <div class="wp__grid">
          <label class="wp__field">
            <span>Sender ID</span>
            <input
              class="ar-field__input"
              maxlength="16"
              [value]="senderId()"
              (input)="senderId.set($any($event.target).value.toUpperCase())"
            />
          </label>
          <label class="wp__field">
            <span>MSG91 auth key</span>
            <input
              class="ar-field__input"
              type="password"
              autocomplete="off"
              placeholder="Leave blank to keep the saved key"
              [value]="authKey()"
              (input)="authKey.set($any($event.target).value)"
            />
          </label>
        </div>
        <div class="wp__actions">
          <button
            ar-button
            type="button"
            variant="primary"
            [disabled]="busy() !== null || senderId().trim().length < 6"
            (click)="saveSender()"
          >
            {{ busy() === 'sender' ? 'Saving…' : 'Save sender' }}
          </button>
        </div>
      </section>

      <section class="wp__card">
        <h2 class="wp__title">Add a DLT template</h2>
        <p class="wp__muted">
          Copy the body exactly as approved, with a <code>{{ varToken }}</code> for each variable.
        </p>
        <div class="wp__grid">
          <label class="wp__field">
            <span>Name</span>
            <input
              class="ar-field__input"
              maxlength="128"
              [value]="name()"
              (input)="name.set($any($event.target).value)"
            />
          </label>
          <label class="wp__field">
            <span>DLT template ID</span>
            <input
              class="ar-field__input"
              [value]="dltId()"
              (input)="dltId.set($any($event.target).value.trim())"
            />
          </label>
          <label class="wp__field">
            <span>MSG91 flow ID</span>
            <input
              class="ar-field__input"
              [value]="flowId()"
              (input)="flowId.set($any($event.target).value.trim())"
            />
          </label>
          <label class="wp__field">
            <span>Category</span>
            <select
              class="ar-field__input"
              [value]="category()"
              (change)="category.set(+$any($event.target).value)"
            >
              @for (c of categories; track c.value) {
                <option [value]="c.value">{{ c.label }}</option>
              }
            </select>
          </label>
          <label class="wp__field wp__field--wide">
            <span>Body</span>
            <textarea
              class="ar-field__input"
              rows="3"
              maxlength="1024"
              [value]="content()"
              (input)="content.set($any($event.target).value)"
            ></textarea>
          </label>
          <label class="wp__field wp__field--wide">
            <span>Variable names, in order, separated by commas ({{ varCount() }} needed)</span>
            <input
              class="ar-field__input"
              placeholder="name, order_no"
              [value]="variables()"
              (input)="variables.set($any($event.target).value)"
            />
          </label>
        </div>
        @if (templateProblem(); as p) {
          <p class="wp__error">{{ p }}</p>
        }
        <div class="wp__actions">
          <button
            ar-button
            type="button"
            variant="primary"
            [disabled]="busy() !== null || templateProblem() !== null"
            (click)="addTemplate()"
          >
            {{ busy() === 'template' ? 'Adding…' : 'Add template' }}
          </button>
        </div>
      </section>

      <section class="wp__card">
        <h2 class="wp__title">Templates</h2>
        <p class="wp__muted">Mark each one approved or rejected once the DLT portal decides.</p>
        <ul class="wp__list">
          @for (t of templates(); track t.id) {
            <li class="wp__item">
              <span class="wp__grow">
                <span class="wp__name" translate="no">{{ t.name }}</span>
                <span class="wp__sub" translate="no">{{ t.content }}</span>
                <span class="wp__sub"
                  >DLT {{ t.dltTemplateId }} · {{ categoryLabel(t.category) }}</span
                >
                @if (t.rejectionReason) {
                  <span class="wp__error">{{ t.rejectionReason }}</span>
                }
              </span>
              <ar-chip [tone]="status(t.status).tone" [dot]="true">{{
                status(t.status).label
              }}</ar-chip>
              @if (t.status !== approved) {
                <button
                  ar-button
                  type="button"
                  variant="ghost"
                  [disabled]="busy() !== null"
                  (click)="approve(t)"
                >
                  Mark approved
                </button>
              }
              @if (t.status !== rejected) {
                <button
                  ar-button
                  type="button"
                  variant="ghost"
                  [disabled]="busy() !== null"
                  (click)="reject(t)"
                >
                  Mark rejected
                </button>
              }
            </li>
          } @empty {
            <li class="wp__empty">No templates yet. SMS can only be sent with an approved one.</li>
          }
        </ul>
      </section>
    </div>
  `,
})
export class ArSmsSetup implements OnInit {
  private readonly api = inject(SmsChannelService);
  private readonly toasts = inject(ToastService);
  private readonly dialogs = inject(ConfirmService);

  protected readonly categories = CATEGORIES;
  protected readonly approved = SmsTemplateStatus.Approved;
  protected readonly rejected = SmsTemplateStatus.Rejected;
  protected readonly varToken = '{#var#}';

  protected readonly channel = signal<SmsChannelDto | null>(null);
  protected readonly templates = signal<SmsTemplateDto[]>([]);
  protected readonly busy = signal<string | null>(null);

  protected readonly senderId = signal('');
  protected readonly authKey = signal('');

  protected readonly name = signal('');
  protected readonly dltId = signal('');
  protected readonly flowId = signal('');
  protected readonly category = signal<SmsTemplateCategory>(SmsTemplateCategory.Transactional);
  protected readonly content = signal('');
  protected readonly variables = signal('');

  protected readonly varCount = computed(() => countDltVariables(this.content()));
  private readonly variableNames = computed(() =>
    this.variables()
      .split(',')
      .map((v) => v.trim())
      .filter((v) => v.length > 0),
  );
  protected readonly templateProblem = computed(() => {
    if (!this.name().trim() || !this.dltId() || !this.flowId() || !this.content().trim()) {
      return 'Fill in the name, DLT template ID, flow ID and body.';
    }
    if (this.variableNames().length !== this.varCount()) {
      return `The body has ${this.varCount()} variable(s); name each one.`;
    }
    return null;
  });

  async ngOnInit(): Promise<void> {
    try {
      const c = await firstValueFrom(this.api.getOrCreate());
      this.channel.set(c);
      this.senderId.set(c.senderId ?? '');
    } catch {
      /* the global handler already said why */
    }
    await this.loadTemplates();
  }

  private async loadTemplates(): Promise<void> {
    try {
      this.templates.set(await firstValueFrom(this.api.getTemplates()));
    } catch {
      this.templates.set([]);
    }
  }

  protected status(s: SmsTemplateStatus) {
    return STATUS[s] ?? STATUS[SmsTemplateStatus.Pending];
  }

  protected categoryLabel(c: number): string {
    return CATEGORIES.find((x) => x.value === c)?.label ?? 'Other';
  }

  protected async saveSender(): Promise<void> {
    await this.run('sender', async () => {
      this.channel.set(
        await firstValueFrom(
          this.api.setSender(
            { senderId: this.senderId().trim(), authKey: this.authKey().trim() || null },
            { skipHandleError: true },
          ),
        ),
      );
      this.authKey.set('');
      this.toasts.success('Sender saved.', 'SMS');
    });
  }

  protected async addTemplate(): Promise<void> {
    await this.run('template', async () => {
      await firstValueFrom(
        this.api.createTemplate(
          {
            name: this.name().trim(),
            dltTemplateId: this.dltId(),
            flowId: this.flowId(),
            content: this.content().trim(),
            category: this.category(),
            variableNames: this.variableNames(),
          },
          { skipHandleError: true },
        ),
      );
      this.name.set('');
      this.dltId.set('');
      this.flowId.set('');
      this.content.set('');
      this.variables.set('');
      this.toasts.success('Template added. Mark it approved once DLT approves it.', 'SMS');
      await this.loadTemplates();
    });
  }

  protected async approve(t: SmsTemplateDto): Promise<void> {
    await this.run(t.id, async () => {
      await firstValueFrom(this.api.markTemplateApproved(t.id, { skipHandleError: true }));
      this.toasts.success(`${t.name} can now be sent.`, 'SMS');
      await this.loadTemplates();
    });
  }

  protected async reject(t: SmsTemplateDto): Promise<void> {
    const reason = await this.dialogs.ask(
      `Mark ${t.name} rejected?`,
      { label: 'Reason from the DLT portal (optional)', value: '', maxLength: 512 },
      'A rejected template cannot be sent.',
    );
    if (reason === null) return;
    await this.run(t.id, async () => {
      await firstValueFrom(
        this.api.markTemplateRejected(
          t.id,
          { reason: reason.trim() || null },
          { skipHandleError: true },
        ),
      );
      await this.loadTemplates();
    });
  }

  private async run(key: string, work: () => Promise<void>): Promise<void> {
    if (this.busy()) return;
    this.busy.set(key);
    try {
      await work();
    } catch (e: unknown) {
      this.toasts.error(readApiError(e, 'That did not save. Try again.'), 'SMS');
    } finally {
      this.busy.set(null);
    }
  }
}
