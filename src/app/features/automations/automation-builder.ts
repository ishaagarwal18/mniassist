import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import {
  BuilderStep,
  GraphAnchors,
  anchorsOf,
  appendStep,
  graphToSteps,
  isBranching,
  moveStep,
  nextLocalId,
  removeStep,
  setRejoin as setRejoinIn,
  stepsToGraph,
  updateStep,
} from '../../core/models/automation-graph';
import {
  CanvasNode,
  Port,
  connect,
  connectProblem,
  disconnect,
  fromDtos,
  isFixed,
  linkOf,
  needsLayout,
  placeNew,
  portsOf,
  removeNode,
  restoreStructure,
  tidy,
  toDtos,
  toNodeDtos,
  unreachable,
} from '../../core/models/automation-canvas';
import { layoutFlowMap } from '../../core/models/automation-flow-map';
import { ArAutomationCanvas, CanvasCard, PaletteItem } from './automation-canvas';
import { OpsService } from '../../core/services/ops.service';
import { PipelineStore } from '../../core/services/pipeline.service';
import { TemplateService } from '../../core/services/template.service';
import { WorkflowStore } from '../../core/services/workflow.service';
import { WorkspaceStore } from '../../core/services/workspace.store';
import { AutomationNodeKind, AutomationTriggerKind } from '../../proxy/messaging';
import { ArTopbar } from '../../layout/topbar';
import { ArButton, ArChip, ArIcon } from '../../ui';
import { IconName } from '../../ui/icon';

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
    label: 'If…',
    icon: 'filter',
    blurb: 'Branch on the contact',
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
    blurb: 'Notify one of your endpoints',
    addable: true,
  },
  // The engine has no handler for this kind yet — it just moves on — so it is not offered.
  // An existing one is still shown, with a warning, so it is not silently dropped.
  [AutomationNodeKind.StartFlow]: {
    label: 'Start a flow',
    icon: 'flow',
    blurb: 'Run an in-chat form',
    addable: false,
  },
  [AutomationNodeKind.WaitForReply]: {
    label: 'Wait for a reply',
    icon: 'clock',
    blurb: 'Branch on whether they respond',
    addable: true,
  },
  [AutomationNodeKind.End]: {
    label: 'End',
    icon: 'check',
    blurb: 'The journey stops',
    addable: false,
  },
};

/** The fields AutomationEngine.ResolveField can read — anything else evaluates to nothing. */
const CONDITION_FIELDS: { value: string; label: string }[] = [
  { value: 'contact.name', label: 'Name' },
  { value: 'contact.company', label: 'Company' },
  { value: 'contact.city', label: 'City' },
  { value: 'contact.state', label: 'State' },
  { value: 'contact.role', label: 'Role' },
  { value: 'contact.language', label: 'Language' },
  { value: 'contact.consentScope', label: 'Consent' },
  { value: 'contact.suppression', label: 'Suppression' },
];
const CUSTOM_ATTRIBUTE = 'attr.';

/** The operators AutomationEngine.Compare evaluates. */
const OPERATORS: { value: string; label: string; needsValue: boolean }[] = [
  { value: 'equals', label: 'is', needsValue: true },
  { value: 'notEquals', label: 'is not', needsValue: true },
  { value: 'contains', label: 'contains', needsValue: true },
  { value: 'isNotEmpty', label: 'is filled in', needsValue: false },
  { value: 'isEmpty', label: 'is empty', needsValue: false },
  { value: 'greaterThan', label: 'is greater than', needsValue: true },
  { value: 'lessThan', label: 'is less than', needsValue: true },
];

type WaitUnit = 'minutes' | 'hours' | 'days';
const UNIT_MINUTES: Record<WaitUnit, number> = { minutes: 1, hours: 60, days: 1440 };

type Mode = 'list' | 'canvas';
const MODE_KEY = 'ar.automationBuilder.mode';
const UNDO_DEPTH = 50;

/**
 * The automation builder (M07-2), two ways round. The step list reads top to bottom: two steps branch — an "If…" and a
 * "Wait for a reply" — and each carries an "Otherwise" list of its own; see <c>automation-graph.ts</c> for exactly what
 * shape that allows. The canvas draws the same automation as boxes and arrows and edits any shape the engine can run,
 * short of a loop; see <c>automation-canvas.ts</c>. Switching from the canvas to the list is only offered when the graph
 * fits the list, so neither view ever rewrites the other's work into something different.
 */
@Component({
  selector: 'ar-automation-builder',
  imports: [RouterLink, NgTemplateOutlet, ArTopbar, ArButton, ArChip, ArIcon, ArAutomationCanvas],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './automation-builder.html',
  styleUrl: './automation-builder.scss',
})
export class ArAutomationBuilder {
  private readonly store = inject(WorkflowStore);
  private readonly templates = inject(TemplateService);
  private readonly members = inject(WorkspaceStore).members;
  private readonly webhooks = inject(OpsService).webhooks;
  private readonly route = inject(ActivatedRoute);
  protected readonly pipelines = inject(PipelineStore).pipelines;

  protected readonly TK = AutomationTriggerKind;
  protected readonly NK = AutomationNodeKind;
  protected readonly kindMeta = KIND_META;
  protected readonly conditionFields = CONDITION_FIELDS;
  protected readonly operators = OPERATORS;
  protected readonly units: WaitUnit[] = ['minutes', 'hours', 'days'];
  protected readonly addableKinds = Object.entries(KIND_META)
    .filter(([, m]) => m.addable)
    .map(([k, m]) => ({ kind: Number(k) as AutomationNodeKind, ...m }));

  protected readonly templateOptions = computed(() =>
    this.templates.all().map((t) => ({ id: t.id, name: t.name })),
  );
  protected readonly agentOptions = computed(() =>
    this.members()
      .filter((m) => m.isActive)
      .map((m) => ({ id: m.userId, name: m.name || m.userName })),
  );
  protected readonly webhookOptions = computed(() =>
    this.webhooks()
      .filter((w) => w.enabled)
      .map((w) => ({ id: w.id, name: w.description || w.url })),
  );

  protected readonly automationId = signal('');
  protected readonly name = signal('');
  protected readonly channelId = signal('');
  protected readonly trigger = signal<AutomationTriggerKind>(AutomationTriggerKind.InboundKeyword);
  protected readonly keywords = signal('');
  /** The trigger config as loaded, kept so a trigger this screen cannot edit is saved back as it was. */
  private rawTriggerConfig = '{}';
  protected readonly stagePipelineId = signal('');
  protected readonly stageId = signal('');

  protected stagesOfPipeline() {
    return this.pipelines().find((p) => p.id === this.stagePipelineId())?.stages ?? [];
  }
  protected readonly steps = signal<BuilderStep[]>([]);

  /** Set when the stored graph has a shape the list cannot show — saving from the list is then blocked. */
  protected readonly notRepresentable = signal<string | null>(null);

  // ---- The canvas ------------------------------------------------------------------------------------------

  protected readonly mode = signal<Mode>('list');
  /** The graph as the canvas edits it. Only current while {@link mode} is 'canvas'; the list is current otherwise. */
  protected readonly nodes = signal<CanvasNode[]>([]);
  protected readonly selectedId = signal<string | null>(null);
  /** Why the view could not be switched, or something the canvas refused to do. */
  protected readonly notice = signal<string | null>(null);
  private readonly history = signal<CanvasNode[][]>([]);
  protected readonly canUndo = computed(() => this.history().length > 0);
  /** The trigger and End of the stored graph, kept so the list saves them back rather than inventing new ones. */
  private anchors: GraphAnchors = {};
  private readonly canvas = viewChild(ArAutomationCanvas);

  protected readonly palette: PaletteItem[] = Object.entries(KIND_META)
    .filter(([, m]) => m.addable)
    .map(([k, m]) => ({ kind: Number(k) as AutomationNodeKind, label: m.label, icon: m.icon }));

  protected readonly selectedNode = computed(
    () => this.nodes().find((n) => n.id === this.selectedId()) ?? null,
  );

  /** The selected canvas node as the step shape the config forms read, so one set of forms serves both views. */
  protected readonly selectedStep = computed<BuilderStep | null>(() => {
    const n = this.selectedNode();
    return n && !isFixed(n.kind) ? { localId: n.id, kind: n.kind, config: n.config } : null;
  });

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly saved = signal(false);
  protected readonly error = signal<string | null>(null);

  /** Which list's "add a step" menu is open: 'root', or the id of the step that owns the branch. */
  protected readonly addMenu = signal<string | null>(null);

  /** Everything that would make the saved automation do nothing, in reading order. */
  protected readonly issues = computed(() => this.collectIssues(this.steps(), ''));

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
        this.rawTriggerConfig = dto.triggerConfigJson || '{}';
        const tc = JSON.parse(this.rawTriggerConfig) as {
          keywords?: string[];
          pipelineId?: string;
          stageId?: string;
        };
        this.keywords.set((tc.keywords ?? []).join(', '));
        this.stagePipelineId.set(tc.pipelineId ?? '');
        this.stageId.set(tc.stageId ?? '');
      } catch {
        this.keywords.set('');
      }

      const stored = dto.nodes ?? [];
      const parsed = graphToSteps(stored);
      this.steps.set(parsed.steps);
      this.notRepresentable.set(
        parsed.representable ? null : (parsed.reason ?? 'an unsupported shape'),
      );
      this.anchors = anchorsOf(stored);

      // A graph the list cannot show opens on the canvas, where it can be edited; otherwise the last view used.
      if (!parsed.representable || this.preferredMode() === 'canvas') {
        this.openCanvas(fromDtos(stored));
      }
    } finally {
      this.loading.set(false);
    }
  }

  // ---- Reading a step's config ---------------------------------------------

  protected cfg(step: BuilderStep, key: string): string {
    const v = step.config[key];
    return v == null ? '' : String(v);
  }

  private num(step: BuilderStep, key: string): number | undefined {
    const v = Number(step.config[key]);
    return Number.isFinite(v) && v > 0 ? v : undefined;
  }

  protected isBranching = isBranching;

  protected meta(kind: AutomationNodeKind) {
    return KIND_META[kind];
  }

  protected label(kind: AutomationNodeKind): string {
    return KIND_META[kind]?.label ?? 'Step';
  }

  protected runsNothing(kind: AutomationNodeKind): boolean {
    return kind === AutomationNodeKind.StartFlow;
  }

  // ---- Editing --------------------------------------------------------------

  protected setCfg(id: string, key: string, value: string): void {
    this.patch(id, (s) => ({ ...s, config: { ...s.config, [key]: value } }));
  }

  /** Numbers are stored as numbers — the engine reads them with GetValue<int>, which throws on a string. */
  protected setNum(id: string, key: string, value: string): void {
    const n = Math.max(1, Math.floor(Number(value)) || 1);
    this.patch(id, (s) => ({ ...s, config: { ...s.config, [key]: n } }));
  }

  /** Changes one step's settings in whichever view is current. On the canvas this is not an undo point — see restoreStructure. */
  private patch(id: string, fn: (s: BuilderStep) => BuilderStep): void {
    this.saved.set(false);
    if (this.mode() === 'canvas') {
      this.nodes.update((ns) =>
        ns.map((n) =>
          n.id === id
            ? { ...n, config: fn({ localId: n.id, kind: n.kind, config: n.config }).config }
            : n,
        ),
      );
      return;
    }
    this.steps.update((list) => updateStep(list, id, fn));
  }

  protected waitUnit(step: BuilderStep): WaitUnit {
    const m = this.num(step, 'minutes') ?? 30;
    return m % 1440 === 0 ? 'days' : m % 60 === 0 ? 'hours' : 'minutes';
  }

  protected waitAmount(step: BuilderStep): number {
    return (this.num(step, 'minutes') ?? 30) / UNIT_MINUTES[this.waitUnit(step)];
  }

  protected setWait(step: BuilderStep, amount: number, unit: WaitUnit): void {
    const minutes = Math.max(1, Math.floor(amount) || 1) * UNIT_MINUTES[unit];
    this.patch(step.localId, (s) => ({ ...s, config: { ...s.config, minutes } }));
  }

  // Condition fields are either one of the contact fields or "attr.<key>" for a custom attribute.
  protected fieldChoice(step: BuilderStep): string {
    const f = this.cfg(step, 'field');
    return f.toLowerCase().startsWith(CUSTOM_ATTRIBUTE) ? CUSTOM_ATTRIBUTE : f;
  }

  protected attributeKey(step: BuilderStep): string {
    const f = this.cfg(step, 'field');
    return f.toLowerCase().startsWith(CUSTOM_ATTRIBUTE) ? f.slice(CUSTOM_ATTRIBUTE.length) : '';
  }

  protected setFieldChoice(id: string, choice: string): void {
    this.setCfg(id, 'field', choice);
  }

  protected setAttributeKey(id: string, key: string): void {
    this.setCfg(id, 'field', CUSTOM_ATTRIBUTE + key.trim());
  }

  protected needsValue(step: BuilderStep): boolean {
    return OPERATORS.find((o) => o.value === this.cfg(step, 'operator'))?.needsValue ?? true;
  }

  /**
   * `owner` names the list being added to: 'root', a step's id (its otherwise list), or
   * `<id>#then` (the true list of a step whose paths rejoin).
   */
  protected addStep(owner: string, kind: AutomationNodeKind): void {
    this.saved.set(false);
    const step: BuilderStep = {
      localId: nextLocalId(),
      kind,
      config: this.defaultConfig(kind),
      otherwise: isBranching(kind) ? [] : undefined,
    };
    if (owner === 'root') {
      this.steps.update((list) => appendStep(list, null, step));
    } else if (owner.endsWith('#then')) {
      this.steps.update((list) => appendStep(list, owner.slice(0, -'#then'.length), step, 'then'));
    } else {
      this.steps.update((list) => appendStep(list, owner, step, 'otherwise'));
    }
    this.addMenu.set(null);
  }

  protected setRejoin(id: string, on: boolean): void {
    this.saved.set(false);
    this.steps.update((list) => setRejoinIn(list, id, on));
  }

  /** Whether the list named by `owner` belongs to a step whose paths rejoin. */
  protected rejoins(owner: string): boolean {
    const id = owner.endsWith('#then') ? owner.slice(0, -'#then'.length) : owner;
    const find = (list: BuilderStep[]): BuilderStep | undefined => {
      for (const s of list) {
        if (s.localId === id) return s;
        const hit = find(s.otherwise ?? []) ?? find(s.then ?? []);
        if (hit) return hit;
      }
      return undefined;
    };
    return !!find(this.steps())?.rejoin;
  }

  /** What the "true" branch of a rejoining step is called. */
  protected thenLabel(step: BuilderStep): string {
    return step.kind === AutomationNodeKind.WaitForReply ? 'If they reply' : 'If it matches';
  }

  /** The automation drawn as the graph the engine will run. */
  protected readonly flowMap = computed(() => {
    let n = 0;
    const nodes = stepsToGraph(this.steps(), () => `n${++n}`);
    if (nodes.length <= 2) return null; // just Trigger → End: nothing worth drawing yet
    const label = (node: { kind?: AutomationNodeKind }): string => {
      if (node.kind === AutomationNodeKind.Trigger) return 'Trigger';
      if (node.kind === AutomationNodeKind.End) return 'End';
      const text = KIND_META[node.kind ?? AutomationNodeKind.SendSessionMessage]?.label ?? 'Step';
      return text.length > 20 ? text.slice(0, 19) + '…' : text;
    };
    return layoutFlowMap(nodes, label);
  });

  private defaultConfig(kind: AutomationNodeKind): Record<string, unknown> {
    switch (kind) {
      case AutomationNodeKind.Wait:
        return { minutes: 30 };
      case AutomationNodeKind.WaitForReply:
        return { hours: 48 };
      case AutomationNodeKind.Condition:
        return { field: 'contact.city', operator: 'equals', value: '' };
      case AutomationNodeKind.UpdateAttribute:
        return { key: '', value: '' };
      case AutomationNodeKind.CreateEnquiry:
        return { subject: '' };
      default:
        return {};
    }
  }

  protected remove(id: string): void {
    this.saved.set(false);
    this.steps.update((list) => removeStep(list, id));
  }

  protected move(id: string, delta: -1 | 1): void {
    this.saved.set(false);
    this.steps.update((list) => moveStep(list, id, delta));
  }

  protected toggleAddMenu(owner: string): void {
    this.addMenu.update((open) => (open === owner ? null : owner));
  }

  /** What the "otherwise" branch of this step is called. */
  protected otherwiseLabel(step: BuilderStep): string {
    return step.kind === AutomationNodeKind.WaitForReply
      ? `If they don't reply within ${this.num(step, 'hours') ?? 48} hours`
      : "Otherwise — when it doesn't match";
  }

  // ---- Switching views -------------------------------------------------------

  private preferredMode(): Mode {
    try {
      return localStorage.getItem(MODE_KEY) === 'canvas' ? 'canvas' : 'list';
    } catch {
      return 'list';
    }
  }

  private rememberMode(mode: Mode): void {
    try {
      localStorage.setItem(MODE_KEY, mode);
    } catch {
      // Private window or blocked storage: the view just isn't remembered.
    }
  }

  private openCanvas(nodes: CanvasNode[]): void {
    this.nodes.set(needsLayout(nodes) ? tidy(nodes) : nodes);
    this.history.set([]);
    this.selectedId.set(null);
    this.mode.set('canvas');
  }

  /**
   * The step list as a graph with every stored node's id and place kept. Steps added in the list since have no place yet:
   * they are put beside whatever leads into them, or the whole thing is laid out if nothing has a place at all.
   */
  private graphFromSteps(): CanvasNode[] {
    const placed = new Set<string>();
    const walk = (list: BuilderStep[]) =>
      list.forEach((s) => {
        if (s.nodeId && s.x !== undefined) placed.add(s.nodeId);
        walk(s.then ?? []);
        walk(s.otherwise ?? []);
      });
    walk(this.steps());
    if (this.anchors.trigger) placed.add(this.anchors.trigger.id);
    if (this.anchors.end) placed.add(this.anchors.end.id);

    const nodes = fromDtos(stepsToGraph(this.steps(), undefined, this.anchors));
    if (needsLayout(nodes)) return tidy(nodes);
    return placeNew(nodes, new Set(nodes.filter((n) => !placed.has(n.id)).map((n) => n.id)));
  }

  protected switchTo(mode: Mode): void {
    if (mode === this.mode()) return;
    this.notice.set(null);

    if (mode === 'canvas') {
      this.openCanvas(this.graphFromSteps());
      this.rememberMode('canvas');
      return;
    }

    const parsed = graphToSteps(toNodeDtos(this.nodes()));
    if (!parsed.representable) {
      this.notice.set(
        `This automation can't be shown as a list: ${parsed.reason}. Keep editing it on the canvas.`,
      );
      return;
    }
    this.steps.set(parsed.steps);
    this.anchors = anchorsOf(toDtos(this.nodes()));
    this.notRepresentable.set(null);
    this.selectedId.set(null);
    this.mode.set('list');
    this.rememberMode('list');
  }

  // ---- Canvas edits --------------------------------------------------------------

  /** Every structural change on the canvas comes through here, so it can be undone. */
  protected commit(next: CanvasNode[]): void {
    const current = this.nodes();
    this.history.update((h) => [...h.slice(-(UNDO_DEPTH - 1)), current]);
    this.nodes.set(next);
    this.saved.set(false);
    this.notice.set(null);
  }

  protected undoCanvas(): void {
    const h = this.history();
    if (!h.length) return;
    this.nodes.set(restoreStructure(h[h.length - 1], this.nodes()));
    this.history.set(h.slice(0, -1));
    if (this.selectedId() && !this.nodes().some((n) => n.id === this.selectedId()))
      this.selectedId.set(null);
    this.saved.set(false);
  }

  protected tidyCanvas(): void {
    this.commit(tidy(this.nodes()));
    queueMicrotask(() => this.canvas()?.fit());
  }

  protected addFromPalette(e: { kind: AutomationNodeKind; x: number; y: number }): void {
    const node: CanvasNode = {
      id: crypto.randomUUID(),
      kind: e.kind,
      config: this.defaultConfig(e.kind),
      x: e.x,
      y: e.y,
      next: null,
      yes: null,
      no: null,
    };
    this.commit([...this.nodes(), node]);
    this.selectedId.set(node.id);
  }

  protected deleteSelected(): void {
    const id = this.selectedId();
    if (!id) return;
    const result = removeNode(this.nodes(), id);
    if ('error' in result) {
      this.notice.set(result.error);
      return;
    }
    this.selectedId.set(null);
    this.commit(result.nodes);
  }

  protected ports = portsOf;
  protected linkOf = linkOf;
  protected isFixed = isFixed;

  protected portName(kind: AutomationNodeKind, port: Port): string {
    if (port === 'next') return 'Then goes to';
    const reply = kind === AutomationNodeKind.WaitForReply;
    if (port === 'yes') return reply ? 'If they reply, goes to' : 'If it matches, goes to';
    return reply ? "If they don't reply, goes to" : "If it doesn't match, goes to";
  }

  /** The steps this way out could lead to — every step but the trigger and anything that would make a loop. */
  protected targetsFor(from: CanvasNode, port: Port): { id: string; label: string }[] {
    const nodes = this.nodes();
    return nodes
      .filter(
        (n) => n.id === linkOf(from, port) || connectProblem(nodes, from.id, port, n.id) === null,
      )
      .map((n) => ({ id: n.id, label: this.nodeLabel(n) }));
  }

  /** The same way-out wiring the canvas does by dragging, from a dropdown, for anyone not using a pointer. */
  protected setLink(from: string, port: Port, to: string): void {
    if (!to) {
      this.commit(disconnect(this.nodes(), from, port));
      return;
    }
    const result = connect(this.nodes(), from, port, to);
    if ('error' in result) this.notice.set(result.error);
    else this.commit(result.nodes);
  }

  /** A step's name as the dropdowns show it: its kind, what it does, and a number where two would read the same. */
  protected nodeLabel(n: CanvasNode): string {
    const card = this.describeNode(n);
    const base = card.detail ? `${card.title} — ${card.detail}` : card.title;
    const same = this.nodes().filter((x) => {
      const c = this.describeNode(x);
      return (c.detail ? `${c.title} — ${c.detail}` : c.title) === base;
    });
    return same.length > 1 ? `${base} (${same.indexOf(n) + 1})` : base;
  }

  /** What a canvas card says about a step, in a few words. */
  protected readonly describeNode = (n: CanvasNode): CanvasCard => {
    const meta = KIND_META[n.kind];
    const title =
      n.kind === AutomationNodeKind.Trigger ? 'When this happens' : (meta?.label ?? 'Step');
    const icon = meta?.icon ?? 'automation';
    const s = { localId: n.id, kind: n.kind, config: n.config } as BuilderStep;
    const clip = (t: string) => (t.length > 34 ? t.slice(0, 33) + '…' : t);
    let detail = '';
    switch (n.kind) {
      case AutomationNodeKind.Trigger:
        detail =
          this.trigger() === AutomationTriggerKind.InboundKeyword
            ? `Keywords: ${this.keywords() || '—'}`
            : 'Set above';
        break;
      case AutomationNodeKind.End:
        detail = 'The journey stops';
        break;
      case AutomationNodeKind.SendSessionMessage:
        detail = this.cfg(s, 'text').trim() ? `“${this.cfg(s, 'text').trim()}”` : 'No message yet';
        break;
      case AutomationNodeKind.SendTemplate:
        detail =
          this.templateOptions().find((t) => t.id === this.cfg(s, 'templateId'))?.name ??
          'No template chosen';
        break;
      case AutomationNodeKind.Wait:
        detail = `${this.waitAmount(s)} ${this.waitUnit(s)}`;
        break;
      case AutomationNodeKind.WaitForReply:
        detail = `Up to ${this.num(s, 'hours') ?? 48} hours`;
        break;
      case AutomationNodeKind.Condition: {
        const field =
          this.fieldChoice(s) === CUSTOM_ATTRIBUTE
            ? this.attributeKey(s) || 'attribute'
            : (CONDITION_FIELDS.find((f) => f.value === this.cfg(s, 'field'))?.label ?? 'field');
        const op = OPERATORS.find((o) => o.value === this.cfg(s, 'operator'));
        detail = `${field} ${op?.label ?? '?'}${op?.needsValue ? ' ' + (this.cfg(s, 'value') || '…') : ''}`;
        break;
      }
      case AutomationNodeKind.AssignAgent:
        detail =
          this.agentOptions().find((a) => a.id === this.cfg(s, 'userId'))?.name ?? 'Nobody chosen';
        break;
      case AutomationNodeKind.UpdateAttribute:
        detail = this.cfg(s, 'key')
          ? `${this.cfg(s, 'key')} = ${this.cfg(s, 'value')}`
          : 'No attribute yet';
        break;
      case AutomationNodeKind.CreateEnquiry:
        detail = this.cfg(s, 'subject') || 'From automation';
        break;
      case AutomationNodeKind.Webhook:
        detail =
          this.webhookOptions().find((w) => w.id === this.cfg(s, 'subscriptionId'))?.name ??
          'No endpoint chosen';
        break;
      case AutomationNodeKind.StartFlow:
        detail = "Doesn't run yet";
        break;
    }
    return { title, detail: clip(detail), icon };
  };

  // ---- Validation -----------------------------------------------------------

  /** What is wrong with one step's settings, worded to follow "Step 3 (Send a message): ". */
  private stepProblems(s: Pick<BuilderStep, 'kind' | 'config'>): string[] {
    const step = s as BuilderStep;
    const out: string[] = [];
    switch (s.kind) {
      case AutomationNodeKind.SendSessionMessage:
        if (!this.cfg(step, 'text').trim()) out.push('write the message.');
        break;
      case AutomationNodeKind.SendTemplate:
        if (!this.cfg(step, 'templateId')) out.push('choose a template.');
        break;
      case AutomationNodeKind.AssignAgent:
        if (!this.cfg(step, 'userId'))
          out.push('choose who to assign to — without one it clears the owner.');
        break;
      case AutomationNodeKind.UpdateAttribute:
        if (!this.cfg(step, 'key').trim()) out.push('give the attribute a name.');
        break;
      case AutomationNodeKind.Webhook:
        if (!this.cfg(step, 'subscriptionId')) out.push('choose one of your webhook endpoints.');
        break;
      case AutomationNodeKind.Condition: {
        const field = this.cfg(step, 'field');
        const known = CONDITION_FIELDS.some((f) => f.value === field);
        const attribute =
          field.toLowerCase().startsWith(CUSTOM_ATTRIBUTE) &&
          field.length > CUSTOM_ATTRIBUTE.length;
        if (!known && !attribute)
          out.push("pick what to check — this field isn't one the engine can read.");
        if (!OPERATORS.some((o) => o.value === this.cfg(step, 'operator')))
          out.push('pick how to compare it.');
        else if (this.needsValue(step) && !this.cfg(step, 'value').trim())
          out.push('give the value to compare against.');
        break;
      }
    }
    return out;
  }

  private collectIssues(list: BuilderStep[], where: string): string[] {
    const out: string[] = [];
    list.forEach((s, i) => {
      const at = `${where}Step ${i + 1} (${this.label(s.kind)})`;
      out.push(...this.stepProblems(s).map((p) => `${at}: ${p}`));
      if (s.then?.length) out.push(...this.collectIssues(s.then, `${at} › if true › `));
      if (s.otherwise?.length) out.push(...this.collectIssues(s.otherwise, `${at} › otherwise › `));
    });
    return out;
  }

  /** The canvas's steps with something to fix, by id, so they can be outlined and listed. */
  protected readonly canvasProblems = computed(() => {
    const out = new Map<string, string[]>();
    for (const n of this.nodes()) {
      if (isFixed(n.kind)) continue;
      const problems = this.stepProblems(n);
      if (problems.length) out.set(n.id, problems);
    }
    return out;
  });

  protected readonly flagged = computed(() => new Set(this.canvasProblems().keys()));

  protected readonly canvasIssues = computed(() =>
    [...this.canvasProblems()].flatMap(([id, problems]) => {
      const n = this.nodes().find((x) => x.id === id)!;
      return problems.map((p) => ({ id, text: `${this.label(n.kind)}: ${p}` }));
    }),
  );

  /** Saved, but no contact will ever get to them — worth saying, not worth refusing a save over. */
  protected readonly stranded = computed(() =>
    this.mode() === 'canvas' ? unreachable(this.nodes()) : [],
  );

  // ---- Save -----------------------------------------------------------------

  protected readonly canSave = computed(
    () =>
      !this.saving() &&
      !this.loading() &&
      (this.mode() === 'canvas' || this.notRepresentable() === null),
  );

  protected async save(): Promise<void> {
    const count = this.mode() === 'canvas' ? this.canvasIssues().length : this.issues().length;
    if (count > 0) {
      this.error.set(
        `Fix ${count} thing${count === 1 ? '' : 's'} first — ${this.mode() === 'canvas' ? 'the steps marked with ! on the canvas' : 'see the list above'}.`,
      );
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    try {
      const nodes = this.mode() === 'canvas' ? toDtos(this.nodes()) : toDtos(this.graphFromSteps());
      await this.store.saveAutomation(this.automationId(), {
        name: this.name().trim(),
        channelId: this.channelId(),
        trigger: this.trigger(),
        triggerConfigJson: this.triggerConfigJson(),
        nodes,
      });
      this.saved.set(true);
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
    if (this.trigger() === AutomationTriggerKind.EnquiryStageChanged) {
      return JSON.stringify({
        pipelineId: this.stagePipelineId() || undefined,
        stageId: this.stageId() || undefined,
      });
    }
    // Every other trigger (a segment drip's segment, for one) is configured elsewhere: save it back untouched.
    return this.rawTriggerConfig;
  }
}
