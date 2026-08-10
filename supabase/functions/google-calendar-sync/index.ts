import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  CRON_SECRET_HEADER,
  fetchCronSecret,
  isAuthorizedInternalCall,
} from "../_shared/calendarCronAuth.ts";
import {
  buildTokenColumns,
  getTokenEncKey,
  isCiphertext,
  readTokenField,
} from "../_shared/googleTokenCrypto.ts";
import {
  buildEventsListUrl,
  buildKeysetOrFilter,
  computeBootstrapUpdate,
  computeCursorResetUpdate,
  computeIncrementalUpdate,
  getPagingLimits,
  isBudgetExhausted,
  isBootstrapCompletionBlocked,
  isCursorGoneStatus,
  isPushScanComplete,
  isTransientSyncError,
  nextDeletedCursor,
  nextPushCursor,
  resolveIncrementalCycleBase,
  resolvePullMode,
  resolvePullWindow,
  resolveResumePageToken,
  resolveSyncStatus,
  type DeletedPushCursor,
  type PushCursor,
  type SyncLifecycleStatus,
} from "../_shared/calendarSyncPaging.ts";
import {
  assertControlledPayload,
  buildConflictRecord,
  buildGooglePushPayload,
  buildMappingMetadata,
  buildPatchHeaders,
  canDeleteRemotely,
  canPushUpdate,
  classifyChange,
  classifyGoogleEvent,
  clearConflictColumns,
  conflictDedupKey,
  conflictMappingColumns,
  decideSyncAction,
  DEFAULT_DURATION_MINUTES,
  isPreconditionFailed,
  mapGoogleEventToLocal,
} from "../_shared/calendarFidelity.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

interface GoogleEvent {
  id: string;
  etag?: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  status?: string;
  updated?: string;
  eventType?: string;
  recurringEventId?: string;
  organizer?: { email?: string; displayName?: string; self?: boolean };
  attendees?: Array<Record<string, unknown>>;
  recurrence?: string[];
  extendedProperties?: { private?: Record<string, string>; shared?: Record<string, string> };
}

// Structured reason codes recorded for every ignored item during sync.
type PushSkipReason =
  | "mapping_soft_deleted"
  | "duplicate_local_signature"
  | "unchanged_since_last_sync"
  | "read_only_mapping"
  | "google_created_without_id";

type PullSkipReason =
  | "created_during_current_push"
  | "unsupported_event_type"
  | "cancelled_event"
  | "missing_start_date"
  | "mapping_tombstoned"
  | "already_synced_unchanged"
  | "local_reference_missing";

interface SkipSample {
  reason: string;
  google_event_id?: string;
  agency_event_id?: string;
  title?: string;
  calendar_id?: string;
  start?: string | null;
  end?: string | null;
  status?: string | null;
  event_type?: string | null;
  recurring_event_id?: string | null;
  all_day?: boolean;
  extended_properties?: Record<string, unknown> | null;
  has_mapping?: boolean;
  mapping_deleted?: boolean;
  google_updated?: string | null;
  last_synced_at?: string | null;
}

const SAMPLE_CAP = 30;

function pushSample(bucket: SkipSample[], sample: SkipSample) {
  if (bucket.length < SAMPLE_CAP) bucket.push(sample);
}

function sampleFromGoogleEvent(
  gEvent: GoogleEvent,
  reason: PullSkipReason,
  extra: Partial<SkipSample> = {},
): SkipSample {
  return {
    reason,
    google_event_id: gEvent.id,
    title: gEvent.summary,
    calendar_id: "primary",
    start: gEvent.start?.dateTime ?? gEvent.start?.date ?? null,
    end: gEvent.end?.dateTime ?? gEvent.end?.date ?? null,
    status: gEvent.status ?? null,
    event_type: gEvent.eventType ?? "default",
    recurring_event_id: gEvent.recurringEventId ?? null,
    all_day: !!gEvent.start?.date,
    extended_properties: gEvent.extendedProperties ?? null,
    google_updated: gEvent.updated ?? null,
    ...extra,
  };
}

function localEventSignature(event: any): string {
  const title = String(event.title || "").trim().toLowerCase();
  const date = String(event.event_date || "");
  const time = event.event_time ? String(event.event_time).slice(0, 5) : "all-day";
  const description = String(event.description || "").trim().toLowerCase();
  return `${title}|${date}|${time}|${description}`;
}

type RefreshOutcome = { access_token: string; expires_in: number } | null | "transient";

/**
 * Refreshes the access token. Returns "transient" for network aborts and
 * server-side/rate-limit failures so callers never flag re-consent on a
 * temporary problem (Block 2, requirement 6).
 */
async function refreshAccessToken(refreshToken: string): Promise<RefreshOutcome> {
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
        client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });
    if (res.status === 429 || res.status >= 500) return "transient";
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.warn(`[calendar-sync] token-refresh-transient err=${(e as Error)?.message}`);
    return isTransientSyncError(e) ? "transient" : "transient";
  }
}

/**
 * Marks a connection as needing user re-consent. Never deletes the token row
 * and never touches google_calendar_sync mappings or agency_events.
 */
async function markReconnectRequired(supabase: any, userId: string, reason: string) {
  const { error } = await supabase
    .from("google_calendar_tokens")
    .update({
      connection_state: "reconnect_required",
      last_auth_error: reason,
      last_auth_error_at: new Date().toISOString(),
      sync_in_progress: false,
      sync_lock_at: null,
      last_sync_status: "error",
      last_sync_error: reason,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
  if (error) {
    console.error(`[calendar-sync] reconnect-flag-error user=${userId} err=${error.message}`);
  } else {
    console.warn(`[calendar-sync] reconnect-required user=${userId} reason=${reason}`);
  }
}

/**
 * Persists a freshly refreshed access token. When encryption is active and the
 * stored row is still legacy (refresh_token_enc missing), the known plaintext
 * refresh token is encrypted in the same write so the row can reach version 1.
 */
async function persistRefreshedToken(
  supabase: any,
  userId: string,
  accessToken: string,
  expiresIn: number,
  existing?: any,
  refreshTokenPlain?: string | null,
) {
  const encKey = getTokenEncKey();
  const payload: { access_token: string; refresh_token?: string } = { access_token: accessToken };
  if (encKey && refreshTokenPlain && !isCiphertext(existing?.refresh_token_enc)) {
    payload.refresh_token = refreshTokenPlain;
  }
  const columns = await buildTokenColumns(payload, encKey, existing ?? null);
  await supabase
    .from("google_calendar_tokens")
    .update({
      ...columns,
      token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
      connection_state: "connected",
      last_auth_error: null,
      last_auth_error_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
}

async function getValidToken(
  supabase: any,
  tokenRecord: any,
  refreshToken: string | null,
  currentAccessToken: string | null,
): Promise<string | null | "transient"> {
  const now = new Date();
  const expiresAt = new Date(tokenRecord.token_expires_at);

  if (currentAccessToken && expiresAt > new Date(now.getTime() + 60000)) {
    return currentAccessToken;
  }

  if (!refreshToken) return null;

  const refreshed = await refreshAccessToken(refreshToken);
  if (refreshed === "transient") return "transient";
  if (!refreshed) return null;

  await persistRefreshedToken(
    supabase,
    tokenRecord.user_id,
    refreshed.access_token,
    refreshed.expires_in,
    tokenRecord,
    refreshToken,
  );
  return refreshed.access_token;
}

/** Best-effort revocation of the Google grant. Never blocks disconnect. */
async function revokeGoogleToken(token: string | null): Promise<"revoked" | "failed" | "skipped"> {
  if (!token) return "skipped";
  try {
    const res = await fetch("https://oauth2.googleapis.com/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token }),
    });
    if (res.ok) return "revoked";
    console.warn(`[calendar-sync] revoke-failed status=${res.status}`);
    return "failed";
  } catch (e) {
    console.warn(`[calendar-sync] revoke-error err=${(e as Error)?.message}`);
    return "failed";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, serviceRoleKey);

  // Internal (cron) calls authenticate with the vault-held shared secret.
  // Fail-closed: without a configured secret no internal call is accepted.
  const presentedCronSecret = req.headers.get(CRON_SECRET_HEADER);
  let isInternal = false;
  if (presentedCronSecret) {
    const expectedSecret = await fetchCronSecret(admin);
    isInternal = isAuthorizedInternalCall(presentedCronSecret, expectedSecret);
    if (!isInternal) {
      console.warn(`[calendar-sync] internal-call-rejected`);
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || "sync";

    let userId: string;
    if (isInternal) {
      if (!body.user_id || typeof body.user_id !== "string") {
        return new Response(JSON.stringify({ error: "user_id required for internal call" }), { status: 400, headers: corsHeaders });
      }
      userId = body.user_id;
    } else {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
      }
      const supabaseUser = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(
        authHeader.replace("Bearer ", "")
      );
      if (claimsError || !claimsData?.claims) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
      }
      userId = claimsData.claims.sub;
    }

    const supabase = admin;
    const encKey = getTokenEncKey();

    // Handle disconnect
    if (action === "disconnect") {
      const { data: existingToken } = await supabase
        .from("google_calendar_tokens")
        .select("access_token, refresh_token, access_token_enc, refresh_token_enc, token_enc_version")
        .eq("user_id", userId)
        .maybeSingle();

      // Revoke the grant at Google before dropping the local credentials.
      let revocation: "revoked" | "failed" | "skipped" = "skipped";
      if (existingToken) {
        const refresh = await readTokenField(existingToken, "refresh_token", encKey);
        const access = await readTokenField(existingToken, "access_token", encKey);
        revocation = await revokeGoogleToken(refresh || access);
      }

      // Credentials are removed; event mappings and calendar events are preserved.
      const { error: deleteError } = await supabase
        .from("google_calendar_tokens")
        .delete()
        .eq("user_id", userId);

      if (deleteError) {
        console.error(`[calendar-sync] disconnect-delete-error user=${userId} err=${deleteError.message}`);
        return new Response(
          JSON.stringify({ error: "Não foi possível desconectar agora. Tente novamente." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      console.log(`[calendar-sync] disconnected user=${userId} revocation=${revocation} mappings=preserved`);

      return new Response(JSON.stringify({ success: true, message: "Desconectado", revocation }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle status check
    if (action === "status") {
      const { data: token } = await supabase
        .from("google_calendar_tokens")
        .select("sync_enabled, auto_sync_enabled, last_sync_at, created_at, sync_in_progress, sync_lock_at, last_sync_status, last_sync_error, last_sync_duration_ms, connection_state, last_auth_error, last_auth_error_at, bootstrap_page_token, bootstrap_started_at, bootstrap_completed_at, bootstrap_pages_done, bootstrap_items_done, bootstrap_last_error, push_cursor_completed_at, incremental_page_token, incremental_pages_done, incremental_items_done, push_deleted_cursor_completed_at")
        .eq("user_id", userId)
        .maybeSingle();

      // Bootstrap progress is exposed as a boolean plus counters so the UI can
      // say "initial sync running" without ever claiming completion.
      const bootstrapInProgress = !!token && (!!token.bootstrap_page_token || !token.bootstrap_completed_at);
      // An incremental walk with a pending pageToken is also unfinished work.
      const incrementalInProgress = !!token?.incremental_page_token;
      return new Response(
        JSON.stringify({
          connected: !!token,
          ...(token || {}),
          ...(token
            ? {
                bootstrap_in_progress: bootstrapInProgress,
                bootstrap_pages_done: token.bootstrap_pages_done ?? 0,
                bootstrap_items_done: token.bootstrap_items_done ?? 0,
                incremental_in_progress: incrementalInProgress,
                incremental_pages_done: token.incremental_pages_done ?? 0,
                incremental_items_done: token.incremental_items_done ?? 0,
                resume_pending: bootstrapInProgress || incrementalInProgress,
              }
            : {}),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Full sync
    const { data: tokenRecord } = await supabase
      .from("google_calendar_tokens")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!tokenRecord) {
      return new Response(JSON.stringify({ error: "Google Calendar não conectado" }), { status: 400, headers: corsHeaders });
    }

    if (tokenRecord.connection_state === "reconnect_required") {
      console.log(`[calendar-sync] reconnect-required-skip user=${userId}`);
      return new Response(
        JSON.stringify({ success: true, skipped: "reconnect-required", connection_state: "reconnect_required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const storedRefreshToken = await readTokenField(tokenRecord, "refresh_token", encKey);
    const storedAccessToken = await readTokenField(tokenRecord, "access_token", encKey);

    if (!storedRefreshToken) {
      await markReconnectRequired(supabase, userId, "Credencial ausente. Reconecte o Google Calendar.");
      return new Response(
        JSON.stringify({ error: "Reconexão necessária. Conecte novamente o Google Calendar.", code: "reconnect_required" }),
        { status: 401, headers: corsHeaders },
      );
    }

    // Auto-sync disabled blocks only cron triggers; manual sync still works.
    if (isInternal && tokenRecord.auto_sync_enabled === false) {
      console.log(`[calendar-sync] auto-sync-disabled user=${userId}`);
      return new Response(JSON.stringify({ success: true, skipped: "auto-sync-disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate-limit: ignore non-forced calls less than 60s after the last sync.
    const force = body.force === true;
    if (!force && tokenRecord.last_sync_at) {
      const sinceLast = Date.now() - new Date(tokenRecord.last_sync_at).getTime();
      if (sinceLast < 60_000) {
        console.log(`[calendar-sync] rate-limit-skip user=${userId} since_last_ms=${sinceLast}`);
        return new Response(JSON.stringify({ success: true, skipped: "rate-limit", since_last_ms: sinceLast }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Atomic lock: clear stale locks first (>5min), then acquire if free.
    const lockCutoff = new Date(Date.now() - 5 * 60_000).toISOString();
    const lockNow = new Date().toISOString();
    const { data: staleLocks } = await supabase
      .from("google_calendar_tokens")
      .update({ sync_in_progress: false, sync_lock_at: null })
      .eq("user_id", userId)
      .eq("sync_in_progress", true)
      .lt("sync_lock_at", lockCutoff)
      .select("id");
    if (staleLocks && staleLocks.length > 0) {
      console.log(`[calendar-sync] stale-lock-detected user=${userId} cutoff=${lockCutoff}`);
      console.log(`[calendar-sync] stale-lock-released user=${userId}`);
    }
    const { data: lockRow, error: lockErr } = await supabase
      .from("google_calendar_tokens")
      .update({ sync_in_progress: true, sync_lock_at: lockNow, last_sync_status: "syncing" })
      .eq("user_id", userId)
      .eq("sync_in_progress", false)
      .select("id")
      .maybeSingle();
    if (lockErr || !lockRow) {
      console.log(`[calendar-sync] lock-skip user=${userId} err=${lockErr?.message || "already-locked"}`);
      return new Response(JSON.stringify({ success: true, skipped: "lock" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const syncStartedAt = Date.now();
    let lockReleased = false;
    /**
     * Always releases sync_in_progress/sync_lock_at. `extra` carries the
     * bootstrap/push progress columns so a partial run persists its cursors
     * while never being reported as a finished sync.
     */
    const releaseLock = async (
      status: SyncLifecycleStatus,
      errorMsg: string | null,
      extra: Record<string, unknown> = {},
    ) => {
      lockReleased = true;
      try {
        await supabase
          .from("google_calendar_tokens")
          .update({
            ...extra,
            sync_in_progress: false,
            sync_lock_at: null,
            last_sync_at: new Date().toISOString(),
            last_sync_status: status,
            last_sync_error: errorMsg,
            last_sync_duration_ms: Date.now() - syncStartedAt,
          })
          .eq("user_id", userId);
      } catch (e) {
        console.error(`[calendar-sync] release-lock-error user=${userId} err=${(e as any)?.message || e}`);
      }
    };

    try {
    const tokenAttempt = await getValidToken(supabase, tokenRecord, storedRefreshToken, storedAccessToken);
    if (tokenAttempt === "transient") {
      // Temporary failure: keep the connection "connected" and retry next run.
      console.warn(`[calendar-sync] token-refresh-transient-skip user=${userId}`);
      await releaseLock("error", "Falha temporária ao renovar o acesso. Nova tentativa em breve.");
      return new Response(
        JSON.stringify({ success: true, skipped: "transient-token-error" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    let accessToken: string | null = tokenAttempt;
    if (!accessToken) {
      // Refresh failed: keep the token row AND every mapping intact, flag the
      // connection for re-consent and release the lock.
      await markReconnectRequired(supabase, userId, "Autorização do Google expirada ou revogada.");
      return new Response(
        JSON.stringify({ error: "Reconexão necessária. Conecte novamente o Google Calendar.", code: "reconnect_required" }),
        { status: 401, headers: corsHeaders },
      );
    }

    // Wrapper: on 401, refresh token once and retry the request.
    const fetchGoogle = async (url: string, init: RequestInit = {}): Promise<Response> => {
      const withAuth = (token: string): RequestInit => ({
        ...init,
        headers: { ...(init.headers || {}), Authorization: `Bearer ${token}` },
      });
      let res = await fetch(url, withAuth(accessToken!));
      if (res.status !== 401) return res;
      console.warn(`[calendar-sync] token-refresh-retry user=${userId} url=${url.split("?")[0]}`);
      const refreshed = await refreshAccessToken(storedRefreshToken);
      if (refreshed === "transient") {
        console.warn(`[calendar-sync] token-refresh-transient user=${userId}`);
        return res;
      }
      if (!refreshed) {
        console.error(`[calendar-sync] token-refresh-failed user=${userId}`);
        await markReconnectRequired(supabase, userId, "Autorização do Google expirada ou revogada.");
        return res;
      }
      await persistRefreshedToken(
        supabase,
        userId,
        refreshed.access_token,
        refreshed.expires_in,
        tokenRecord,
        storedRefreshToken,
      );
      accessToken = refreshed.access_token;
      console.log(`[calendar-sync] token-refresh-success user=${userId}`);
      res = await fetch(url, withAuth(accessToken!));
      if (res.status === 401) {
        console.error(`[calendar-sync] token-refresh-failed user=${userId} reason=still-401-after-refresh`);
      }
      return res;
    };

    // Local (push) window: 30 days back → 730 days forward, always current.
    // The pull window for a resumed bootstrap is separate and immutable —
    // see pullBootstrapWindow below.
    const now = new Date();
    const windowStartDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const windowEndDate = new Date(now.getTime() + 730 * 24 * 60 * 60 * 1000);
    const localWindow = {
      windowStart: windowStartDate.toISOString(),
      windowEnd: windowEndDate.toISOString(),
    };
    const windowStartDay = windowStartDate.toISOString().slice(0, 10);
    const windowEndDay = windowEndDate.toISOString().slice(0, 10);

    // Agency context is not required for sync; kept as n/a in logs.
    const agencyId: string | null = null;

    const calendarId = "primary";
    console.log(
      `[calendar-sync] boot user=${userId} agency=${agencyId ?? "n/a"} calendar=${calendarId} window=${windowStartDay}..${windowEndDay} window_iso=${localWindow.windowStart}..${localWindow.windowEnd}`
    );

    // Per-run budgets (configurable, clamped). They replace the old silent
    // page cap: whatever is left over is reported and resumed next run.
    const limits = getPagingLimits(Deno.env.toObject());

    // Shared state. Both phases read and write the same maps so the push can
    // see everything the pull has just learned about this account.
    const syncMap = new Map<string, any>();
    const reverseSyncMap = new Map<string, any>();
    const justPushedGoogleIds = new Set<string>();
    const localIds = new Set<string>();
    const localRowsById = new Map<string, any>();

    let pushedCreated = 0;
    let pushedUpdated = 0;
    let pushedSkipped = 0;
    let deletedGoogle = 0;
    let deletedLocal = 0;
    let deletedSkipped = 0;
    let deleteErrors = 0;
    let pulledCreated = 0;
    let pulledUpdated = 0;
    let pulledSkipped = 0;
    let conflictsDetected = 0;
    let readOnlySkipped = 0;
    const pushErrors: Array<{ event_id: string; status?: number; error: string }> = [];
    const pullErrors: Array<{ google_event_id?: string; status?: number; error: string }> = [];

    // Structured skip diagnostics: every ignored item is recorded with a
    // machine-readable reason plus a small sample so the UI can show a
    // breakdown. Samples never carry attendee lists — counts only.
    const pushSkipReasons: Record<string, number> = {};
    const pushSkipSamples: SkipSample[] = [];
    const recordPushSkip = (reason: PushSkipReason, sample: SkipSample) => {
      pushSkipReasons[reason] = (pushSkipReasons[reason] || 0) + 1;
      pushSample(pushSkipSamples, { ...sample, reason });
    };
    const pullSkipReasons: Record<string, number> = {};
    const pullSkipSamples: SkipSample[] = [];
    const recordPullSkip = (reason: PullSkipReason, gEvent: GoogleEvent, extra: Partial<SkipSample> = {}) => {
      pullSkipReasons[reason] = (pullSkipReasons[reason] || 0) + 1;
      pushSample(pullSkipSamples, sampleFromGoogleEvent(gEvent, reason, extra));
    };

    // Conflicts are recorded, never auto-resolved. Dedup key = mapping + the
    // exact pair of versions, so a repeated run adds nothing.
    const conflictSummary: Array<{
      google_event_id: string | null;
      agency_event_id: string | null;
      conflict_type: string;
      title: string | null;
    }> = [];
    const seenConflictKeys = new Set<string>();
    const recordConflict = async (input: Parameters<typeof buildConflictRecord>[0]) => {
      const record = buildConflictRecord(input);
      const key = conflictDedupKey(record as any);
      if (seenConflictKeys.has(key)) return;
      seenConflictKeys.add(key);
      const { error: existingErr, data: existing } = await supabase
        .from("google_calendar_conflicts")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "open")
        .eq("google_event_id", record.google_event_id as string)
        .maybeSingle();
      if (!existingErr && existing) {
        // Refresh the versions of the already-open conflict instead of
        // inserting a duplicate row for the same mapping.
        await supabase
          .from("google_calendar_conflicts")
          .update({
            google_etag: record.google_etag,
            google_updated: record.google_updated,
            local_updated_at: record.local_updated_at,
            google_snapshot: record.google_snapshot,
            local_snapshot: record.local_snapshot,
            conflict_type: record.conflict_type,
            detected_at: record.detected_at,
          })
          .eq("id", existing.id);
      } else {
        const { error: insErr } = await supabase.from("google_calendar_conflicts").insert(record);
        if (insErr && !String(insErr.message || "").includes("duplicate key")) {
          console.error(`[calendar-sync] conflict-record-error err=${insErr.message}`);
        }
      }
      if (input.syncId) {
        // Conflict state lives on the mapping. It is NEVER a reconnect signal.
        await supabase
          .from("google_calendar_sync")
          .update(conflictMappingColumns(record.detected_at as string))
          .eq("id", input.syncId);
      }
      conflictsDetected++;
      if (conflictSummary.length < SAMPLE_CAP) {
        conflictSummary.push({
          google_event_id: (record.google_event_id as string) ?? null,
          agency_event_id: (record.agency_event_id as string) ?? null,
          conflict_type: record.conflict_type as string,
          title: input.localEvent?.title ?? input.googleEvent?.summary ?? null,
        });
      }
    };

    // =====================================================================
    // PHASE 1 — PULL (Google → local). Always runs before the push so the
    // local side is compared against the freshest remote state and a local
    // write never clobbers a change that arrived in the same window.
    // =====================================================================
    const pullMode = resolvePullMode(tokenRecord);
    const pullBootstrapWindow = resolvePullWindow(pullMode, tokenRecord, localWindow);
    console.log(
      `[calendar-sync] pull-start range=${pullBootstrapWindow.windowStart}..${pullBootstrapWindow.windowEnd} window_persisted=${pullBootstrapWindow.persisted}`,
    );
    let googleEvents: GoogleEvent[] = [];
    let pullPageError = false;
    let pagesThisRun = 0;
    let itemsThisRun = 0;
    let pendingPageToken: string | null = null;
    let receivedSyncToken: string | null = null;
    let cursorReset = false;
    {
      // Both modes resume from their own persisted pageToken.
      let pageToken: string | null = resolveResumePageToken(pullMode, tokenRecord);
      const syncToken = pullMode === "incremental" ? tokenRecord.sync_token : null;
      console.log(
        `[calendar-sync] pull-start mode=${pullMode} resumed=${pageToken ? "yes" : "no"} max_pages=${limits.maxPages} max_items=${limits.maxItems}`,
      );
      while (true) {
        const url = buildEventsListUrl({
          windowStart: pullBootstrapWindow.windowStart,
          windowEnd: pullBootstrapWindow.windowEnd,
          pageToken,
          syncToken,
        });
        const pageRes = await fetchGoogle(url);
        if (isCursorGoneStatus(pageRes.status)) {
          // Expired sync/page token: reset ONLY the cursors and restart the
          // bootstrap. Events, mappings and tombstones are untouched.
          await pageRes.text().catch(() => "");
          console.warn(`[calendar-sync] cursor-expired-410 mode=${pullMode} restarting_bootstrap=true`);
          cursorReset = true;
          break;
        }
        if (!pageRes.ok) {
          const errText = await pageRes.text();
          console.error(`[calendar-sync] pull-error list page=${pagesThisRun + 1} status=${pageRes.status} body=${errText.slice(0, 300)}`);
          pullErrors.push({ status: pageRes.status, error: errText.slice(0, 200) });
          pullPageError = true;
          break;
        }
        const pageData = await pageRes.json();
        const items: GoogleEvent[] = pageData.items || [];
        googleEvents = googleEvents.concat(items);
        pagesThisRun++;
        itemsThisRun += items.length;
        pageToken = pageData.nextPageToken ?? null;
        receivedSyncToken = pageData.nextSyncToken ?? null;
        console.log(`[calendar-sync] pull-page page=${pagesThisRun} events=${items.length} has_next=${pageToken ? "yes" : "no"}`);
        if (!pageToken) break;
        if (isBudgetExhausted({ pages: pagesThisRun, items: itemsThisRun }, limits)) {
          // Not a silent cap: the cursor is persisted and reported.
          pendingPageToken = pageToken;
          console.log(
            `[calendar-sync] pull-budget-reached pages=${pagesThisRun} items=${itemsThisRun} resume_pending=true`,
          );
          break;
        }
      }
      console.log(
        `[calendar-sync] pull-list mode=${pullMode} google_events=${googleEvents.length} pages=${pagesThisRun} pending=${pendingPageToken ? "yes" : "no"}`,
      );
    }

    // Reverse mappings for exactly the Google ids of this run (chunked in-lists).
    // FAIL-CLOSED: if any chunk of the reverse mapping or of the mapped local
    // rows fails, the whole pull for this run is cancelled. Continuing would
    // read a partial inventory, treat already-mapped events as new (duplicates)
    // and drop mappings as `local_reference_missing`.
    let pullInventoryFailed = false;
    if (googleEvents.length > 0) {
      const ids = [...new Set(googleEvents.map((e) => e.id).filter(Boolean))];
      for (let i = 0; i < ids.length && !pullInventoryFailed; i += 200) {
        const chunk = ids.slice(i, i + 200);
        const { data: chunkMaps, error: chunkErr } = await supabase
          .from("google_calendar_sync")
          .select("*")
          .eq("user_id", userId)
          .in("google_event_id", chunk);
        if (chunkErr) {
          console.error(`[calendar-sync] reverse-map-fetch-error err=${chunkErr.message}`);
          pullErrors.push({ status: 0, error: `reverse_mapping_fetch_failed: ${chunkErr.message}`.slice(0, 200) });
          pullInventoryFailed = true;
          break;
        }
        for (const m of chunkMaps || []) {
          reverseSyncMap.set(m.google_event_id, m);
          syncMap.set(m.agency_event_id, m);
        }
      }
      // Local rows for mapped ids: existence AND updated_at, needed by the
      // conflict policy (local side vs the marker saved at the last sync).
      if (!pullInventoryFailed) {
        const mappedLocalIds = [...new Set((googleEvents
          .map((e) => reverseSyncMap.get(e.id)?.agency_event_id)
          .filter(Boolean) as string[]))];
        for (let i = 0; i < mappedLocalIds.length && !pullInventoryFailed; i += 200) {
          const chunk = mappedLocalIds.slice(i, i + 200);
          const { data: liveRows, error: liveErr } = await supabase
            .from("agency_events")
            .select("id, title, updated_at, event_date, event_time, end_date, end_time, all_day, time_zone, location")
            .eq("user_id", userId)
            .is("deleted_at", null)
            .in("id", chunk);
          if (liveErr) {
            console.error(`[calendar-sync] mapped-local-fetch-error err=${liveErr.message}`);
            pullErrors.push({ status: 0, error: `mapped_local_fetch_failed: ${liveErr.message}`.slice(0, 200) });
            pullInventoryFailed = true;
            break;
          }
          for (const r of liveRows || []) {
            localIds.add(r.id);
            localRowsById.set(r.id, r);
          }
        }
      }
    }
    if (pullInventoryFailed) {
      // Transient error: no local write, no cursor advance, lock released by the
      // normal end-of-run path. The same pages are re-read next run.
      console.error(
        `[calendar-sync] pull-aborted reason=inventory_fetch_failed google_events=${googleEvents.length} cursor_preserved=true`,
      );
    }

    if (!pullPageError && !pullInventoryFailed) {
      console.log(`[calendar-sync] reverse-map-before-pull mappings=${reverseSyncMap.size} just_pushed=${justPushedGoogleIds.size}`);

      let skipCancelled = 0;
      let skipAlreadyMapped = 0;
      let skipNoDate = 0;
      let skipJustPushed = 0;
      let skipTombstone = 0;

      for (const gEvent of googleEvents) {
        if (justPushedGoogleIds.has(gEvent.id)) {
          pulledSkipped++; skipJustPushed++;
          console.log(`[calendar-sync] pull-skipped google=${gEvent.id} reason=created-during-current-push mapped_local=${reverseSyncMap.get(gEvent.id)?.agency_event_id || "unknown"}`);
          recordPullSkip("created_during_current_push", gEvent, {
            agency_event_id: reverseSyncMap.get(gEvent.id)?.agency_event_id,
            has_mapping: true,
          });
          continue;
        }

        if (gEvent.status === "cancelled") {
          const cancelledMapping = reverseSyncMap.get(gEvent.id);
          if (cancelledMapping && !cancelledMapping.deleted_at) {
            console.log(`[calendar-sync] delete-local-start google=${gEvent.id} local=${cancelledMapping.agency_event_id}`);
            try {
              const tombstoneAt = new Date().toISOString();
              const { error: softErr } = await supabase
                .from("agency_events")
                .update({ deleted_at: tombstoneAt, deleted_by_sync: true })
                .eq("id", cancelledMapping.agency_event_id)
                .eq("user_id", userId);
              if (softErr) {
                deleteErrors++;
                console.error(`[calendar-sync] delete-local-error google=${gEvent.id} local=${cancelledMapping.agency_event_id} err=${softErr.message}`);
                pullErrors.push({ google_event_id: gEvent.id, error: softErr.message });
                continue;
              }
              await supabase
                .from("google_calendar_sync")
                .update({ deleted_at: tombstoneAt, last_synced_at: tombstoneAt })
                .eq("id", cancelledMapping.id);
              cancelledMapping.deleted_at = tombstoneAt;
              reverseSyncMap.set(gEvent.id, cancelledMapping);
              syncMap.set(cancelledMapping.agency_event_id, cancelledMapping);
              deletedLocal++;
              console.log(`[calendar-sync] delete-local-success google=${gEvent.id} local=${cancelledMapping.agency_event_id}`);
            } catch (e: any) {
              deleteErrors++;
              console.error(`[calendar-sync] delete-local-error exception google=${gEvent.id} err=${e?.message || e}`);
              pullErrors.push({ google_event_id: gEvent.id, error: String(e?.message || e) });
            }
          } else {
            pulledSkipped++; skipCancelled++;
            console.log(`[calendar-sync] pull-skipped google=${gEvent.id} reason=cancelled-${cancelledMapping ? "already-tombstoned" : "unmapped"}`);
            recordPullSkip("cancelled_event", gEvent, {
              has_mapping: !!cancelledMapping,
              mapping_deleted: !!cancelledMapping?.deleted_at,
            });
          }
          continue;
        }

        // Fidelity mapping: real start/end, timezone, all-day (exclusive end),
        // location, attendees, organizer, reminders, Meet and recurrence.
        // Google-managed, non-default, recurring instances and non-editable
        // events are mirrored but marked read-only — never pushed back.
        const classification = classifyGoogleEvent(gEvent as any, { calendarId });
        const localFields = mapGoogleEventToLocal(gEvent as any, { calendarId });
        if (!localFields) {
          pulledSkipped++; skipNoDate++;
          console.log(`[calendar-sync] pull-skipped google=${gEvent.id} reason=no-start-date`);
          recordPullSkip("missing_start_date", gEvent);
          continue;
        }
        if (classification.isReadOnly) {
          readOnlySkipped++;
          console.log(
            `[calendar-sync] pull-read-only google=${gEvent.id} reasons=${classification.reasons.join(",")}`,
          );
        }

        const mapped = reverseSyncMap.get(gEvent.id);
        if (mapped) {
          // Tombstone guard: mapping already marked deleted → do not resurrect
          if (mapped.deleted_at) {
            pulledSkipped++; skipTombstone++;
            console.log(`[calendar-sync] skipped-deleted google=${gEvent.id} reason=mapping-tombstone local=${mapped.agency_event_id}`);
            recordPullSkip("mapping_tombstoned", gEvent, {
              agency_event_id: mapped.agency_event_id,
              has_mapping: true,
              mapping_deleted: true,
              last_synced_at: mapped.last_synced_at,
            });
            continue;
          }
          // Guard: mapping alive but local reference vanished. Drop the stale
          // mapping and re-import as a fresh local event on the next run.
          if (!localIds.has(mapped.agency_event_id)) {
            console.warn(
              `[calendar-sync] pull-recovery google=${gEvent.id} local=${mapped.agency_event_id} reason=local-missing dropping-mapping`,
            );
            await supabase.from("google_calendar_sync").delete().eq("id", mapped.id);
            reverseSyncMap.delete(gEvent.id);
            syncMap.delete(mapped.agency_event_id);
            recordPullSkip("local_reference_missing", gEvent, {
              agency_event_id: mapped.agency_event_id,
              has_mapping: true,
              mapping_deleted: false,
              last_synced_at: mapped.last_synced_at,
            });
            pulledSkipped++;
            continue;
          }

          // Conflict policy: compare BOTH sides against the state persisted at
          // the last sync (etag/updated vs snapshot, local updated_at vs
          // marker). Both changed → nobody wins, the conflict is recorded.
          const localRow = localRowsById.get(mapped.agency_event_id) || {};
          const change = classifyChange({
            googleEtag: gEvent.etag ?? null,
            googleUpdated: gEvent.updated ?? null,
            snapshotEtag: mapped.google_etag ?? mapped.provider_snapshot?.etag ?? null,
            snapshotUpdated: mapped.google_updated ?? mapped.provider_snapshot?.updated ?? null,
            localUpdatedAt: localRow.updated_at ?? null,
            localMarker: mapped.local_updated_at_at_sync ?? mapped.last_synced_at ?? null,
          });
          const decision = decideSyncAction(change, mapped);

          if (decision === "conflict") {
            await recordConflict({
              userId,
              syncId: mapped.id,
              agencyEventId: mapped.agency_event_id,
              googleEventId: gEvent.id,
              conflictType: "both_changed",
              googleEvent: gEvent as any,
              localEvent: localRow,
              localUpdatedAt: localRow.updated_at ?? null,
            });
            pulledSkipped++;
            console.log(`[calendar-sync] conflict-detected google=${gEvent.id} local=${mapped.agency_event_id} type=both_changed`);
            continue;
          }
          if (decision !== "pull") {
            // Nothing changed on Google, or only the local side did — the push
            // phase below handles it. No local overwrite here.
            pulledSkipped++; skipAlreadyMapped++;
            recordPullSkip("already_synced_unchanged", gEvent, {
              agency_event_id: mapped.agency_event_id,
              has_mapping: true,
              mapping_deleted: false,
              last_synced_at: mapped.last_synced_at,
            });
            continue;
          }

          try {
            const { data: updatedRow, error: updErr } = await supabase
              .from("agency_events")
              .update({
                title: localFields.title,
                description: localFields.description,
                event_date: localFields.event_date,
                event_time: localFields.event_time,
                end_date: localFields.end_date,
                end_time: localFields.end_time,
                start_at: localFields.start_at,
                end_at: localFields.end_at,
                time_zone: localFields.time_zone,
                all_day: localFields.all_day,
                location: localFields.location,
                conference_url: localFields.conference_url,
                attendees: localFields.attendees,
                reminders: localFields.reminders,
                organizer: localFields.organizer,
                recurrence: localFields.recurrence,
                is_read_only: localFields.is_read_only,
                source: "google",
              })
              .eq("id", mapped.agency_event_id)
              .eq("user_id", userId)
              .select("updated_at")
              .maybeSingle();
            if (updErr) {
              console.error(`[calendar-sync] pull-error update google=${gEvent.id} err=${updErr.message}`);
              pullErrors.push({ google_event_id: gEvent.id, error: updErr.message });
              continue;
            }
            const metadata = buildMappingMetadata(gEvent as any, {
              origin: mapped.origin === "local" ? "local" : "google",
              calendarId,
              localUpdatedAt: updatedRow?.updated_at ?? null,
            });
            await supabase
              .from("google_calendar_sync")
              .update({ ...metadata, ...clearConflictColumns() })
              .eq("id", mapped.id);
            Object.assign(mapped, metadata);
            pulledUpdated++;
            console.log(`[calendar-sync] pull-updated google=${gEvent.id} local=${mapped.agency_event_id} read_only=${localFields.is_read_only}`);
          } catch (e: any) {
            console.error(`[calendar-sync] pull-error exception update google=${gEvent.id} err=${e?.message || e}`);
            pullErrors.push({ google_event_id: gEvent.id, error: String(e?.message || e) });
          }
          continue;
        }

        // New Google event → local insert with full fidelity. Deduplication is
        // by google_event_id only; the unique (user_id, google_event_id)
        // constraint remains the source of truth.
        try {
          const { data: inserted, error: insErr } = await supabase
            .from("agency_events")
            .insert({
              user_id: userId,
              title: localFields.title,
              description: localFields.description,
              event_type: "compromisso",
              event_date: localFields.event_date,
              event_time: localFields.event_time,
              end_date: localFields.end_date,
              end_time: localFields.end_time,
              start_at: localFields.start_at,
              end_at: localFields.end_at,
              time_zone: localFields.time_zone,
              all_day: localFields.all_day,
              location: localFields.location,
              conference_url: localFields.conference_url,
              attendees: localFields.attendees,
              reminders: localFields.reminders,
              organizer: localFields.organizer,
              recurrence: localFields.recurrence,
              is_read_only: localFields.is_read_only,
              source: "google",
              color: "#22c55e",
            })
            .select("id, updated_at")
            .single();

          if (insErr || !inserted) {
            console.error(`[calendar-sync] pull-error insert google=${gEvent.id} err=${insErr?.message}`);
            pullErrors.push({ google_event_id: gEvent.id, error: insErr?.message || "insert failed" });
            continue;
          }

          const metadata = buildMappingMetadata(gEvent as any, {
            origin: "google",
            calendarId,
            localUpdatedAt: inserted.updated_at ?? null,
          });
          const { data: insertedMapping, error: mapInsertErr } = await supabase.from("google_calendar_sync").upsert({
            user_id: userId,
            agency_event_id: inserted.id,
            google_event_id: gEvent.id,
            sync_direction: "bidirectional",
            ...metadata,
          }, { onConflict: "user_id,google_event_id" }).select("*").single();
          if (mapInsertErr || !insertedMapping) {
            console.error(`[calendar-sync] mapping-error create-from-pull google=${gEvent.id} local=${inserted.id} err=${mapInsertErr?.message || "mapping upsert failed"}`);
            pullErrors.push({ google_event_id: gEvent.id, error: mapInsertErr?.message || "mapping upsert failed" });
            await supabase
              .from("agency_events")
              .delete()
              .eq("id", inserted.id)
              .eq("user_id", userId);
            console.log(`[calendar-sync] pull-cleanup local=${inserted.id} reason=mapping-create-failed`);
            continue;
          }
          reverseSyncMap.set(gEvent.id, insertedMapping);
          syncMap.set(inserted.id, insertedMapping);
          localIds.add(inserted.id);
          localRowsById.set(inserted.id, { id: inserted.id, updated_at: inserted.updated_at });
          pulledCreated++;
          console.log(`[calendar-sync] mapping-created-from-pull google=${gEvent.id} local=${inserted.id} origin=google read_only=${localFields.is_read_only}`);
        } catch (e: any) {
          console.error(`[calendar-sync] pull-error exception google=${gEvent.id} err=${e?.message || e}`);
          pullErrors.push({ google_event_id: gEvent.id, error: String(e?.message || e) });
        }
      }

      console.log(
        `[calendar-sync] pull-summary created=${pulledCreated} updated=${pulledUpdated} deleted_local=${deletedLocal} conflicts=${conflictsDetected} read_only=${readOnlySkipped} skipped_cancelled=${skipCancelled} skipped_tombstone=${skipTombstone} skipped_just_pushed=${skipJustPushed} skipped_already_mapped_unchanged=${skipAlreadyMapped} skipped_no_date=${skipNoDate}`
      );
    }

    // =====================================================================
    // PHASE 2 — PUSH (local → Google). Runs after the pull, keeping the
    // Block 2 incremental cursors, budgets and fail-closed guarantees.
    // =====================================================================
    const pushCursor: PushCursor = {
      updated_at: tokenRecord.push_cursor_updated_at ?? null,
      event_id: tokenRecord.push_cursor_event_id ?? null,
    };
    let pushQuery = supabase
      .from("agency_events")
      .select("*")
      .eq("user_id", userId)
      .gte("event_date", windowStartDay)
      .lte("event_date", windowEndDay)
      .is("deleted_at", null)
      .order("updated_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(limits.maxPushItems);
    if (pushCursor.updated_at && pushCursor.event_id) {
      pushQuery = pushQuery.or(
        `updated_at.gt.${pushCursor.updated_at},and(updated_at.eq.${pushCursor.updated_at},id.gt.${pushCursor.event_id})`,
      );
    } else if (pushCursor.updated_at) {
      pushQuery = pushQuery.gt("updated_at", pushCursor.updated_at);
    }
    const { data: pushBatch, error: localErr } = await pushQuery;

    if (localErr) {
      console.error(`[calendar-sync] local-fetch-error err=${localErr.message}`);
    }

    const liveLocalEvents = (pushBatch || []) as any[];

    // Deletion queue — same keyset technique, ordered by (deleted_at, id).
    const deletedCursor: DeletedPushCursor = {
      deleted_at: tokenRecord.push_deleted_cursor_at ?? null,
      event_id: tokenRecord.push_deleted_cursor_event_id ?? null,
    };
    let deletedQuery = supabase
      .from("agency_events")
      .select("*")
      .eq("user_id", userId)
      .gte("event_date", windowStartDay)
      .lte("event_date", windowEndDay)
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(limits.maxPushItems);
    if (deletedCursor.deleted_at && deletedCursor.event_id) {
      deletedQuery = deletedQuery.or(
        buildKeysetOrFilter("deleted_at", deletedCursor.deleted_at, deletedCursor.event_id),
      );
    } else if (deletedCursor.deleted_at) {
      deletedQuery = deletedQuery.gt("deleted_at", deletedCursor.deleted_at);
    }
    const { data: deletedBatch, error: deletedErr } = await deletedQuery;
    if (deletedErr) {
      console.error(`[calendar-sync] deleted-fetch-error err=${deletedErr.message}`);
    }
    const deletedLocalEvents = (deletedBatch || []) as any[];
    const deletedScanComplete = isPushScanComplete(deletedLocalEvents.length, limits.maxPushItems);

    // Mappings for exactly the events in this batch — never the whole table.
    const batchEventIds = [
      ...liveLocalEvents.map((e: any) => e.id),
      ...deletedLocalEvents.map((e: any) => e.id),
    ];
    // Fail-closed: a failed mapping lookup must never be read as "unmapped",
    // otherwise the push would recreate events that already exist on Google.
    let mappingFetchFailed = false;
    let batchMappingCount = 0;
    if (batchEventIds.length > 0) {
      const { data: batchSyncs, error: syncErr } = await supabase
        .from("google_calendar_sync")
        .select("*")
        .eq("user_id", userId)
        .in("agency_event_id", batchEventIds);
      if (syncErr) {
        console.error(`[calendar-sync] sync-fetch-error err=${syncErr.message}`);
        mappingFetchFailed = true;
      }
      for (const m of batchSyncs || []) {
        syncMap.set(m.agency_event_id, m);
        reverseSyncMap.set(m.google_event_id, m);
        batchMappingCount++;
      }
    }
    // With an unknown mapping state the whole push (creates/updates/deletes) is
    // skipped for this run; cursors stay put so the batch is retried intact.
    const pushEvents: any[] = mappingFetchFailed ? [] : liveLocalEvents;
    const deleteEvents: any[] = mappingFetchFailed ? [] : deletedLocalEvents;
    if (mappingFetchFailed) {
      console.warn(
        `[calendar-sync] push-aborted reason=mapping-fetch-error live=${liveLocalEvents.length} deleted=${deletedLocalEvents.length} cursors_preserved=true`,
      );
    }

    for (const e of pushEvents) localIds.add(e.id);
    const pushScanComplete = !mappingFetchFailed && isPushScanComplete(liveLocalEvents.length, limits.maxPushItems);
    const advancedPushCursor = nextPushCursor(pushEvents, pushCursor);
    const mappedInWindow = liveLocalEvents.filter((e: any) => syncMap.has(e.id)).length;
    const unmappedInWindow = liveLocalEvents.length - mappedInWindow;
    const mappedLocalSignatures = new Map<string, string>();
    for (const event of pushEvents) {
      if (syncMap.has(event.id)) mappedLocalSignatures.set(localEventSignature(event), event.id);
    }

    console.log(
      `[calendar-sync] inventory batch_local_events=${liveLocalEvents.length} deleted_local=${deletedLocalEvents.length} batch_mappings=${batchMappingCount} reverse_mappings=${reverseSyncMap.size} mapped_in_batch=${mappedInWindow} unmapped_in_batch=${unmappedInWindow} push_scan_complete=${pushScanComplete} push_limit=${limits.maxPushItems}`
    );

    const pushDefaultDuration = parseInt(Deno.env.get("CALENDAR_DEFAULT_DURATION_MINUTES") || "", 10);
    const pushOptions = {
      profileTimeZone: tokenRecord.calendar_time_zone ?? null,
      defaultDurationMinutes: Number.isFinite(pushDefaultDuration) && pushDefaultDuration > 0
        ? pushDefaultDuration
        : DEFAULT_DURATION_MINUTES,
    };

    console.log(`[calendar-sync] push-start count=${pushEvents.length}`);

    for (const event of pushEvents) {
      const existing = syncMap.get(event.id);

      // Tombstone guard: never recreate an event whose mapping was marked deleted
      if (existing && existing.deleted_at) {
        pushedSkipped++; deletedSkipped++;
        console.log(`[calendar-sync] skipped-deleted event=${event.id} reason=mapping-tombstone google=${existing.google_event_id}`);
        recordPushSkip("mapping_soft_deleted", {
          reason: "mapping_soft_deleted",
          agency_event_id: event.id,
          google_event_id: existing.google_event_id,
          title: event.title,
          start: event.event_date,
          all_day: !event.event_time,
          has_mapping: true,
          mapping_deleted: true,
          last_synced_at: existing.last_synced_at,
        });
        continue;
      }

      if (!existing) {
        const mappedTwinId = mappedLocalSignatures.get(localEventSignature(event));
        if (mappedTwinId && mappedTwinId !== event.id) {
          pushedSkipped++;
          console.log(`[calendar-sync] push-skipped event=${event.id} reason=duplicate-of-mapped-local-event mapped_event=${mappedTwinId}`);
          recordPushSkip("duplicate_local_signature", {
            reason: "duplicate_local_signature",
            agency_event_id: event.id,
            title: event.title,
            start: event.event_date,
            all_day: !event.event_time,
            has_mapping: false,
          });
          continue;
        }
      }

      // Read-only guard: Google-managed events, recurring instances and
      // non-default types are mirrored locally but never written back.
      if (existing && !canPushUpdate(existing)) {
        pushedSkipped++; readOnlySkipped++;
        console.log(`[calendar-sync] push-skipped event=${event.id} reason=read-only google=${existing.google_event_id} event_type=${existing.event_type || "default"}`);
        recordPushSkip("read_only_mapping", {
          reason: "read_only_mapping",
          agency_event_id: event.id,
          google_event_id: existing.google_event_id,
          title: event.title,
          event_type: existing.event_type ?? null,
          recurring_event_id: existing.recurring_event_id ?? null,
          has_mapping: true,
        });
        continue;
      }

      // Skip push if local event hasn't changed since last sync
      if (existing && existing.last_synced_at && event.updated_at) {
        const localUpdated = new Date(event.updated_at).getTime();
        const marker = new Date(existing.local_updated_at_at_sync || existing.last_synced_at).getTime();
        if (localUpdated <= marker) {
          pushedSkipped++;
          console.log(`[calendar-sync] push-skipped event=${event.id} reason=unchanged-since-last-sync`);
          recordPushSkip("unchanged_since_last_sync", {
            reason: "unchanged_since_last_sync",
            agency_event_id: event.id,
            google_event_id: existing.google_event_id,
            title: event.title,
            start: event.event_date,
            all_day: !event.event_time,
            has_mapping: true,
            mapping_deleted: false,
            last_synced_at: existing.last_synced_at,
          });
          continue;
        }
      }

      // Payload with UI-controlled fields only. Attendees, conferenceData,
      // recurrence, reminders, organizer and visibility are never sent, so a
      // PATCH can't wipe them on Google.
      const googleEvent = buildGooglePushPayload(event, pushOptions);
      assertControlledPayload(googleEvent as unknown as Record<string, unknown>);

      try {
        if (existing) {
          const res = await fetchGoogle(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events/${existing.google_event_id}`,
            {
              method: "PATCH",
              headers: buildPatchHeaders(existing.google_etag),
              body: JSON.stringify(googleEvent),
            }
          );
          if (isPreconditionFailed(res.status)) {
            // Stale etag: Google changed under us. Record a conflict instead of
            // retrying blindly with the local version.
            await res.text().catch(() => "");
            await recordConflict({
              userId,
              syncId: existing.id,
              agencyEventId: event.id,
              googleEventId: existing.google_event_id,
              conflictType: "precondition_failed",
              localEvent: event,
              localUpdatedAt: event.updated_at ?? null,
            });
            pushedSkipped++;
            console.warn(`[calendar-sync] push-conflict event=${event.id} google=${existing.google_event_id} status=412`);
            continue;
          }
          if (!res.ok) {
            const errText = await res.text();
            console.error(`[calendar-sync] push-error update event=${event.id} status=${res.status} body=${errText.slice(0, 300)}`);
            pushErrors.push({ event_id: event.id, status: res.status, error: errText.slice(0, 200) });
          } else {
            const updated = await res.json().catch(() => ({}));
            pushedUpdated++;
            const metadata = buildMappingMetadata(updated as any, {
              origin: existing.origin === "google" ? "google" : "local",
              calendarId,
              localUpdatedAt: event.updated_at ?? null,
            });
            const { error: mapUpdateErr } = await supabase
              .from("google_calendar_sync")
              .update({ ...metadata, ...clearConflictColumns() })
              .eq("id", existing.id);
            if (mapUpdateErr) {
              console.error(`[calendar-sync] mapping-error update event=${event.id} google=${existing.google_event_id} err=${mapUpdateErr.message}`);
              pushErrors.push({ event_id: event.id, error: mapUpdateErr.message });
            } else {
              Object.assign(existing, metadata);
              syncMap.set(event.id, existing);
              reverseSyncMap.set(existing.google_event_id, existing);
              console.log(`[calendar-sync] mapping-updated event=${event.id} google=${existing.google_event_id}`);
            }
            console.log(`[calendar-sync] push-updated event=${event.id} google=${existing.google_event_id} method=PATCH if_match=${existing.google_etag ? "yes" : "no"}`);
          }
        } else {
          const res = await fetchGoogle(
            "https://www.googleapis.com/calendar/v3/calendars/primary/events",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(googleEvent),
            }
          );
          if (!res.ok) {
            const errText = await res.text();
            console.error(`[calendar-sync] push-error create event=${event.id} status=${res.status} body=${errText.slice(0, 300)}`);
            pushErrors.push({ event_id: event.id, status: res.status, error: errText.slice(0, 200) });
            continue;
          }
          const created = await res.json();
          if (created.id) {
            // Proven local origin: only these mappings may ever propagate a
            // remote deletion later on.
            const metadata = buildMappingMetadata(created as any, {
              origin: "local",
              calendarId,
              localUpdatedAt: event.updated_at ?? null,
            });
            const { data: insertedMapping, error: mapInsertErr } = await supabase.from("google_calendar_sync").upsert({
              user_id: userId,
              agency_event_id: event.id,
              google_event_id: created.id,
              sync_direction: "bidirectional",
              ...metadata,
              is_read_only: false,
            }, { onConflict: "user_id,agency_event_id" }).select("*").single();
            if (mapInsertErr || !insertedMapping) {
              console.error(`[calendar-sync] mapping-error create event=${event.id} google=${created.id} err=${mapInsertErr?.message || "mapping upsert failed"}`);
              pushErrors.push({ event_id: event.id, error: mapInsertErr?.message || "mapping upsert failed" });
              continue;
            }
            syncMap.set(event.id, insertedMapping);
            reverseSyncMap.set(created.id, insertedMapping);
            mappedLocalSignatures.set(localEventSignature(event), event.id);
            justPushedGoogleIds.add(created.id);
            pushedCreated++;
            console.log(`[calendar-sync] mapping-created event=${event.id} google=${created.id} origin=local`);
            console.log(`[calendar-sync] push-created event=${event.id} google=${created.id}`);
          } else {
            pushedSkipped++;
            console.warn(`[calendar-sync] push-skipped event=${event.id} reason=no-id`);
            recordPushSkip("google_created_without_id", {
              reason: "google_created_without_id",
              agency_event_id: event.id,
              title: event.title,
              start: event.event_date,
              all_day: !event.event_time,
              has_mapping: false,
            });
          }
        }
      } catch (e: any) {
        console.error(`[calendar-sync] push-error exception event=${event.id} err=${e?.message || e}`);
        pushErrors.push({ event_id: event.id, error: String(e?.message || e) });
      }
    }

    // Delete-from-Google: only mappings of proven local origin that are still
    // editable. Everything else is unlinked locally and reported as a skip.
    console.log(
      `[calendar-sync] delete-google-start count=${deleteEvents.length} resumed=${deletedCursor.event_id ? "yes" : "no"} deleted_scan_complete=${deletedScanComplete}`,
    );
    const processedDeleted: any[] = [];
    let deletedAdvanceBlocked = false;
    const deleteSkipReasons: Record<string, number> = {};
    const markDeletedProcessed = (event: any) => {
      if (!deletedAdvanceBlocked) processedDeleted.push(event);
    };
    for (const event of deleteEvents) {
      const mapping = syncMap.get(event.id);
      if (!mapping) {
        // No mapping → nothing to delete on Google. The physical removal must
        // succeed before the cursor may pass this row.
        const { error: cleanupErr } = await supabase
          .from("agency_events")
          .delete()
          .eq("id", event.id)
          .eq("user_id", userId);
        if (cleanupErr) {
          deleteErrors++;
          console.error(`[calendar-sync] delete-local-cleanup-error event=${event.id} err=${cleanupErr.message}`);
          pushErrors.push({ event_id: event.id, error: cleanupErr.message });
          deletedAdvanceBlocked = true;
          continue;
        }
        console.log(`[calendar-sync] delete-local-cleanup event=${event.id} reason=no-mapping`);
        markDeletedProcessed(event);
        continue;
      }
      if (mapping.deleted_at) {
        deletedSkipped++;
        console.log(`[calendar-sync] skipped-deleted event=${event.id} reason=already-deleted-on-google google=${mapping.google_event_id}`);
        markDeletedProcessed(event);
        continue;
      }

      const deleteDecision = canDeleteRemotely(mapping);
      if (!deleteDecision.allowed) {
        // Google-origin / read-only / legacy mapping: the Google event stays
        // untouched. Locally we only tombstone the mapping (safe unlink).
        const tombstoneAt = new Date().toISOString();
        const { error: unlinkErr } = await supabase
          .from("google_calendar_sync")
          .update({ deleted_at: tombstoneAt, last_synced_at: tombstoneAt })
          .eq("id", mapping.id);
        if (unlinkErr) {
          deleteErrors++;
          console.error(`[calendar-sync] delete-unlink-error event=${event.id} err=${unlinkErr.message}`);
          pushErrors.push({ event_id: event.id, error: unlinkErr.message });
          deletedAdvanceBlocked = true;
          continue;
        }
        mapping.deleted_at = tombstoneAt;
        syncMap.set(event.id, mapping);
        reverseSyncMap.set(mapping.google_event_id, mapping);
        deletedSkipped++;
        deleteSkipReasons[deleteDecision.reason] = (deleteSkipReasons[deleteDecision.reason] || 0) + 1;
        markDeletedProcessed(event);
        console.log(
          `[calendar-sync] delete-google-skipped event=${event.id} google=${mapping.google_event_id} reason=${deleteDecision.reason} remote_preserved=true`,
        );
        continue;
      }

      try {
        const res = await fetchGoogle(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events/${mapping.google_event_id}`,
          { method: "DELETE", headers: mapping.google_etag ? { "If-Match": mapping.google_etag } : {} }
        );
        if (isPreconditionFailed(res.status)) {
          // Changed on Google since our last read → treat as a conflict.
          await res.text().catch(() => "");
          await recordConflict({
            userId,
            syncId: mapping.id,
            agencyEventId: event.id,
            googleEventId: mapping.google_event_id,
            conflictType: "precondition_failed",
            localEvent: event,
            localUpdatedAt: event.updated_at ?? null,
          });
          deletedSkipped++;
          console.warn(`[calendar-sync] delete-conflict event=${event.id} google=${mapping.google_event_id} status=412`);
          markDeletedProcessed(event);
          continue;
        }
        // 200/204 = deleted, 404/410 = already gone (treat as success)
        // 400/403 with eventTypeRestriction = Google-managed event that cannot
        // be deleted via API. Tombstone the mapping so we stop retrying.
        let isEventTypeRestriction = false;
        let restrictionBody = "";
        if (!res.ok && (res.status === 400 || res.status === 403)) {
          restrictionBody = await res.clone().text();
          if (restrictionBody.includes("eventTypeRestriction")) {
            isEventTypeRestriction = true;
          }
        }
        if (res.ok || res.status === 404 || res.status === 410 || isEventTypeRestriction) {
          const tombstoneAt = new Date().toISOString();
          const { error: tombErr } = await supabase
            .from("google_calendar_sync")
            .update({ deleted_at: tombstoneAt, last_synced_at: tombstoneAt })
            .eq("id", mapping.id);
          if (tombErr) {
            deleteErrors++;
            console.error(`[calendar-sync] delete-google-error tombstone event=${event.id} err=${tombErr.message}`);
            pushErrors.push({ event_id: event.id, error: tombErr.message });
            deletedAdvanceBlocked = true;
            continue;
          }
          mapping.deleted_at = tombstoneAt;
          syncMap.set(event.id, mapping);
          reverseSyncMap.set(mapping.google_event_id, mapping);
          deletedGoogle++;
          markDeletedProcessed(event);
          console.log(`[calendar-sync] delete-google-success event=${event.id} google=${mapping.google_event_id} status=${res.status}${isEventTypeRestriction ? " reason=event-type-restriction-skipped" : ""}`);
        } else {
          const errText = await res.text();
          deleteErrors++;
          console.error(`[calendar-sync] delete-google-error event=${event.id} google=${mapping.google_event_id} status=${res.status} body=${errText.slice(0, 300)}`);
          pushErrors.push({ event_id: event.id, status: res.status, error: errText.slice(0, 200) });
          deletedAdvanceBlocked = true;
        }
      } catch (e: any) {
        deleteErrors++;
        console.error(`[calendar-sync] delete-google-error exception event=${event.id} err=${e?.message || e}`);
        pushErrors.push({ event_id: event.id, error: String(e?.message || e) });
        deletedAdvanceBlocked = true;
      }
    }
    const advancedDeletedCursor = nextDeletedCursor(processedDeleted, deletedCursor);

    const pushed = pushedCreated + pushedUpdated;
    const pulled = pulledCreated + pulledUpdated;
    console.log(
      `[calendar-sync] finished user=${userId} pushed_created=${pushedCreated} pushed_updated=${pushedUpdated} pushed_skipped=${pushedSkipped} push_errors=${pushErrors.length} pulled_created=${pulledCreated} pulled_updated=${pulledUpdated} pulled_skipped=${pulledSkipped} pull_errors=${pullErrors.length} deleted_google=${deletedGoogle} deleted_local=${deletedLocal} deleted_skipped=${deletedSkipped} delete_errors=${deleteErrors} total_google=${googleEvents.length}`
    );

    // A failed mapping lookup is a transient error: it must surface in the
    // status so the run is never reported as a clean success.
    const totalErrors =
      pushErrors.length + pullErrors.length + deleteErrors + (mappingFetchFailed ? 1 : 0);

    // Progress persistence. A partial bootstrap keeps its pageToken and is
    // reported as "bootstrap" — never as a finished sync.
    let progressColumns: Record<string, unknown> = {};
    let bootstrapInProgress = false;
    let incrementalInProgress = false;
    let bootstrapBlocked = false;
    if (cursorReset) {
      // Only a real HTTP 410 reaches here: cursors (sync_token,
      // bootstrap_page_token, incremental_page_token) are cleared; events,
      // mappings and tombstones are untouched.
      progressColumns = computeCursorResetUpdate();
      bootstrapInProgress = true;
    } else if (!pullPageError) {
      if (pullMode === "bootstrap") {
        bootstrapBlocked = isBootstrapCompletionBlocked({
          nextPageToken: pendingPageToken,
          nextSyncToken: receivedSyncToken,
        });
        progressColumns = computeBootstrapUpdate({
          nextPageToken: pendingPageToken,
          nextSyncToken: receivedSyncToken,
          pagesDone: (tokenRecord.bootstrap_pages_done || 0) + pagesThisRun,
          itemsDone: (tokenRecord.bootstrap_items_done || 0) + itemsThisRun,
          // Immutable for the whole walk: whatever produced the pageToken.
          windowStart: pullBootstrapWindow.windowStart,
          windowEnd: pullBootstrapWindow.windowEnd,
          startedAt: tokenRecord.bootstrap_started_at,
        });
        // Blocked completion keeps the bootstrap open for a safe retry.
        bootstrapInProgress = !!pendingPageToken || bootstrapBlocked;
        if (bootstrapBlocked) {
          console.warn(
            `[calendar-sync] bootstrap-missing-sync-token pages=${pagesThisRun} items=${itemsThisRun} completed=false retry=true`,
          );
        }
      } else {
        const cycle = resolveIncrementalCycleBase(tokenRecord);
        progressColumns = computeIncrementalUpdate({
          nextPageToken: pendingPageToken,
          nextSyncToken: receivedSyncToken,
          currentSyncToken: tokenRecord.sync_token,
          pagesDone: cycle.pagesDone + pagesThisRun,
          itemsDone: cycle.itemsDone + itemsThisRun,
          startedAt: cycle.startedAt,
        });
        incrementalInProgress = !!pendingPageToken;
      }
    }
    // Local push cursor advances only over rows actually processed. With an
    // unknown mapping state nothing was pushed, so the cursor stays put.
    if (!localErr && !mappingFetchFailed) {
      progressColumns = {
        ...progressColumns,
        push_cursor_updated_at: advancedPushCursor.updated_at,
        push_cursor_event_id: advancedPushCursor.event_id,
        ...(pushScanComplete ? { push_cursor_completed_at: new Date().toISOString() } : {}),
      };
    }
    // Deletion cursor advances independently from the live scan.
    if (!deletedErr && !mappingFetchFailed) {
      progressColumns = {
        ...progressColumns,
        push_deleted_cursor_at: advancedDeletedCursor.deleted_at,
        push_deleted_cursor_event_id: advancedDeletedCursor.event_id,
        ...(deletedScanComplete && !deletedAdvanceBlocked
          ? { push_deleted_cursor_completed_at: new Date().toISOString() }
          : {}),
      };
    }

    await releaseLock(
      resolveSyncStatus({ bootstrapInProgress, incrementalInProgress, errors: totalErrors }),
      totalErrors > 0 ? `${totalErrors} erro(s) durante a sincronização` : null,
      progressColumns,
    );

    return new Response(
      JSON.stringify({
        success: true,
        pushed,
        pulled,
        pushed_created: pushedCreated,
        pushed_updated: pushedUpdated,
        pushed_skipped: pushedSkipped,
        pulled_created: pulledCreated,
        pulled_updated: pulledUpdated,
        pulled_skipped: pulledSkipped,
        deleted_google: deletedGoogle,
        deleted_local: deletedLocal,
        deleted_skipped: deletedSkipped,
        delete_errors: deleteErrors,
        duration_ms: Date.now() - syncStartedAt,
        total_google: googleEvents.length,
        pull_mode: pullMode,
        bootstrap_in_progress: bootstrapInProgress,
        pages_this_run: pagesThisRun,
        items_this_run: itemsThisRun,
        incremental_in_progress: incrementalInProgress,
        resume_pending: !!pendingPageToken || bootstrapInProgress || incrementalInProgress,
        cursor_reset: cursorReset,
        push_scan_complete: pushScanComplete,
        push_batch_size: liveLocalEvents.length,
        mapping_fetch_failed: mappingFetchFailed,
        bootstrap_completion_blocked: bootstrapBlocked,
        pull_window: { start: pullBootstrapWindow.windowStart, end: pullBootstrapWindow.windowEnd, persisted: pullBootstrapWindow.persisted },
        deleted_scan_complete: deletedScanComplete && !deletedAdvanceBlocked,
        deleted_batch_size: deletedLocalEvents.length,
        deleted_processed: processedDeleted.length,
        // Block 3 reporting: conflicts and preserved (never overwritten) items.
        conflicts_detected: conflictsDetected,
        conflicts: conflictSummary,
        read_only_skipped: readOnlySkipped,
        delete_skip_reasons: deleteSkipReasons,
        phase_order: "pull_then_push",
        limits,
        push_errors: pushErrors,
        pull_errors: pullErrors,
        window: { start: windowStartDay, end: windowEndDay },
        calendar_id: calendarId,
        skip_summary: {
          push: pushSkipReasons,
          pull: pullSkipReasons,
        },
        // Detailed samples of the first N ignored items so the UI can show a
        // breakdown. Contains only the diagnostic fields listed in the sync
        // investigation spec (no arbitrary payload data).
        skip_samples: {
          push: pushSkipSamples,
          pull: pullSkipSamples,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    } catch (innerErr) {
      const transient = isTransientSyncError(innerErr);
      console.error(
        `[calendar-sync] sync-failed user=${userId} transient=${transient} err=${(innerErr as any)?.message || innerErr}`,
      );
      // Locks are always released; a transient timeout never flags re-consent.
      await releaseLock("error", String((innerErr as any)?.message || innerErr).slice(0, 500));
      throw innerErr;
    } finally {
      if (!lockReleased) {
        await releaseLock("error", "Sincronização interrompida.");
      }
    }
  } catch (error) {
    console.error("Sync error:", error);
    return new Response(JSON.stringify({ error: "Erro na sincronização" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
