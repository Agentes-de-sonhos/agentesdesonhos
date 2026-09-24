/**
 * Avaliações públicas do Google (Places API New) para sites white-label.
 * O navegador envia SOMENTE o hostname; o Place ID vem desta allowlist
 * administrativa. Nada é persistido nem cacheado; a chave nunca sai do servidor.
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PLACE_BY_HOSTNAME: Record<string, string> = {
  "destinoscomaju.com.br": "ChIJhTnCndr3zpQRyRaMIZaR7Kw",
  "www.destinoscomaju.com.br": "ChIJhTnCndr3zpQRyRaMIZaR7Kw",
};

const FIELD_MASK = "id,displayName,rating,userRatingCount,googleMapsUri,reviews,attributions";
const TIMEOUT_MS = 8000;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: { ...corsHeaders, "Cache-Control": "no-store" } });
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
    const resp = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=pt-BR`,
      { signal: ctrl.signal, headers: { "X-Goog-Api-Key": KEY, "X-Goog-FieldMask": FIELD_MASK } },
    );
    const r = await resp.json().catch(() => null);
    if (!resp.ok || !r?.id) {
      console.error("google-place-reviews: falha", resp.status, r?.error?.status ?? "");
      return json({ error: "Avaliações indisponíveis no momento." }, 502);
    }
    const reviews = (Array.isArray(r.reviews) ? r.reviews : []).slice(0, 5).map((x: any) => ({
      authorAttribution: {
        displayName: x?.authorAttribution?.displayName ?? null,
        uri: x?.authorAttribution?.uri ?? null,
        photoUri: x?.authorAttribution?.photoUri ?? null,
      },
      rating: x?.rating ?? null,
      text: x?.text?.text ?? x?.originalText?.text ?? null,
      relativePublishTimeDescription: x?.relativePublishTimeDescription ?? null,
      publishTime: x?.publishTime ?? null,
      googleMapsUri: x?.googleMapsUri ?? null,
      flagContentUri: x?.flagContentUri ?? null,
    }));
    const attributions = (Array.isArray(r.attributions) ? r.attributions : []).map((a: any) => ({
      provider: a?.provider ?? null,
      providerUri: a?.providerUri ?? null,
    }));
    return json({
      enabled: true,
      id: r.id,
      displayName: r.displayName?.text ?? null,
      rating: r.rating ?? null,
      userRatingCount: r.userRatingCount ?? null,
      googleMapsUri: r.googleMapsUri ?? null,
      attributions,
      reviews,
    });
  } catch (e) {
    const aborted = e instanceof DOMException && e.name === "AbortError";
    console.error("google-place-reviews:", aborted ? "timeout" : "erro de rede");
    return json({ error: "Avaliações indisponíveis no momento." }, aborted ? 504 : 502);
  } finally {
    clearTimeout(timer);
  }
});
