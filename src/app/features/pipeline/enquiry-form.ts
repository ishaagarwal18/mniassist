import { PermissionService } from '@abp/ng.core';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { grantedPolicy } from '../../core/auth/permission';
import { PickerOption, PipelineStore } from '../../core/services/pipeline.service';
import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import { ArTopbar } from '../../layout/topbar';
import { LeadSource } from '../../proxy/pipeline';
import { ArBanner } from '../../ui/banner';
import { ArButton } from '../../ui/button';
import { ArCard } from '../../ui/card';
import { ArContactPicker } from './contact-picker';
import { ProjectOptionDto, ProjectService } from '../../proxy/projects/project.service';
import { environment } from '../../../environments/environment';
import {
  BLANK_ENQUIRY_DRAFT,
  EnquiryDraft,
  LEAD_SOURCES,
  parseEstimatedValueInPaise,
  validateEnquiryDraft,
} from './enquiry-form.logic';

@Component({
  selector: 'ar-enquiry-form',
  imports: [ArTopbar, ArButton, ArCard, ArBanner, ArContactPicker],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './enquiry-form.html',
  styleUrl: './enquiry-form.scss',
})
export class ArEnquiryForm implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly permissions = inject(PermissionService);
  private readonly toasts = inject(ToastService);
  private readonly pipelineStore = inject(PipelineStore);

  protected readonly canCreate = grantedPolicy('AutoReach.Enquiries.Create', this.permissions);

  protected readonly pipelines = this.pipelineStore.pipelines;
  protected readonly currentPipeline = this.pipelineStore.currentPipeline;
  protected readonly sources = LEAD_SOURCES;

  protected readonly contact = signal<PickerOption | null>(null);
  protected readonly draft = signal<EnquiryDraft>({ ...BLANK_ENQUIRY_DRAFT });
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  private readonly projectsApi = inject(ProjectService);
  protected readonly canSeeProjects = grantedPolicy('AutoReach.Projects', this.permissions);
  protected readonly projects = signal<ProjectOptionDto[]>([]);
  protected readonly projectId = signal('');

  protected readonly selectedPipeline = computed(() => {
    const id = this.draft().pipelineId;
    return this.pipelines().find((p) => p.id === id) ?? this.currentPipeline();
  });

  ngOnInit(): void {
    const queryPipe = this.route.snapshot.queryParamMap.get('pipelineId');
    const activePipeId =
      queryPipe || this.pipelineStore.pipelineId() || this.pipelines()[0]?.id || '';

    const project = this.route.snapshot.queryParamMap.get('project');
    this.draft.update((d) => ({
      ...d,
      pipelineId: activePipeId,
      source: project ? LeadSource.Project : LeadSource.Manual,
    }));
    if (project) this.projectId.set(project);
    if (this.canSeeProjects() && !environment.useMockData) {
      this.projectsApi
        .search(null)
        .subscribe({ next: (list) => this.projects.set(list), error: () => undefined });
    }
  }

  protected onContactPicked(option: PickerOption | null): void {
    this.contact.set(option);
    this.draft.update((d) => ({
      ...d,
      contactId: option?.id ?? '',
      contactLabel: option?.label ?? '',
    }));
    this.error.set(null);
  }

  protected patch<K extends keyof EnquiryDraft>(key: K, value: EnquiryDraft[K]): void {
    this.draft.update((d) => ({ ...d, [key]: value }));
    this.error.set(null);
  }

  protected patchSource(val: string): void {
    this.patch('source', Number(val) as LeadSource);
  }

  protected cancel(): void {
    void this.router.navigate(['/enquiries']);
  }

  protected async save(): Promise<void> {
    const currentDraft = this.draft();
    const validationError = validateEnquiryDraft(currentDraft);

    if (validationError) {
      this.error.set(validationError);
      this.toasts.warning(validationError, 'Enquiry');
      return;
    }

    this.busy.set(true);
    this.error.set(null);
    try {
      const estimatedValueInPaise = parseEstimatedValueInPaise(currentDraft.valueRupees);

      await this.pipelineStore.createEnquiry({
        contactId: currentDraft.contactId,
        pipelineId: currentDraft.pipelineId || undefined,
        source: currentDraft.source,
        title: currentDraft.title.trim(),
        requirement: currentDraft.requirement.trim() || undefined,
        estimatedValueInPaise,
        ...(this.projectId() ? { projectId: this.projectId() } : {}),
      });

      this.toasts.success(`Enquiry “${currentDraft.title.trim()}” created successfully.`);
      void this.router.navigate(['/enquiries']);
    } catch (e: unknown) {
      const msg = readApiError(e, 'The enquiry could not be created.');
      this.error.set(msg);
      this.toasts.error(msg, 'Enquiry');
    } finally {
      this.busy.set(false);
    }
  }
}
