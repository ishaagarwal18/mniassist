import {
  PersonAttitude,
  PersonInfluence,
  ProjectEventDto,
  ProjectEventKind,
  ProjectOutcome,
  ProjectRole,
  ProjectStage,
  SaveProjectInput,
  SpecStatus,
} from '../../proxy/projects/project.service';
import type { ChipTone } from '../../ui/chip';

export const STAGES: ProjectStage[] = [
  ProjectStage.Identified,
  ProjectStage.Design,
  ProjectStage.Specified,
  ProjectStage.Tender,
  ProjectStage.Awarded,
  ProjectStage.Closed,
];

export const STAGE_TEXT: Record<ProjectStage, string> = {
  [ProjectStage.Identified]: 'Identified',
  [ProjectStage.Design]: 'Design',
  [ProjectStage.Specified]: 'Specified',
  [ProjectStage.Tender]: 'Tender',
  [ProjectStage.Awarded]: 'Awarded',
  [ProjectStage.Closed]: 'Closed',
};

/** Who decides at each stage, as the board's column hint. */
export const STAGE_DECIDER: Record<ProjectStage, string> = {
  [ProjectStage.Identified]: 'End-user, internally',
  [ProjectStage.Design]: 'Consultant',
  [ProjectStage.Specified]: 'Consultant (done)',
  [ProjectStage.Tender]: 'EPC contractor',
  [ProjectStage.Awarded]: 'Panel builder',
  [ProjectStage.Closed]: 'Result recorded',
};

export const OUTCOME_TEXT: Record<ProjectOutcome, string> = {
  [ProjectOutcome.None]: '',
  [ProjectOutcome.Won]: 'Won',
  [ProjectOutcome.Lost]: 'Lost',
  [ProjectOutcome.Dropped]: 'Dropped',
};

export const ROLES: { role: ProjectRole; text: string }[] = [
  { role: ProjectRole.EndUser, text: 'End-user' },
  { role: ProjectRole.Consultant, text: 'Consultant' },
  { role: ProjectRole.EpcContractor, text: 'EPC contractor' },
  { role: ProjectRole.PanelBuilder, text: 'Panel builder' },
  { role: ProjectRole.SystemIntegrator, text: 'System integrator' },
  { role: ProjectRole.Oem, text: 'OEM' },
  { role: ProjectRole.CompetitorDistributor, text: 'Competitor distributor' },
];

export const INFLUENCE_TEXT: Record<PersonInfluence, string> = {
  [PersonInfluence.DecisionMaker]: 'Decision maker',
  [PersonInfluence.Influencer]: 'Influencer',
  [PersonInfluence.User]: 'User',
  [PersonInfluence.Gatekeeper]: 'Gatekeeper',
};

export const ATTITUDE_TEXT: Record<PersonAttitude, string> = {
  [PersonAttitude.Unknown]: 'Unknown',
  [PersonAttitude.Supporter]: 'Supporter',
  [PersonAttitude.Neutral]: 'Neutral',
  [PersonAttitude.Blocker]: 'Blocker',
};

export const ATTITUDE_TONE: Record<PersonAttitude, ChipTone> = {
  [PersonAttitude.Unknown]: 'neutral',
  [PersonAttitude.Supporter]: 'good',
  [PersonAttitude.Neutral]: 'neutral',
  [PersonAttitude.Blocker]: 'bad',
};

export const SECTORS = [
  'Steel',
  'Cement',
  'Pharma',
  'Water',
  'Auto',
  'Food & beverage',
  'Power',
  'Oil & gas',
  'Chemicals',
  'Paper',
  'Textiles',
  'Infrastructure',
];

export function hasRole(roles: ProjectRole, role: ProjectRole): boolean {
  return (roles & role) === role;
}

export function toggleRole(roles: ProjectRole, role: ProjectRole, on: boolean): ProjectRole {
  return on ? roles | role : roles & ~role;
}

export function rolesText(roles: ProjectRole): string[] {
  return ROLES.filter((r) => hasRole(roles, r.role)).map((r) => r.text);
}

/** ₹ in lakh and crore, the way Indian sales teams read project sizes: "₹4.5 Cr", "₹75 L", "₹40,000". */
export function rupeesShort(paise: number | null | undefined): string {
  if (paise === null || paise === undefined) return '—';
  const rupees = paise / 100;
  if (rupees >= 1_00_00_000) return `₹${trim(rupees / 1_00_00_000)} Cr`;
  if (rupees >= 1_00_000) return `₹${trim(rupees / 1_00_000)} L`;
  return '₹' + Math.round(rupees).toLocaleString('en-IN');
}

function trim(n: number): string {
  return (Math.round(n * 100) / 100).toString();
}

/** "45,00,000" or "4.5 Cr"-style typing to paise; null for blank or unreadable. */
export function parseRupees(text: string): number | null {
  const t = text.replace(/[₹,\s]/g, '').toLowerCase();
  if (!t) return null;
  const m = /^(\d+(?:\.\d+)?)(cr|crore|l|lakh|lac|k)?$/.exec(t);
  if (!m) return null;
  const unit = m[2] ?? '';
  const factor = unit.startsWith('c')
    ? 1_00_00_000
    : unit.startsWith('l')
      ? 1_00_000
      : unit === 'k'
        ? 1_000
        : 1;
  return Math.round(+m[1] * factor * 100);
}

/** What the timeline line says. */
export function eventText(e: ProjectEventDto): string {
  switch (e.kind) {
    case ProjectEventKind.Created:
      return `Project created: ${e.toValue ?? ''}`;
    case ProjectEventKind.StageChanged:
      return `Stage ${e.fromValue ?? ''} → ${e.toValue ?? ''}${e.note ? ` · ${e.note}` : ''}`;
    case ProjectEventKind.PartyAdded:
      return `Added ${e.toValue ?? 'a party'}`;
    case ProjectEventKind.PartyRemoved:
      return `Removed ${e.fromValue ?? 'a party'}`;
    case ProjectEventKind.PersonChanged:
      return `People updated: ${e.toValue ?? ''}`;
    case ProjectEventKind.SpecChanged:
      return `Specification ${e.fromValue ?? ''} → ${e.toValue ?? ''}`;
    case ProjectEventKind.EnquiryLinked:
      return `Enquiry linked: ${e.toValue ?? ''}`;
    case ProjectEventKind.Note:
      return e.toValue ?? '';
    default:
      return e.toValue ?? 'Updated';
  }
}

export function formProblem(f: SaveProjectInput): string | null {
  if (!f.name.trim()) return 'Give the project a name.';
  if (!f.endUserAccountId) return 'Choose the end-user.';
  if (
    f.ourScopeValueInPaise !== null &&
    f.ourScopeValueInPaise !== undefined &&
    f.ourScopeValueInPaise < 0
  )
    return 'The value can’t be negative.';
  return null;
}

/** A stage the board can move a card to without asking anything: Awarded needs the winner, Closed the outcome. */
export function needsDetails(stage: ProjectStage): boolean {
  return stage === ProjectStage.Awarded || stage === ProjectStage.Closed;
}

export const SPEC_STATUSES: SpecStatus[] = [
  SpecStatus.Unknown,
  SpecStatus.Named,
  SpecStatus.NamedOrEquivalent,
  SpecStatus.CompetitorNamed,
  SpecStatus.Open,
];

export const SPEC_TEXT: Record<SpecStatus, string> = {
  [SpecStatus.Unknown]: 'Unknown: not seen yet',
  [SpecStatus.Named]: 'Named: only our brand',
  [SpecStatus.NamedOrEquivalent]: 'Named or equivalent',
  [SpecStatus.CompetitorNamed]: 'Competitor named',
  [SpecStatus.Open]: 'Open: no brand named',
};

export const SPEC_TONE: Record<SpecStatus, ChipTone> = {
  [SpecStatus.Unknown]: 'neutral',
  [SpecStatus.Named]: 'good',
  [SpecStatus.NamedOrEquivalent]: 'good',
  [SpecStatus.CompetitorNamed]: 'bad',
  [SpecStatus.Open]: 'amber',
};

/** What a spec row needs before it can be saved, in the words the server uses. */
export function specProblem(
  status: SpecStatus,
  ourMakes: string[],
  competitorIds: string[],
): string | null {
  if (status === SpecStatus.Named && ourMakes.length === 0)
    return 'Tick which of our brands the spec names.';
  if (status === SpecStatus.CompetitorNamed && competitorIds.length === 0)
    return 'Tick which competitor brands the spec names.';
  return null;
}

/** "60%" for 0.6; "—" before anything is known. */
/** What happened to a tender alert, for the alerts table. */
export const TENDER_STATUS_TEXT: Record<number, string> = {
  0: 'Being read',
  1: 'Suggested',
  2: 'Under the match line',
  3: 'Project made',
  4: 'Not relevant',
  5: 'Same tender as an earlier alert',
  6: 'Could not be read',
};

/** "a, b; c" or one per line → the list, blanks dropped. */
export function splitList(text: string): string[] {
  return text
    .split(/[;,\n]/)
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

export function percent(rate: number | null | undefined): string {
  return rate === null || rate === undefined ? '—' : `${Math.round(rate * 100)}%`;
}
