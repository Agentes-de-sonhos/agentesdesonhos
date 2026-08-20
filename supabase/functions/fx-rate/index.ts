import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Cotação de referência para a Carteira Digital pública.
 *
 * Frankfurter (BCE) não cobre ARS nem CLP, então o provedor primário é
 * open.er-api.com (sem chave, cobre ARS/CLP) e o Frankfurter fica apenas como
 * fallback para as moedas que ele realmente publica.
 */

const ALLOWED = [
  "BRL",
  "EUR",
  "USD",
  "GBP",
  "JPY",
  "CHF",
  "CAD",
  "AUD",
  "MXN",
  "ARS",
  "CLP",
] as const;

/** Moedas publicadas pelo Frankfurter (BCE) — ARS e CLP ficam de fora. */
const FRANKFURTER_SUPPORTED = new Set([
  "BRL",
  "EUR",
  "USD",
  "GBP",
  "JPY",
  "CHF",
  "CAD",
  "AUD",
  "MXN",
]);

const TIMEOUT_MS = 8000;
const CACHE_SECONDS = 1800; // 30 minutos

function isAllowed(code: string | null): code is string {
  return !!code && (ALLOWED as readonly string[]).includes(code);
}

function isValidRate(rate: unknown): rate is number {
  return typeof rate === "number" && Number.isFinite(rate) && rate > 0;
}

function json(body: unknown, status: number, cache = false) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": cache
        ? `public, max-age=${CACHE_SECONDS}, s-maxage=${CACHE_SECONDS}`
        : "no-store",
    },
  });
}

async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`http_${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** Provedor primário: open.er-api.com. Cobre ARS e CLP. */
async function fromErApi(from: string, to: string) {
  const data = (await fetchJson(`https://open.er-api.com/v6/latest/${from}`)) as {
    result?: string;
    rates?: Record<string, unknown>;
    time_last_update_utc?: string;
  };
  if (data?.result !== "success") throw new Error("provider_result");
  const rate = data.rates?.[to];
  if (!isValidRate(rate)) throw new Error("invalid_rate");
  const parsed = data.time_last_update_utc ? new Date(data.time_last_update_utc) : null;
  const date =
    parsed && !isNaN(parsed.getTime())
      ? parsed.toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);
  return { rate, date, provider: "open.er-api.com" };
}

/** Fallback: Frankfurter, apenas para moedas que ele suporta. */
async function fromFrankfurter(from: string, to: string) {
  if (!FRANKFURTER_SUPPORTED.has(from) || !FRANKFURTER_SUPPORTED.has(to)) {
    throw new Error("unsupported_by_fallback");
  }
  const data = (await fetchJson(
    `https://api.frankfurter.dev/v1/latest?from=${from}&to=${to}`,
  )) as { rates?: Record<string, unknown>; date?: string };
  const rate = data?.rates?.[to];
  if (!isValidRate(rate)) throw new Error("invalid_rate");
  return {
    rate,
    date: typeof data.date === "string" ? data.date : new Date().toISOString().slice(0, 10),
    provider: "frankfurter.dev",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "GET") {
    return json({ error: "Método não permitido." }, 405);
  }

  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  if (!isAllowed(from) || !isAllowed(to)) {
    return json({ error: "Moeda inválida." }, 400);
  }

  if (from === to) {
    return json(
      { from, to, rate: 1, date: new Date().toISOString().slice(0, 10), provider: "identity" },
      200,
      true,
    );
  }

  try {
    const result = await fromErApi(from, to);
    return json({ from, to, ...result }, 200, true);
  } catch (primaryError) {
    console.error("fx-rate primary provider failed", from, to, String(primaryError));
    try {
      const result = await fromFrankfurter(from, to);
      return json({ from, to, ...result }, 200, true);
    } catch (fallbackError) {
      console.error("fx-rate fallback failed", from, to, String(fallbackError));
      return json({ error: "Cotação indisponível no momento." }, 503);
    }
  }
});
