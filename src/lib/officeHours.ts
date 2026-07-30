// Office-hours logic for white-label product landing pages.
// The reference clock comes from the server (returned by the public RPC),
// never from the visitor's local machine, and windows are evaluated in the
// agency's own timezone.

export type DayKey = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";
export type HourWindow = [string, string];
export type OfficeHours = Partial<Record<DayKey, HourWindow[]>>;

export const DAY_KEYS: DayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export const DAY_LABELS: Record<DayKey, string> = {
  sun: "Domingo",
  mon: "Segunda",
  tue: "Terça",
  wed: "Quarta",
  thu: "Quinta",
  fri: "Sexta",
  sat: "Sábado",
};

export const DEFAULT_TIMEZONE = "America/Sao_Paulo";

export const DEFAULT_OFFICE_HOURS: OfficeHours = {
  mon: [["08:00", "18:00"]],
  tue: [["08:00", "18:00"]],
  wed: [["08:00", "18:00"]],
  thu: [["08:00", "18:00"]],
  fri: [["08:00", "18:00"]],
  sat: [],
  sun: [],
};

/** "HH:MM" -> minutes since midnight. Returns null when malformed. */
export function parseHm(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec((value ?? "").trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 24 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

/** Weekday index (0=sun) and minutes-of-day for a moment in a given timezone. */
export function zonedParts(now: Date, timezone: string): { day: number; minutes: number } {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone || DEFAULT_TIMEZONE,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(now);
  } catch {
    parts = new Intl.DateTimeFormat("en-US", {
      timeZone: DEFAULT_TIMEZONE,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(now);
  }
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const wd = get("weekday").toLowerCase().slice(0, 3) as DayKey;
  const day = Math.max(0, DAY_KEYS.indexOf(wd));
  const hour = Number(get("hour") === "24" ? "0" : get("hour"));
  const minute = Number(get("minute"));
  return { day, minutes: hour * 60 + minute };
}

function windowsFor(hours: OfficeHours, dayIndex: number): HourWindow[] {
  const key = DAY_KEYS[((dayIndex % 7) + 7) % 7];
  const list = hours?.[key];
  return Array.isArray(list) ? list : [];
}

/**
 * True when `now` falls inside one of the agency's service windows.
 * Overnight windows (end <= start, e.g. 22:00-02:00) are split so that the
 * tail belongs to the following day.
 */
export function isWithinOfficeHours(
  hours: OfficeHours | null | undefined,
  timezone: string | null | undefined,
  now: Date = new Date()
): boolean {
  const effective = hours && Object.keys(hours).length > 0 ? hours : DEFAULT_OFFICE_HOURS;
  const { day, minutes } = zonedParts(now, timezone || DEFAULT_TIMEZONE);

  // Same-day windows
  for (const [from, to] of windowsFor(effective, day)) {
    const start = parseHm(from);
    const end = parseHm(to);
    if (start === null || end === null) continue;
    if (end > start) {
      if (minutes >= start && minutes < end) return true;
    } else {
      // overnight: today's tail after `start`
      if (minutes >= start) return true;
    }
  }

  // Overnight windows that started yesterday
  for (const [from, to] of windowsFor(effective, day - 1)) {
    const start = parseHm(from);
    const end = parseHm(to);
    if (start === null || end === null) continue;
    if (end <= start && minutes < end) return true;
  }

  return false;
}

/** Human-readable summary, e.g. "Seg. a Sex., das 08:00 às 18:00". */
export function describeOfficeHours(hours: OfficeHours | null | undefined): string {
  const effective = hours && Object.keys(hours).length > 0 ? hours : DEFAULT_OFFICE_HOURS;
  const lines: string[] = [];
  for (const key of ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as DayKey[]) {
    const list = effective[key] ?? [];
    if (!list.length) continue;
    const ranges = list
      .filter(([a, b]) => parseHm(a) !== null && parseHm(b) !== null)
      .map(([a, b]) => `${a} às ${b}`)
      .join(" e ");
    if (ranges) lines.push(`${DAY_LABELS[key]}: ${ranges}`);
  }
  return lines.length ? lines.join(" • ") : "Atendimento por formulário";
}

/** Normalizes arbitrary JSON coming from the database into OfficeHours. */
export function normalizeOfficeHours(raw: unknown): OfficeHours {
  if (!raw || typeof raw !== "object") return DEFAULT_OFFICE_HOURS;
  const out: OfficeHours = {};
  for (const key of DAY_KEYS) {
    const list = (raw as Record<string, unknown>)[key];
    if (!Array.isArray(list)) {
      out[key] = [];
      continue;
    }
    out[key] = list
      .filter(
        (w): w is HourWindow =>
          Array.isArray(w) &&
          w.length === 2 &&
          typeof w[0] === "string" &&
          typeof w[1] === "string" &&
          parseHm(w[0]) !== null &&
          parseHm(w[1]) !== null
      )
      .map(([a, b]) => [a, b] as HourWindow);
  }
  return out;
}