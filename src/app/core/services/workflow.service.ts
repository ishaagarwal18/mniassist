import { Injectable, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AutomationDto,
  AutomationService,
  AutomationState,
  AutomationTriggerKind,
} from '../../proxy/automation';
import { FlowDto, FlowService, FlowState } from '../../proxy/flows';

export type WState = 'draft' | 'active' | 'paused';
export type FState = 'draft' | 'published' | 'deprecated' | 'blocked';

export interface Automation {
  id: string;
  name: string;
  description?: string;
  trigger: string;
  state: WState;
  enrolled: number;
  completed: number;
  completionRate: number;
  steps: number;
  lastRunAt?: string;
}
export interface Flow {
  id: string;
  name: string;
  state: FState;
  version: number;
  screens: number;
  publishedAt?: string;
  blockReason?: string;
  hasEndpoint: boolean;
}

const TRIGGER: Record<AutomationTriggerKind, string> = {
  [AutomationTriggerKind.InboundKeyword]: 'Keyword',
  [AutomationTriggerKind.ButtonReply]: 'Button reply',
  [AutomationTriggerKind.ContactCreated]: 'Contact created',
  [AutomationTriggerKind.AttributeChanged]: 'Attribute changed',
  [AutomationTriggerKind.EnquiryStageChanged]: 'Enquiry stage',
  [AutomationTriggerKind.ScheduledDate]: 'Scheduled date',
  [AutomationTriggerKind.FlowSubmitted]: 'Flow submitted',
};
const WSTATE: Record<AutomationState, WState> = {
  [AutomationState.Draft]: 'draft',
  [AutomationState.Active]: 'active',
  [AutomationState.Paused]: 'paused',
};
const FSTATE: Record<FlowState, FState> = {
  [FlowState.Draft]: 'draft',
  [FlowState.Published]: 'published',
  [FlowState.Deprecated]: 'deprecated',
  [FlowState.Blocked]: 'blocked',
};

function automation(a: AutomationDto): Automation {
  return {
    id: a.id!,
    name: a.name,
    description: a.description,
    trigger: TRIGGER[a.trigger],
    state: WSTATE[a.state],
    enrolled: a.enrolledCount,
    completed: a.completedCount,
    completionRate: a.completionRate,
    steps: (a.nodes ?? []).length,
    lastRunAt: a.lastRunAtUtc,
  };
}
function flow(f: FlowDto): Flow {
  return {
    id: f.id!,
    name: f.name,
    state: FSTATE[f.state],
    version: f.version,
    screens: (f.screens ?? []).length,
    publishedAt: f.publishedAtUtc,
    blockReason: f.blockReason,
    hasEndpoint: !!f.dataEndpointUrl,
  };
}

const SEED_AUTOMATIONS: Automation[] = [
  {
    id: 'w-1',
    name: 'AMC renewal cadence',
    trigger: 'Scheduled date',
    state: 'active',
    enrolled: 1_340,
    completed: 812,
    completionRate: 0.606,
    steps: 6,
    lastRunAt: '2026-09-05T09:12:00Z',
  },
  {
    id: 'w-2',
    name: 'Quotation follow-up',
    trigger: 'Enquiry stage',
    state: 'active',
    enrolled: 284,
    completed: 96,
    completionRate: 0.338,
    steps: 8,
    lastRunAt: '2026-09-05T08:40:00Z',
  },
  {
    id: 'w-3',
    name: 'Datasheet keyword bot',
    trigger: 'Keyword',
    state: 'active',
    enrolled: 5_210,
    completed: 4_980,
    completionRate: 0.956,
    steps: 4,
    lastRunAt: '2026-09-05T10:55:00Z',
  },
  {
    id: 'w-4',
    name: 'Exhibition qualification',
    trigger: 'Flow submitted',
    state: 'paused',
    enrolled: 612,
    completed: 410,
    completionRate: 0.67,
    steps: 7,
  },
];
const SEED_FLOWS: Flow[] = [
  {
    id: 'f-1',
    name: 'RFQ intake',
    state: 'published',
    version: 3,
    screens: 4,
    publishedAt: '2026-07-20',
    hasEndpoint: true,
  },
  {
    id: 'f-2',
    name: 'Site-visit booking',
    state: 'published',
    version: 1,
    screens: 3,
    publishedAt: '2026-08-02',
    hasEndpoint: true,
  },
  { id: 'f-3', name: 'Service ticket', state: 'draft', version: 1, screens: 5, hasEndpoint: true },
  {
    id: 'f-4',
    name: 'Feedback',
    state: 'deprecated',
    version: 2,
    screens: 2,
    publishedAt: '2026-05-11',
    hasEndpoint: false,
  },
];

@Injectable({ providedIn: 'root' })
export class WorkflowStore {
  private readonly automationApi = inject(AutomationService);
  private readonly flowApi = inject(FlowService);
  private readonly tick = signal(0);

  private readonly automationsResource = rxResource({
    params: () => (environment.useMockData ? undefined : { tick: this.tick() }),
    stream: () =>
      this.automationApi
        .getList({ skipCount: 0, maxResultCount: 100 })
        .pipe(map((p) => (p.items ?? []).map(automation))),
    defaultValue: SEED_AUTOMATIONS,
  });

  private readonly flowsResource = rxResource({
    params: () => (environment.useMockData ? undefined : { tick: this.tick() }),
    stream: () =>
      this.flowApi
        .getList({ skipCount: 0, maxResultCount: 100 })
        .pipe(map((p) => (p.items ?? []).map(flow))),
    defaultValue: SEED_FLOWS,
  });

  readonly automations = computed(() =>
    environment.useMockData ? SEED_AUTOMATIONS : this.automationsResource.value(),
  );
  readonly flows = computed(() =>
    environment.useMockData ? SEED_FLOWS : this.flowsResource.value(),
  );
  readonly loadingAutomations = computed(
    () => !environment.useMockData && this.automationsResource.isLoading(),
  );
  readonly loadingFlows = computed(
    () => !environment.useMockData && this.flowsResource.isLoading(),
  );

  private reload(): void {
    this.tick.update((n) => n + 1);
  }

  async setAutomationActive(id: string, active: boolean): Promise<void> {
    await firstValueFrom(active ? this.automationApi.activate(id) : this.automationApi.pause(id));
    this.reload();
  }
  async simulate(id: string, contactId: string): Promise<string[]> {
    return firstValueFrom(this.automationApi.simulate(id, contactId));
  }
  async publishFlow(id: string): Promise<void> {
    await firstValueFrom(this.flowApi.publish(id));
    this.reload();
  }
  async deprecateFlow(id: string): Promise<void> {
    await firstValueFrom(this.flowApi.deprecate(id));
    this.reload();
  }
}
