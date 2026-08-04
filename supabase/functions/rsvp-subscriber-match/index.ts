import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { parseBody, safeKeyCompare, buildResponse } from "./logic.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, x-integration-key",
};

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  const expected = Deno.env.get("RSVP_INTEGRATION_KEY") ?? null;
  const provided = req.headers.get("x-integration-key");
  if (!safeKeyCompare(provided, expected)) {
    return json({ error: "Não autorizado." }, 401);
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json({ error: "Corpo inválido." }, 400);
  }

  const parsed = parseBody(raw);
  if (!parsed.ok) return json({ error: parsed.error }, 400);

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data, error } = await admin.rpc("rsvp_match_subscribers", {
      _emails: parsed.emails,
    });
    if (error) throw error;

    console.log(
      `rsvp-subscriber-match: ${parsed.emails.length} e-mail(s) consultado(s), ${
        Array.isArray(data) ? data.length : 0
      } linha(s) retornada(s)`,
    );

    return json({ matches: buildResponse(parsed.emails, data) }, 200);
  } catch (err) {
    console.error("rsvp-subscriber-match: falha interna", (err as Error)?.message);
    return json({ error: "Erro ao processar solicitação." }, 500);
  }
});