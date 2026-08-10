/**
 * Block 3 — fidelity, conflict policy and safe deletions.
 *
 * Pure helpers (no network, no Deno APIs) so the whole policy is unit-testable:
 *  - Google → local mapping with real start/end, timezone, all-day semantics,
 *    location, attendees, organizer, reminders, conference data and recurrence.
 *  - Read-only classification (Google-managed, recurring instances, non-default
 *    event types, non-editable organizer, secondary calendars).
 *  - Non-destructive push payloads: only UI-controlled fields, PATCH semantics.
 *  - Conflict detection from etag/updated vs snapshot and local updated_at vs
 *    the marker persisted at the last sync.
 *  - Remote-deletion guard: only proven local-origin editable mappings may
 *    propagate a DELETE to Google.
 */

/** Last-resort IANA zone. Never an offset literal such as "-03:00". */
export const FALLBACK_TIME_ZONE = "America/Sao_Paulo";
/** Duration applied to legacy local events that have no end at all. */
export const DEFAULT_DURATION_MINUTES = 60;

export type EventOrigin = "local" | "google";
export type ChangeSide = "none" | "google_only" | "local_only" | "both";
export type SyncDecision = "noop" | "pull" | "push" | "conflict" | "skip_read_only";

export interface GoogleEventLike {
  id?: string;
  etag?: string;
  status?: string;
  summary?: string;
  description?: string;
  location?: string;
  updated?: string;
  eventType?: string;
  recurringEventId?: string;
  recurrence?: string[];
  originalStartTime?: { date?: string; dateTime?: string; timeZone?: string };
  start?: { date?: string; dateTime?: string; timeZone?: string };
  end?: { date?: string; dateTime?: string; timeZone?: string };
  organizer?: { email?: string; displayName?: string; self?: boolean };
  creator?: { email?: string; self?: boolean };
  attendees?: Array<{
    email?: string;
    displayName?: string;
    responseStatus?: string;
    optional?: boolean;
    organizer?: boolean;
    self?: boolean;
  }>;
  reminders?: { useDefault?: boolean; overrides?: Array<{ method?: string; minutes?: number }> };
  hangoutLink?: string;
  conferenceData?: {
    conferenceId?: string;
    entryPoints?: Array<{ entryPointType?: string; uri?: string; label?: string }>;
  };
  locked?: boolean;
  guestsCanModify?: boolean;
  extendedProperties?: { private?: Record<string, string>; shared?: Record<string, string> };
}

// ---------------------------------------------------------------------------
// Read-only classification
// ---------------------------------------------------------------------------

export interface ReadOnlyClassification {
  isGoogleManaged: boolean;
  isRecurringInstance: boolean;
  isReadOnly: boolean;
  reasons: string[];
}

/**
 * A Google event is mirrored locally but must never be written back when it is
 * managed by Google, an expanded recurring instance, of a non-default type, not
 * organized by (or editable for) this account, or from a secondary calendar.
 */
export function classifyGoogleEvent(
  gEvent: GoogleEventLike,
  opts: { calendarId?: string; primaryCalendarId?: string } = {},
): ReadOnlyClassification {
  const reasons: string[] = [];
  const eventType = gEvent.eventType || "default";
  const isGoogleManaged = eventType !== "default" || gEvent.locked === true;
  if (eventType !== "default") reasons.push(`event_type:${eventType}`);
  if (gEvent.locked === true) reasons.push("locked");

  const isRecurringInstance = !!gEvent.recurringEventId;
  if (isRecurringInstance) reasons.push("recurring_instance");
  if (!isRecurringInstance && (gEvent.recurrence?.length ?? 0) > 0) reasons.push("recurring_series");

  // Not our event and guests cannot edit it → read-only.
  const organizerSelf = gEvent.organizer?.self;
  if (organizerSelf === false && gEvent.guestsCanModify !== true) reasons.push("organizer_not_editable");

  const calendarId = opts.calendarId ?? "primary";
  const primary = opts.primaryCalendarId ?? "primary";
  if (calendarId !== primary) reasons.push("secondary_calendar");

  return {
    isGoogleManaged,
    isRecurringInstance,
    isReadOnly: reasons.length > 0,
    reasons,
  };
}

// ---------------------------------------------------------------------------
// Google → local mapping (fidelity)
// ---------------------------------------------------------------------------

export interface LocalEventFields {
  title: string;
  description: string | null;
  event_date: string;
  event_time: string | null;
  end_date: string | null;
  end_time: string | null;
  start_at: string | null;
  end_at: string | null;
  time_zone: string | null;
  all_day: boolean;
  location: string | null;
  conference_url: string | null;
  attendees: unknown[] | null;
  reminders: unknown | null;
  organizer: unknown | null;
  recurrence: unknown | null;
  is_read_only: boolean;
  source: EventOrigin;
}

/** Wall-clock date part of an RFC3339 dateTime, without any UTC conversion. */
export function wallDate(dateTime: string): string {
  return dateTime.slice(0, 10);
}

/** Wall-clock HH:MM of an RFC3339 dateTime, without any UTC conversion. */
export function wallTime(dateTime: string): string {
  return dateTime.slice(11, 16);
}

/** Adds whole days to a YYYY-MM-DD string using UTC arithmetic (DST-safe). */
export function shiftDay(date: string, days: number): string {
  const base = new Date(`${date}T00:00:00Z`);
  return new Date(base.getTime() + days * 86_400_000).toISOString().slice(0, 10);
}

/** Adds minutes to a wall HH:MM, returning the new time and a day carry. */
export function shiftWallTime(time: string, minutes: number): { time: string; dayCarry: number } {
  const [h, m] = time.split(":").map((v) => parseInt(v, 10));
  const total = h * 60 + m + minutes;
  const dayCarry = Math.floor(total / 1440);
  const rest = ((total % 1440) + 1440) % 1440;
  const hh = String(Math.floor(rest / 60)).padStart(2, "0");
  const mm = String(rest % 60).padStart(2, "0");
  return { time: `${hh}:${mm}`, dayCarry };
}

/** First video entry point of a conference, or the legacy hangoutLink. */
export function extractConferenceUrl(gEvent: GoogleEventLike): string | null {
  const entry = gEvent.conferenceData?.entryPoints?.find((p) => p.entryPointType === "video");
  return entry?.uri || gEvent.hangoutLink || null;
}

/** Attendees are kept with the fields the UI needs, nothing else. */
export function sanitizeAttendees(gEvent: GoogleEventLike): unknown[] | null {
  if (!gEvent.attendees?.length) return null;
  return gEvent.attendees.map((a) => ({
    email: a.email ?? null,
    displayName: a.displayName ?? null,
    responseStatus: a.responseStatus ?? null,
    optional: a.optional ?? false,
    organizer: a.organizer ?? false,
    self: a.self ?? false,
  }));
}

/** Counts only — used for logs, diagnostics and conflict snapshots. */
export function summarizeAttendees(gEvent: GoogleEventLike): {
  count: number;
  accepted: number;
  declined: number;
  needs_action: number;
} {
  const list = gEvent.attendees ?? [];
  return {
    count: list.length,
    accepted: list.filter((a) => a.responseStatus === "accepted").length,
    declined: list.filter((a) => a.responseStatus === "declined").length,
    needs_action: list.filter((a) => a.responseStatus === "needsAction").length,
  };
}

/**
 * Maps a Google event to local columns preserving real duration and timezone.
 * All-day events keep Google's exclusive end in the snapshot while `end_date`
 * stores the inclusive last day used by the local calendar UI.
 */
export function mapGoogleEventToLocal(
  gEvent: GoogleEventLike,
  opts: { calendarId?: string; primaryCalendarId?: string; readOnly?: boolean } = {},
): LocalEventFields | null {
  const allDay = !!gEvent.start?.date && !gEvent.start?.dateTime;
  const startRaw = gEvent.start?.dateTime || gEvent.start?.date;
  if (!startRaw) return null;

  const classification = classifyGoogleEvent(gEvent, opts);
  const readOnly = opts.readOnly ?? classification.isReadOnly;

  const base = {
    title: gEvent.summary || "Sem título",
    description: gEvent.description || null,
    location: gEvent.location || null,
    conference_url: extractConferenceUrl(gEvent),
    attendees: sanitizeAttendees(gEvent),
    reminders: gEvent.reminders ?? null,
    organizer: gEvent.organizer
      ? {
          email: gEvent.organizer.email ?? null,
          displayName: gEvent.organizer.displayName ?? null,
          self: gEvent.organizer.self ?? false,
        }
      : null,
    recurrence: gEvent.recurrence?.length ? gEvent.recurrence : null,
    is_read_only: readOnly,
    source: "google" as EventOrigin,
  };

  if (allDay) {
    const startDay = gEvent.start!.date!;
    // Google's end.date is exclusive; the inclusive last day is end - 1 day.
    const exclusiveEnd = gEvent.end?.date ?? shiftDay(startDay, 1);
    const inclusiveEnd = shiftDay(exclusiveEnd, -1);
    return {
      ...base,
      event_date: startDay,
      event_time: null,
      end_date: inclusiveEnd < startDay ? startDay : inclusiveEnd,
      end_time: null,
      start_at: null,
      end_at: null,
      time_zone: gEvent.start?.timeZone ?? null,
      all_day: true,
    };
  }

  const startDateTime = gEvent.start!.dateTime!;
  const endDateTime = gEvent.end?.dateTime ?? null;
  return {
    ...base,
    event_date: wallDate(startDateTime),
    event_time: wallTime(startDateTime),
    end_date: endDateTime ? wallDate(endDateTime) : null,
    end_time: endDateTime ? wallTime(endDateTime) : null,
    start_at: new Date(startDateTime).toISOString(),
    end_at: endDateTime ? new Date(endDateTime).toISOString() : null,
    time_zone: gEvent.start?.timeZone ?? gEvent.end?.timeZone ?? null,
    all_day: false,
  };
}

// ---------------------------------------------------------------------------
// Provider snapshot + mapping metadata
// ---------------------------------------------------------------------------

export interface ProviderSnapshot {
  id: string | null;
  etag: string | null;
  updated: string | null;
  status: string | null;
  event_type: string;
  summary: string | null;
  start: { date?: string; dateTime?: string; timeZone?: string } | null;
  end: { date?: string; dateTime?: string; timeZone?: string } | null;
  location: string | null;
  recurring_event_id: string | null;
  original_start_time: string | null;
  recurrence_count: number;
  attendee_summary: { count: number; accepted: number; declined: number; needs_action: number };
  has_conference: boolean;
  captured_at: string;
}

/**
 * Compact snapshot of the Google state used for conflict comparison. Attendees
 * are reduced to counts so no personal data is duplicated into diagnostics.
 */
export function buildProviderSnapshot(gEvent: GoogleEventLike, now?: string): ProviderSnapshot {
  return {
    id: gEvent.id ?? null,
    etag: gEvent.etag ?? null,
    updated: gEvent.updated ?? null,
    status: gEvent.status ?? null,
    event_type: gEvent.eventType || "default",
    summary: gEvent.summary ?? null,
    start: gEvent.start ?? null,
    end: gEvent.end ?? null,
    location: gEvent.location ?? null,
    recurring_event_id: gEvent.recurringEventId ?? null,
    original_start_time:
      gEvent.originalStartTime?.dateTime ?? gEvent.originalStartTime?.date ?? null,
    recurrence_count: gEvent.recurrence?.length ?? 0,
    attendee_summary: summarizeAttendees(gEvent),
    has_conference: !!extractConferenceUrl(gEvent),
    captured_at: now ?? new Date().toISOString(),
  };
}

/** Columns written to google_calendar_sync after a successful pull/push. */
export function buildMappingMetadata(
  gEvent: GoogleEventLike,
  opts: {
    origin: EventOrigin;
    calendarId?: string;
    localUpdatedAt?: string | null;
    now?: string;
    primaryCalendarId?: string;
  },
): Record<string, unknown> {
  return buildMappingMetadataInternal(gEvent, opts);
}

/**
 * Legacy backfill escape hatch.
 *
 * The Block 3 backfill marked every pre-existing mapping as
 * `is_read_only = true` for safety. That must not be permanent: on the first
 * successful pull we reclassify the event against Google's real state and
 * release the read-only flag for plain editable events. `origin` stays
 * 'google' so remote DELETE remains blocked.
 *
 * Returns null when nothing needs to change.
 */
export function buildReadOnlyReclassification(
  gEvent: GoogleEventLike,
  mapping: { is_read_only?: boolean | null; is_google_managed?: boolean | null; origin?: string | null },
  opts: { calendarId?: string; primaryCalendarId?: string } = {},
): { is_read_only: boolean; is_google_managed: boolean; event_type: string } | null {
  const classification = classifyGoogleEvent(gEvent, opts);
  const currentReadOnly = mapping.is_read_only === true;
  const currentManaged = mapping.is_google_managed === true;
  if (currentReadOnly === classification.isReadOnly && currentManaged === classification.isGoogleManaged) {
    return null;
  }
  return {
    is_read_only: classification.isReadOnly,
    is_google_managed: classification.isGoogleManaged,
    event_type: gEvent.eventType || "default",
  };
}

function buildMappingMetadataInternal(
  gEvent: GoogleEventLike,
  opts: {
    origin: EventOrigin;
    calendarId?: string;
    localUpdatedAt?: string | null;
    now?: string;
    primaryCalendarId?: string;
  },
): Record<string, unknown> {
  const classification = classifyGoogleEvent(gEvent, {
    calendarId: opts.calendarId,
    primaryCalendarId: opts.primaryCalendarId,
  });
  const now = opts.now ?? new Date().toISOString();
  return {
    google_etag: gEvent.etag ?? null,
    google_updated: gEvent.updated ?? null,
    google_calendar_id: opts.calendarId ?? "primary",
    recurring_event_id: gEvent.recurringEventId ?? null,
    original_start_time:
      gEvent.originalStartTime?.dateTime ?? gEvent.originalStartTime?.date ?? null,
    event_type: gEvent.eventType || "default",
    is_google_managed: classification.isGoogleManaged,
    // A local-origin event is only read-only when Google says so.
    is_read_only: classification.isReadOnly,
    origin: opts.origin,
    provider_snapshot: buildProviderSnapshot(gEvent, now),
    local_updated_at_at_sync: opts.localUpdatedAt ?? null,
    last_synced_at: now,
  };
}

// ---------------------------------------------------------------------------
// Push payload (non-destructive)
// ---------------------------------------------------------------------------

/** Fields the local UI owns. Anything outside this list is never sent. */
export const CONTROLLED_PUSH_FIELDS = ["summary", "description", "start", "end", "location"] as const;
/** Fields that would destroy Google-side data if sent empty/undefined. */
export const FORBIDDEN_PUSH_FIELDS = [
  "attendees",
  "conferenceData",
  "recurrence",
  "reminders",
  "organizer",
  "visibility",
  "transparency",
  "guestsCanModify",
  "extendedProperties",
  "colorId",
  "status",
] as const;

export interface LocalEventLike {
  id?: string;
  title?: string | null;
  description?: string | null;
  event_date?: string | null;
  event_time?: string | null;
  end_date?: string | null;
  end_time?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  time_zone?: string | null;
  all_day?: boolean | null;
  location?: string | null;
  updated_at?: string | null;
}

/**
 * Converts an absolute instant (ISO/UTC) into the wall date and time observed
 * in an IANA zone. Uses Intl.formatToParts, so DST transitions are handled by
 * the timezone database instead of a fixed offset. An ISO UTC string is NEVER
 * treated as local wall time.
 */
export function wallTimeInZone(
  instant: string,
  timeZone: string,
): { date: string; time: string } | null {
  const ms = Date.parse(instant);
  if (!Number.isFinite(ms)) return null;
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).formatToParts(new Date(ms));
  } catch {
    // Unknown zone: fall back to the platform zone rather than breaking sync.
    if (timeZone === FALLBACK_TIME_ZONE) return null;
    return wallTimeInZone(instant, FALLBACK_TIME_ZONE);
  }
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const hour = get("hour") === "24" ? "00" : get("hour");
  const date = `${get("year")}-${get("month")}-${get("day")}`;
  const time = `${hour}:${get("minute")}`;
  if (date.length !== 10 || time.length !== 5) return null;
  return { date, time };
}

/**
 * Resolves the IANA zone for a push: the event's own zone, then the
 * profile/agency configuration, then the platform fallback. Offset literals
 * ("-03:00") are rejected — Google needs a real IANA identifier.
 */
export function resolvePushTimeZone(
  localEvent: LocalEventLike,
  profileTimeZone?: string | null,
): string {
  const isIana = (v?: string | null) => !!v && /^[A-Za-z]+\/[A-Za-z0-9_+\-/]+$/.test(v);
  if (isIana(localEvent.time_zone)) return localEvent.time_zone as string;
  if (isIana(profileTimeZone)) return profileTimeZone as string;
  return FALLBACK_TIME_ZONE;
}

export interface GooglePushPayload {
  summary: string;
  description?: string;
  location?: string;
  start: { date?: string; dateTime?: string; timeZone?: string };
  end: { date?: string; dateTime?: string; timeZone?: string };
}

/**
 * Builds the PATCH/POST body with UI-controlled fields only.
 *  - all-day → `date` with Google's exclusive end;
 *  - timed   → wall `dateTime` + IANA `timeZone`, never a fixed offset;
 *  - legacy events without any end → configurable fallback duration.
 */
export function buildGooglePushPayload(
  localEvent: LocalEventLike,
  opts: {
    profileTimeZone?: string | null;
    defaultDurationMinutes?: number;
  } = {},
): GooglePushPayload {
  const payload: GooglePushPayload = {
    summary: localEvent.title || "Sem título",
    start: {},
    end: {},
  };
  if (typeof localEvent.description === "string") payload.description = localEvent.description;
  // Location is only sent when the local record actually carries one, so a
  // Google-side location is never wiped by an empty string.
  if (typeof localEvent.location === "string" && localEvent.location.trim() !== "") {
    payload.location = localEvent.location;
  }

  const allDay = localEvent.all_day === true || !localEvent.event_time;
  const timeZone = resolvePushTimeZone(localEvent, opts.profileTimeZone);

  // Start: wall fields win; otherwise the stored instant converted into the
  // resolved IANA zone (never read as local wall time).
  const startFromInstant = !localEvent.event_date && localEvent.start_at
    ? wallTimeInZone(localEvent.start_at, timeZone)
    : null;
  const startDay = String(localEvent.event_date || startFromInstant?.date || "");

  if (allDay && !startFromInstant) {
    const inclusiveEnd = localEvent.end_date && localEvent.end_date >= startDay
      ? localEvent.end_date
      : startDay;
    payload.start = { date: startDay };
    payload.end = { date: shiftDay(inclusiveEnd, 1) }; // Google end is exclusive
    return payload;
  }

  const startTime = localEvent.event_time
    ? String(localEvent.event_time).slice(0, 5)
    : (startFromInstant?.time ?? "00:00");
  payload.start = { dateTime: `${startDay}T${startTime}:00`, timeZone };

  let endDay = localEvent.end_date || null;
  let endTime = localEvent.end_time ? String(localEvent.end_time).slice(0, 5) : null;
  if (!endTime && localEvent.end_at) {
    // Real end recorded as an instant: convert it, do not invent a duration.
    const wall = wallTimeInZone(localEvent.end_at, timeZone);
    if (wall) {
      endDay = wall.date;
      endTime = wall.time;
    }
  }
  if (!endTime) {
    const minutes = opts.defaultDurationMinutes ?? DEFAULT_DURATION_MINUTES;
    const shifted = shiftWallTime(startTime, minutes);
    endTime = shifted.time;
    endDay = shiftDay(endDay || startDay, shifted.dayCarry);
  }
  payload.end = { dateTime: `${endDay || startDay}T${endTime}:00`, timeZone };
  return payload;
}

/** Guard used in code and tests: the payload carries no destructive field. */
export function assertControlledPayload(payload: Record<string, unknown>): void {
  for (const field of FORBIDDEN_PUSH_FIELDS) {
    if (field in payload) {
      throw new Error(`push payload must not contain "${field}"`);
    }
  }
}

/** Headers for a non-destructive update: PATCH + optimistic concurrency. */
export function buildPatchHeaders(etag?: string | null): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (etag) headers["If-Match"] = etag;
  return headers;
}

/** Google answers a stale If-Match with 412 Precondition Failed. */
export function isPreconditionFailed(status: number): boolean {
  return status === 412;
}

// ---------------------------------------------------------------------------
// Conflict policy
// ---------------------------------------------------------------------------

export interface ChangeInput {
  googleEtag?: string | null;
  googleUpdated?: string | null;
  snapshotEtag?: string | null;
  snapshotUpdated?: string | null;
  localUpdatedAt?: string | null;
  localMarker?: string | null;
}

/** Compares both sides against the state persisted at the last sync. */
export function classifyChange(input: ChangeInput): ChangeSide {
  const googleChanged = (() => {
    if (input.googleEtag && input.snapshotEtag) return input.googleEtag !== input.snapshotEtag;
    if (input.googleUpdated && input.snapshotUpdated) {
      return new Date(input.googleUpdated).getTime() > new Date(input.snapshotUpdated).getTime();
    }
    // Unknown baseline: treat a present Google version as changed so the pull
    // refreshes local data instead of silently dropping it.
    return !!(input.googleEtag || input.googleUpdated);
  })();

  const localChanged = (() => {
    if (!input.localUpdatedAt) return false;
    if (!input.localMarker) return true;
    return new Date(input.localUpdatedAt).getTime() > new Date(input.localMarker).getTime();
  })();

  if (googleChanged && localChanged) return "both";
  if (googleChanged) return "google_only";
  if (localChanged) return "local_only";
  return "none";
}

/**
 * Turns a change classification into an action. A read-only or Google-managed
 * mapping can only ever be pulled — never pushed, updated or deleted remotely.
 */
export function decideSyncAction(
  change: ChangeSide,
  mapping: { is_read_only?: boolean | null; is_google_managed?: boolean | null; origin?: string | null },
): SyncDecision {
  const readOnly = mapping.is_read_only === true || mapping.is_google_managed === true;
  switch (change) {
    case "both":
      // Never overwrite either side.
      return "conflict";
    case "google_only":
      return "pull";
    case "local_only":
      return readOnly ? "skip_read_only" : "push";
    default:
      return "noop";
  }
}

export interface ConflictRecordInput {
  userId: string;
  syncId?: string | null;
  agencyEventId?: string | null;
  googleEventId?: string | null;
  conflictType?: "both_changed" | "precondition_failed";
  googleEvent?: GoogleEventLike | null;
  localEvent?: LocalEventLike | null;
  localUpdatedAt?: string | null;
  now?: string;
}

/** Row inserted into google_calendar_conflicts. Snapshots carry no PII lists. */
export function buildConflictRecord(input: ConflictRecordInput): Record<string, unknown> {
  const now = input.now ?? new Date().toISOString();
  const g = input.googleEvent ?? null;
  return {
    user_id: input.userId,
    sync_id: input.syncId ?? null,
    agency_event_id: input.agencyEventId ?? null,
    google_event_id: input.googleEventId ?? g?.id ?? null,
    conflict_type: input.conflictType ?? "both_changed",
    status: "open",
    google_snapshot: g ? buildProviderSnapshot(g, now) : null,
    local_snapshot: input.localEvent
      ? {
          id: input.localEvent.id ?? null,
          title: input.localEvent.title ?? null,
          event_date: input.localEvent.event_date ?? null,
          event_time: input.localEvent.event_time ?? null,
          end_date: input.localEvent.end_date ?? null,
          end_time: input.localEvent.end_time ?? null,
          all_day: input.localEvent.all_day ?? false,
          time_zone: input.localEvent.time_zone ?? null,
          location: input.localEvent.location ?? null,
          updated_at: input.localEvent.updated_at ?? null,
        }
      : null,
    google_etag: g?.etag ?? null,
    google_updated: g?.updated ?? null,
    local_updated_at: input.localUpdatedAt ?? input.localEvent?.updated_at ?? null,
    detected_at: now,
  };
}

/**
 * Identity of an open conflict: same mapping AND same pair of versions. A new
 * run over unchanged data must not create a second row.
 */
export function conflictDedupKey(row: {
  google_event_id?: string | null;
  google_etag?: string | null;
  local_updated_at?: string | null;
}): string {
  return [row.google_event_id ?? "", row.google_etag ?? "", row.local_updated_at ?? ""].join("|");
}

/** Conflict markers written on google_calendar_sync. Never reconnect_required. */
export function conflictMappingColumns(now?: string): Record<string, unknown> {
  return { conflict_state: "open", conflict_at: now ?? new Date().toISOString() };
}

export function clearConflictColumns(): Record<string, unknown> {
  return { conflict_state: "none", conflict_at: null };
}

// ---------------------------------------------------------------------------
// Deletion safety
// ---------------------------------------------------------------------------

export type DeleteDecision =
  | { allowed: true }
  | { allowed: false; reason: "read_only" | "google_origin" | "google_managed" | "recurring_instance" | "unknown_origin" };

/**
 * Only a mapping proven to originate locally and still editable may propagate a
 * DELETE to Google. Legacy/conservative mappings (origin='google', read-only)
 * are unlinked locally and reported as skipped.
 */
export function canDeleteRemotely(mapping: {
  origin?: string | null;
  is_read_only?: boolean | null;
  is_google_managed?: boolean | null;
  recurring_event_id?: string | null;
  event_type?: string | null;
}): DeleteDecision {
  if (mapping.is_google_managed === true) return { allowed: false, reason: "google_managed" };
  if (mapping.recurring_event_id) return { allowed: false, reason: "recurring_instance" };
  if (mapping.event_type && mapping.event_type !== "default") {
    return { allowed: false, reason: "google_managed" };
  }
  if (mapping.is_read_only === true) return { allowed: false, reason: "read_only" };
  if (!mapping.origin) return { allowed: false, reason: "unknown_origin" };
  if (mapping.origin !== "local") return { allowed: false, reason: "google_origin" };
  return { allowed: true };
}

/** Same guard for updates: read-only mappings never receive a PATCH. */
export function canPushUpdate(mapping: {
  origin?: string | null;
  is_read_only?: boolean | null;
  is_google_managed?: boolean | null;
  recurring_event_id?: string | null;
  event_type?: string | null;
}): boolean {
  if (mapping.is_google_managed === true) return false;
  if (mapping.is_read_only === true) return false;
  if (mapping.recurring_event_id) return false;
  if (mapping.event_type && mapping.event_type !== "default") return false;
  return true;
}