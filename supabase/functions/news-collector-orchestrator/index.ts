import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  authorizeCollectorRequest,
  corsHeaders,
  PORTAL_CONFIGS,
  runCollectPortal,
  type PortalKey,
} from "../_shared/news-scraper.ts";

const ALL_PORTALS: PortalKey[] = ["PANROTAS", "Mercado & Eventos", "Brasilturis"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = await authorizeCollectorRequest(req);
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: auth.reason || "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let selected: PortalKey[] = ALL_PORTALS;
  if (req.method === "POST") {
    try {
      const body = await req.json();
      if (Array.isArray(body?.portals) && body.portals.length > 0) {
        selected = body.portals.filter((p: string) => (ALL_PORTALS as string[]).includes(p)) as PortalKey[];
      }
    } catch (_) { /* no body → all */ }
  }

  // Executa em paralelo, isolando falhas (Promise.allSettled)
  const settled = await Promise.allSettled(
    selected.map((p) => runCollectPortal(p, auth.triggerSource)),
  );

  const results = settled.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    return {
      portal: selected[i],
      status: "error" as const,
      run_id: null,
      message: (r.reason as Error)?.message || "unknown error",
      counters: {
        found: 0, inserted: 0, updated: 0, skipped_duplicates: 0,
        invalid: 0, others: 0, broken_links: 0, errors: [],
      },
    };
  });

  const summary = results.reduce(
    (acc, r) => {
      acc.found += r.counters.found;
      acc.inserted += r.counters.inserted;
      acc.skipped_duplicates += r.counters.skipped_duplicates;
      acc.invalid += r.counters.invalid;
      acc.others += r.counters.others;
      if (r.status === "error") acc.portals_failed++;
      return acc;
    },
    { found: 0, inserted: 0, skipped_duplicates: 0, invalid: 0, others: 0, portals_failed: 0 },
  );

  return new Response(JSON.stringify({
    trigger: auth.triggerSource,
    portals: results,
    summary,
    portals_configured: Object.keys(PORTAL_CONFIGS),
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});