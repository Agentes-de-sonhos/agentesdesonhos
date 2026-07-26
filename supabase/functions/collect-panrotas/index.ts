import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { authorizeCollectorRequest, corsHeaders, runCollectPortal } from "../_shared/news-scraper.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = await authorizeCollectorRequest(req);
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: auth.reason || "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  try {
    const result = await runCollectPortal("PANROTAS", auth.triggerSource);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("collect-panrotas error:", e);
    return new Response(JSON.stringify({ error: "Falha ao coletar PANROTAS." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});