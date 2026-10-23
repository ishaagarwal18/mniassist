import { PermissionService } from '@abp/ng.core';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { grantedPolicy } from '../../core/auth/permission';
import { ConfirmService } from '../../core/ui/confirm.service';
import { ToastService } from '../../core/ui/toast.service';
import { TemplateService } from '../../core/services/template.service';
import { ChannelService } from '../../core/services/channel.service';
import {
  Template,
  TemplateCategory,
  TemplateQuality,
  TemplateStatus,
} from '../../core/models/template.model';
import { ArTopbar } from '../../layout/topbar';
import { ArButton, ArChip, ArSearchBox, ArStatTile } from '../../ui';
import { ChipTone } from '../../ui/chip';
import { HostTemplateLibraryDto } from '../../proxy/messaging/models';
import { TemplateComponentKind } from '../../proxy/messaging/template-component-kind.enum';

const STATUS_TONE: Record<TemplateStatus, ChipTone> = {
  draft: 'neutral',
  pending: 'amber',
  approved: 'good',
  rejected: 'bad',
  paused: 'warn',
  disabled: 'bad',
};

const QUALITY_TONE: Record<TemplateQuality, ChipTone> = {
  unknown: 'neutral',
  high: 'good',
  medium: 'amber',
  low: 'bad',
};

/**
 * Template studio (M04). The list, the pre-submission lint summary, and
 * submission to Meta. Authoring itself is the visual composer at
 * `/templates/new` (M04-1) — a form beside a live WhatsApp preview.
 *
 * The screen leads with the two states that cost a tenant money: a template Meta
 * re-categorised (billing follows Meta's category, not the filed one) and a
 * rejection (with the reason, so the fix is obvious rather than another day-long
 * round trip).
 */
@Component({
  selector: 'ar-templates',
  imports: [ArTopbar, ArButton, ArChip, ArSearchBox, ArStatTile],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './templates.html',
  styleUrl: './templates.scss',
})
export class ArTemplates {
  private readonly permissions = inject(PermissionService);
  private readonly dialogs = inject(ConfirmService);
  private readonly toasts = inject(ToastService);
  private readonly store = inject(TemplateService);
  private readonly channelStore = inject(ChannelService);
  protected readonly channels = this.channelStore.channels;
  protected readonly activeChannel = this.channelStore.active;

  protected selectChannel(id: string): void {
    if (this.busy() || !this.channels().some((channel) => channel.id === id)) return;
    this.channelStore.select(id);
    this.notice.set(null);
    this.store.reload();
  }
  private readonly router = inject(Router);

  protected readonly canCreate = grantedPolicy('AutoReach.Templates.Create', this.permissions);
  protected readonly canUpdate = grantedPolicy('AutoReach.Templates.Update', this.permissions);
  protected readonly canDelete = grantedPolicy('AutoReach.Templates.Delete', this.permissions);
  protected readonly canSubmitPolicy = grantedPolicy(
    'AutoReach.Templates.Submit',
    this.permissions,
  );

  protected readonly templates = this.store.templates;
  protected readonly counts = this.store.counts;
  protected readonly loading = this.store.loading;

  /** The languages a template name exists in — a group of more than one is M04-9. */
  protected languagesFor(t: Template): string[] {
    return (this.store.languageGroups().get(t.name) ?? [t.language]).slice().sort();
  }

  protected readonly busy = signal(false);

  protected readonly subtitle = computed(() => {
    const c = this.counts();
    if (c.rejected > 0) return `${c.rejected} rejected — needs a fix`;
    if (c.pending > 0) return `${c.pending} awaiting Meta review`;
    return `${c.total} template${c.total === 1 ? '' : 's'}`;
  });

  protected search(term: string): void {
    this.store.filter.set(term);
  }

  protected newTemplate(): void {
    void this.router.navigate(['/templates/new']);
  }

  protected edit(t: Template): void {
    void this.router.navigate(['/templates', t.id, 'edit']);
  }

  protected async submit(t: Template): Promise<void> {
    this.busy.set(true);
    try {
      await this.store.submit(t.id);
    } finally {
      this.busy.set(false);
    }
  }

  protected readonly notice = signal<string | null>(null);
  protected readonly hostLibraryOpen = signal(false);
  protected readonly hostLibraryBusy = signal(false);
  protected readonly hostTemplates = signal<HostTemplateLibraryDto[]>([]);
  protected readonly hostTemplateTotal = signal(0);
  protected readonly hostFilter = signal('');
  protected readonly hostOffset = signal(0);

  protected async openHostLibrary(offset = 0): Promise<void> {
    if (this.hostLibraryBusy()) return;
    this.hostLibraryOpen.set(true);
    this.hostLibraryBusy.set(true);
    try {
      const page = await this.store.hostLibrary(this.hostFilter(), offset);
      this.hostTemplates.set(page.items);
      this.hostTemplateTotal.set(page.totalCount);
      this.hostOffset.set(offset);
    } finally {
      this.hostLibraryBusy.set(false);
    }
  }

  protected hostPreview(template: HostTemplateLibraryDto): string {
    return template.components.find((c) => c.kind === TemplateComponentKind.Body)?.text ?? '';
  }

  protected async copyHostTemplate(template: HostTemplateLibraryDto): Promise<void> {
    const channel = this.activeChannel();
    if (!channel || this.busy()) return;
    this.busy.set(true);
    try {
      await this.store.copyHostTemplate(template.id, channel.id);
      this.toasts.success(
        `${template.name} copied as a draft. Review it and submit it to Meta for this number.`,
      );
    } finally {
      this.busy.set(false);
    }
  }

  protected async addLibrary(): Promise<void> {
    this.busy.set(true);
    this.notice.set(null);
    try {
      const added = await this.store.addLibraryTemplates();
      this.notice.set(
        added
          ? `${added} library template${added === 1 ? '' : 's'} added as drafts. Review and submit them to Meta.`
          : 'This number already has every library template.',
      );
    } catch {
      this.notice.set('The library templates could not be added.');
    } finally {
      this.busy.set(false);
    }
  }

  /** Sends every draft to Meta in one go, after a confirmation: once submitted, a template can't be edited. */
  protected async submitDrafts(): Promise<void> {
    const drafts = this.counts().draft;
    if (
      !(await this.dialogs.confirm({
        title: `Submit ${drafts} draft${drafts === 1 ? '' : 's'} to Meta?`,
        message:
          'Each goes to Meta for review. A submitted template can no longer be edited (only replaced by a new one), so check the drafts first.',
        confirmText: 'Submit all',
      }))
    )
      return;
    this.busy.set(true);
    this.notice.set(null);
    try {
      const r = await this.store.submitDrafts();
      const sent = `${r.submitted} template${r.submitted === 1 ? '' : 's'} submitted to Meta for review.`;
      if (r.failed.length === 0) {
        this.toasts.success(sent);
      } else {
        this.notice.set(
          `${sent} ${r.failed.length} not submitted: ` +
            r.failed.map((f) => `${f.name} (${f.languageCode}): ${f.reason}`).join(' · '),
        );
      }
    } catch {
      this.notice.set(
        'The drafts could not be submitted. Check the number is still connected, then try again.',
      );
    } finally {
      this.busy.set(false);
    }
  }

  protected async sync(): Promise<void> {
    if (!this.activeChannel()) return;
    this.busy.set(true);
    try {
      await this.store.syncFromMeta();
    } finally {
      this.busy.set(false);
    }
  }

  protected statusTone(s: TemplateStatus): ChipTone {
    return STATUS_TONE[s];
  }

  protected qualityTone(q: TemplateQuality): ChipTone {
    return QUALITY_TONE[q];
  }

  protected categoryLabel(c: TemplateCategory): string {
    return c[0].toUpperCase() + c.slice(1);
  }

  protected canEdit(t: Template): boolean {
    return t.status === 'draft' || t.status === 'rejected';
  }

  protected canSubmit(t: Template): boolean {
    return t.status === 'draft' || t.status === 'rejected';
  }

  protected when(iso?: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  protected async deleteTemplate(t: Template): Promise<void> {
    if (
      !(await this.dialogs.delete(
        'template',
        t.name,
        'This will remove the template draft from MNI Assist.',
      ))
    ) {
      return;
    }
    this.busy.set(true);
    try {
      await this.store.delete(t.id);
      this.toasts.success(`“${t.name}” deleted.`);
    } catch {
      this.toasts.error(`Could not delete “${t.name}”.`);
    } finally {
      this.busy.set(false);
    }
  }
}
