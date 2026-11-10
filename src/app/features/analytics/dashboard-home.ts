import { DashboardMetricUnit } from '../../proxy/analytics';
import { inrCompact } from '../../core/util/format';

/** The dashboard this person pinned to the home page (a per-device preference). */
export const HOME_DASHBOARD_KEY = 'ar_home_dashboard';

/** The id of the dashboard pinned to the home page on this device, if any. */
export function pinnedHomeDashboard(): string | null {
  try {
    return localStorage.getItem(HOME_DASHBOARD_KEY);
  } catch {
    return null;
  }
}

/** A rendered metric as shown on a tile: a rate as a percentage, money in rupees. */
export function formatMetric(value: number, unit: DashboardMetricUnit): string {
  if (unit === DashboardMetricUnit.Rate) return `${(value * 100).toFixed(1)}%`;
  if (unit === DashboardMetricUnit.Rupees) {
    const rupees = value / 100;
    return Math.abs(rupees) >= 1_00_000
      ? inrCompact(rupees)
      : `₹${rupees.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  }
  return value.toLocaleString('en-IN');
}
