/**
 * Commercial metrics for product landing pages.
 *
 * Homologation (test) events are flagged server-side with `is_test` and must
 * never inflate the agency's commercial indicators. The `is_test` flag comes
 * exclusively from the landing's admin-controlled `test_mode_until` window —
 * public visitors cannot set it.
 */
export interface LandingEvent {
  is_test?: boolean | null;
}

export interface LandingMetrics {
  views: number;
  leads: number;
  conversion: number;
  testViews: number;
  testLeads: number;
}

const real = (e: LandingEvent) => !e.is_test;

export function computeLandingMetrics(
  views: LandingEvent[] = [],
  leads: LandingEvent[] = []
): LandingMetrics {
  const v = views.filter(real).length;
  const l = leads.filter(real).length;
  return {
    views: v,
    leads: l,
    conversion: v > 0 ? Number(((l / v) * 100).toFixed(1)) : 0,
    testViews: views.length - v,
    testLeads: leads.length - l,
  };
}

/** Conversion rate from already-filtered counters stored on the landing row. */
export function conversionRate(views: number, leads: number): string {
  return views > 0 ? ((leads / views) * 100).toFixed(1) : "0";
}

/** True while an admin-scheduled homologation window is still open. */
export function isTestModeActive(
  testModeUntil: string | null | undefined,
  now: Date = new Date()
): boolean {
  if (!testModeUntil) return false;
  const until = new Date(testModeUntil).getTime();
  return Number.isFinite(until) && until > now.getTime();
}
