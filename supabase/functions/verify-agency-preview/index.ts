import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Validação server-side da senha de preview dos sites white label.
 *
 * Segurança:
 * - Nunca existe senha em claro: apenas o SHA-256 esperado (ou o secret
 *   AGENCY_PREVIEW_PASSWORD_SHA256, que tem prioridade quando definido).
 * - O hostname enviado precisa corresponder a um domínio de agência ativo
 *   (RPC get_agency_domain). Host desconhecido nunca é autorizado.
 * - Respostas genéricas: nunca revelam se o erro foi host ou senha.
 */

const DEFAULT_PASSWORD_SHA256 =
  "5b96b65122b8f54d41a4433c8b8f2807bd8e040f7d5a7857cb1aab1981585b5d";

const PLATFORM_ORIGIN_SUFFIXES = ["lovable.app", "lovableproject.com", "localhost"];

const BASE_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "X-Robots-Tag": "noindex, nofollow",
  Vary: "Origin",
};

export function normalizeHostname(hostname: string): string {
  return (hostname || "").trim().toLowerCase().replace(/:\d+$/, "");
}

/** Hostname da Origin, ou null quando ausente/inválida. */
export function originHostname(origin: string | null): string | null {
  if (!origin) return null;
  try {
    return normalizeHostname(new URL(origin).hostname);
  } catch {
    return null;
  }
}

/** Origin permitida: host técnico do Lovable/local ou o próprio host da agência. */
export function isAllowedOrigin(origin: string | null, agencyHost: string | null): boolean {
  const host = originHostname(origin);
  if (!host) return false;
  if (host === "localhost" || host === "127.0.0.1") return true;
  if (PLATFORM_ORIGIN_SUFFIXES.some((s) => host === s || host.endsWith(`.${s}`))) return true;
  if (!agencyHost) return false;
  const bare = agencyHost.replace(/^www\./, "");
  return host === bare || host === `www.${bare}`;
}

/** Comparação em tempo constante de duas strings hexadecimais. */
export function safeEqualHex(a: string, b: string): boolean {
  const x = (a || "").toLowerCase();
  const y = (b || "").toLowerCase();
  if (x.length !== y.length || x.length === 0) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function corsFor(origin: string | null, agencyHost: string | null): Record<string, string> {
  const allowed = isAllowedOrigin(origin, agencyHost);
  return {
    ...BASE_HEADERS,
    "Access-Control-Allow-Origin": allowed && origin ? origin : "null",
  };
}

function json(body: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: { ...BASE_HEADERS, "Access-Control-Allow-Origin": origin ?? "*" } });
  }
  if (req.method !== "POST") {
    return json({ ok: false }, 405, corsFor(origin, null));
  }

  let hostname = "";
  let password = "";
  try {
    const body = await req.json();
    hostname = normalizeHostname(String(body?.hostname || ""));
    password = String(body?.password || "");
  } catch {
    return json({ ok: false }, 400, corsFor(origin, null));
  }

  if (!hostname || hostname.length > 253 || !password || password.length > 200) {
    return json({ ok: false }, 401, corsFor(origin, null));
  }

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data, error } = await admin.rpc("get_agency_domain", { p_hostname: hostname });
    const info = (data ?? null) as { user_id?: string } | null;
    if (error || !info?.user_id) {
      // Resposta genérica: não revela se o problema foi o host.
      return json({ ok: false }, 401, corsFor(origin, null));
    }

    const headers = corsFor(origin, hostname);
    if (!isAllowedOrigin(origin, hostname)) {
      return json({ ok: false }, 403, headers);
    }

    const expected = (Deno.env.get("AGENCY_PREVIEW_PASSWORD_SHA256") || DEFAULT_PASSWORD_SHA256).trim();
    const provided = await sha256Hex(password);
    if (!safeEqualHex(provided, expected)) {
      return json({ ok: false }, 401, headers);
    }

    return json({ ok: true, expires_in: 8 * 60 * 60 }, 200, headers);
  } catch {
    return json({ ok: false }, 500, corsFor(origin, null));
  }
});
