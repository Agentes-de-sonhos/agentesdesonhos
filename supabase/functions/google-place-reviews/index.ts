import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

/**
 * Avaliações públicas do Google para sites white-label.
 * O navegador envia SOMENTE o hostname; o Place ID vem desta allowlist
 * administrativa. Nada é persistido; a chave nunca sai do servidor.
 */
const PLACE_BY_HOSTNAME: Record<string, string> = {
  "destinoscomaju.com.br": "ChIJhTnCndr3zpQRyRaMIZaR7Kw",
  "www.destinoscomaju.com.br": "ChIJhTnCndr3zpQRyRaMIZaR7Kw",
};

const FIELDS = "place_id,name,rating,user_ratings_total,reviews,url";
const TIMEOUT_MS = 8000;

const json = (body: unknown, status = 200, cache = false) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": cache ? "public, max-age=300" : "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  let hostname = "";
  try {
    const body = await req.json();
    hostname = String(body?.hostname ?? "").trim().toLowerCase().replace(/\.$/, "").slice(0, 253);
  } catch {
    return json({ error: "Requisição inválida." }, 400);
  }
  if (!/^[a-z0-9.-]+$/.test(hostname)) return json({ error: "Requisição inválida." }, 400);

  const placeId = PLACE_BY_HOSTNAME[hostname];
  if (!placeId) return json({ enabled: false }, 404);

  const KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");
  if (!KEY) {
    console.error("google-place-reviews: chave não configurada");
    return json({ error: "Avaliações indisponíveis no momento." }, 503);
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=${FIELDS}&language=pt-BR&reviews_no_translations=true&key=${KEY}`;
    const resp = await fetch(url, { signal: ctrl.signal });
    const data = await resp.json().catch(() => null);
    if (!resp.ok || data?.status !== "OK" || !data?.result) {
      console.error("google-place-reviews: falha", resp.status, data?.status ?? "");
      return json({ error: "Avaliações indisponíveis no momento." }, 502);
    }
    const r = data.result;
    const reviews = (Array.isArray(r.reviews) ? r.reviews : []).slice(0, 5).map((x: any) => ({
      author_name: x?.author_name ?? null,
      author_url: x?.author_url ?? null,
      profile_photo_url: x?.profile_photo_url ?? null,
      rating: x?.rating ?? null,
      text: x?.text ?? null,
      relative_time_description: x?.relative_time_description ?? null,
      time: x?.time ?? null,
    }));
    return json({
      enabled: true,
      place_id: r.place_id ?? placeId,
      name: r.name ?? null,
      rating: r.rating ?? null,
      user_ratings_total: r.user_ratings_total ?? null,
      url: r.url ?? null,
      reviews,
    }, 200, true);
  } catch (e) {
    const aborted = e instanceof DOMException && e.name === "AbortError";
    console.error("google-place-reviews:", aborted ? "timeout" : "erro de rede");
    return json({ error: "Avaliações indisponíveis no momento." }, aborted ? 504 : 502);
  } finally {
    clearTimeout(timer);
  }
});
