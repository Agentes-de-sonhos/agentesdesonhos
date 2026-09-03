import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Validação server-side da senha de acesso ao SiteLab.
 *
 * Segurança:
 * - a senha em claro nunca existe no frontend nem no banco: comparamos o
 *   SHA-256 informado com o hash guardado em `sitelab_templates`;
 * - comparação em tempo constante e resposta sempre genérica ({ ok: false });
 * - CORS restrito: domínio principal (agentesdesonhos.com.br e www), domínio
 *   publicado do projeto, previews técnicos do Lovable e localhost.
 */

const ALLOWED_HOSTS = new Set([
  "agentesdesonhos.com.br",
  "www.agentesdesonhos.com.br",
  "app.agentesdesonhos.com.br",
  "agentedesonhoproject.lovable.app",
  "localhost",
  "127.0.0.1",
]);

const ALLOWED_HOST_SUFFIXES = ["lovable.app", "lovableproject.com"];

const BASE_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "X-Robots-Tag": "noindex, nofollow",
  Vary: "Origin",
};

export function originHostname(origin: string | null): string | null {
  if (!origin) return null;
  try {
    return new URL(origin).hostname.trim().toLowerCase();
  } catch {
    return null;
  }
}

export function isAllowedOrigin(origin: string | null): boolean {
  const host = originHostname(origin);
  if (!host) return false;
  if (ALLOWED_HOSTS.has(host)) return true;
  return ALLOWED_HOST_SUFFIXES.some((s) => host === s || host.endsWith(`.${s}`));
}

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

function corsFor(origin: string | null): Record<string, string> {
  return {
    ...BASE_HEADERS,
    "Access-Control-Allow-Origin": isAllowedOrigin(origin) && origin ? origin : "null",
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
  const headers = corsFor(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }
  if (req.method !== "POST") return json({ ok: false }, 405, headers);
  if (!isAllowedOrigin(origin)) return json({ ok: false }, 403, headers);

  let slug = "";
  let password = "";
  try {
    const body = await req.json();
    slug = String(body?.slug || "").trim().toLowerCase();
    password = String(body?.password || "");
  } catch {
    return json({ ok: false }, 400, headers);
  }

  if (!slug || slug.length > 64 || !/^[a-z0-9-]+$/.test(slug)) return json({ ok: false }, 401, headers);
  if (!password || password.length > 200) return json({ ok: false }, 401, headers);

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data, error } = await admin
      .from("sitelab_templates")
      .select("password_sha256")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();

    const expected = (data?.password_sha256 || "").trim();
    if (error || !expected) return json({ ok: false }, 401, headers);

    const provided = await sha256Hex(password);
    if (!safeEqualHex(provided, expected)) return json({ ok: false }, 401, headers);

    return json({ ok: true, expires_in: 8 * 60 * 60 }, 200, headers);
  } catch {
    return json({ ok: false }, 500, headers);
  }
});
