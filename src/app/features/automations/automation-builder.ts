import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { WorkflowStore } from '../../core/services/workflow.service';
import { TemplateService } from '../../core/services/template.service';
import { AutomationNodeDto, CreateUpdateAutomationNodeDto } from '../../proxy/automation';
import { AutomationNodeKind, AutomationTriggerKind } from '../../proxy/messaging';
import { ArTopbar } from '../../layout/topbar';
import { ArButton, ArChip, ArIcon } from '../../ui';
import { IconName } from '../../ui/icon';

interface BuilderStep {
  localId: string;
  kind: AutomationNodeKind;
  config: Record<string, unknown>;
  entered?: number;
  exited?: number;
}

const KIND_META: Record<
  AutomationNodeKind,
  { label: string; icon: IconName; blurb: string; addable: boolean }
> = {
  [AutomationNodeKind.Trigger]: {
    label: 'Trigger',
    icon: 'automation',
    blurb: 'Starts the automation',
    addable: false,
  },
  [AutomationNodeKind.SendSessionMessage]: {
    label: 'Send a message',
    icon: 'send',
    blurb: 'Free-form, inside the window',
    addable: true,
  },
  [AutomationNodeKind.SendTemplate]: {
    label: 'Send a template',
    icon: 'template',
    blurb: 'An approved template',
    addable: true,
  },
  [AutomationNodeKind.Wait]: {
    label: 'Wait',
    icon: 'clock',
    blurb: 'Pause before the next step',
    addable: true,
  },
  [AutomationNodeKind.Condition]: {
    label: 'Only continue if…',
    icon: 'filter',
    blurb: 'Stop unless the contact matches',
    addable: true,
  },
  [AutomationNodeKind.AssignAgent]: {
    label: 'Assign to an agent',
    icon: 'user',
    blurb: 'Hand the conversation over',
    addable: true,
  },
  [AutomationNodeKind.UpdateAttribute]: {
    label: 'Set an attribute',
    icon: 'contacts',
    blurb: 'Tag or update the contact',
    addable: true,
  },
  [AutomationNodeKind.CreateEnquiry]: {
    label: 'Create an enquiry',
    icon: 'enquiry',
    blurb: 'Open a pipeline card',
    addable: true,
  },
  [AutomationNodeKind.Webhook]: {
    label: 'Call a webhook',
    icon: 'link',
    blurb: 'POST to your own system',
    addable: true,
  },
  [AutomationNodeKind.StartFlow]: {
    label: 'Start a flow',
    icon: 'flow',
    blurb: 'Run an in-chat form',
    addable: true,
  },
  [AutomationNodeKind.End]: {
    label: 'End',
    icon: 'check',
    blurb: 'The journey stops',
    addable: false,
  },
};

let counter = 0;
const nextLocalId = () => `s${++counter}`;

/**
 * The automation step builder (M07-2). The graph is drawn as a vertical chain
 * rather than a free canvas: the domain never gives a node more than two outputs, and
 * for a keyword bot or a drip sequence a list reads more clearly than boxes and
 * arrows. A "Only continue if…" step is the one branch — it carries on when the
 * contact matches and ends the journey when they do not.
 */
@Component({
  selector: 'ar-automation-builder',
  imports: [RouterLink, ArTopbar, ArButton, ArChip, ArIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './automation-builder.html',
  styleUrl: './automation-builder.scss',
})
export class ArAutomationBuilder {
  private readonly store = inject(WorkflowStore);
  private readonly templates = inject(TemplateService);
  private readonly route = inject(ActivatedRoute);

  protected readonly TK = AutomationTriggerKind;
  protected readonly NK = AutomationNodeKind;
  protected readonly kindMeta = KIND_META;
  protected readonly addableKinds = Object.entries(KIND_META)
    .filter(([, m]) => m.addable)
    .map(([k, m]) => ({ kind: Number(k) as AutomationNodeKind, ...m }));

  protected readonly templateOptions = computed(() =>
    this.templates.all().map((t) => ({ id: t.id, name: t.name })),
  );
  protected readonly flowOptions = computed(() =>
    this.store.flows().map((f) => ({ id: f.id, name: f.name })),
  );

  protected readonly automationId = signal('');
  protected readonly name = signal('');
  protected readonly channelId = signal('');
  protected readonly trigger = signal<AutomationTriggerKind>(AutomationTriggerKind.InboundKeyword);
  protected readonly keywords = signal('');
  protected readonly steps = signal<BuilderStep[]>([]);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly addingAfter = signal<number | null>(null);

  constructor() {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.automationId.set(id);
    void this.load(id);
  }

  private async load(id: string): Promise<void> {
    this.loading.set(true);
    try {
      const dto = await this.store.loadAutomation(id);
      this.name.set(dto.name ?? '');
      this.channelId.set(dto.channelId ?? '');
      this.trigger.set(dto.trigger ?? AutomationTriggerKind.InboundKeyword);
      try {
        const tc = JSON.parse(dto.triggerConfigJson || '{}') as { keywords?: string[] };
        this.keywords.set((tc.keywords ?? []).join(', '));
      } catch {
        this.keywords.set('');
      }
      this.steps.set(this.chainToSteps(dto.nodes ?? []));
    } finally {
      this.loading.set(false);
    }
  }

  /** Follows nextNodeId / trueNodeId from the trigger into a flat list. */
  private chainToSteps(nodes: AutomationNodeDto[]): BuilderStep[] {
    const byId = new Map(nodes.map((n) => [n.id!, n]));
    const trigger = nodes.find((n) => n.kind === AutomationNodeKind.Trigger);
    const out: BuilderStep[] = [];
    const seen = new Set<string>();
    let cursor = trigger?.nextNodeId ?? null;

    while (cursor && byId.has(cursor) && !seen.has(cursor)) {
      seen.add(cursor);
      const node = byId.get(cursor)!;
      if (node.kind === AutomationNodeKind.End) break;
      out.push({
        localId: nextLocalId(),
        kind: node.kind ?? AutomationNodeKind.SendSessionMessage,
        config: this.parse(node.configJson),
        entered: node.enteredCount,
        exited: node.exitedCount,
      });
      cursor =
        node.kind === AutomationNodeKind.Condition
          ? (node.trueNodeId ?? null)
          : (node.nextNodeId ?? null);
    }
    return out;
  }

  private parse(json: string | null | undefined): Record<string, unknown> {
    try {
      return json ? (JSON.parse(json) as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }

  // ---- Step editing ---------------------------------------------------

  protected cfg(step: BuilderStep, key: string): string {
    const v = step.config[key];
    return v == null ? '' : String(v);
  }

  protected setCfg(index: number, key: string, value: string): void {
    this.steps.update((list) =>
      list.map((s, i) => (i === index ? { ...s, config: { ...s.config, [key]: value } } : s)),
    );
  }

  protected addStep(kind: AutomationNodeKind): void {
    const at = this.addingAfter();
    const step: BuilderStep = { localId: nextLocalId(), kind, config: this.defaultConfig(kind) };
    this.steps.update((list) => {
      const copy = [...list];
      copy.splice(at == null ? copy.length : at + 1, 0, step);
      return copy;
    });
    this.addingAfter.set(null);
  }

  private defaultConfig(kind: AutomationNodeKind): Record<string, unknown> {
    switch (kind) {
      case AutomationNodeKind.Wait:
        return { minutes: 30 };
      case AutomationNodeKind.Condition:
        return { field: 'lastInboundDays', op: 'lte', value: '1' };
      case AutomationNodeKind.AssignAgent:
        return { strategy: 'roundRobin' };
      case AutomationNodeKind.Webhook:
        return { url: '', method: 'POST' };
      case AutomationNodeKind.CreateEnquiry:
        return { source: 'ClickToWhatsApp', title: '' };
      default:
        return {};
    }
  }

  protected remove(index: number): void {
    this.steps.update((list) => list.filter((_, i) => i !== index));
  }

  protected move(index: number, delta: number): void {
    this.steps.update((list) => {
      const to = index + delta;
      if (to < 0 || to >= list.length) return list;
      const copy = [...list];
      [copy[index], copy[to]] = [copy[to], copy[index]];
      return copy;
    });
  }

  // ---- Save ---------------------------------------------------------

  protected async save(): Promise<void> {
    this.saving.set(true);
    this.error.set(null);
    try {
      const nodes = this.buildNodes();
      await this.store.saveAutomation(this.automationId(), {
        name: this.name().trim(),
        channelId: this.channelId(),
        trigger: this.trigger(),
        triggerConfigJson: this.triggerConfigJson(),
        nodes,
      });
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'The automation could not be saved.');
    } finally {
      this.saving.set(false);
    }
  }

  private triggerConfigJson(): string {
    if (this.trigger() === AutomationTriggerKind.InboundKeyword) {
      const kw = this.keywords()
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);
      return JSON.stringify({ keywords: kw });
    }
    return '{}';
  }

  private uuid(): string {
    return crypto.randomUUID();
  }

  /** Flattens the step list back into Trigger → … → End with real ids and links. */
  private buildNodes(): CreateUpdateAutomationNodeDto[] {
    const triggerId = this.uuid();
    const endId = this.uuid();
    const ids = this.steps().map(() => this.uuid());

    const nodes: CreateUpdateAutomationNodeDto[] = [
      {
        id: triggerId,
        kind: AutomationNodeKind.Trigger,
        configJson: '{}',
        nextNodeId: ids[0] ?? endId,
        positionX: 0,
        positionY: 0,
      },
    ];

    this.steps().forEach((step, i) => {
      const next = ids[i + 1] ?? endId;
      const base: CreateUpdateAutomationNodeDto = {
        id: ids[i],
        kind: step.kind,
        configJson: JSON.stringify(step.config),
        positionX: 0,
        positionY: (i + 1) * 120,
      };
      if (step.kind === AutomationNodeKind.Condition) {
        base.trueNodeId = next;
        base.falseNodeId = endId;
      } else {
        base.nextNodeId = next;
      }
      nodes.push(base);
    });

    nodes.push({
      id: endId,
      kind: AutomationNodeKind.End,
      configJson: '{}',
      positionX: 0,
      positionY: (this.steps().length + 1) * 120,
    });
    return nodes;
  }

  protected label(kind: AutomationNodeKind): string {
    return KIND_META[kind].label;
  }
}
