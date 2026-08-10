import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  CRON_SECRET_HEADER,
  fetchCronSecret,
  isAuthorizedInternalCall,
} from "../_shared/calendarCronAuth.ts";
import {
  effectiveUserTimeoutMs,
  getCronBudget,
  hasCronBudgetLeft,
  orderEligibleTokens,
} from "../_shared/calendarSyncPaging.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startedAt = Date.now();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Fail-closed authentication: the shared secret lives in the database vault.
  const expectedSecret = await fetchCronSecret(supabase);
  const presentedSecret = req.headers.get(CRON_SECRET_HEADER);
  if (!isAuthorizedInternalCall(presentedSecret, expectedSecret)) {
    console.warn(`[calendar-sync] cron-unauthorized configured=${expectedSecret ? "yes" : "no"}`);
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log(`[calendar-sync] cron-start`);

  // Housekeeping: drop stale OAuth state rows.
  try {
    await supabase.rpc("cleanup_google_oauth_states");
  } catch (e) {
    console.warn(`[calendar-sync] cron-state-cleanup-error err=${(e as Error)?.message}`);
  }

  // Eligible: connected users whose auto-sync is enabled and (a) never synced OR (b) >2min since last sync.
  const twoMinAgo = new Date(Date.now() - 2 * 60_000).toISOString();
  const { data: tokens, error } = await supabase
    .from("google_calendar_tokens")
    .select("user_id, last_sync_at, sync_in_progress, sync_lock_at, connection_state")
    .eq("auto_sync_enabled", true)
    .eq("connection_state", "connected")
    .or(`last_sync_at.is.null,last_sync_at.lt.${twoMinAgo}`);

  if (error) {
    console.error(`[calendar-sync] cron-fetch-error err=${error.message}`);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const eligible = tokens || [];
  // Fairness: never-synced first, then oldest last_sync_at. Since every run
  // updates last_sync_at, the heavy account cannot monopolize the queue.
  const queue = orderEligibleTokens(eligible);
  const budget = getCronBudget(Deno.env.toObject());
  console.log(
    `[calendar-sync] cron-eligible count=${queue.length} budget_ms=${budget.totalMs} per_user_ms=${budget.perUserMs} max_users=${budget.maxUsers}`,
  );

  let invoked = 0;
  let failures = 0;
  let timeouts = 0;
  let deferred = 0;
  let bootstrapPending = 0;
  // Aggregated only: user identifiers are never returned in the response.
  const statusCounts: Record<string, number> = {};
  const skipCounts: Record<string, number> = {};

  // Sequential to avoid bursts; each user has its own timeout and a slow or
  // failing account never blocks the remaining ones.
  for (const t of queue) {
    if (!hasCronBudgetLeft(Date.now() - startedAt, invoked, budget)) {
      deferred = queue.length - invoked;
      console.log(`[calendar-sync] cron-budget-reached processed=${invoked} deferred=${deferred}`);
      break;
    }
    // Effective slice: never exceeds what is left of the whole-run budget.
    const sliceMs = effectiveUserTimeoutMs(Date.now() - startedAt, budget);
    if (sliceMs <= 0) {
      deferred = queue.length - invoked;
      console.log(`[calendar-sync] cron-no-window processed=${invoked} deferred=${deferred}`);
      break;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), sliceMs);
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/google-calendar-sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [CRON_SECRET_HEADER]: expectedSecret!,
        },
        body: JSON.stringify({ action: "sync", user_id: t.user_id }),
        signal: controller.signal,
      });
      let body: any = null;
      try { body = await res.json(); } catch { /* ignore */ }
      invoked++;
      statusCounts[String(res.status)] = (statusCounts[String(res.status)] || 0) + 1;
      if (body?.skipped) skipCounts[String(body.skipped)] = (skipCounts[String(body.skipped)] || 0) + 1;
      if (body?.bootstrap_in_progress) bootstrapPending++;
      // Aggregated only: never log user identifiers here.
      console.log(
        `[calendar-sync] cron-invoke status=${res.status} skipped=${body?.skipped || "no"} bootstrap_in_progress=${body?.bootstrap_in_progress ? "yes" : "no"} pages=${body?.pages_this_run ?? 0}`,
      );
    } catch (e: any) {
      const aborted = e?.name === "AbortError";
      if (aborted) timeouts++;
      failures++;
      invoked++;
      // Continue with the remaining users after a timeout or error.
      console.error(`[calendar-sync] cron-invoke-error timeout=${aborted} err=${e?.message || e}`);
    } finally {
      clearTimeout(timer);
    }
  }

  const durationMs = Date.now() - startedAt;
  console.log(
    `[calendar-sync] cron-finished invoked=${invoked} failures=${failures} timeouts=${timeouts} deferred=${deferred} bootstrap_pending=${bootstrapPending} duration_ms=${durationMs}`,
  );

  return new Response(
    JSON.stringify({
      success: true,
      eligible: queue.length,
      invoked,
      failures,
      timeouts,
      deferred,
      bootstrap_pending: bootstrapPending,
      duration_ms: durationMs,
      status_counts: statusCounts,
      skip_counts: skipCounts,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
