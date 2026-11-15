import { Injectable, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom, map } from 'rxjs';
import { OnboardingChecklistService } from '../../proxy/identity';
import { OnboardingChecklistStep } from '../../proxy/identity/onboarding-checklist-step.enum';
import { settled } from '../util/resource';

export interface ChecklistItem {
  readonly step: OnboardingChecklistStep;
  readonly label: string;
  readonly description: string;
  readonly done: boolean;
  readonly route?: string;
}

/** Who accepted the consent rules on Get started, when, and which version of them. */
export interface ConsentRulesAcceptance {
  readonly by: string;
  readonly at: string;
  readonly version: string;
}

export interface Checklist {
  readonly items: readonly ChecklistItem[];
  readonly completedCount: number;
  readonly totalCount: number;
  readonly isComplete: boolean;
  readonly dismissed: boolean;
  readonly nextStep?: OnboardingChecklistStep;
  readonly mobileVerified: boolean;
  readonly verifiedMobile?: string;
  /** Absent until someone accepts the rules (a step ticked by hand before this existed has none). */
  readonly consentRules?: ConsentRulesAcceptance;
}

const STEP_META: Record<
  OnboardingChecklistStep,
  { label: string; description: string; route?: string }
> = {
  [OnboardingChecklistStep.VerifyEmail]: {
    label: 'Verify your email',
    description: 'Confirm the address you signed up with.',
  },
  [OnboardingChecklistStep.VerifyMobile]: {
    label: 'Verify your mobile',
    description: 'A one-time code sent on WhatsApp from the platform number.',
  },
  [OnboardingChecklistStep.CompleteProfile]: {
    label: 'Complete your business profile',
    description: 'Legal name, GSTIN and address — shown on quotations and invoices.',
    route: '/settings/business-profile',
  },
  [OnboardingChecklistStep.ConnectChannel]: {
    label: 'Connect a WhatsApp number',
    description: 'Embedded signup with Meta. The number your customers message.',
    route: '/channels',
  },
  [OnboardingChecklistStep.ReviewConsentPolicy]: {
    label: 'Review the consent rules',
    description: 'How opt-in is captured and honoured. Required before the first campaign.',
    route: '/compliance',
  },
  [OnboardingChecklistStep.ImportContacts]: {
    label: 'Import your contacts',
    description: 'A CSV of existing customers, with their consent status.',
    route: '/contacts',
  },
  [OnboardingChecklistStep.SubmitTemplate]: {
    label: 'Submit your first template',
    description: 'Meta reviews message templates before they can be sent.',
    route: '/templates',
  },
  [OnboardingChecklistStep.FundWallet]: {
    label: 'Add funds',
    description:
      'Top up the prepaid wallet that pays for WhatsApp messages. A campaign waits at its pre-flight check until the wallet can cover it.',
    route: '/billing',
  },
  [OnboardingChecklistStep.InviteTeam]: {
    label: 'Invite your team',
    description:
      'Invite the people who will work with you: agents for the inbox, a manager for campaigns. Each gets an email with a link to join.',
    route: '/settings/members',
  },
};

/**
 * The order Get started shows the steps in. The business profile comes first: legal name, GSTIN and address are what
 * quotations, invoices and the WhatsApp profile are built from. The API lists steps in its own order; the screen
 * re-sorts them by this one (see {@link sortSteps}).
 */
export const ORDER: readonly OnboardingChecklistStep[] = [
  OnboardingChecklistStep.CompleteProfile,
  OnboardingChecklistStep.VerifyEmail,
  OnboardingChecklistStep.VerifyMobile,
  OnboardingChecklistStep.ConnectChannel,
  OnboardingChecklistStep.ReviewConsentPolicy,
  OnboardingChecklistStep.ImportContacts,
  OnboardingChecklistStep.SubmitTemplate,
  OnboardingChecklistStep.FundWallet,
  OnboardingChecklistStep.InviteTeam,
];

/** Steps in {@link ORDER}; a step the order doesn't know keeps its place after the known ones. */
export function sortSteps<T extends { step: OnboardingChecklistStep }>(items: readonly T[]): T[] {
  const rank = (s: OnboardingChecklistStep) => {
    const i = ORDER.indexOf(s);
    return i < 0 ? ORDER.length : i;
  };
  return items
    .map((item, i) => ({ item, i }))
    .sort((a, b) => rank(a.item.step) - rank(b.item.step) || a.i - b.i)
    .map((x) => x.item);
}

const EMPTY: Checklist = {
  items: [],
  completedCount: 0,
  totalCount: 0,
  isComplete: false,
  dismissed: false,
  mobileVerified: false,
};

/**
 * The get-started wizard. A checklist rather than a forced linear flow: the steps
 * have a natural order but a tenant who already has a number connected should not be
 * walked through signup again. `nextStep` is the one thing the screen highlights —
 * everything else is visible but not nagged.
 */
@Injectable({ providedIn: 'root' })
export class OnboardingStore {
  private readonly api = inject(OnboardingChecklistService);

  private readonly reloadTick = signal(0);
  private readonly local = signal<Checklist | null>(null);

  private readonly resource = rxResource({
    params: () => ({ tick: this.reloadTick() }),
    stream: () => this.api.get().pipe(map((dto) => this.normalise(dto))),
    defaultValue: EMPTY,
  });

  readonly checklist = computed<Checklist>(() => {
    if (this.local()) return this.local()!;
    return settled(this.resource, EMPTY);
  });

  readonly loading = computed(() => this.resource.isLoading());

  /**
   * Every step is done, as far as is known: false until the checklist has loaded, so Get started stays in the menu
   * rather than flickering away for someone who still has steps left.
   */
  readonly isComplete = computed(() => this.checklist().isComplete);

  /** The checklist as it stands, reading it first if it hasn't loaded yet (the Get started route's guard). */
  async current(): Promise<Checklist> {
    if (this.local() || this.resource.status() === 'resolved') return this.checklist();
    const fresh = this.normalise(await firstValueFrom(this.api.get()));
    this.local.set(fresh);
    return fresh;
  }

  readonly progress = computed(() => {
    const c = this.checklist();
    return c.totalCount ? Math.round((c.completedCount / c.totalCount) * 100) : 0;
  });

  private normalise(dto: {
    items?: {
      step?: OnboardingChecklistStep;
      label?: string;
      description?: string;
      done?: boolean;
      route?: string;
    }[];
    completedCount?: number;
    totalCount?: number;
    isComplete?: boolean;
    dismissed?: boolean;
    nextStep?: OnboardingChecklistStep | null;
    mobileVerified?: boolean;
    verifiedMobile?: string | null;
    consentRulesAcceptedBy?: string | null;
    consentRulesAcceptedAtUtc?: string | null;
    consentRulesVersion?: string | null;
  }): Checklist {
    const items = sortSteps(
      (dto.items ?? []).map((it) => {
        const step = it.step ?? OnboardingChecklistStep.VerifyEmail;
        return {
          step,
          label: it.label || STEP_META[step].label,
          description: it.description || STEP_META[step].description,
          route: it.route || STEP_META[step].route,
          done: it.done ?? false,
        };
      }),
    );
    return {
      items,
      completedCount: dto.completedCount ?? items.filter((i) => i.done).length,
      totalCount: dto.totalCount ?? items.length,
      isComplete: dto.isComplete ?? false,
      dismissed: dto.dismissed ?? false,
      // The first step still to do in this screen's order (the API's own pick follows its order).
      nextStep: items.find((i) => !i.done)?.step ?? dto.nextStep ?? undefined,
      mobileVerified: dto.mobileVerified ?? false,
      verifiedMobile: dto.verifiedMobile ?? undefined,
      consentRules:
        dto.consentRulesAcceptedBy && dto.consentRulesAcceptedAtUtc
          ? {
              by: dto.consentRulesAcceptedBy,
              at: dto.consentRulesAcceptedAtUtc,
              version: dto.consentRulesVersion ?? '',
            }
          : undefined,
    };
  }

  /** True once the checklist is done or the user has hidden it: either way Get started leaves the menu. */
  readonly hidden = computed(() => this.checklist().isComplete || this.checklist().dismissed);

  /** Hides Get started for good; the steps still count as they are done. */
  async dismiss(): Promise<void> {
    const dto = await firstValueFrom(this.api.dismiss());
    this.local.set(this.normalise(dto));
  }

  async markStep(step: OnboardingChecklistStep): Promise<void> {
    const dto = await firstValueFrom(this.api.markStep(step));
    this.local.set(this.normalise(dto));
  }

  async startMobileVerification(mobile: string): Promise<void> {
    await firstValueFrom(
      this.api.startMobileVerification({ mobile: mobile.trim().replace(/[+\s()-]/g, '') }),
    );
  }

  /** Reads the checklist again, e.g. after the email link was opened in another tab. */
  async refresh(): Promise<void> {
    const dto = await firstValueFrom(this.api.get());
    this.local.set(this.normalise(dto));
  }

  /** The signed-in person accepts this version of the consent rules: ticks the step and records who and when. */
  async acceptConsentRules(version: string): Promise<void> {
    const dto = await firstValueFrom(this.api.acceptConsentRules({ version }));
    this.local.set(this.normalise(dto));
  }

  /** Reads the checklist again after a step was worked on in another screen (Get started's popups). */
  async reread(): Promise<void> {
    const dto = await firstValueFrom(this.api.get());
    this.local.set(this.normalise(dto));
  }

  async confirmMobile(code: string): Promise<void> {
    const dto = await firstValueFrom(this.api.confirmMobileVerification({ code: code.trim() }));
    this.local.set(this.normalise(dto));
  }
}
