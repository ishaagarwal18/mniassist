import { Injectable, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom, map } from 'rxjs';
import {
  AutomationDto,
  AutomationService,
  CreateUpdateAutomationNodeDto,
} from '../../proxy/automation';
import { AutomationState, AutomationTriggerKind, FlowState } from '../../proxy/messaging';
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
  [AutomationTriggerKind.AiCallCompleted]: 'AI call completed',
  [AutomationTriggerKind.AiCallNotConnected]: 'AI call not connected',
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

@Injectable({ providedIn: 'root' })
export class WorkflowStore {
  private readonly automationApi = inject(AutomationService);
  private readonly flowApi = inject(FlowService);
  private readonly tick = signal(0);

  private readonly automationsResource = rxResource({
    params: () => ({ tick: this.tick() }),
    stream: () =>
      this.automationApi
        .getList({ skipCount: 0, maxResultCount: 100 })
        .pipe(map((p) => (p.items ?? []).map(automation))),
    defaultValue: [],
  });

  private readonly flowsResource = rxResource({
    params: () => ({ tick: this.tick() }),
    stream: () =>
      this.flowApi
        .getList({ skipCount: 0, maxResultCount: 100 })
        .pipe(map((p) => (p.items ?? []).map(flow))),
    defaultValue: [],
  });

  readonly automations = computed(() => settled(this.automationsResource, []));
  readonly flows = computed(() => settled(this.flowsResource, []));
  readonly loadingAutomations = computed(() => this.automationsResource.isLoading());
  readonly loadingFlows = computed(() => this.flowsResource.isLoading());

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
  async deleteAutomation(id: string): Promise<void> {
    await firstValueFrom(this.automationApi.delete(id));
    this.reload();
  }
  async publishFlow(id: string): Promise<void> {
    await firstValueFrom(this.flowApi.publish(id));
    this.reload();
  }
  async deprecateFlow(id: string): Promise<void> {
    await firstValueFrom(this.flowApi.deprecate(id));
    this.reload();
  }
  async deleteFlow(id: string): Promise<void> {
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
    await firstValueFrom(
      this.flowApi.create({ name: name.trim(), channelId, definitionJson: STARTER_FLOW_JSON }),
    );
    this.reload();
  }

  // ---- Automation builder (M07-2) -------------------------------------

  /** The automation with its full node graph, for the step builder. */
  async loadAutomation(id: string): Promise<AutomationDto> {
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
    await firstValueFrom(this.automationApi.update(id, input));
    this.reload();
  }
}
