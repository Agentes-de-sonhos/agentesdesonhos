// Authorized, title-scoped, resumable purge of remote Google Calendar copies.
//
// Scope guarantees:
//  - one single account (job.user_id) and one calendar;
//  - only the four exact titles in PURGE_TARGET_TITLES;
//  - mapped ids first (deduped by recurring master), then a bounded Google-side
//    scan for unmapped duplicates;
//  - sync stays disabled: this function never touches sync_enabled /
//    auto_sync_enabled and never runs a sync;
//  - never logs tokens, event ids, titles or user identifiers.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  CRON_SECRET_HEADER,
  fetchCronSecret,
  isAuthorizedInternalCall,
} from "../_shared/calendarCronAuth.ts";
import {
  buildVerifiedEncryptedColumns,
  getTokenEncKey,
  readTokenField,
} from "../_shared/googleTokenCrypto.ts";
import {
  bumpErrorSummary,
  buildPurgeScanUrl,
  classifyDeleteStatus,
  hasPurgeBudgetLeft,
  matchesPurgeTitle,
  PURGE_BATCH_SIZE,
  PURGE_TARGET_TITLES,
} from "../_shared/calendarPurge.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function resolveAccessToken(supabase: any, userId: string): Promise<string | null> {
  const encKey = getTokenEncKey();
  if (!encKey) {
    console.error("[calendar-purge] token-read-blocked reason=missing-enc-key");
    return null;
  }
  const { data: rec, error } = await supabase
    .from("google_calendar_tokens")
    .select("user_id, access_token, refresh_token, access_token_enc, refresh_token_enc, token_enc_version, token_expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !rec) {
    console.error(`[calendar-purge] token-missing err=${error?.message || "no-row"}`);
    return null;
  }
  const access = await readTokenField(rec, "access_token", encKey);
  const refresh = await readTokenField(rec, "refresh_token", encKey);
  const expiresAt = rec.token_expires_at ? new Date(rec.token_expires_at).getTime() : 0;
  if (access && expiresAt > Date.now() + 60_000) return access;
  if (!refresh) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
      refresh_token: refresh,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    console.error(`[calendar-purge] token-refresh-failed status=${res.status}`);
    return null;
  }
  const body = await res.json();
  if (!body?.access_token) return null;
  const columns = await buildVerifiedEncryptedColumns(
    { access_token: body.access_token, refresh_token: refresh },
    encKey,
  );
  if (columns) {
    await supabase
      .from("google_calendar_tokens")
      .update({
        ...columns,
        token_expires_at: new Date(Date.now() + (body.expires_in ?? 3600) * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
  }
  return body.access_token as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Fail-closed: only the internal cron secret may reach this endpoint.
  const expected = await fetchCronSecret(supabase);
  if (!isAuthorizedInternalCall(req.headers.get(CRON_SECRET_HEADER), expected)) {
    console.warn(`[calendar-purge] unauthorized configured=${expected ? "yes" : "no"}`);
    return json({ error: "Unauthorized" }, 401);
  }

  let payload: any = {};
  try { payload = await req.json(); } catch { /* cron may send no body */ }
  const action: string = payload?.action || "run";

  if (action === "status") {
    const { data, error } = await supabase
      .from("google_calendar_purge_jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);
    if (error) return json({ error: error.message }, 500);
    return json({ success: true, jobs: data });
  }

  if (action === "start") {
    const userId: string | undefined = payload?.user_id;
    if (!userId) return json({ error: "user_id required" }, 400);
    const { data: open } = await supabase
      .from("google_calendar_purge_jobs")
      .select("id")
      .eq("user_id", userId)
      .in("status", ["pending", "running"])
      .maybeSingle();
    if (open) return json({ success: true, job_id: open.id, created: false });
    const { data, error } = await supabase
      .from("google_calendar_purge_jobs")
      .insert({
        user_id: userId,
        calendar_id: payload?.calendar_id || "primary",
        titles: PURGE_TARGET_TITLES,
        status: "pending",
        phase: "mappings",
        scan_window_start: payload?.window_start || "2026-07-22T00:00:00.000Z",
        scan_window_end: payload?.window_end || "2028-07-22T00:00:00.000Z",
      })
      .select("*")
      .single();
    if (error) return json({ error: error.message }, 500);
    console.log(`[calendar-purge] job-created phase=mappings`);
    return json({ success: true, job_id: data.id, created: true });
  }

  if (action !== "run") return json({ error: "unknown action" }, 400);

  // ---- run: claim the oldest open job and work for one bounded slice -------
  const startedAt = Date.now();
  const { data: candidate } = await supabase
    .from("google_calendar_purge_jobs")
    .select("*")
    .in("status", ["pending", "running"])
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!candidate) return json({ success: true, skipped: "no-open-job" });

  const { data: claimed } = await supabase.rpc("google_calendar_purge_claim", {
    p_job: candidate.id,
    p_stale_seconds: 300,
  });
  if (!claimed) {
    console.log(`[calendar-purge] skip reason=locked`);
    return json({ success: true, skipped: "locked" });
  }

  const job = candidate;
  const titles: string[] = job.titles || [];
  const calendarId: string = job.calendar_id || "primary";
  let removed = job.removed_count || 0;
  let alreadyGone = job.already_gone_count || 0;
  let failed = job.failed_count || 0;
  let scanned = job.scanned_count || 0;
  let mappingsMarked = job.mappings_marked || 0;
  let errorSummary: Record<string, number> = (job.error_summary as any) || {};
  let phase: string = job.phase || "mappings";
  let mappingCursor: string | null = job.mapping_cursor ?? null;
  let scanPageToken: string | null = job.scan_page_token ?? null;
  let status: string = "running";
  let lastError: string | null = null;
  let throttled = false;
  let deletedThisRun = 0;

  const accessToken = await resolveAccessToken(supabase, job.user_id);
  if (!accessToken) {
    await supabase
      .from("google_calendar_purge_jobs")
      .update({ last_error: "token_unavailable", locked_at: null, updated_at: new Date().toISOString() })
      .eq("id", job.id);
    return json({ success: false, error: "token_unavailable" }, 503);
  }

  const deleteRemote = async (targetId: string) => {
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(targetId)}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } },
    );
    let body = "";
    if (!res.ok) body = await res.text().catch(() => "");
    return { outcome: classifyDeleteStatus(res.status, body), status: res.status };
  };

  try {
    // ---------------- PHASE 1: mapped targets ----------------
    while (phase === "mappings" && hasPurgeBudgetLeft(Date.now() - startedAt) && !throttled) {
      const { data: targets, error: targetsErr } = await supabase.rpc("google_calendar_purge_next_targets", {
        p_job: job.id,
        p_limit: PURGE_BATCH_SIZE,
      });
      if (targetsErr) {
        lastError = "targets_fetch_failed";
        console.error(`[calendar-purge] targets-error err=${targetsErr.message}`);
        break;
      }
      const list: string[] = (targets || []).map((r: any) => r.target).filter(Boolean);
      if (list.length === 0) {
        phase = "scan";
        console.log(`[calendar-purge] phase-advance to=scan removed=${removed} already_gone=${alreadyGone}`);
        break;
      }
      for (const target of list) {
        if (!hasPurgeBudgetLeft(Date.now() - startedAt)) break;
        const { outcome, status: httpStatus } = await deleteRemote(target);
        if (outcome === "transient") {
          throttled = true;
          console.warn(`[calendar-purge] throttled status=${httpStatus} cursor_preserved=true`);
          break;
        }
        if (outcome === "removed" || outcome === "already_gone") {
          if (outcome === "removed") removed++; else alreadyGone++;
          deletedThisRun++;
          const { data: marked, error: markErr } = await supabase.rpc("google_calendar_purge_mark_target", {
            p_user: job.user_id,
            p_titles: titles,
            p_target: target,
          });
          if (markErr) {
            // Do not advance past a target whose mappings are still active.
            throttled = true;
            lastError = "mapping_mark_failed";
            console.error(`[calendar-purge] mark-error err=${markErr.message}`);
            break;
          }
          mappingsMarked += Number(marked || 0);
          mappingCursor = target;
        } else {
          failed++;
          errorSummary = bumpErrorSummary(errorSummary, httpStatus);
          mappingCursor = target;
        }
      }
      // Persist progress after every batch so a cold stop never loses work.
      await supabase
        .from("google_calendar_purge_jobs")
        .update({
          phase,
          mapping_cursor: mappingCursor,
          removed_count: removed,
          already_gone_count: alreadyGone,
          failed_count: failed,
          mappings_marked: mappingsMarked,
          error_summary: errorSummary,
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);
    }

    // ---------------- PHASE 2: complementary Google scan ----------------
    while (phase === "scan" && hasPurgeBudgetLeft(Date.now() - startedAt) && !throttled) {
      const url = buildPurgeScanUrl({
        calendarId,
        timeMin: job.scan_window_start || "2026-07-22T00:00:00.000Z",
        timeMax: job.scan_window_end || "2028-07-22T00:00:00.000Z",
        pageToken: scanPageToken,
      });
      const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (res.status === 410) {
        // Page token invalidated by our own deletions: restart the scan window.
        scanPageToken = null;
        console.warn(`[calendar-purge] scan-token-gone restart=yes`);
        continue;
      }
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        const outcome = classifyDeleteStatus(res.status, body);
        errorSummary = bumpErrorSummary(errorSummary, res.status);
        if (outcome === "transient") {
          throttled = true;
          console.warn(`[calendar-purge] scan-throttled status=${res.status}`);
        } else {
          lastError = `scan_failed_${res.status}`;
          console.error(`[calendar-purge] scan-error status=${res.status}`);
        }
        break;
      }
      const page = await res.json();
      const items: any[] = page.items || [];
      scanned += items.length;
      const matches = items.filter((it) => matchesPurgeTitle(it?.summary));
      console.log(`[calendar-purge] scan-page items=${items.length} matches=${matches.length} has_next=${page.nextPageToken ? "yes" : "no"}`);
      for (const item of matches) {
        if (!hasPurgeBudgetLeft(Date.now() - startedAt)) break;
        const targetId = item.recurringEventId || item.id;
        if (!targetId) continue;
        const { outcome, status: httpStatus } = await deleteRemote(targetId);
        if (outcome === "transient") {
          throttled = true;
          console.warn(`[calendar-purge] scan-delete-throttled status=${httpStatus}`);
          break;
        }
        if (outcome === "removed" || outcome === "already_gone") {
          if (outcome === "removed") removed++; else alreadyGone++;
          deletedThisRun++;
          await supabase.rpc("google_calendar_purge_mark_target", {
            p_user: job.user_id,
            p_titles: titles,
            p_target: targetId,
          });
        } else {
          failed++;
          errorSummary = bumpErrorSummary(errorSummary, httpStatus);
        }
      }
      if (throttled) break;
      // Deleting inside a page shifts pagination: rescan from the start of the
      // window whenever something was removed, otherwise follow the token.
      scanPageToken = matches.length > 0 ? null : (page.nextPageToken ?? null);
      if (matches.length === 0 && !page.nextPageToken) {
        phase = "done";
        status = "completed";
        console.log(`[calendar-purge] completed removed=${removed} already_gone=${alreadyGone} failed=${failed}`);
        break;
      }
      await supabase
        .from("google_calendar_purge_jobs")
        .update({
          phase,
          scan_page_token: scanPageToken,
          removed_count: removed,
          already_gone_count: alreadyGone,
          failed_count: failed,
          scanned_count: scanned,
          error_summary: errorSummary,
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);
    }
  } catch (e: any) {
    lastError = "run_exception";
    console.error(`[calendar-purge] run-exception err=${e?.message || e}`);
  }

  await supabase
    .from("google_calendar_purge_jobs")
    .update({
      status: status === "completed" ? "completed" : "pending",
      phase,
      mapping_cursor: mappingCursor,
      scan_page_token: scanPageToken,
      removed_count: removed,
      already_gone_count: alreadyGone,
      failed_count: failed,
      scanned_count: scanned,
      mappings_marked: mappingsMarked,
      error_summary: errorSummary,
      last_error: lastError,
      locked_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", job.id);

  const durationMs = Date.now() - startedAt;
  console.log(
    `[calendar-purge] run-finished phase=${phase} status=${status} deleted_this_run=${deletedThisRun} removed=${removed} already_gone=${alreadyGone} failed=${failed} throttled=${throttled} duration_ms=${durationMs}`,
  );

  return json({
    success: true,
    job_id: job.id,
    phase,
    status,
    throttled,
    deleted_this_run: deletedThisRun,
    removed_count: removed,
    already_gone_count: alreadyGone,
    failed_count: failed,
    mappings_marked: mappingsMarked,
    duration_ms: durationMs,
  });
});
