// Minimal OAuth scope set for the Agentes de Sonhos <-> Google Calendar sync.
//
// Proven by the endpoints the integration actually calls:
//  * calendar.events               -> list/insert/patch/delete on
//                                    /calendar/v3/calendars/primary/events
//  * calendar.calendars.readonly   -> GET /calendar/v3/calendars/primary
//                                    (?fields=timeZone) to render events in the
//                                    calendar's real time zone
// No other Calendar endpoint is used, so the broad `auth/calendar` scope is not
// requested anymore.

export const CALENDAR_EVENTS_SCOPE = "https://www.googleapis.com/auth/calendar.events";
export const CALENDAR_READONLY_SCOPE = "https://www.googleapis.com/auth/calendar.calendars.readonly";

/** Scopes requested on every new/renewed consent. */
export const REQUIRED_SCOPES = [CALENDAR_EVENTS_SCOPE, CALENDAR_READONLY_SCOPE] as const;

/** Version stamp persisted with the connection when the minimal set is granted. */
export const OAUTH_SCOPE_VERSION = 2;

/** Legacy broad scope kept only for detection of pre-existing connections. */
export const LEGACY_FULL_SCOPE = "https://www.googleapis.com/auth/calendar";

export function parseScopeString(scope: string | null | undefined): string[] {
  if (typeof scope !== "string") return [];
  return scope.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
}

/**
 * The events scope is the only hard requirement: without it the sync cannot
 * read or write anything. The calendars.readonly scope is optional — its
 * absence only costs the time-zone lookup, which has a safe fallback.
 */
export function hasRequiredScopes(granted: string[]): boolean {
  return granted.includes(CALENDAR_EVENTS_SCOPE) || granted.includes(LEGACY_FULL_SCOPE);
}

export function hasCalendarsReadonly(granted: string[]): boolean {
  return granted.includes(CALENDAR_READONLY_SCOPE) || granted.includes(LEGACY_FULL_SCOPE);
}

/** True when the grant is broader than what this integration needs. */
export function isOverbroadScope(granted: string[]): boolean {
  return granted.includes(LEGACY_FULL_SCOPE);
}

/**
 * Version to persist for a grant: 2 only when the grant is exactly the minimal
 * set (no legacy broad scope). Anything broader stays at 1 so the connection is
 * visibly pending a scope downgrade.
 */
export function resolveScopeVersion(granted: string[]): number {
  if (isOverbroadScope(granted)) return 1;
  return hasRequiredScopes(granted) ? OAUTH_SCOPE_VERSION : 0;
}
