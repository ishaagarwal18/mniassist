import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import { ArTopbar } from '../../layout/topbar';
import {
  EscalationActions,
  EscalationAppliesTo,
  EscalationCondition,
  EscalationPersonDto,
  EscalationPolicyDto,
  EscalationPolicyService,
  EscalationStepDto,
  SaveEscalationPolicyInput,
} from '../../proxy/support/escalation.service';
import { ArBanner, ArButton, ArCard } from '../../ui';
import { environment } from '../../../environments/environment';
import {
  ACTION_FIELDS,
  APPLIES_TO_TEXT,
  CONDITION_TEXT,
  DAY_NAMES,
  clockText,
  duration,
  hasAction,
  parseClock,
  policyProblem,
  sortedSteps,
  toggleAction,
} from './escalation.logic';

interface Draft extends SaveEscalationPolicyInput {
  id: string | null;
  openTickets: number;
  dirty: boolean;
}

function draftOf(p: EscalationPolicyDto): Draft {
  return {
    id: p.id,
    name: p.name,
    appliesTo: p.appliesTo,
    order: p.order,
    isEnabled: p.isEnabled,
    hours: { ...p.hours, days: [...p.hours.days] },
    steps: p.steps.map((s) => ({ ...s })),
    coordinatorUserId: p.coordinatorUserId ?? null,
    managerUserId: p.managerUserId ?? null,
    openTickets: p.openTickets,
    dirty: false,
  };
}

/**
 * The escalation ladders breakdown tickets follow: which machines each covers, the hours its clock runs, who the coordinator and
 * manager are, and the steps (after how long, if what is still unmet, do what). Policies are tried in order; the first that covers a
 * ticket's machine is used.
 */
@Component({
  selector: 'ar-escalation-page',
  imports: [ArTopbar, ArButton, ArBanner, ArCard, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './escalation-page.html',
  styleUrl: './escalation-page.scss',
})
export class ArEscalationPage {
  private readonly api = inject(EscalationPolicyService);
  private readonly toasts = inject(ToastService);

  protected readonly mock = environment.useMockData;
  protected readonly drafts = signal<Draft[]>([]);
  protected readonly people = signal<EscalationPersonDto[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal<number | null>(null);

  protected readonly appliesOptions = [
    EscalationAppliesTo.AmcOrCritical,
    EscalationAppliesTo.Amc,
    EscalationAppliesTo.HighCriticality,
    EscalationAppliesTo.All,
  ];
  protected readonly conditions = [
    EscalationCondition.NoEngineer,
    EscalationCondition.NoFirstResponse,
    EscalationCondition.NoVisit,
    EscalationCondition.NotResolved,
  ];
  protected readonly APPLIES_TO_TEXT = APPLIES_TO_TEXT;
  protected readonly CONDITION_TEXT = CONDITION_TEXT;
  protected readonly ACTION_FIELDS = ACTION_FIELDS;
  protected readonly DAY_NAMES = DAY_NAMES;
  protected readonly duration = duration;
  protected readonly clockText = clockText;
  protected readonly hasAction = hasAction;

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    if (this.mock) return;
    try {
      const [list, people] = await Promise.all([
        firstValueFrom(this.api.getList()),
        firstValueFrom(this.api.getPeople()),
      ]);
      this.drafts.set(list.map(draftOf));
      this.people.set(people);
    } catch (e) {
      this.error.set(readApiError(e, 'The escalation policies could not be loaded.'));
    }
  }

  protected problem(d: Draft): string | null {
    return policyProblem(d.name, d.hours, d.steps);
  }

  protected patch(i: number, change: Partial<Draft>): void {
    this.drafts.update((list) =>
      list.map((d, j) => (j === i ? { ...d, ...change, dirty: true } : d)),
    );
  }

  protected setHours(i: number, change: Partial<Draft['hours']>): void {
    const d = this.drafts()[i];
    this.patch(i, { hours: { ...d.hours, ...change } });
  }

  protected toggleDay(i: number, day: number, on: boolean): void {
    const days = new Set(this.drafts()[i].hours.days);
    if (on) days.add(day);
    else days.delete(day);
    this.setHours(i, { days: [...days].sort() });
  }

  protected setTime(i: number, which: 'opensAtMinute' | 'closesAtMinute', value: string): void {
    const minute = parseClock(value);
    if (minute !== null) this.setHours(i, { [which]: minute });
  }

  protected setStep(i: number, s: number, change: Partial<EscalationStepDto>): void {
    const steps = this.drafts()[i].steps.map((x, k) => (k === s ? { ...x, ...change } : x));
    this.patch(i, { steps });
  }

  protected setAction(i: number, s: number, flag: EscalationActions, on: boolean): void {
    this.setStep(i, s, { actions: toggleAction(this.drafts()[i].steps[s].actions, flag, on) });
  }

  protected addStep(i: number): void {
    const steps = this.drafts()[i].steps;
    const last = steps.length ? steps[steps.length - 1].minutes : 0;
    this.patch(i, {
      steps: [
        ...steps,
        {
          minutes: last + 60,
          condition: EscalationCondition.NotResolved,
          actions: EscalationActions.NotifyManager,
        },
      ],
    });
  }

  protected removeStep(i: number, s: number): void {
    this.patch(i, { steps: this.drafts()[i].steps.filter((_, k) => k !== s) });
  }

  protected addPolicy(): void {
    this.drafts.update((list) => [
      ...list,
      {
        id: null,
        name: 'New policy',
        appliesTo: EscalationAppliesTo.All,
        order: 0,
        isEnabled: true,
        hours: {
          alwaysOpen: false,
          days: [1, 2, 3, 4, 5, 6],
          opensAtMinute: 540,
          closesAtMinute: 1080,
        },
        steps: [
          {
            minutes: 30,
            condition: EscalationCondition.NoEngineer,
            actions: EscalationActions.NotifyCoordinator,
          },
        ],
        coordinatorUserId: null,
        managerUserId: null,
        openTickets: 0,
        dirty: true,
      },
    ]);
  }

  protected async save(i: number): Promise<void> {
    const d = this.drafts()[i];
    const problem = this.problem(d);
    if (problem) {
      this.toasts.warning(problem);
      return;
    }
    this.busy.set(i);
    const input: SaveEscalationPolicyInput = {
      name: d.name.trim(),
      appliesTo: +d.appliesTo,
      order: d.order,
      isEnabled: d.isEnabled,
      hours: d.hours,
      steps: sortedSteps(d.steps).map((s) => ({ ...s, condition: +s.condition })),
      coordinatorUserId: d.coordinatorUserId || null,
      managerUserId: d.managerUserId || null,
    };
    try {
      const saved = await firstValueFrom(
        d.id ? this.api.update(d.id, input) : this.api.create(input),
      );
      this.drafts.update((list) => list.map((x, j) => (j === i ? draftOf(saved) : x)));
      this.toasts.success(`"${saved.name}" saved. Open tickets keep the ladder they started on.`);
    } catch (e) {
      this.toasts.error(readApiError(e, 'The policy could not be saved.'));
    } finally {
      this.busy.set(null);
    }
  }
}
