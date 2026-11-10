import { Injectable, effect, inject, signal } from '@angular/core';
import { catchError, of } from 'rxjs';
import { BillingService, PlanUsageDto, SubscriptionPlan } from '../../proxy/billing';
import { CurrentUserService } from './current-user.service';

/** Features unlocked by subscription tiers according to Table 13.4 & SubscriptionPlanCatalog */
export const DEFAULT_PLAN_FEATURES: Record<SubscriptionPlan, readonly string[]> = {
  [SubscriptionPlan.Starter]: [],
  [SubscriptionPlan.Growth]: [
    'AutomationBuilder',
    'Flows',
    'DocumentLibrary',
    'FullAnalytics',
    'ClickToWhatsAppAttribution',
    'SalesAndPurchasing',
  ],
  [SubscriptionPlan.Pro]: [
    'AutomationBuilder',
    'Flows',
    'DocumentLibrary',
    'FullAnalytics',
    'ClickToWhatsAppAttribution',
    'PipelineCrm',
    'PublicApi',
    'Connectors',
    'Payments',
    'Helpdesk',
    'AiAssistant',
    'Voice',
    'Sms',
    'Email',
    'RenewalDesk',
    'ErpSync',
    'SalesAndPurchasing',
    'Manufacturing',
    'Finance',
    'FieldService',
    'OemPricing',
    'ProjectBilling',
  ],
  [SubscriptionPlan.Enterprise]: [
    'AutomationBuilder',
    'Flows',
    'DocumentLibrary',
    'FullAnalytics',
    'ClickToWhatsAppAttribution',
    'PipelineCrm',
    'PublicApi',
    'Connectors',
    'Payments',
    'Helpdesk',
    'AiAssistant',
    'Voice',
    'Sms',
    'Email',
    'RenewalDesk',
    'ErpSync',
    'Sso',
    'OemNetwork',
    'SalesAndPurchasing',
    'Manufacturing',
    'Finance',
    'FieldService',
    'Partners',
    'OemPricing',
    'ProjectBilling',
  ],
};

@Injectable({ providedIn: 'root' })
export class PlanService {
  private readonly billingApi = inject(BillingService);
  private readonly account = inject(CurrentUserService);

  /** Active plan for the workspace */
  readonly plan = signal<SubscriptionPlan>(SubscriptionPlan.Starter);

  /** Normalized set of unlocked feature names (lowercase) */
  readonly features = signal<ReadonlySet<string>>(
    new Set(DEFAULT_PLAN_FEATURES[SubscriptionPlan.Starter].map((f) => f.toLowerCase())),
  );

  readonly loading = signal<boolean>(false);

  constructor() {
    // Refresh plan usage whenever the user or tenant changes
    effect(() => {
      const isAuth = this.account.isAuthenticated();
      const isHostAdmin = this.account.isHostAdmin();

      if (isAuth) {
        if (isHostAdmin) {
          this.setHostPlan();
        } else {
          void this.refresh();
        }
      }
    });
  }

  private setHostPlan(): void {
    this.plan.set(SubscriptionPlan.Enterprise);
    const all = Object.values(DEFAULT_PLAN_FEATURES).flatMap((arr) => arr);
    this.features.set(new Set(all.map((f) => f.toLowerCase())));
  }

  /** Reloads plan limits and unlocked features from the server */
  async refresh(): Promise<void> {
    if (this.account.isHostAdmin()) {
      this.setHostPlan();
      return;
    }

    this.loading.set(true);
    try {
      this.billingApi
        .getPlanUsage()
        .pipe(
          catchError((err) => {
            console.warn('[PlanService] Failed to load plan usage, falling back to Starter:', err);
            return of({
              plan: SubscriptionPlan.Starter,
              features: [],
            } as PlanUsageDto);
          }),
        )
        .subscribe((usage) => {
          const resolvedPlan: SubscriptionPlan =
            (usage.plan as SubscriptionPlan) ?? SubscriptionPlan.Starter;
          this.plan.set(resolvedPlan);

          const featureList = [
            ...(DEFAULT_PLAN_FEATURES[resolvedPlan] ?? []),
            ...(usage.features ?? []),
          ];
          this.features.set(new Set(featureList.map((f) => f.toLowerCase())));
          this.loading.set(false);
        });
    } catch {
      this.loading.set(false);
    }
  }

  /**
   * Checks whether the current workspace meets the minimum subscription plan.
   */
  hasPlan(minPlan: SubscriptionPlan | undefined | null): boolean {
    if (minPlan == null) return true;
    if (this.account.isHostAdmin()) return true;
    return this.plan() >= minPlan;
  }

  /**
   * Checks whether a specific feature is included in the workspace plan or enabled via add-on.
   */
  hasFeature(featureName: string | undefined | null): boolean {
    if (!featureName) return true;
    if (this.account.isHostAdmin()) return true;
    return this.features().has(featureName.trim().toLowerCase());
  }
}
