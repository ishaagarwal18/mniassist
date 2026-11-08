import type { ChipTone } from '../../ui/chip';
import {
  SpaAgeBand,
  SpaClaimLineDto,
  SpaClaimLineState,
  SpaClaimStatus,
} from '../../proxy/oem/spa-claim.service';

export const CLAIM_STATUS_TEXT: Record<SpaClaimStatus, string> = {
  [SpaClaimStatus.Draft]: 'Draft',
  [SpaClaimStatus.Submitted]: 'Submitted',
  [SpaClaimStatus.PartlySettled]: 'Partly settled',
  [SpaClaimStatus.Settled]: 'Settled',
  [SpaClaimStatus.Rejected]: 'Rejected',
  [SpaClaimStatus.WrittenOff]: 'Written off',
};

export const CLAIM_STATUS_TONE: Record<SpaClaimStatus, ChipTone> = {
  [SpaClaimStatus.Draft]: 'amber',
  [SpaClaimStatus.Submitted]: 'teal',
  [SpaClaimStatus.PartlySettled]: 'teal',
  [SpaClaimStatus.Settled]: 'good',
  [SpaClaimStatus.Rejected]: 'bad',
  [SpaClaimStatus.WrittenOff]: 'neutral',
};

export const LINE_STATE_TEXT: Record<SpaClaimLineState, string> = {
  [SpaClaimLineState.Open]: 'Open',
  [SpaClaimLineState.Settled]: 'Settled',
  [SpaClaimLineState.Rejected]: 'Rejected',
  [SpaClaimLineState.WrittenOff]: 'Written off',
};

export const AGE_BAND_TEXT: Record<SpaAgeBand, string> = {
  [SpaAgeBand.UpTo30]: '0–30 days',
  [SpaAgeBand.UpTo60]: '31–60 days',
  [SpaAgeBand.UpTo90]: '61–90 days',
  [SpaAgeBand.Over90]: 'Over 90 days',
};

/** Per-line amounts as typed for a credit note (rupees), as the API's allocation in paise; blanks and zeros left out. */
export function allocationOf(
  typed: Record<string, string>,
): { lineId: string; amountInPaise: number }[] {
  return Object.entries(typed)
    .map(([lineId, text]) => ({
      lineId,
      amountInPaise: Math.round((Number(text.replace(/[₹,\s]/g, '')) || 0) * 100),
    }))
    .filter((a) => a.amountInPaise > 0);
}

/** What a credit note can still be matched to: the open lines with something outstanding. */
export function settleableLines(lines: readonly SpaClaimLineDto[]): SpaClaimLineDto[] {
  return lines.filter(
    (l) => l.state === SpaClaimLineState.Open && l.outstandingInPaise > 0 && l.amountInPaise > 0,
  );
}
