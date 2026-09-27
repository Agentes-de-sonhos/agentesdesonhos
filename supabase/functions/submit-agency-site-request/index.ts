// Public submission endpoint for the white-label agency site "Central de Solicitações".
// The browser NEVER writes to clients/opportunities: this function validates,
// rate-limits and delegates to a SECURITY DEFINER RPC executable only by the
// service role. The tenant is resolved from the HOSTNAME on the server.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getClientIP, rateLimitResponse } from "../_shared/rate-limiter.ts";
import { sanitizeText } from "../_shared/input-validator.ts";
import { isAllowedServiceKey, originAllowed } from "./validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function clean(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const out = sanitizeText(value).slice(0, max);
  return out.length ? out : null;
}

const DETAIL_KEY_RE = /^[a-z0-9_]{1,60}$/;
const MAX_DETAIL_KEYS = 40;

/**
 * Flat, sanitized string map for the `details` jsonb column.
 * Only shallow string/number/boolean values with safe keys survive — nested
 * objects/arrays are dropped so the browser can never inject arbitrary JSON.
 */
function cleanDetails(value: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return out;
  for (const [rawKey, rawValue] of Object.entries(value as Record<string, unknown>)) {
    if (Object.keys(out).length >= MAX_DETAIL_KEYS) break;
    const key = rawKey.trim().toLowerCase();
    if (!DETAIL_KEY_RE.test(key)) continue;
    let text: string | null = null;
    if (typeof rawValue === "string") text = clean(rawValue, 400);
    else if (typeof rawValue === "number" && Number.isFinite(rawValue)) text = String(rawValue);
    else if (typeof rawValue === "boolean") text = rawValue ? "true" : "false";
    if (text) out[key] = text;
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  // Código de rastreamento: aparece no log e na resposta de erro interno.
  const trace = crypto.randomUUID().slice(0, 8);

  const ip = getClientIP(req);
  const rate = await checkRateLimit(ip, "submit-agency-site-request", 10, 60);
  if (!rate.allowed) return rateLimitResponse(corsHeaders, rate.retryAfterMs);

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "Requisição inválida." }, 400);
  }

  const hostname = (clean(body.hostname, 120) || "").toLowerCase().replace(/:\d+$/, "");
  if (!hostname || !hostname.includes(".")) return json({ error: "Site não encontrado." }, 400);
  if (!originAllowed({ origin: req.headers.get("origin"), referer: req.headers.get("referer") }, hostname)) {
    console.warn("[submit-agency-site-request] origin-mismatch", hostname);
    return json({ error: "Não foi possível validar a origem do envio." }, 403);
  }

  const serviceKey = (clean(body.service_key, 40) || "").toLowerCase();
  const isOffer = serviceKey === "oferta";
  if (!isOffer && !isAllowedServiceKey(serviceKey)) {
    return json({ error: "Selecione o serviço desejado." }, 400);
  }

  // Honeypot + minimum interaction time: silent bot filters.
  if (clean(body.honeypot, 100)) return json({ error: "Não foi possível enviar." }, 400);
  const elapsed = Number(body.elapsed_ms);
  if (Number.isFinite(elapsed) && elapsed < 3000) {
    return json({ error: "Aguarde um instante antes de enviar." }, 400);
  }

  const utmRaw = body.utm && typeof body.utm === "object" ? (body.utm as Record<string, unknown>) : null;
  const utm: Record<string, string> = {};
  if (utmRaw) {
    for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
      const v = clean(utmRaw[key], 120);
      if (v) utm[key] = v;
    }
  }

  const payload: Record<string, unknown> = {
    service_key: serviceKey,
    service_label: clean(body.service_label, 120),
    lead_name: clean(body.lead_name, 200),
    lead_phone: clean(body.lead_phone, 40),
    lead_email: clean(body.lead_email, 200),
    preferred_channel: clean(body.preferred_channel, 40),
    best_time: clean(body.best_time, 60),
    destination: clean(body.destination, 300),
    summary: clean(body.summary, 2000),
    notes: clean(body.notes, 2000),
    session_id: clean(body.session_id, 100),
    idempotency_key: clean(body.idempotency_key, 120),
    source_url: clean(body.source_url, 500),
    consent: body.consent === true ? "true" : "false",
    consent_version: clean(body.consent_version, 20) ?? "v1",
    details: cleanDetails(body.details),
  };
  if (Object.keys(utm).length) payload.utm = utm;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // Solicitação de oferta: o servidor valida a oferta pelo slug + hostname e
  // grava a fotografia imutável na mesma transação (submit_offer_request).
  if (isOffer) {
    const slug = (clean(body.offer_slug, 120) || "").toLowerCase();
    if (!/^[a-z0-9-]{3,120}$/.test(slug)) return json({ error: "Oferta não encontrada." }, 400);
    const offerPayload: Record<string, unknown> = {
      lead_name: payload.lead_name,
      lead_phone: payload.lead_phone,
      lead_email: payload.lead_email,
      adults: clean(String(body.adults ?? ""), 4),
      children: clean(String(body.children ?? ""), 4),
      departure_city: clean(body.departure_city, 120),
      notes: payload.notes,
      consent: payload.consent,
      consent_version: payload.consent_version,
      idempotency_key: payload.idempotency_key,
      session_id: payload.session_id,
      source_url: payload.source_url,
    };
    if (payload.utm) offerPayload.utm = payload.utm;
    const res = await supabase.rpc("submit_offer_request", {
      p_hostname: hostname,
      p_slug: slug,
      p_payload: offerPayload,
    });
    if (res.error) {
      console.error("[submit-agency-site-request] offer-rpc-error", trace, res.error.message);
      return json({ error: "Não foi possível registrar sua solicitação agora. Tente novamente.", trace }, 500);
    }
    const r = (res.data ?? {}) as Record<string, unknown>;
    if (r.error) return json({ error: String(r.error) }, 400);
    console.log("[submit-agency-site-request] offer-ok", trace, hostname, r.duplicate === true ? "duplicate" : "created");
    return json({ success: true, request_id: r.request_id ?? null, duplicate: r.duplicate === true });
  }

  let data: unknown;
  try {
    const res = await supabase.rpc("submit_agency_site_request", {
      p_hostname: hostname,
      p_payload: payload,
    });
    if (res.error) {
      console.error("[submit-agency-site-request] rpc-error", trace, res.error.message);
      return json(
        { error: "Não foi possível registrar sua solicitação agora. Tente novamente.", trace },
        500,
      );
    }
    data = res.data;
  } catch (err) {
    console.error("[submit-agency-site-request] unexpected", trace, String(err));
    return json(
      { error: "Não foi possível registrar sua solicitação agora. Tente novamente.", trace },
      500,
    );
  }

  const result = (data ?? {}) as Record<string, unknown>;
  if (result.error) return json({ error: String(result.error) }, 400);

  console.log(
    "[submit-agency-site-request] ok",
    trace,
    hostname,
    serviceKey,
    result.duplicate === true ? "duplicate" : "created",
  );
  return json({
    success: true,
    request_id: result.request_id ?? null,
    duplicate: result.duplicate === true,
  });
});
