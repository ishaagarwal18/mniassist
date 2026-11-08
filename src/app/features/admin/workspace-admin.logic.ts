import { PlanFeature } from '../../proxy/billing/plan-feature.enum';
import { SubscriptionPlan } from '../../proxy/billing/subscription-plan.enum';
import { BillingCycle } from '../../proxy/billing/billing-cycle.enum';
import { WorkspaceFeatureMode } from '../../proxy/administration/workspace-feature-mode.enum';
import { InvoiceState } from '../../proxy/billing/invoice-state.enum';
import type {
  AssignPlanInput,
  HostGenerateInvoiceInput,
  WorkspaceSubscriptionDto,
} from '../../proxy/administration/models';

/** What each plan feature is called on screen. */
export const FEATURE_LABELS: Record<PlanFeature, string> = {
  [PlanFeature.AutomationBuilder]: 'Automation builder',
  [PlanFeature.Flows]: 'WhatsApp Flows',
  [PlanFeature.DocumentLibrary]: 'Document library',
  [PlanFeature.FullAnalytics]: 'Full analytics',
  [PlanFeature.ClickToWhatsAppAttribution]: 'Click-to-WhatsApp ad attribution',
  [PlanFeature.PipelineCrm]: 'Pipeline and CRM',
  [PlanFeature.PublicApi]: 'Public API and API keys',
  [PlanFeature.Connectors]: 'CRM and accounting connectors',
  [PlanFeature.Sso]: 'Single sign-on',
  [PlanFeature.Payments]: 'Payment links',
  [PlanFeature.Helpdesk]: 'Helpdesk',
  [PlanFeature.AiAssistant]: 'AI assistant',
  [PlanFeature.Voice]: 'Voice and IVR',
  [PlanFeature.Sms]: 'SMS',
  [PlanFeature.Email]: 'Email sending',
  [PlanFeature.RenewalDesk]: 'AMC renewal desk',
  [PlanFeature.ErpSync]: 'Tally and SAP sync',
  [PlanFeature.OemNetwork]: 'OEM dealer network',
  [PlanFeature.ReorderPortal]: 'Spares re-order portal',
  [PlanFeature.SalesAndPurchasing]: 'Sales and purchasing',
  [PlanFeature.Manufacturing]: 'Manufacturing',
  [PlanFeature.Finance]: 'Finance and GST',
  [PlanFeature.FieldService]: 'Field service',
  [PlanFeature.Partners]: 'Resellers and agency mode',
  [PlanFeature.OemPricing]: 'OEM special prices and claims',
};

export const featureLabel = (f: PlanFeature): string => FEATURE_LABELS[f] ?? `Feature ${f}`;

export const PLAN_OPTIONS: readonly { value: SubscriptionPlan; label: string }[] = [
  { value: SubscriptionPlan.Starter, label: 'Starter' },
  { value: SubscriptionPlan.Growth, label: 'Growth' },
  { value: SubscriptionPlan.Pro, label: 'Pro' },
  { value: SubscriptionPlan.Enterprise, label: 'Enterprise' },
];

export const planLabel = (p: SubscriptionPlan | null | undefined): string =>
  PLAN_OPTIONS.find((o) => o.value === p)?.label ?? 'No plan';

export const MODE_OPTIONS: readonly { value: WorkspaceFeatureMode; label: string }[] = [
  { value: WorkspaceFeatureMode.Default, label: 'As the plan says' },
  { value: WorkspaceFeatureMode.On, label: 'Always on' },
  { value: WorkspaceFeatureMode.Off, label: 'Always off' },
];

/** One line on the subscription, for the dialog's header. */
export function subscriptionSummary(s: WorkspaceSubscriptionDto | null | undefined): string {
  if (!s) return 'No subscription — on the Starter trial terms';
  const cycle = s.cycle === BillingCycle.Annual ? 'annual' : 'monthly';
  const kind = s.isTrial ? `${planLabel(s.plan)} trial` : `${planLabel(s.plan)}, ${cycle}`;
  const until = s.expiresAtUtc
    ? `ends ${dateOnly(s.expiresAtUtc)}`
    : `${s.isTrial ? 'trial ends' : 'renews'} ${dateOnly(s.currentPeriodEndUtc)}`;
  return `${kind} · ${until}`;
}

/** The form the plan tab edits. Money in rupees as typed; blank means "the plan's own". */
export interface PlanForm {
  plan: SubscriptionPlan;
  cycle: BillingCycle;
  isTrial: boolean;
  periodEnd: string;
  expires: string;
  monthlyFeeRupees: string;
  seats: string;
}

export function planFormFrom(s: WorkspaceSubscriptionDto | null | undefined): PlanForm {
  return {
    plan: s?.plan ?? SubscriptionPlan.Starter,
    cycle: s?.cycle ?? BillingCycle.Monthly,
    isTrial: s?.isTrial ?? false,
    periodEnd: '',
    expires: s?.expiresAtUtc ? dateOnly(s.expiresAtUtc) : '',
    monthlyFeeRupees: '',
    seats: '',
  };
}

/** Turns the form into the API input, or names the first thing wrong with it. */
export function assignPlanInput(f: PlanForm, today = new Date()): AssignPlanInput | string {
  const fee = f.monthlyFeeRupees.trim();
  const seats = f.seats.trim();
  if (fee && !(Number(fee) >= 0)) return 'The monthly fee must be a number of rupees.';
  if (seats && !(Number.isInteger(Number(seats)) && Number(seats) >= 1)) {
    return 'Seats must be a whole number, 1 or more.';
  }
  const todayIso = isoDate(today);
  if (f.periodEnd && f.periodEnd < todayIso) return 'The current period cannot end in the past.';
  if (f.expires && f.expires < todayIso) return 'The plan cannot end in the past.';
  if (f.periodEnd && f.expires && f.expires < f.periodEnd) {
    return 'The plan cannot end before the current period does.';
  }
  return {
    plan: Number(f.plan),
    cycle: Number(f.cycle),
    isTrial: f.isTrial,
    currentPeriodEndUtc: f.periodEnd ? endOfIndianDay(f.periodEnd) : null,
    expiresAtUtc: f.expires ? endOfIndianDay(f.expires) : null,
    monthlyFeeInPaise: fee ? Math.round(Number(fee) * 100) : null,
    includedAgentSeats: seats ? Number(seats) : null,
  };
}

/** The last moment of a calendar day in India, as UTC. */
export function endOfIndianDay(date: string): string {
  return new Date(`${date}T23:59:59+05:30`).toISOString();
}

export function dateOnly(iso: string): string {
  return iso.slice(0, 10);
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Rupees from paise, Indian grouping. */
export function rupees(paise: number): string {
  return '₹' + (paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

// ---- Invoices the platform issues to a workspace ---------------------------------------

export interface InvoiceForm {
  /** Inclusive dates, yyyy-MM-dd, as Indian calendar days. */
  start: string;
  end: string;
  /** Two-digit GST state code, or blank to take it from the workspace's profile. */
  place: string;
}

/** The current calendar month: what a monthly subscription invoice usually covers. */
export function invoiceFormDefault(today = new Date()): InvoiceForm {
  const first = new Date(today.getFullYear(), today.getMonth(), 1);
  const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return { start: isoDate(first), end: isoDate(last), place: '' };
}

/** The API input, or why the form can't be sent. */
export function generateInvoiceInput(f: InvoiceForm): HostGenerateInvoiceInput | string {
  if (!f.start || !f.end) return 'Choose the first and last day the invoice covers.';
  if (f.end < f.start) return 'The period must end on or after the day it starts.';
  const place = f.place.trim();
  if (place && !/^[0-9]{2}$/.test(place)) {
    return 'The place of supply is a two-digit GST state code, like 27 for Maharashtra.';
  }
  return {
    periodStartUtc: new Date(`${f.start}T00:00:00+05:30`).toISOString(),
    periodEndUtc: endOfIndianDay(f.end),
    placeOfSupplyStateCode: place || null,
  };
}

/** How an invoice's state shows as a chip. */
export function invoiceStateChip(state: InvoiceState | undefined): {
  label: string;
  tone: 'neutral' | 'amber' | 'good' | 'bad';
} {
  switch (state) {
    case InvoiceState.Issued:
      return { label: 'Issued', tone: 'amber' };
    case InvoiceState.Paid:
      return { label: 'Paid', tone: 'good' };
    case InvoiceState.Cancelled:
      return { label: 'Cancelled', tone: 'bad' };
    case InvoiceState.Credited:
      return { label: 'Credited', tone: 'neutral' };
    default:
      return { label: 'Draft', tone: 'neutral' };
  }
}
