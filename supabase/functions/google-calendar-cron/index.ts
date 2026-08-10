import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  CRON_SECRET_HEADER,
  fetchCronSecret,
  isAuthorizedInternalCall,
} from "../_shared/calendarCronAuth.ts";

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
  console.log(`[calendar-sync] cron-eligible count=${eligible.length}`);

  let invoked = 0;
  let failures = 0;
  // Aggregated only: user identifiers are never returned in the response.
  const statusCounts: Record<string, number> = {};
  const skipCounts: Record<string, number> = {};

  // Sequential to avoid bursts; per-user sync is fast and respects its own lock.
  for (const t of eligible) {
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/google-calendar-sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [CRON_SECRET_HEADER]: expectedSecret!,
        },
        body: JSON.stringify({ action: "sync", user_id: t.user_id }),
      });
      let body: any = null;
      try { body = await res.json(); } catch { /* ignore */ }
      invoked++;
      statusCounts[String(res.status)] = (statusCounts[String(res.status)] || 0) + 1;
      if (body?.skipped) skipCounts[String(body.skipped)] = (skipCounts[String(body.skipped)] || 0) + 1;
      console.log(`[calendar-sync] cron-invoke user=${t.user_id} status=${res.status} skipped=${body?.skipped || "no"}`);
    } catch (e: any) {
      failures++;
      console.error(`[calendar-sync] cron-invoke-error user=${t.user_id} err=${e?.message || e}`);
    }
  }

  const durationMs = Date.now() - startedAt;
  console.log(`[calendar-sync] cron-finished invoked=${invoked} failures=${failures} duration_ms=${durationMs}`);

  return new Response(
    JSON.stringify({
      success: true,
      eligible: eligible.length,
      invoked,
      failures,
      duration_ms: durationMs,
      status_counts: statusCounts,
      skip_counts: skipCounts,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
