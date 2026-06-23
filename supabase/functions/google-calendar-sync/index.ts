import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GoogleEvent {
  id: string;
  summary?: string;
  description?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  status?: string;
  updated?: string;
}

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> {
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
  if (!res.ok) return null;
  return await res.json();
}

async function getValidToken(supabase: any, tokenRecord: any): Promise<string | null> {
  const now = new Date();
  const expiresAt = new Date(tokenRecord.token_expires_at);

  if (expiresAt > new Date(now.getTime() + 60000)) {
    return tokenRecord.access_token;
  }

  const refreshed = await refreshAccessToken(tokenRecord.refresh_token);
  if (!refreshed) return null;

  const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
  await supabase
    .from("google_calendar_tokens")
    .update({ access_token: refreshed.access_token, token_expires_at: newExpiry, updated_at: new Date().toISOString() })
    .eq("user_id", tokenRecord.user_id);

  return refreshed.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const userId = claimsData.claims.sub;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json().catch(() => ({}));
    const action = body.action || "sync";

    // Handle disconnect
    if (action === "disconnect") {
      await supabase.from("google_calendar_tokens").delete().eq("user_id", userId);
      await supabase.from("google_calendar_sync").delete().eq("user_id", userId);
      return new Response(JSON.stringify({ success: true, message: "Desconectado" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle status check
    if (action === "status") {
      const { data: token } = await supabase
        .from("google_calendar_tokens")
        .select("sync_enabled, last_sync_at, created_at")
        .eq("user_id", userId)
        .single();

      return new Response(JSON.stringify({ connected: !!token, ...(token || {}) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Full sync
    const { data: tokenRecord } = await supabase
      .from("google_calendar_tokens")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (!tokenRecord) {
      return new Response(JSON.stringify({ error: "Google Calendar não conectado" }), { status: 400, headers: corsHeaders });
    }

    const accessToken = await getValidToken(supabase, tokenRecord);
    if (!accessToken) {
      // Token refresh failed, remove stale record
      await supabase.from("google_calendar_tokens").delete().eq("user_id", userId);
      return new Response(JSON.stringify({ error: "Token expirado. Reconecte o Google Calendar." }), { status: 401, headers: corsHeaders });
    }

    // Sync window: 30 days back → 730 days forward
    const now = new Date();
    const windowStartDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const windowEndDate = new Date(now.getTime() + 730 * 24 * 60 * 60 * 1000);
    const windowStart = windowStartDate.toISOString();
    const windowEnd = windowEndDate.toISOString();
    const windowStartDay = windowStartDate.toISOString().slice(0, 10);
    const windowEndDay = windowEndDate.toISOString().slice(0, 10);

    // Resolve agency_id for context (best-effort, never blocks sync)
    let agencyId: string | null = null;
    try {
      const { data: prof } = await supabase
        .from("profiles")
        .select("agency_id")
        .eq("id", userId)
        .maybeSingle();
      agencyId = prof?.agency_id ?? null;
    } catch (_) { /* ignore */ }

    const calendarId = "primary";
    console.log(
      `[calendar-sync] boot user=${userId} agency=${agencyId ?? "n/a"} calendar=${calendarId} window=${windowStartDay}..${windowEndDay} window_iso=${windowStart}..${windowEnd}`
    );

    // 1. Push local events → Google
    const { data: localEvents, error: localErr } = await supabase
      .from("agency_events")
      .select("*")
      .eq("user_id", userId)
      .gte("event_date", windowStartDay)
      .lte("event_date", windowEndDay);

    if (localErr) {
      console.error(`[calendar-sync] local-fetch-error err=${localErr.message}`);
    }

    const { data: existingSyncs, error: syncErr } = await supabase
      .from("google_calendar_sync")
      .select("*")
      .eq("user_id", userId);

    if (syncErr) {
      console.error(`[calendar-sync] sync-fetch-error err=${syncErr.message}`);
    }

    const syncMap = new Map((existingSyncs || []).map((s: any) => [s.agency_event_id, s]));
    const localIds = new Set((localEvents || []).map((e: any) => e.id));
    const mappedInWindow = (localEvents || []).filter((e: any) => syncMap.has(e.id)).length;
    const unmappedInWindow = (localEvents || []).length - mappedInWindow;
    const orphanMappings = (existingSyncs || []).filter((s: any) => !localIds.has(s.agency_event_id)).length;

    console.log(
      `[calendar-sync] inventory local_events=${localEvents?.length || 0} existing_mappings=${existingSyncs?.length || 0} mapped_in_window=${mappedInWindow} unmapped_in_window=${unmappedInWindow} orphan_mappings_outside_window=${orphanMappings}`
    );
    let pushedCreated = 0;
    let pushedUpdated = 0;
    let pushedSkipped = 0;
    const pushErrors: Array<{ event_id: string; status?: number; error: string }> = [];

    console.log(`[calendar-sync] push-start count=${localEvents?.length || 0}`);

    for (const event of localEvents || []) {
      const existing = syncMap.get(event.id);

      // Skip push if local event hasn't changed since last sync
      if (existing && existing.last_synced_at && event.updated_at) {
        const localUpdated = new Date(event.updated_at).getTime();
        const lastSynced = new Date(existing.last_synced_at).getTime();
        if (localUpdated <= lastSynced) {
          pushedSkipped++;
          console.log(`[calendar-sync] push-skipped event=${event.id} reason=unchanged-since-last-sync`);
          continue;
        }
      }

      // Build start/end. If timed, ensure end >= start + 1h (Google rejects end == start).
      let start: Record<string, string>;
      let end: Record<string, string>;
      if (event.event_time) {
        const timeStr = String(event.event_time).slice(0, 5); // HH:MM
        const startDateTime = `${event.event_date}T${timeStr}:00`;
        const startMs = new Date(`${startDateTime}-03:00`).getTime();
        const endMs = startMs + 60 * 60 * 1000;
        const endLocal = new Date(endMs);
        // Format as YYYY-MM-DDTHH:MM:00 in America/Sao_Paulo (UTC-3)
        const endShifted = new Date(endMs - 3 * 60 * 60 * 1000);
        const endDateTime = endShifted.toISOString().slice(0, 19);
        start = { dateTime: startDateTime, timeZone: "America/Sao_Paulo" };
        end = { dateTime: endDateTime, timeZone: "America/Sao_Paulo" };
      } else {
        // All-day event: Google requires end.date = start.date + 1 day
        const startDay = new Date(`${event.event_date}T00:00:00Z`);
        const endDay = new Date(startDay.getTime() + 24 * 60 * 60 * 1000);
        start = { date: event.event_date };
        end = { date: endDay.toISOString().slice(0, 10) };
      }

      const googleEvent = {
        summary: event.title,
        description: event.description || "",
        start,
        end,
      };

      try {
        if (existing) {
          const res = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events/${existing.google_event_id}`,
            {
              method: "PUT",
              headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
              body: JSON.stringify(googleEvent),
            }
          );
          if (!res.ok) {
            const errText = await res.text();
            console.error(`[calendar-sync] push-error update event=${event.id} status=${res.status} body=${errText.slice(0, 300)}`);
            pushErrors.push({ event_id: event.id, status: res.status, error: errText.slice(0, 200) });
          } else {
            pushedUpdated++;
            await supabase
              .from("google_calendar_sync")
              .update({ last_synced_at: new Date().toISOString() })
              .eq("id", existing.id);
            console.log(`[calendar-sync] push-updated event=${event.id} google=${existing.google_event_id}`);
          }
        } else {
          const res = await fetch(
            "https://www.googleapis.com/calendar/v3/calendars/primary/events",
            {
              method: "POST",
              headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
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
            await supabase.from("google_calendar_sync").insert({
              user_id: userId,
              agency_event_id: event.id,
              google_event_id: created.id,
              last_synced_at: new Date().toISOString(),
            });
            pushedCreated++;
            console.log(`[calendar-sync] push-created event=${event.id} google=${created.id}`);
          } else {
            pushedSkipped++;
            console.warn(`[calendar-sync] push-skipped event=${event.id} reason=no-id`);
          }
        }
      } catch (e: any) {
        console.error(`[calendar-sync] push-error exception event=${event.id} err=${e?.message || e}`);
        pushErrors.push({ event_id: event.id, error: String(e?.message || e) });
      }
    }

    // 2. Pull Google events → local
    console.log(`[calendar-sync] pull-start range=${windowStart}..${windowEnd}`);
    const googleRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(windowStart)}&timeMax=${encodeURIComponent(windowEnd)}&singleEvents=true&maxResults=500&orderBy=startTime`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    let pulledCreated = 0;
    let pulledUpdated = 0;
    let pulledSkipped = 0;
    const pullErrors: Array<{ google_event_id?: string; status?: number; error: string }> = [];
    let googleEvents: GoogleEvent[] = [];

    if (!googleRes.ok) {
      const errText = await googleRes.text();
      console.error(`[calendar-sync] pull-error list status=${googleRes.status} body=${errText.slice(0, 300)}`);
      pullErrors.push({ status: googleRes.status, error: errText.slice(0, 200) });
    } else {
      const googleData = await googleRes.json();
      googleEvents = googleData.items || [];
      console.log(`[calendar-sync] pull-list google_events=${googleEvents.length}`);

      const reverseSyncMap = new Map((existingSyncs || []).map((s: any) => [s.google_event_id, s]));
      let skipCancelled = 0;
      let skipAlreadyMapped = 0;
      let skipNoDate = 0;

      for (const gEvent of googleEvents) {
        if (gEvent.status === "cancelled") {
          pulledSkipped++; skipCancelled++;
          console.log(`[calendar-sync] pull-skipped google=${gEvent.id} reason=cancelled`);
          continue;
        }
        const startDate = gEvent.start?.date || gEvent.start?.dateTime?.split("T")[0];
        if (!startDate) {
          pulledSkipped++; skipNoDate++;
          console.log(`[calendar-sync] pull-skipped google=${gEvent.id} reason=no-start-date`);
          continue;
        }

        const startTime = gEvent.start?.dateTime
          ? gEvent.start.dateTime.split("T")[1]?.substring(0, 5)
          : null;

        const mapped = reverseSyncMap.get(gEvent.id);
        if (mapped) {
          // Already mapped: update local only if Google version is newer than last sync
          const gUpdated = gEvent.updated ? new Date(gEvent.updated).getTime() : 0;
          const lastSynced = mapped.last_synced_at ? new Date(mapped.last_synced_at).getTime() : 0;
          if (gUpdated <= lastSynced) {
            pulledSkipped++; skipAlreadyMapped++;
            continue;
          }
          try {
            const { error: updErr } = await supabase
              .from("agency_events")
              .update({
                title: gEvent.summary || "Sem título",
                description: gEvent.description || null,
                event_date: startDate,
                event_time: startTime,
              })
              .eq("id", mapped.agency_event_id)
              .eq("user_id", userId);
            if (updErr) {
              console.error(`[calendar-sync] pull-error update google=${gEvent.id} err=${updErr.message}`);
              pullErrors.push({ google_event_id: gEvent.id, error: updErr.message });
              continue;
            }
            await supabase
              .from("google_calendar_sync")
              .update({ last_synced_at: new Date().toISOString() })
              .eq("id", mapped.id);
            pulledUpdated++;
            console.log(`[calendar-sync] pull-updated google=${gEvent.id} local=${mapped.agency_event_id}`);
          } catch (e: any) {
            console.error(`[calendar-sync] pull-error exception update google=${gEvent.id} err=${e?.message || e}`);
            pullErrors.push({ google_event_id: gEvent.id, error: String(e?.message || e) });
          }
          continue;
        }

        try {
          const { data: inserted, error: insErr } = await supabase
            .from("agency_events")
            .insert({
              user_id: userId,
              title: gEvent.summary || "Sem título",
              description: gEvent.description || null,
              event_type: "compromisso",
              event_date: startDate,
              event_time: startTime,
              color: "#22c55e",
            })
            .select("id")
            .single();

          if (insErr || !inserted) {
            console.error(`[calendar-sync] pull-error insert google=${gEvent.id} err=${insErr?.message}`);
            pullErrors.push({ google_event_id: gEvent.id, error: insErr?.message || "insert failed" });
            continue;
          }

          await supabase.from("google_calendar_sync").insert({
            user_id: userId,
            agency_event_id: inserted.id,
            google_event_id: gEvent.id,
            last_synced_at: new Date().toISOString(),
          });
          pulledCreated++;
          console.log(`[calendar-sync] pull-created google=${gEvent.id} local=${inserted.id}`);
        } catch (e: any) {
          console.error(`[calendar-sync] pull-error exception google=${gEvent.id} err=${e?.message || e}`);
          pullErrors.push({ google_event_id: gEvent.id, error: String(e?.message || e) });
        }
      }

      console.log(
        `[calendar-sync] pull-summary created=${pulledCreated} updated=${pulledUpdated} skipped_cancelled=${skipCancelled} skipped_already_mapped_unchanged=${skipAlreadyMapped} skipped_no_date=${skipNoDate}`
      );
    }

    // Update last sync
    await supabase
      .from("google_calendar_tokens")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("user_id", userId);

    const pushed = pushedCreated + pushedUpdated;
    const pulled = pulledCreated + pulledUpdated;
    console.log(
      `[calendar-sync] finished user=${userId} pushed_created=${pushedCreated} pushed_updated=${pushedUpdated} pushed_skipped=${pushedSkipped} push_errors=${pushErrors.length} pulled_created=${pulledCreated} pulled_updated=${pulledUpdated} pulled_skipped=${pulledSkipped} pull_errors=${pullErrors.length} total_google=${googleEvents.length}`
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
        total_google: googleEvents.length,
        push_errors: pushErrors,
        pull_errors: pullErrors,
        window: { start: windowStartDay, end: windowEndDay },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Sync error:", error);
    return new Response(JSON.stringify({ error: "Erro na sincronização" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
