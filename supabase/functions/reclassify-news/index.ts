// Reclassifica em lote notícias existentes (ex: as que ficaram em "Outros" durante indisponibilidade da IA).
// Atualiza APENAS titulo_curto, resumo, categoria e classification_confidence.
// Preserva: portal (fonte), url_original, likes_count, reads_count, data_publicacao, hidden, status.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  authorizeCollectorRequest,
  CATEGORIES,
  classifyItemsWithAI,
  corsHeaders,
  type PortalKey,
} from "../_shared/news-scraper.ts";

interface NewsRow {
  id: string;
  titulo_curto: string | null;
  resumo: string | null;
  fonte: string;
  url_original: string | null;
  categoria: string | null;
}

const BATCH_SIZE = 8;
const HARD_LIMIT = 200; // segurança

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = await authorizeCollectorRequest(req);
  // Reclassificação só pode ser disparada manualmente por admin autenticado
  if (!auth.ok || auth.triggerSource !== "manual") {
    return new Response(JSON.stringify({ error: auth.reason || "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { ids?: string[]; only_others?: boolean; only_pending?: boolean; limit?: number } = {};
  try { body = await req.json(); } catch (_) { /* usa defaults */ }

  const limit = Math.max(1, Math.min(HARD_LIMIT, Number(body.limit) || HARD_LIMIT));
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const sr = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, sr);

  // 1. Seleciona alvos
  let query = sb
    .from("noticias_dashboard")
    .select("id, titulo_curto, resumo, fonte, url_original, categoria")
    .limit(limit);

  if (body.ids && Array.isArray(body.ids) && body.ids.length > 0) {
    query = query.in("id", body.ids.slice(0, HARD_LIMIT));
  } else if (body.only_pending) {
    query = query.is("classification_confidence", null);
  } else if (body.only_others !== false) {
    query = query.eq("categoria", "Outros");
  }

  const { data: rows, error: rowsErr } = await query;
  if (rowsErr) {
    return new Response(JSON.stringify({ error: rowsErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const targets = (rows ?? []) as NewsRow[];
  if (targets.length === 0) {
    return new Response(JSON.stringify({
      reclassified: 0, kept_others: 0, errors: 0, total: 0,
      error_details: [],
      message: "Nenhuma notícia encontrada para reclassificar.",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // 2. Agrupa por portal (o classificador recebe portalKey)
  const byPortal = new Map<PortalKey, NewsRow[]>();
  for (const r of targets) {
    const portal = (r.fonte as PortalKey) || "PANROTAS";
    if (!byPortal.has(portal)) byPortal.set(portal, []);
    byPortal.get(portal)!.push(r);
  }

  let reclassified = 0;
  let keptOthers = 0;
  let errors = 0;
  const errorDetails: unknown[] = [];

  for (const [portal, list] of byPortal.entries()) {
    for (let i = 0; i < list.length; i += BATCH_SIZE) {
      const chunk = list.slice(i, i + BATCH_SIZE);
      const items = chunk.map((r) => ({
        titulo_original: r.titulo_curto || "",
        conteudo: r.resumo || "",
        url: r.url_original || "",
        url_canonical: r.url_original || "",
        data_publicacao: null,
        content_hash: "",
      }));

      const ai = await classifyItemsWithAI(items, portal);
      if (!ai.ok) {
        errors += chunk.length;
        errorDetails.push({ portal, batch_size: chunk.length, ...ai.failure });
        continue;
      }

      for (let j = 0; j < chunk.length; j++) {
        const row = chunk[j];
        const c = ai.items[j];
        if (!c) { errors++; errorDetails.push({ id: row.id, reason: "no_ai_item" }); continue; }

        const confidence = typeof c.confidence === "number" ? Math.max(0, Math.min(1, c.confidence)) : null;
        let categoria = c.categoria && (CATEGORIES as readonly string[]).includes(c.categoria) ? c.categoria : "Outros";
        if (confidence != null && confidence < 0.5) categoria = "Outros";

        const titulo = (c.titulo_curto || row.titulo_curto || "").toString().slice(0, 160);
        const resumo = (c.resumo || row.resumo || "").toString().slice(0, 500);

        const { error: updErr } = await sb
          .from("noticias_dashboard")
          .update({
            categoria,
            titulo_curto: titulo || row.titulo_curto,
            resumo: resumo || row.resumo,
            classification_confidence: confidence,
          })
          .eq("id", row.id);

        if (updErr) {
          errors++;
          errorDetails.push({ id: row.id, message: updErr.message });
          continue;
        }
        if (categoria === "Outros") keptOthers++;
        else reclassified++;
      }
    }
  }

  return new Response(JSON.stringify({
    total: targets.length,
    reclassified,
    kept_others: keptOthers,
    errors,
    error_details: errorDetails.slice(0, 20),
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});