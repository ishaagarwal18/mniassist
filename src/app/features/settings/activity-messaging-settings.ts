import { PermissionService } from '@abp/ng.core';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { grantedPolicy } from '../../core/auth/permission';
import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import { ArTopbar } from '../../layout/topbar';
import { ActivityLinkService } from '../../proxy/activities';
import { SmsChannelService, SmsTemplateStatus } from '../../proxy/sms/sms-channel.service';
import { ArButton, ArCard } from '../../ui';

/**
 * Settings → Tasks & meetings: how task and meeting reminders and shares go out beyond the bell. WhatsApp uses the two library
 * templates once Meta approves them; SMS uses the DLT-registered template chosen here.
 */
@Component({
  selector: 'ar-activity-messaging-settings',
  imports: [ArTopbar, ArCard, ArButton, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="Tasks & meetings"
      subtitle="How reminders and shared tasks and meetings go out by WhatsApp and SMS"
      help="Email needs nothing here. WhatsApp to a colleague or customer who has not messaged you in 24 hours needs an approved template; SMS in India needs a DLT-registered template."
    />
    <div class="am ar-scroll">
      <ar-card heading="WhatsApp">
        <div class="am__body">
          <p class="am__hint">
            Add these from Templates › Industrial library and submit them to Meta. Until they are
            approved, WhatsApp only reaches people who messaged your number in the last 24 hours.
          </p>
          <ul class="am__list">
            <li>
              <span class="ar-mono">task_reminder</span>
              <span [class.am__ok]="taskOk()" [class.am__no]="!taskOk()">{{
                taskOk() ? 'Approved' : 'Not approved yet'
              }}</span>
            </li>
            <li>
              <span class="ar-mono">meeting_reminder</span>
              <span [class.am__ok]="meetingOk()" [class.am__no]="!meetingOk()">{{
                meetingOk() ? 'Approved' : 'Not approved yet'
              }}</span>
            </li>
          </ul>
          <p class="am__hint">
            Colleagues are messaged on the mobile number on their user profile (My profile or
            Members & invites).
          </p>
          <a ar-button variant="ghost" routerLink="/templates">Open templates</a>
        </div>
      </ar-card>

      <ar-card heading="SMS">
        <div class="am__body">
          <p class="am__hint">
            Register a reminder template with DLT and add it under Channels › SMS (Exotel or MSG91), then choose it
            here. Its variables are filled in order: the person's name, then the task or meeting
            title, then when it is due or starts, then the link or place.
          </p>
          <label class="ar-field" for="am-sms">
            <span class="ar-field__label">SMS template for reminders and shares</span>
            <select
              id="am-sms"
              class="ar-field__input"
              [disabled]="!canManage()"
              [value]="smsTemplateId()"
              (change)="smsTemplateId.set($any($event.target).value)"
            >
              <option value="">None: no SMS</option>
              @for (t of smsTemplates(); track t.id) {
                <option [value]="t.id" [selected]="t.id === smsTemplateId()">
                  {{ t.name }}{{ t.approved ? '' : ' (not approved)' }}
                </option>
              }
            </select>
          </label>
          @if (!smsTemplates().length) {
            <p class="am__hint">
              No SMS templates yet. Connect Exotel or MSG91 and add one under Channels › SMS.
            </p>
          }
          @if (canManage()) {
            <div class="am__actions">
              <button
                ar-button
                type="button"
                variant="primary"
                [disabled]="busy()"
                (click)="save()"
              >
                {{ busy() ? 'Saving…' : 'Save' }}
              </button>
            </div>
          }
        </div>
      </ar-card>
    </div>
  `,
  styles: `
    .am {
      padding: 20px 24px;
      max-width: 760px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .am__body {
      display: flex;
      flex-direction: column;
      gap: 12px;
      align-items: flex-start;
    }
    .am__body .ar-field {
      align-self: stretch;
    }
    .am__hint {
      margin: 0;
      font: 400 12.5px/1.5 var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .am__list {
      margin: 0;
      padding: 0;
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 6px;
      font: 400 13px var(--ar-font-sans);
    }
    .am__list li {
      display: flex;
      gap: 12px;
    }
    .am__ok {
      color: var(--ar-good-600, #067647);
      font-weight: 600;
    }
    .am__no {
      color: var(--ar-amber-700, #b54708);
    }
    .am__actions {
      align-self: stretch;
      display: flex;
      justify-content: flex-end;
    }
  `,
})
export class ArActivityMessagingSettings {
  private readonly api = inject(ActivityLinkService);
  private readonly sms = inject(SmsChannelService);
  private readonly toasts = inject(ToastService);
  private readonly permissions = inject(PermissionService);

  protected readonly canManage = grantedPolicy('AutoReach.Channels.Manage', this.permissions);
  protected readonly taskOk = signal(false);
  protected readonly meetingOk = signal(false);
  protected readonly smsTemplateId = signal('');
  protected readonly smsTemplates = signal<{ id: string; name: string; approved: boolean }[]>([]);
  protected readonly busy = signal(false);

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      const s = await firstValueFrom(this.api.getMessagingSettings());
      this.taskOk.set(!!s.taskTemplateApproved);
      this.meetingOk.set(!!s.meetingTemplateApproved);
      this.smsTemplateId.set(s.smsTemplateId ?? '');
    } catch (e: unknown) {
      this.toasts.error(readApiError(e, 'The settings could not be loaded.'), 'Tasks & meetings');
    }
    try {
      const templates = await firstValueFrom(this.sms.getTemplates());
      this.smsTemplates.set(
        templates.map((t) => ({
          id: t.id,
          name: t.name,
          approved: t.status === SmsTemplateStatus.Approved,
        })),
      );
    } catch {
      // No SMS channel yet: the empty list says so.
    }
  }

  protected async save(): Promise<void> {
    this.busy.set(true);
    try {
      await firstValueFrom(
        this.api.updateMessagingSettings({ smsTemplateId: this.smsTemplateId() || null }),
      );
      this.toasts.success('Saved.');
    } catch (e: unknown) {
      this.toasts.error(readApiError(e, 'The settings could not be saved.'), 'Tasks & meetings');
    } finally {
      this.busy.set(false);
    }
  }
}
