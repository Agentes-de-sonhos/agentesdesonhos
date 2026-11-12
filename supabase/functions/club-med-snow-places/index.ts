/**
 * Club Med na neve — dados do Google Places (API New) compartilhados entre
 * todos os sites. O navegador envia só o slug do catálogo; a consulta vem da
 * allowlist abaixo. Resultado deduplicado por slug/Place ID na tabela
 * `club_med_place_cache` (service role) e reaproveitado por todos os tenants
 * até expirar (CACHE_HOURS). Avaliações e localização; fotos já coletadas só são devolvidas se
 * corresponderem à seleção individual de perfil + crédito + URI revisada.
 * Esta função não consulta novas fotos nem aprova futuras imagens do perfil.
 * A chave nunca sai do servidor.
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { selectReviewedGooglePhotos } from "../_shared/clubMedGooglePhotos.ts";
import { QUERIES } from "./queries.ts";

const CACHE_HOURS = 24;
const DETAILS_MASK = "id,displayName,formattedAddress,location,rating,userRatingCount,googleMapsUri,reviews";

const reviewedPayload = async (slug: string, payload: Record<string, unknown> = {}) => {
  const { photos: _photos, ...details } = payload;
  return { ...details, photos: await selectReviewedGooglePhotos(slug, Array.isArray(_photos) ? _photos : []) };
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" } });

async function g(path: string, key: string, init: RequestInit & { mask?: string } = {}) {
  const resp = await fetch(`https://places.googleapis.com/v1/${path}`, {
    ...init,
    signal: AbortSignal.timeout(9000),
    headers: { "X-Goog-Api-Key": key, "Content-Type": "application/json", ...(init.mask ? { "X-Goog-FieldMask": init.mask } : {}) },
  });
  const body = await resp.json().catch(() => null);
  if (!resp.ok) throw new Error(`[${resp.status}] ${JSON.stringify(body?.error?.status ?? body)}`);
  return body;
}

async function enrich(slug: string, key: string, knownId: string | null) {
  const q = QUERIES[slug];
  let placeId = knownId ?? q.placeId ?? null;
  if (!placeId) {
    const s = await g("places:searchText", key, { method: "POST", mask: "places.id,places.displayName", body: JSON.stringify({ textQuery: q.query, pageSize: 1 }) });
    placeId = s?.places?.[0]?.id ?? null;
    if (!placeId) return { placeId: null, status: "not_found", payload: {} };
  }
  const d = await g(`places/${encodeURIComponent(placeId)}?languageCode=pt-BR`, key, { mask: DETAILS_MASK });
  const payload = {
    placeName: d.displayName?.text ?? null,
    address: d.formattedAddress ?? null,
    rating: d.rating ?? null, total: d.userRatingCount ?? null,
    mapsUrl: d.googleMapsUri ?? null,
    lat: d.location?.latitude ?? null, lng: d.location?.longitude ?? null,
    reviews: (d.reviews ?? []).slice(0, 5).map((r: any) => ({
      author: r.authorAttribution?.displayName ?? "Usuário do Google", authorUri: r.authorAttribution?.uri ?? null,
      rating: r.rating ?? null, text: r.text?.text ?? r.originalText?.text ?? "", relativeTime: r.relativePublishTimeDescription ?? null,
    })),
  };
  return { placeId, status: "ok", payload };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);
  let slug = "";
  try { slug = String((await req.json())?.slug ?? "").slice(0, 80); } catch { return json({ error: "Requisição inválida." }, 400); }
  if (!/^[a-z0-9-]+$/.test(slug) || !QUERIES[slug]) return json({ error: "Hotel não encontrado." }, 404);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: row } = await admin.from("club_med_place_cache").select("*").eq("slug", slug).maybeSingle();
  const fresh = row && Date.now() - new Date(row.fetched_at).getTime() < CACHE_HOURS * 3600_000;
  if (fresh) return json({ placeId: row.place_id, status: row.status, ...await reviewedPayload(slug, row.payload), cachedAt: row.fetched_at });

  const KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");
  if (!KEY) return json({ error: "Dados do Google indisponíveis no momento." }, 503);
  try {
    const r = await enrich(slug, KEY, row?.place_id ?? null);
    const now = new Date().toISOString();
    await admin.from("club_med_place_cache").upsert({ slug, place_id: r.placeId, payload: r.payload, status: r.status, fetched_at: now });
    return json({ placeId: r.placeId, status: r.status, ...r.payload, cachedAt: now });
  } catch (e) {
    console.error("club-med-snow-places", slug, e instanceof Error ? e.message : String(e));
    if (row) return json({ placeId: row.place_id, status: row.status, ...row.payload, photos: [], cachedAt: row.fetched_at, stale: true });
    return json({ error: "Dados do Google indisponíveis no momento." }, 502);
  }
});
