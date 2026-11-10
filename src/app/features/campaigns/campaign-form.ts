import { PermissionService } from '@abp/ng.core';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { grantedPolicy } from '../../core/auth/permission';
import { CampaignStore } from '../../core/services/campaign.service';
import { ChannelService } from '../../core/services/channel.service';
import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import { ArTopbar } from '../../layout/topbar';
import type { TemplateDto } from '../../proxy/messaging/models';
import { TemplateStatus } from '../../proxy/messaging/template-status.enum';
import { TemplateService as TemplateApi } from '../../proxy/messaging/template.service';
import { ArBanner } from '../../ui/banner';
import { ArButton } from '../../ui/button';
import { ArCard } from '../../ui/card';
import { ArChip } from '../../ui/chip';
import { ArIcon } from '../../ui/icon';
import { BLANK_CAMPAIGN_DRAFT, CampaignDraft, validateCampaignDraft } from './campaign-form.logic';

@Component({
  selector: 'ar-campaign-form',
  imports: [ArTopbar, ArButton, ArCard, ArBanner, ArIcon, ArChip, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './campaign-form.html',
  styleUrl: './campaign-form.scss',
})
export class ArCampaignForm implements OnInit {
  private readonly router = inject(Router);
  private readonly permissions = inject(PermissionService);
  private readonly toasts = inject(ToastService);
  private readonly store = inject(CampaignStore);
  private readonly channelService = inject(ChannelService);
  private readonly templateApi = inject(TemplateApi);

  protected readonly canCreate = grantedPolicy('AutoReach.Campaigns.Create', this.permissions);

  protected readonly channels = this.channelService.channels;
  protected readonly approvedTemplates = signal<TemplateDto[]>([]);
  protected readonly templatesLoading = signal(false);

  protected readonly draft = signal<CampaignDraft>({ ...BLANK_CAMPAIGN_DRAFT });
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly selectedTemplate = computed<TemplateDto | undefined>(() =>
    this.approvedTemplates().find((t) => t.id === this.draft().templateId),
  );

  protected readonly selectedChannel = computed(() =>
    this.channels().find((c) => c.id === this.draft().channelId),
  );

  async ngOnInit(): Promise<void> {
    const list = this.channels();
    if (list.length > 0) {
      const firstId = list[0].id;
      this.draft.update((d) => ({ ...d, channelId: firstId }));
      await this.loadTemplates(firstId);
    }
  }

  protected async chooseChannel(channelId: string): Promise<void> {
    this.draft.update((d) => ({ ...d, channelId, templateId: '' }));
    this.error.set(null);
    await this.loadTemplates(channelId);
  }

  protected patch(key: keyof CampaignDraft, value: string): void {
    this.draft.update((d) => ({ ...d, [key]: value }));
    this.error.set(null);
  }

  private async loadTemplates(channelId: string): Promise<void> {
    this.approvedTemplates.set([]);
    if (!channelId) return;

    this.templatesLoading.set(true);
    try {
      const page = await firstValueFrom(
        this.templateApi.getList({
          channelId,
          status: TemplateStatus.Approved,
          maxResultCount: 200,
          skipCount: 0,
        }),
      );

      if (channelId !== this.draft().channelId) return; // channel changed meanwhile

      const list = [...(page.items ?? [])].sort((a, b) =>
        (a.name ?? '').localeCompare(b.name ?? ''),
      );
      this.approvedTemplates.set(list);
      if (list.length > 0 && !this.draft().templateId) {
        this.draft.update((d) => ({ ...d, templateId: list[0]?.id ?? '' }));
      }
    } catch (e: unknown) {
      this.error.set(readApiError(e, 'The approved templates could not be loaded.'));
    } finally {
      this.templatesLoading.set(false);
    }
  }

  protected cancel(): void {
    void this.router.navigate(['/campaigns']);
  }

  protected async save(): Promise<void> {
    const currentDraft = this.draft();
    const hasTemplates = this.approvedTemplates().length > 0;
    const validationError = validateCampaignDraft(currentDraft, hasTemplates);

    if (validationError) {
      this.error.set(validationError);
      this.toasts.warning(validationError, 'Campaign');
      return;
    }

    this.busy.set(true);
    this.error.set(null);
    try {
      const id = await this.store.create(
        currentDraft.name,
        currentDraft.channelId,
        currentDraft.templateId,
      );
      this.toasts.success(`Campaign “${currentDraft.name.trim()}” created as draft.`);
      void this.router.navigate(['/campaigns'], { queryParams: { open: id } });
    } catch (e: unknown) {
      const msg = readApiError(e, 'The campaign could not be created.');
      this.error.set(msg);
      this.toasts.error(msg, 'Campaign');
    } finally {
      this.busy.set(false);
    }
  }
}
