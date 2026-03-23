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

    // Get current year range
    const now = new Date();
    const yearStart = `${now.getFullYear()}-01-01T00:00:00Z`;
    const yearEnd = `${now.getFullYear()}-12-31T23:59:59Z`;

    // 1. Push local events → Google
    const { data: localEvents } = await supabase
      .from("agency_events")
      .select("*")
      .eq("user_id", userId)
      .gte("event_date", `${now.getFullYear()}-01-01`)
      .lte("event_date", `${now.getFullYear()}-12-31`);

    const { data: existingSyncs } = await supabase
      .from("google_calendar_sync")
      .select("*")
      .eq("user_id", userId);

    const syncMap = new Map((existingSyncs || []).map((s: any) => [s.agency_event_id, s]));
    let pushed = 0;
    let pulled = 0;

    for (const event of localEvents || []) {
      const existing = syncMap.get(event.id);

      const googleEvent = {
        summary: event.title,
        description: event.description || "",
        start: event.event_time
          ? { dateTime: `${event.event_date}T${event.event_time}:00`, timeZone: "America/Sao_Paulo" }
          : { date: event.event_date },
        end: event.event_time
          ? { dateTime: `${event.event_date}T${event.event_time}:00`, timeZone: "America/Sao_Paulo" }
          : { date: event.event_date },
      };

      if (existing) {
        // Update existing
        await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events/${existing.google_event_id}`,
          {
            method: "PUT",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify(googleEvent),
          }
        );
      } else {
        // Create new
        const res = await fetch(
          "https://www.googleapis.com/calendar/v3/calendars/primary/events",
          {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify(googleEvent),
          }
        );
        const created = await res.json();
        if (created.id) {
          await supabase.from("google_calendar_sync").insert({
            user_id: userId,
            agency_event_id: event.id,
            google_event_id: created.id,
          });
          pushed++;
        }
      }
    }

    // 2. Pull Google events → local
    const googleRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(yearStart)}&timeMax=${encodeURIComponent(yearEnd)}&singleEvents=true&maxResults=500`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const googleData = await googleRes.json();
    const googleEvents: GoogleEvent[] = googleData.items || [];

    const reverseSyncMap = new Map((existingSyncs || []).map((s: any) => [s.google_event_id, s]));

    for (const gEvent of googleEvents) {
      if (gEvent.status === "cancelled") continue;
      if (reverseSyncMap.has(gEvent.id)) continue; // Already synced from local

      const startDate = gEvent.start?.date || gEvent.start?.dateTime?.split("T")[0];
      if (!startDate) continue;

      const startTime = gEvent.start?.dateTime
        ? gEvent.start.dateTime.split("T")[1]?.substring(0, 5)
        : null;

      const { data: inserted } = await supabase
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

      if (inserted) {
        await supabase.from("google_calendar_sync").insert({
          user_id: userId,
          agency_event_id: inserted.id,
          google_event_id: gEvent.id,
        });
        pulled++;
      }
    }

    // Update last sync
    await supabase
      .from("google_calendar_tokens")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("user_id", userId);

    return new Response(
      JSON.stringify({ success: true, pushed, pulled, total_google: googleEvents.length }),
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
