import type { ConfirmService } from '../../../core/ui/confirm.service';
import {
  CancelGstDocumentInput,
  EWayTransportMode,
  GenerateEWayBillInput,
  GstCancelReason,
  GstPortalMode,
} from '../../../proxy/finance';
import type { ChipTone } from '../../../ui';

/** The portal modes a workspace can choose, with what each one means for the numbers it gets. */
export const PORTAL_MODES: readonly { value: GstPortalMode; label: string; hint: string }[] = [
  {
    value: GstPortalMode.Test,
    label: 'Test',
    hint: 'No account needed. Numbers start with TEST and are registered nowhere.',
  },
  {
    value: GstPortalMode.Sandbox,
    label: 'Sandbox',
    hint: 'Real calls to the Masters India sandbox. Nothing is registered with the government.',
  },
  {
    value: GstPortalMode.Live,
    label: 'Live',
    hint: 'Registers with the government portals. These numbers are legally valid.',
  },
  { value: GstPortalMode.Off, label: 'Off', hint: 'E-invoices and e-way bills are not generated.' },
];

export function portalModeLabel(mode: GstPortalMode | null | undefined): string {
  return PORTAL_MODES.find((m) => m.value === mode)?.label ?? 'Not from the portal';
}

/**
 * The chip beside a generated number that is not a real one: a rehearsal (Test, Sandbox), or a number that did not come
 * from the portal at all (typed in, or made before the portal was connected). Null for a Live number, which needs none.
 */
export function unofficialNumberChip(
  mode: GstPortalMode | null | undefined,
): { label: string; tone: ChipTone; title: string } | null {
  switch (mode) {
    case GstPortalMode.Live:
      return null;
    case GstPortalMode.Test:
      return { label: 'Test', tone: 'warn', title: 'A test number. It is registered nowhere.' };
    case GstPortalMode.Sandbox:
      return {
        label: 'Sandbox',
        tone: 'warn',
        title: 'A sandbox number. It is not registered with the government.',
      };
    default:
      return {
        label: 'Not verified',
        tone: 'neutral',
        title: 'This number did not come from the GST portal through this system.',
      };
  }
}

export const TRANSPORT_MODES: readonly { value: EWayTransportMode; label: string }[] = [
  { value: EWayTransportMode.Road, label: 'Road' },
  { value: EWayTransportMode.Rail, label: 'Rail' },
  { value: EWayTransportMode.Air, label: 'Air' },
  { value: EWayTransportMode.Ship, label: 'Ship' },
];

const GSTIN_OR_TRANSPORTER_ID = /^[0-9]{2}[A-Z0-9]{13}$/;
/** Indian vehicle registration, e.g. MH14BT4590 (separators removed first). */
const VEHICLE_NUMBER = /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}$/;

export interface EWayForm {
  transportMode: EWayTransportMode;
  vehicleNumber: string;
  transporterGstin: string;
  transporterName: string;
  transportDocumentNumber: string;
  /** yyyy-MM-dd from a date input, or empty. */
  transportDocumentDate: string;
  distanceInKm: number | null;
}

/** The form as the API wants it, or the first thing wrong with it in plain words. */
export function eWayInputFrom(
  form: EWayForm,
): { input: GenerateEWayBillInput; error?: undefined } | { input?: undefined; error: string } {
  const vehicle = form.vehicleNumber.toUpperCase().replace(/[\s-]/g, '');
  const transporter = form.transporterGstin.toUpperCase().replace(/\s/g, '');
  const documentNumber = form.transportDocumentNumber.trim();
  const distance = Number(form.distanceInKm);
  const byRoad = form.transportMode === EWayTransportMode.Road;

  if (transporter && !GSTIN_OR_TRANSPORTER_ID.test(transporter)) {
    return { error: 'The transporter GSTIN or ID has 15 characters, e.g. 27AAACG1234A1Z5.' };
  }
  if (byRoad && !vehicle && !transporter) {
    return {
      error: 'Enter the vehicle number, or the transporter who will add the vehicle later.',
    };
  }
  if (byRoad && vehicle && !VEHICLE_NUMBER.test(vehicle)) {
    return { error: 'That vehicle number does not look right, e.g. MH14BT4590.' };
  }
  if (!byRoad && !documentNumber) {
    return { error: 'Enter the transport document number (RR, airway bill or bill of lading).' };
  }
  if (!(distance >= 1 && distance <= 4000)) {
    return { error: 'Enter the distance in km, between 1 and 4,000.' };
  }

  return {
    input: {
      transportMode: form.transportMode,
      vehicleNumber: vehicle || undefined,
      transporterGstin: transporter || undefined,
      transporterName: form.transporterName.trim() || undefined,
      transportDocumentNumber: documentNumber || undefined,
      transportDocumentDateUtc: form.transportDocumentDate
        ? new Date(`${form.transportDocumentDate}T00:00:00+05:30`).toISOString()
        : undefined,
      distanceInKm: Math.round(distance),
    },
  };
}

/** Asks why a number is being cancelled; null when the user backs out. */
export async function askCancelReason(
  confirm: ConfirmService,
  what: 'e-invoice' | 'e-way bill',
  number: string,
  live: boolean,
): Promise<CancelGstDocumentInput | null> {
  const values = await confirm.prompt({
    title: `Cancel ${what}?`,
    message: live
      ? `${number} will be cancelled on the GST portal. This cannot be undone, and is allowed only within 24 hours of generating it.`
      : `${number} will be marked cancelled.`,
    confirmText: `Cancel ${what}`,
    cancelText: 'Keep it',
    fields: [
      {
        key: 'reason',
        label: 'Reason',
        required: true,
        value: String(GstCancelReason.DataEntryMistake),
        options: [
          { value: String(GstCancelReason.DataEntryMistake), label: 'Data entry mistake' },
          { value: String(GstCancelReason.OrderCancelled), label: 'Order cancelled' },
          { value: String(GstCancelReason.Duplicate), label: 'Duplicate' },
          { value: String(GstCancelReason.Other), label: 'Other' },
        ],
      },
      {
        key: 'remarks',
        label: 'Remarks',
        required: true,
        maxLength: 100,
        placeholder: 'What went wrong, in a few words',
      },
    ],
  });
  if (!values) return null;
  return {
    reason: Number(values['reason']) as GstCancelReason,
    remarks: (values['remarks'] ?? '').trim(),
  };
}
