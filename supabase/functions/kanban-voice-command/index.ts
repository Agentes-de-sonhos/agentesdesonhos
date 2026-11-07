import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    client_name: { type: ["string", "null"] },
    destination: { type: ["string", "null"] },
    start_date: { type: ["string", "null"], description: "YYYY-MM-DD" },
    end_date: { type: ["string", "null"], description: "YYYY-MM-DD" },
    adults_count: { type: ["integer", "null"] },
    children_count: { type: ["integer", "null"] },
    estimated_value: { type: ["number", "null"] },
    notes: { type: ["string", "null"] },
  },
  required: ["client_name", "destination", "start_date", "end_date", "adults_count", "children_count", "estimated_value", "notes"],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await supa.auth.getUser();
    if (!u?.user) return json({ error: "Faça login novamente." }, 401);

    const body = await req.json().catch(() => null);
    const text = typeof body?.text === "string" ? body.text.trim().slice(0, 1000) : "";
    if (!text) return json({ error: "Nada foi entendido no áudio." }, 400);

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "Serviço de IA indisponível." }, 500);

    const today = new Date().toISOString().slice(0, 10);
    const r = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        reasoning: { effort: "low" },
        input: [
          {
            role: "system",
            content:
              `Hoje é ${today}. Extraia de um ditado em português os dados de uma nova oportunidade de viagem de uma agência. ` +
              "Use null para o que não foi dito; nunca invente. Datas no futuro mais próximo coerente. Valor em número.",
          },
          { role: "user", content: text },
        ],
        text: { format: { type: "json_schema", name: "opportunity", strict: true, schema } },
      }),
    });
    if (!r.ok) {
      const status = r.status;
      console.error("AI gateway error", status, await r.text());
      if (status === 429) return json({ error: "Muitas solicitações. Tente em instantes." }, 429);
      if (status === 402) return json({ error: "Créditos de IA esgotados." }, 402);
      if (status === 403) return json({ error: "Uso de IA bloqueado no momento." }, 403);
      return json({ error: "Não foi possível interpretar o áudio." }, 502);
    }
    const out = await r.json();
    const raw =
      out.output_text ??
      out.output?.flatMap((o: any) => o.content ?? []).find((c: any) => c.type === "output_text")?.text;
    if (!raw) return json({ error: "Não foi possível interpretar o áudio." }, 502);
    return json({ data: JSON.parse(raw), transcript: text });
  } catch (e) {
    console.error(e);
    return json({ error: "Erro inesperado ao interpretar o áudio." }, 500);
  }
});
