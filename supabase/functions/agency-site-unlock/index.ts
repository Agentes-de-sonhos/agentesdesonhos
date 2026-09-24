import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

/**
 * Desbloqueio por senha dos sites institucionais white label.
 * - Apenas o SHA-256 da senha existe aqui (ou o secret SITE_UNLOCK_PASSWORD_SHA256).
 * - Token = base64url(payload).HMAC-SHA256, chave derivada de segredo do servidor.
 * - A senha nunca é registrada em log nem devolvida.
 */
const DEFAULT_PASSWORD_SHA256 = "36f46a8c505c94611e1e75ff2d2eddd0a4215ec146e953c867767087538f4a4a";
const TTL_SECONDS = 7 * 24 * 60 * 60;
const PROTECTED = new Set([
  "9433421c-2252-4030-acab-135c03ab009e",
  "4d028510-034f-4c0f-9a33-4275dca0607a",
  "d14b95d2-7eeb-4717-bfca-b76482ddfb4f",
  "4d5a7157-59b6-4329-8768-7f8895e8ce92",
]);

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s: string): string {
  return atob(s.replace(/-/g, "+").replace(/_/g, "/"));
}
function hex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length || !a.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

async function key(): Promise<CryptoKey> {
  const base = Deno.env.get("SITE_UNLOCK_SECRET") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!base) throw new Error("missing secret");
  const material = await crypto.subtle.digest("SHA-256", enc.encode(`agency-site-unlock:v1:${base}`));
  return crypto.subtle.importKey("raw", material, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}
async function sign(payload: string): Promise<string> {
  return b64url(new Uint8Array(await crypto.subtle.sign("HMAC", await key(), enc.encode(payload))));
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false }, 400);
  }
  const action = String(body?.action || "");
  const tenant = String(body?.tenant || "");
  if (!PROTECTED.has(tenant)) return json({ ok: false }, 401);

  try {
    if (action === "unlock") {
      const password = typeof body.password === "string" ? body.password : "";
      if (!password || password.length > 200) return json({ ok: false }, 401);
      const expected = (Deno.env.get("SITE_UNLOCK_PASSWORD_SHA256") || DEFAULT_PASSWORD_SHA256).trim().toLowerCase();
      const provided = hex(await crypto.subtle.digest("SHA-256", enc.encode(password)));
      if (!safeEqual(provided, expected)) return json({ ok: false }, 401);
      const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS;
      const payload = b64url(enc.encode(JSON.stringify({ t: tenant, exp })));
      return json({ ok: true, token: `${payload}.${await sign(payload)}`, exp: exp * 1000 }, 200);
    }

    if (action === "verify") {
      const token = typeof body.token === "string" ? body.token : "";
      const [payload, sig] = token.split(".");
      if (!payload || !sig || token.length > 1000) return json({ ok: false }, 401);
      if (!safeEqual(await sign(payload), sig)) return json({ ok: false }, 401);
      const data = JSON.parse(fromB64url(payload)) as { t?: string; exp?: number };
      const now = Math.floor(Date.now() / 1000);
      if (data.t !== tenant || typeof data.exp !== "number" || data.exp <= now || data.exp - now > TTL_SECONDS + 60) {
        return json({ ok: false }, 401);
      }
      return json({ ok: true, token, exp: data.exp * 1000 }, 200);
    }
    return json({ ok: false }, 400);
  } catch {
    console.error("agency-site-unlock: falha interna");
    return json({ ok: false, error: "Serviço indisponível." }, 500);
  }
});
