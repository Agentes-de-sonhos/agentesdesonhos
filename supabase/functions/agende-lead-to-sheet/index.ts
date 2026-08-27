// Appends a successful /agende registration to the Google Sheet
// "Leads | Agendamento - EducaTravel Academy" via the Lovable connector gateway.
// Public endpoint: it only writes to the spreadsheet, never to the database,
// and never touches the existing agende-public-api registration flow.
import { checkRateLimit, getClientIP, rateLimitResponse } from "../_shared/rate-limiter.ts";
import { sanitizeText } from "../_shared/input-validator.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SPREADSHEET_ID = "1eDkNw5Vi9MMQxNR2EKcgZuvMApnYyrLMFQgpHut6M6k";
const SHEET_RANGE = "Página1!A:O";
const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_sheets/v4";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/** Keeps accents, spaces and special characters; only trims and caps length. */
function clean(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return sanitizeText(value).slice(0, max);
}

function nowInSaoPaulo(): string {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date());
  return parts.replace(",", "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  const ip = getClientIP(req);
  const rate = await checkRateLimit(ip, "agende-lead-to-sheet", 10, 60);
  if (!rate.allowed) return rateLimitResponse(corsHeaders, rate.retryAfterMs);

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "Requisição inválida." }, 400);
  }

  const email = clean(body.email, 200);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return json({ error: "E-mail inválido." }, 400);
  }

  const row = [
    email,
    clean(body.firstName, 120),
    clean(body.lastName, 120),
    clean(body.whatsapp, 40),
    body.whatsappOptIn === true ? "sim" : "não",
    clean(body.agencyName, 200),
    clean(body.state, 40),
    clean(body.city, 120),
    clean(body.session, 200),
    clean(body.utm_source, 200),
    clean(body.utm_medium, 200),
    clean(body.utm_campaign, 200),
    clean(body.utm_content, 200),
    clean(body.utm_term, 200),
    nowInSaoPaulo(),
  ];

  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const connectionKey = Deno.env.get("GOOGLE_SHEETS_API_KEY");
  if (!lovableKey || !connectionKey) {
    console.error("[agende-sheet] missing gateway credentials");
    return json({ error: "Integração de planilha não configurada." }, 500);
  }

  const url =
    `${GATEWAY_URL}/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_RANGE}:append` +
    `?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": connectionKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values: [row] }),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error(`[agende-sheet] gateway-error status=${response.status} body=${detail.slice(0, 500)}`);
    return json({ error: "Não foi possível registrar o lead na planilha.", status: response.status }, 502);
  }

  const payload = await response.json().catch(() => ({}));
  console.log(`[agende-sheet] appended range=${(payload as any)?.updates?.updatedRange ?? "?"}`);
  return json({ success: true });
});
