// Mirror of the server-side scheduling rule used for lead e-mail notifications.
// The server (product_landing_next_notify_at) is the source of truth; this
// module powers the configuration summary in the panel and the unit tests.
import { DAY_KEYS, DAY_LABELS, DEFAULT_TIMEZONE, parseHm, zonedParts, type DayKey } from "./officeHours";

export interface NotifyWindow {
  days: DayKey[];
  start: string;
  end: string;
  timezone: string;
}

/** True when `now` is inside the notification window, in the agency timezone. */
export function isWithinNotifyWindow(win: NotifyWindow, now: Date = new Date()): boolean {
  const start = parseHm(win.start);
  const end = parseHm(win.end);
  if (start === null || end === null || !win.days?.length) return false;
  const { day, minutes } = zonedParts(now, win.timezone || DEFAULT_TIMEZONE);
  const todayKey = DAY_KEYS[day];
  const yesterdayKey = DAY_KEYS[(day + 6) % 7];

  if (end > start) {
    return win.days.includes(todayKey) && minutes >= start && minutes < end;
  }
  // Overnight window: tail belongs to the following day.
  if (win.days.includes(todayKey) && minutes >= start) return true;
  return win.days.includes(yesterdayKey) && minutes < end;
}

/**
 * Start of the next notification window, or null when we are inside one
 * (meaning: send immediately). Looks up to 8 days ahead.
 */
export function nextNotifyAt(win: NotifyWindow, now: Date = new Date()): Date | null {
  const start = parseHm(win.start);
  if (start === null || !win.days?.length) return null;
  if (isWithinNotifyWindow(win, now)) return null;

  const tz = win.timezone || DEFAULT_TIMEZONE;
  for (let i = 0; i <= 8; i++) {
    const candidate = new Date(now.getTime() + i * 86_400_000);
    const { day } = zonedParts(candidate, tz);
    if (!win.days.includes(DAY_KEYS[day])) continue;
    const at = atZonedTime(candidate, tz, start);
    if (at.getTime() > now.getTime()) return at;
  }
  return null;
}

/** Builds the instant matching `minutes` of the local day of `ref` in `tz`. */
function atZonedTime(ref: Date, tz: string, minutes: number): Date {
  const { minutes: current } = zonedParts(ref, tz);
  return new Date(ref.getTime() + (minutes - current) * 60_000);
}

export function describeNotifyWindow(win: NotifyWindow): string {
  if (!win.days?.length) return "Nenhum dia selecionado";
  const ordered: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const labels = ordered
    .filter((d) => win.days.includes(d))
    .map((d) => DAY_LABELS[d].slice(0, 3));
  return `${labels.join(", ")} • ${win.start} às ${win.end}`;
}