// Public submission endpoint for the white-label agency site "Central de Solicitações".
// The browser NEVER writes to clients/opportunities: this function validates,
// rate-limits and delegates to a SECURITY DEFINER RPC executable only by the
// service role. The tenant is resolved from the HOSTNAME on the server.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getClientIP, rateLimitResponse } from "../_shared/rate-limiter.ts";
import { sanitizeText } from "../_shared/input-validator.ts";

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

/** Flat record of short strings — the per-service answers. */
function cleanDetails(value: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!value || typeof value !== "object") return out;
  const entries = Object.entries(value as Record<string, unknown>).slice(0, 40);
  for (const [rawKey, rawVal] of entries) {
    const key = rawKey.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 40);
    if (!key) continue;
    const val =
      typeof rawVal === "string"
        ? clean(rawVal, 400)
        : typeof rawVal === "number" || typeof rawVal === "boolean"
          ? String(rawVal)
          : null;
    if (val) out[key] = val;
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

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
    service_key: clean(body.service_key, 40),
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

  const { data, error } = await supabase.rpc("submit_agency_site_request", {
    p_hostname: hostname,
    p_payload: payload,
  });

  if (error) {
    console.error("[submit-agency-site-request] rpc-error", error.message);
    return json({ error: "Não foi possível registrar sua solicitação agora. Tente novamente." }, 500);
  }

  const result = (data ?? {}) as Record<string, unknown>;
  if (result.error) return json({ error: String(result.error) }, 400);

  return json({
    success: true,
    request_id: result.request_id ?? null,
    duplicate: result.duplicate === true,
  });
});
