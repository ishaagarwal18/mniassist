import { KpiDto, KpiUnit } from '../../proxy/analytics';
import { changeOf } from '../services/report-period.store';
import { count, inr, inrCompact } from './format';
import type { StatTone } from '../../ui';

/** A headline figure in its own unit: "6,230", "₹22,541", "96.8%", "11 min". */
export function formatKpi(unit: KpiUnit, value: number | null | undefined): string {
  if (value == null) return '—';
  switch (unit) {
    case KpiUnit.Rupees:
      return Math.abs(value) >= 1_00_00_000 ? inrCompact(value / 100) : inr(value);
    case KpiUnit.Rate:
      return `${(value * 100).toFixed(1)}%`;
    case KpiUnit.Minutes:
      return value < 60
        ? `${Math.round(value)} min`
        : `${Math.floor(value / 60)}h ${Math.round(value % 60)}m`;
    default:
      return count(value);
  }
}

/** The tile's note and colour: the change on the period before, when comparing. */
export function kpiNote(
  kpi: KpiDto,
  compare: boolean,
  previousLabel: string,
): { note: string | null; tone: StatTone } {
  const scope = kpi.scope === 'workspace' ? 'All channels' : null;
  if (!compare) return { note: scope, tone: 'neutral' };
  const change = changeOf(kpi.current, kpi.previous, {
    rate: kpi.unit === KpiUnit.Rate,
    higherIsBetter: kpi.higherIsBetter,
  });
  if (!change) return { note: scope ?? `nothing ${previousLabel}`, tone: 'neutral' };
  return {
    note: `${change.text} ${previousLabel}`,
    tone: change.good == null ? 'neutral' : change.good ? 'good' : 'bad',
  };
}
