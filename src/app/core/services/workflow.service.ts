import { Injectable, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AutomationDto,
  AutomationNodeDto,
  AutomationService,
  CreateUpdateAutomationNodeDto,
} from '../../proxy/automation';
import {
  AutomationNodeKind,
  AutomationState,
  AutomationTriggerKind,
  FlowState,
} from '../../proxy/messaging';
import { FlowDto, FlowService } from '../../proxy/flows';
import { settled } from '../util/resource';

/** A one-screen placeholder so a freshly created flow is valid JSON; the screen
 *  designer fills in the rest. */
const STARTER_FLOW_JSON = JSON.stringify({
  version: '7.0',
  screens: [
    {
      id: 'WELCOME',
      title: 'Untitled screen',
      terminal: true,
      layout: { type: 'SingleColumnLayout', children: [] },
    },
  ],
});

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
  [AutomationTriggerKind.FlowCompleted]: 'Flow completed',
  [AutomationTriggerKind.CampaignReply]: 'Campaign reply',
  [AutomationTriggerKind.SegmentEntered]: 'Segment entered',
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
    name: a.name ?? '(untitled)',
    description: a.description ?? undefined,
    trigger: a.trigger != null ? (TRIGGER[a.trigger] ?? '—') : '—',
    state: a.state != null ? (WSTATE[a.state] ?? 'draft') : 'draft',
    enrolled: a.enrolledCount ?? 0,
    completed: a.completedCount ?? 0,
    completionRate: a.completionRate ?? 0,
    steps: (a.nodes ?? []).length,
    lastRunAt: a.lastRunAtUtc ?? undefined,
  };
}
function flow(f: FlowDto): Flow {
  return {
    id: f.id!,
    name: f.name ?? '(untitled)',
    state: f.state != null ? (FSTATE[f.state] ?? 'draft') : 'draft',
    version: f.version ?? 1,
    screens: (f.screens ?? []).length,
    publishedAt: f.publishedAtUtc ?? undefined,
    blockReason: f.blockReason ?? undefined,
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
    defaultValue: [],
  });

  private readonly flowsResource = rxResource({
    params: () => (environment.useMockData ? undefined : { tick: this.tick() }),
    stream: () =>
      this.flowApi
        .getList({ skipCount: 0, maxResultCount: 100 })
        .pipe(map((p) => (p.items ?? []).map(flow))),
    defaultValue: [],
  });

  private readonly mockAutomations = signal<Automation[]>([...SEED_AUTOMATIONS]);
  private readonly mockFlows = signal<Flow[]>([...SEED_FLOWS]);

  readonly automations = computed(() =>
    environment.useMockData ? this.mockAutomations() : settled(this.automationsResource, []),
  );
  readonly flows = computed(() =>
    environment.useMockData ? this.mockFlows() : settled(this.flowsResource, []),
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
    if (environment.useMockData) {
      this.mockAutomations.update((list) =>
        list.map((a) => (a.id === id ? { ...a, state: active ? 'active' : 'paused' } : a)),
      );
      return;
    }
    await firstValueFrom(active ? this.automationApi.activate(id) : this.automationApi.pause(id));
    this.reload();
  }
  async simulate(id: string, contactId: string): Promise<string[]> {
    return firstValueFrom(this.automationApi.simulate(id, contactId));
  }
  async deleteAutomation(id: string): Promise<void> {
    if (environment.useMockData) {
      this.mockAutomations.update((list) => list.filter((a) => a.id !== id));
      return;
    }
    await firstValueFrom(this.automationApi.delete(id));
    this.reload();
  }
  async publishFlow(id: string): Promise<void> {
    if (environment.useMockData) {
      this.mockFlows.update((list) =>
        list.map((f) =>
          f.id === id ? { ...f, state: 'published', publishedAt: new Date().toISOString() } : f,
        ),
      );
      return;
    }
    await firstValueFrom(this.flowApi.publish(id));
    this.reload();
  }
  async deprecateFlow(id: string): Promise<void> {
    if (environment.useMockData) {
      this.mockFlows.update((list) =>
        list.map((f) => (f.id === id ? { ...f, state: 'deprecated' } : f)),
      );
      return;
    }
    await firstValueFrom(this.flowApi.deprecate(id));
    this.reload();
  }
  async deleteFlow(id: string): Promise<void> {
    if (environment.useMockData) {
      this.mockFlows.update((list) => list.filter((f) => f.id !== id));
      return;
    }
    await firstValueFrom(this.flowApi.delete(id));
    this.reload();
  }

  /** Creates a draft automation. The trigger config and nodes are set in the editor. */
  async createAutomation(
    name: string,
    channelId: string,
    trigger: AutomationTriggerKind,
    keyword?: string,
    /** Trigger config for triggers that need one, such as the stage an enquiry must reach. */
    triggerConfig?: object,
  ): Promise<void> {
    if (environment.useMockData) {
      this.mockAutomations.update((list) => [
        {
          id: 'w-' + Date.now(),
          name: name.trim(),
          trigger: TRIGGER[trigger] ?? 'Keyword',
          state: 'paused',
          enrolled: 0,
          completed: 0,
          completionRate: 0,
          steps: 1,
        },
        ...list,
      ]);
      return;
    }
    const triggerConfigJson =
      trigger === AutomationTriggerKind.InboundKeyword && keyword
        ? JSON.stringify({ keywords: [keyword.trim()] })
        : triggerConfig
          ? JSON.stringify(triggerConfig)
          : '{}';
    await firstValueFrom(
      this.automationApi.create({ name: name.trim(), channelId, trigger, triggerConfigJson }),
    );
    this.reload();
  }

  /** Creates a draft flow with a single empty screen. */
  async createFlow(name: string, channelId: string): Promise<void> {
    if (environment.useMockData) {
      this.mockFlows.update((list) => [
        {
          id: 'f-' + Date.now(),
          name: name.trim(),
          state: 'draft',
          version: 1,
          screens: 1,
          hasEndpoint: false,
        },
        ...list,
      ]);
      return;
    }
    await firstValueFrom(
      this.flowApi.create({ name: name.trim(), channelId, definitionJson: STARTER_FLOW_JSON }),
    );
    this.reload();
  }

  // ---- Automation builder (M07-2) -------------------------------------

  /** The automation with its full node graph, for the step builder. */
  async loadAutomation(id: string): Promise<AutomationDto> {
    if (environment.useMockData) {
      return {
        id,
        name: 'Keyword bot — PRICE',
        channelId: 'ch-1',
        trigger: AutomationTriggerKind.InboundKeyword,
        triggerConfigJson: JSON.stringify({ keywords: ['PRICE', 'RATE'] }),
        state: AutomationState.Draft,
        nodes: SEED_NODES,
      } as AutomationDto;
    }
    return firstValueFrom(this.automationApi.get(id));
  }

  /** Persists the trigger config and the node graph the builder produced. */
  async saveAutomation(
    id: string,
    input: {
      name: string;
      channelId: string;
      trigger: AutomationTriggerKind;
      triggerConfigJson: string;
      nodes: CreateUpdateAutomationNodeDto[];
    },
  ): Promise<void> {
    if (environment.useMockData) return;
    await firstValueFrom(this.automationApi.update(id, input));
    this.reload();
  }
}

const SEED_NODES: AutomationNodeDto[] = [
  {
    id: 'n-trigger',
    kind: AutomationNodeKind.Trigger,
    configJson: '{}',
    nextNodeId: 'n-msg',
    enteredCount: 120,
    exitedCount: 120,
  },
  {
    id: 'n-msg',
    kind: AutomationNodeKind.SendSessionMessage,
    configJson: JSON.stringify({
      text: 'Thanks for your interest! Which product line — VFDs, PLCs or servos?',
    }),
    nextNodeId: 'n-wait',
    enteredCount: 120,
    exitedCount: 118,
  },
  {
    id: 'n-wait',
    kind: AutomationNodeKind.Wait,
    configJson: JSON.stringify({ minutes: 30 }),
    nextNodeId: 'n-cond',
    enteredCount: 118,
    exitedCount: 118,
  },
  {
    id: 'n-cond',
    kind: AutomationNodeKind.Condition,
    configJson: JSON.stringify({ field: 'lastInboundDays', op: 'lte', value: '1' }),
    trueNodeId: 'n-enq',
    falseNodeId: 'n-end',
    enteredCount: 118,
    exitedCount: 96,
  },
  {
    id: 'n-enq',
    kind: AutomationNodeKind.CreateEnquiry,
    configJson: JSON.stringify({ source: 'ClickToWhatsApp', title: 'Inbound price enquiry' }),
    nextNodeId: 'n-assign',
    enteredCount: 96,
    exitedCount: 96,
  },
  {
    id: 'n-assign',
    kind: AutomationNodeKind.AssignAgent,
    configJson: JSON.stringify({ strategy: 'roundRobin' }),
    nextNodeId: 'n-end',
    enteredCount: 96,
    exitedCount: 96,
  },
  {
    id: 'n-end',
    kind: AutomationNodeKind.End,
    configJson: '{}',
    enteredCount: 118,
    exitedCount: 0,
  },
];
