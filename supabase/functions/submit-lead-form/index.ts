// Public submission endpoint for the conversational lead form.
// The browser never writes to lead_captures directly: this function validates,
// rate-limits and delegates the write to a SECURITY DEFINER RPC that only the
// service role can execute.
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  const ip = getClientIP(req);
  const rate = await checkRateLimit(ip, "submit-lead-form", 12, 60);
  if (!rate.allowed) return rateLimitResponse(corsHeaders, rate.retryAfterMs);

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "Requisição inválida." }, 400);
  }

  const token = clean(body.token, 80);
  if (!token) return json({ error: "Formulário não encontrado." }, 400);

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
    lead_name: clean(body.lead_name, 200),
    lead_phone: clean(body.lead_phone, 40),
    lead_email: clean(body.lead_email, 200),
    destination: clean(body.destination, 300),
    travel_dates: clean(body.travel_dates, 200),
    travelers_count: clean(body.travelers_count, 100),
    budget: clean(body.budget, 200),
    additional_info: clean(body.additional_info, 2000),
    lead_summary: clean(body.lead_summary, 2000),
    ai_suggestion: clean(body.ai_suggestion, 2000),
    whatsapp_message: clean(body.whatsapp_message, 2000),
    session_id: clean(body.session_id, 100),
    idempotency_key: clean(body.idempotency_key, 120),
    source_url: clean(body.source_url, 500),
    consent: body.consent === true ? "true" : "false",
    consent_version: clean(body.consent_version, 20) ?? "v1",
  };
  if (Object.keys(utm).length) payload.utm = utm;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { data, error } = await supabase.rpc("submit_conversational_lead", {
    p_token: token,
    p_payload: payload,
  });

  if (error) {
    console.error("[submit-lead-form] rpc-error", error.message);
    return json({ error: "Não foi possível registrar seu contato agora. Tente novamente." }, 500);
  }

  const result = (data ?? {}) as Record<string, unknown>;
  if (result.error) return json({ error: String(result.error) }, 400);

  return json({
    success: true,
    lead_id: result.lead_id ?? null,
    duplicate: result.duplicate === true,
    is_test: result.is_test === true,
    within_office_hours: result.within_office_hours ?? null,
  });
});
