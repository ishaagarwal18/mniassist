import { describe, expect, it } from 'vitest';
import { NegotiationSessionDto } from '../../../proxy/pipeline/negotiation-agent.models';
import { NegotiationSessionStatus } from '../../../proxy/pipeline/negotiation-enums';
import {
  marginPosition,
  matchesFilter,
  rulesProblem,
  rupeesToPaise,
  totalsOf,
} from './ai-negotiator.logic';

const session = (status: NegotiationSessionStatus, margin = 20) =>
  ({ status, currentMarginPercent: margin }) as NegotiationSessionDto;

describe('ai-negotiator.logic', () => {
  it('counts negotiations and the margin kept on agreed ones', () => {
    const t = totalsOf([
      session(NegotiationSessionStatus.Negotiating),
      session(NegotiationSessionStatus.Agreed, 20),
      session(NegotiationSessionStatus.Agreed, 25),
      session(NegotiationSessionStatus.EscalatedToHuman),
      session(NegotiationSessionStatus.WalkedAway),
    ]);
    expect(t).toEqual({ open: 1, agreed: 2, needsYou: 1, closed: 3, avgAgreedMargin: 22.5 });
    expect(totalsOf([]).avgAgreedMargin).toBeNull();
  });

  it('filters by where a negotiation stands', () => {
    expect(matchesFilter(session(NegotiationSessionStatus.EscalatedToHuman), 'needs-you')).toBe(
      true,
    );
    expect(matchesFilter(session(NegotiationSessionStatus.Agreed), 'open')).toBe(false);
    expect(matchesFilter(session(NegotiationSessionStatus.Expired), 'closed')).toBe(true);
  });

  it('reads rupees and places margins on the bar', () => {
    expect(rupeesToPaise('1,18,000')).toBe(1_18_000_00);
    expect(rupeesToPaise('0')).toBeNull();
    expect(rupeesToPaise('abc')).toBeNull();
    expect(marginPosition(20)).toBe(50);
    expect(marginPosition(80)).toBe(100);
  });

  it('checks the rules make sense together', () => {
    const ok = {
      targetMarginPercent: 25,
      floorMarginPercent: 15,
      maxDiscountPercent: 10,
      maxRounds: 4,
      concessionStepPercent: 2.5,
    };
    expect(rulesProblem(ok)).toBeNull();
    expect(rulesProblem({ ...ok, floorMarginPercent: 30 })).toContain('cannot be above');
    expect(rulesProblem({ ...ok, maxRounds: 2.5 })).toContain('whole number');
  });
});
