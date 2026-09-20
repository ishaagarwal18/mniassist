import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import {
  BuilderStep,
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
import { layoutFlowMap } from '../../core/models/automation-flow-map';
import { OpsService } from '../../core/services/ops.service';
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
  [AutomationNodeKind.Trigger]: { label: 'Trigger', icon: 'automation', blurb: 'Starts the automation', addable: false },
  [AutomationNodeKind.SendSessionMessage]: { label: 'Send a message', icon: 'send', blurb: 'Free-form, inside the window', addable: true },
  [AutomationNodeKind.SendTemplate]: { label: 'Send a template', icon: 'template', blurb: 'An approved template', addable: true },
  [AutomationNodeKind.Wait]: { label: 'Wait', icon: 'clock', blurb: 'Pause before the next step', addable: true },
  [AutomationNodeKind.Condition]: { label: 'If…', icon: 'filter', blurb: 'Branch on the contact', addable: true },
  [AutomationNodeKind.AssignAgent]: { label: 'Assign to an agent', icon: 'user', blurb: 'Hand the conversation over', addable: true },
  [AutomationNodeKind.UpdateAttribute]: { label: 'Set an attribute', icon: 'contacts', blurb: 'Tag or update the contact', addable: true },
  [AutomationNodeKind.CreateEnquiry]: { label: 'Create an enquiry', icon: 'enquiry', blurb: 'Open a pipeline card', addable: true },
  [AutomationNodeKind.Webhook]: { label: 'Call a webhook', icon: 'link', blurb: 'Notify one of your endpoints', addable: true },
  // The engine has no handler for this kind yet — it just moves on — so it is not offered.
  // An existing one is still shown, with a warning, so it is not silently dropped.
  [AutomationNodeKind.StartFlow]: { label: 'Start a flow', icon: 'flow', blurb: 'Run an in-chat form', addable: false },
  [AutomationNodeKind.WaitForReply]: { label: 'Wait for a reply', icon: 'clock', blurb: 'Branch on whether they respond', addable: true },
  [AutomationNodeKind.End]: { label: 'End', icon: 'check', blurb: 'The journey stops', addable: false },
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

/**
 * The automation step builder (M07-2): a step list, not a canvas. Two steps branch — an
 * "If…" and a "Wait for a reply" — and each carries an "Otherwise" list of its own that
 * runs when the condition fails or no reply arrives. The steps after a branching step are
 * its "true" path. See <c>automation-graph.ts</c> for exactly what shape that allows and
 * why a stored graph outside it is left untouched instead of being flattened.
 */
@Component({
  selector: 'ar-automation-builder',
  imports: [RouterLink, NgTemplateOutlet, ArTopbar, ArButton, ArChip, ArIcon],
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
  protected readonly steps = signal<BuilderStep[]>([]);

  /** Set when the stored graph has a shape the list cannot show — saving is then blocked. */
  protected readonly notRepresentable = signal<string | null>(null);

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
        const tc = JSON.parse(dto.triggerConfigJson || '{}') as { keywords?: string[] };
        this.keywords.set((tc.keywords ?? []).join(', '));
      } catch {
        this.keywords.set('');
      }

      const parsed = graphToSteps(dto.nodes ?? []);
      this.steps.set(parsed.steps);
      this.notRepresentable.set(parsed.representable ? null : (parsed.reason ?? 'an unsupported shape'));
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

  private patch(id: string, fn: (s: BuilderStep) => BuilderStep): void {
    this.saved.set(false);
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
    return step.kind === AutomationNodeKind.WaitForReply
      ? 'If they reply'
      : 'If it matches';
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

  // ---- Validation -----------------------------------------------------------

  private collectIssues(list: BuilderStep[], where: string): string[] {
    const out: string[] = [];
    list.forEach((s, i) => {
      const at = `${where}Step ${i + 1} (${this.label(s.kind)})`;
      switch (s.kind) {
        case AutomationNodeKind.SendSessionMessage:
          if (!this.cfg(s, 'text').trim()) out.push(`${at}: write the message.`);
          break;
        case AutomationNodeKind.SendTemplate:
          if (!this.cfg(s, 'templateId')) out.push(`${at}: choose a template.`);
          break;
        case AutomationNodeKind.AssignAgent:
          if (!this.cfg(s, 'userId')) out.push(`${at}: choose who to assign to — without one it clears the owner.`);
          break;
        case AutomationNodeKind.UpdateAttribute:
          if (!this.cfg(s, 'key').trim()) out.push(`${at}: give the attribute a name.`);
          break;
        case AutomationNodeKind.Webhook:
          if (!this.cfg(s, 'subscriptionId')) out.push(`${at}: choose one of your webhook endpoints.`);
          break;
        case AutomationNodeKind.Condition: {
          const field = this.cfg(s, 'field');
          const known = CONDITION_FIELDS.some((f) => f.value === field);
          const attribute = field.toLowerCase().startsWith(CUSTOM_ATTRIBUTE) && field.length > CUSTOM_ATTRIBUTE.length;
          if (!known && !attribute) out.push(`${at}: pick what to check — this field isn't one the engine can read.`);
          if (!OPERATORS.some((o) => o.value === this.cfg(s, 'operator'))) out.push(`${at}: pick how to compare it.`);
          else if (this.needsValue(s) && !this.cfg(s, 'value').trim()) out.push(`${at}: give the value to compare against.`);
          break;
        }
      }
      if (s.then?.length) out.push(...this.collectIssues(s.then, `${at} › if true › `));
      if (s.otherwise?.length) out.push(...this.collectIssues(s.otherwise, `${at} › otherwise › `));
    });
    return out;
  }

  // ---- Save -----------------------------------------------------------------

  protected readonly canSave = computed(
    () => !this.saving() && !this.loading() && this.notRepresentable() === null,
  );

  protected async save(): Promise<void> {
    const problems = this.issues();
    if (problems.length > 0) {
      this.error.set(`Fix ${problems.length} thing${problems.length === 1 ? '' : 's'} first — see the list above.`);
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    try {
      await this.store.saveAutomation(this.automationId(), {
        name: this.name().trim(),
        channelId: this.channelId(),
        trigger: this.trigger(),
        triggerConfigJson: this.triggerConfigJson(),
        nodes: stepsToGraph(this.steps()),
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
    return '{}';
  }
}
