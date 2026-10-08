import { Injectable, computed, inject, signal } from '@angular/core';
import { ConfigStateService, PermissionService } from '@abp/ng.core';
import { firstValueFrom } from 'rxjs';

import { checkPolicy } from '../../core/auth/permission';
import { PipelineStore } from '../../core/services/pipeline.service';
import { environment } from '../../../environments/environment';
import { ActivityUserDto } from '../../proxy/activities';
import { ActivityGateway, MOCK_ME } from './activity-mock';

/**
 * What tasks and meetings share: who can be picked, who "I" am, what I am allowed to do, and the open enquiries a task or meeting
 * can be about.
 */
@Injectable({ providedIn: 'root' })
export class ActivityDirectory {
  private readonly api = inject(ActivityGateway).directory;
  private readonly config = inject(ConfigStateService);
  private readonly permissions = inject(PermissionService);
  private readonly pipeline = inject(PipelineStore);

  readonly users = signal<ActivityUserDto[]>([]);
  private loaded = false;

  /** The signed-in user's id, as the server knows them. Undefined until the session has loaded. */
  get meId(): string | undefined {
    if (environment.useMockData) return MOCK_ME;
    return (this.config.getDeep('currentUser.id') as string | undefined) ?? undefined;
  }

  /** May see everyone's tasks and meetings, not just their own. */
  get canSeeAll(): boolean {
    return checkPolicy('AutoReach.Activities.ViewAll', this.permissions);
  }

  get canDelete(): boolean {
    return checkPolicy('AutoReach.Activities.Delete', this.permissions);
  }

  get canCreate(): boolean {
    return checkPolicy('AutoReach.Activities.Create', this.permissions);
  }

  get canUpdate(): boolean {
    return checkPolicy('AutoReach.Activities.Update', this.permissions);
  }

  readonly enquiryOptions = computed(() => this.pipeline.openEnquiryOptions());

  nameOf(userId: string | null | undefined): string {
    return this.users().find((u) => u.userId === userId)?.name ?? 'Someone';
  }

  async load(): Promise<void> {
    if (this.loaded) return;
    try {
      this.users.set(await firstValueFrom(this.api.getUsers()));
      this.loaded = true;
    } catch {
      // Pickers stay empty; the pages still work with what is already on them.
    }
  }
}
