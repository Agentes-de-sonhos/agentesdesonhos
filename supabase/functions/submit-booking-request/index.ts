// Public endpoint for booking requests coming from a published web quote.
// The browser never writes to quote_booking_requests: this function validates,
// rate-limits and delegates to a SECURITY DEFINER RPC that only the service role
// can execute. Prices, totals and snapshots are ALWAYS resolved in the database.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getClientIP, rateLimitResponse } from "../_shared/rate-limiter.ts";
import { hashClientIp, validateBookingRequestPayload } from "./validate.ts";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  const ip = getClientIP(req);
  const rate = await checkRateLimit(ip, "submit-booking-request", 8, 60);
  if (!rate.allowed) return rateLimitResponse(corsHeaders, rate.retryAfterMs);

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "Requisição inválida." }, 400);
  }

  const parsed = validateBookingRequestPayload(body);
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  const p = parsed.data;

  const salt =
    Deno.env.get("IP_HASH_SALT") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const sourceIpHash = await hashClientIp(ip, salt);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { data, error } = await supabase.rpc("submit_quote_booking_request", {
    p_agency_slug: p.agency_slug,
    p_code: p.code,
    p_selected_service_ids: p.selected_service_ids,
    p_client_name: p.client_name,
    p_client_email: p.client_email,
    p_client_whatsapp: p.client_whatsapp,
    p_client_notes: p.client_notes,
    p_disclaimer_accepted: true,
    p_idempotency_key: p.idempotency_key,
    p_source_ip_hash: sourceIpHash,
  });

  if (error) {
    console.error("[submit-booking-request] rpc-error", error.message);
    return json({ error: "Não foi possível registrar seu pedido agora. Tente novamente." }, 500);
  }

  const result = (data ?? {}) as Record<string, unknown>;
  if (result.error) return json({ error: String(result.error) }, 400);

  return json({
    success: true,
    request_id: result.request_id ?? null,
    protocol: result.protocol ?? null,
    version: result.version ?? 1,
    status: result.status ?? "received",
    total_estimated: result.total_estimated ?? 0,
    currency: result.currency ?? "BRL",
    public_access_token: result.public_access_token ?? null,
    duplicate: result.duplicate === true,
    message:
      "Recebemos sua solicitação de reserva. Ela ainda não é uma confirmação: a agência vai reconfirmar serviços, disponibilidade e valores e retornar o contato.",
  });
});
