import { Injectable, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom, map } from 'rxjs';

import { environment } from '../../../environments/environment';
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

export interface Checklist {
  readonly items: readonly ChecklistItem[];
  readonly completedCount: number;
  readonly totalCount: number;
  readonly isComplete: boolean;
  readonly dismissed: boolean;
  readonly nextStep?: OnboardingChecklistStep;
  readonly mobileVerified: boolean;
  readonly verifiedMobile?: string;
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
    description: 'A one-time code by SMS. Used for account recovery and critical alerts.',
  },
  [OnboardingChecklistStep.CompleteProfile]: {
    label: 'Complete your business profile',
    description: 'Legal name, GSTIN and address — shown on quotations and invoices.',
    route: '/settings',
  },
  [OnboardingChecklistStep.ConnectChannel]: {
    label: 'Connect a WhatsApp number',
    description: 'Embedded signup with Meta. The number your customers message.',
    route: '/channels',
  },
  [OnboardingChecklistStep.ReviewConsentPolicy]: {
    label: 'Review the consent policy',
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
    label: 'Fund your wallet',
    description: 'A prepaid balance. Messages are billed against it at Meta’s rates.',
    route: '/billing',
  },
  [OnboardingChecklistStep.InviteTeam]: {
    label: 'Invite your team',
    description: 'Add the people who will handle the inbox and the pipeline.',
    route: '/settings/members',
  },
};

const ORDER: OnboardingChecklistStep[] = [
  OnboardingChecklistStep.VerifyEmail,
  OnboardingChecklistStep.VerifyMobile,
  OnboardingChecklistStep.CompleteProfile,
  OnboardingChecklistStep.ConnectChannel,
  OnboardingChecklistStep.ReviewConsentPolicy,
  OnboardingChecklistStep.ImportContacts,
  OnboardingChecklistStep.SubmitTemplate,
  OnboardingChecklistStep.FundWallet,
  OnboardingChecklistStep.InviteTeam,
];

const SEED: Checklist = {
  items: ORDER.map((step, i) => ({
    step,
    label: STEP_META[step].label,
    description: STEP_META[step].description,
    route: STEP_META[step].route,
    done: i < 3,
  })),
  completedCount: 3,
  totalCount: ORDER.length,
  isComplete: false,
  dismissed: false,
  nextStep: OnboardingChecklistStep.ConnectChannel,
  mobileVerified: true,
  verifiedMobile: '+91 90210 44xxx',
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
    params: () => (environment.useMockData ? undefined : { tick: this.reloadTick() }),
    stream: () => this.api.get().pipe(map((dto) => this.normalise(dto))),
    defaultValue: SEED,
  });

  readonly checklist = computed<Checklist>(() => {
    if (this.local()) return this.local()!;
    return environment.useMockData ? SEED : settled(this.resource, SEED);
  });

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
  }): Checklist {
    const items = (dto.items ?? []).map((it) => {
      const step = it.step ?? OnboardingChecklistStep.VerifyEmail;
      return {
        step,
        label: it.label || STEP_META[step].label,
        description: it.description || STEP_META[step].description,
        route: it.route || STEP_META[step].route,
        done: it.done ?? false,
      };
    });
    return {
      items,
      completedCount: dto.completedCount ?? items.filter((i) => i.done).length,
      totalCount: dto.totalCount ?? items.length,
      isComplete: dto.isComplete ?? false,
      dismissed: dto.dismissed ?? false,
      nextStep: dto.nextStep ?? undefined,
      mobileVerified: dto.mobileVerified ?? false,
      verifiedMobile: dto.verifiedMobile ?? undefined,
    };
  }

  private reload(): void {
    this.reloadTick.update((n) => n + 1);
  }

  async markStep(step: OnboardingChecklistStep): Promise<void> {
    if (environment.useMockData) {
      const c = this.checklist();
      const items = c.items.map((i) => (i.step === step ? { ...i, done: true } : i));
      this.local.set({
        ...c,
        items,
        completedCount: items.filter((i) => i.done).length,
        nextStep: items.find((i) => !i.done)?.step,
        isComplete: items.every((i) => i.done),
      });
      return;
    }
    const dto = await firstValueFrom(this.api.markStep(step));
    this.local.set(this.normalise(dto));
  }

  async startMobileVerification(mobile: string): Promise<void> {
    if (!environment.useMockData) {
      await firstValueFrom(this.api.startMobileVerification({ mobile: mobile.trim() }));
    }
  }

  /** Reads the checklist again, e.g. after the email link was opened in another tab. */
  async refresh(): Promise<void> {
    if (environment.useMockData) {
      await this.markStep(OnboardingChecklistStep.VerifyEmail);
      return;
    }
    const dto = await firstValueFrom(this.api.get());
    this.local.set(this.normalise(dto));
  }

  async confirmMobile(code: string): Promise<void> {
    if (environment.useMockData) {
      await this.markStep(OnboardingChecklistStep.VerifyMobile);
      return;
    }
    const dto = await firstValueFrom(this.api.confirmMobileVerification({ code: code.trim() }));
    this.local.set(this.normalise(dto));
  }

  async dismiss(): Promise<void> {
    if (environment.useMockData) {
      this.local.set({ ...this.checklist(), dismissed: true });
      return;
    }
    const dto = await firstValueFrom(this.api.dismiss());
    this.local.set(this.normalise(dto));
  }
}
