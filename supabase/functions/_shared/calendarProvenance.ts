// Idempotency / provenance guards shared by pull and push.
//
// Root cause of the mass-duplication incident: a local row that originated on
// Google but lost (or never had) its mapping was treated as a brand-new local
// event and POSTed back to Google, which then pulled it again — an unbounded
// create loop. A remote event may only be created for a row proven to be local.

export interface ProvenanceEvent {
  source?: string | null;
  is_read_only?: boolean | null;
  recurrence?: unknown;
  deleted_by_sync?: boolean | null;
}

/** True when the row carries any evidence of provider (Google) origin. */
export function isProviderOriginEvent(event: ProvenanceEvent | null | undefined): boolean {
  if (!event) return false;
  if (typeof event.source === "string" && event.source.toLowerCase() === "google") return true;
  if (event.is_read_only === true) return true;
  if (Array.isArray(event.recurrence) && event.recurrence.length > 0) return true;
  return false;
}

/**
 * Fail-closed decision for "create this local event on Google".
 * Only an unmapped row with no provider evidence may be created remotely.
 * `hasAnyMapping` covers tombstoned/legacy mappings: their existence proves the
 * event already has a remote identity and must never be recreated.
 */
export function canCreateOnGoogle(
  event: ProvenanceEvent | null | undefined,
  opts: { hasAnyMapping: boolean },
): boolean {
  if (!event) return false;
  if (opts.hasAnyMapping) return false;
  return !isProviderOriginEvent(event);
}
