import type { ChipTone } from '../../ui/chip';
import {
  ComponentState,
  StatusComponents,
  StatusImpact,
} from '../../proxy/platform/platform-status.service';

/** The parts of the platform, in the order the page lists them. */
export const COMPONENTS: { value: StatusComponents; label: string }[] = [
  { value: StatusComponents.App, label: 'Web app and sign-in' },
  { value: StatusComponents.Messaging, label: 'WhatsApp, SMS and email messages' },
  { value: StatusComponents.Campaigns, label: 'Campaigns and automations' },
  { value: StatusComponents.Payments, label: 'Payments and billing' },
  { value: StatusComponents.Integrations, label: 'Integrations (ERP, CRM, telephony)' },
];

export function stateLabel(s: ComponentState): string {
  switch (s) {
    case ComponentState.Outage:
      return 'Outage';
    case ComponentState.Degraded:
      return 'Degraded';
    case ComponentState.Maintenance:
      return 'Maintenance';
    default:
      return 'Operational';
  }
}

export function stateTone(s: ComponentState): ChipTone {
  switch (s) {
    case ComponentState.Outage:
      return 'bad';
    case ComponentState.Degraded:
      return 'warn';
    case ComponentState.Maintenance:
      return 'teal';
    default:
      return 'good';
  }
}

/** The banner across the top of the page. */
export function overallHeadline(s: ComponentState): string {
  switch (s) {
    case ComponentState.Outage:
      return 'Part of MNI Assist is down';
    case ComponentState.Degraded:
      return 'Some things are slower or failing';
    case ComponentState.Maintenance:
      return 'Planned maintenance under way';
    default:
      return 'All systems operational';
  }
}

export function impactLabel(i: StatusImpact): string {
  return i === StatusImpact.Major ? 'Major' : i === StatusImpact.Minor ? 'Minor' : 'Maintenance';
}

/** The names of the parts an incident flags, for its line on the page. */
export function componentNames(flags: StatusComponents): string[] {
  return COMPONENTS.filter((c) => (flags & c.value) === c.value).map((c) => c.label);
}

export function toggleComponent(flags: StatusComponents, c: StatusComponents): StatusComponents {
  return ((flags & c) === c ? flags & ~c : flags | c) as StatusComponents;
}

/** "10 Oct, 14:30 IST" — the page is read in India, and says so. */
export function istTime(utc: string | null | undefined): string {
  if (!utc) return '';
  return (
    new Date(utc).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }) + ' IST'
  );
}
