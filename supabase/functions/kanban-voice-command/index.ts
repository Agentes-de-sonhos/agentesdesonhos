import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const nul = (t: string, extra: Record<string, unknown> = {}) => ({ type: [t, "null"], ...extra });

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    action: {
      type: "string",
      enum: ["create_opportunity", "move_stage", "create_followup", "add_note", "unknown"],
    },
    card_id: nul("string", { description: "id do cartão citado, somente da lista fornecida" }),
    stage_id: nul("string", { description: "id da coluna destino, somente da lista fornecida" }),
    follow_up_date: nul("string", { description: "YYYY-MM-DD" }),
    note: nul("string", { description: "texto do follow-up ou da anotação" }),
    message: nul("string", { description: "explicação curta em português quando unknown ou ambíguo" }),
    client_name: nul("string"),
    destination: nul("string"),
    start_date: nul("string", { description: "YYYY-MM-DD" }),
    end_date: nul("string", { description: "YYYY-MM-DD" }),
    adults_count: nul("integer"),
    children_count: nul("integer"),
    estimated_value: nul("number"),
    notes: nul("string"),
  },
  required: [
    "action", "card_id", "stage_id", "follow_up_date", "note", "message", "client_name", "destination",
    "start_date", "end_date", "adults_count", "children_count", "estimated_value", "notes",
  ],
};

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");

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
    const text = clean(body?.text, 1000);
    if (!text) return json({ error: "Nada foi entendido no áudio." }, 400);

    const stages = (Array.isArray(body?.stages) ? body.stages : []).slice(0, 40)
      .map((s: any) => ({ id: clean(s?.id, 60), name: clean(s?.name, 80) }))
      .filter((s: any) => s.id && s.name);
    const cards = (Array.isArray(body?.cards) ? body.cards : []).slice(0, 400)
      .map((c: any) => ({
        id: clean(c?.id, 60), client: clean(c?.client, 100), destination: clean(c?.destination, 80), stage: clean(c?.stage, 80),
      }))
      .filter((c: any) => c.id);

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "Serviço de IA indisponível." }, 500);

    const today = new Date().toISOString().slice(0, 10);
    const system =
      `Hoje é ${today}. Você interpreta comandos de voz em português no funil de oportunidades de uma agência de viagens.\n` +
      "Ações: create_opportunity (nova oportunidade/viagem; preencha client_name, destination, datas, pessoas, valor, notes), " +
      "move_stage (mover cartão para outra coluna; card_id + stage_id), create_followup (agendar contato/retorno; card_id + follow_up_date + note), " +
      "add_note (anotar algo no cartão; card_id + note).\n" +
      "Escolha card_id e stage_id SOMENTE das listas fornecidas, tolerando erros de transcrição e nomes parciais. " +
      "Se houver mais de um cartão compatível, ou faltar dado essencial (ex.: data do follow-up), ou o pedido não fizer sentido, use action unknown " +
      "e explique em message de forma curta e útil (cite as opções encontradas). Datas sempre no futuro mais próximo coerente. Nunca invente; use null.";

    const r = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        reasoning: { effort: "low" },
        input: [
          { role: "system", content: system },
          { role: "user", content: `Colunas: ${JSON.stringify(stages)}\nCartões: ${JSON.stringify(cards)}\n\nComando: ${text}` },
        ],
        text: { format: { type: "json_schema", name: "kanban_command", strict: true, schema } },
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
    const data = JSON.parse(raw);
    // Garante que ids venham apenas do contexto enviado.
    if (data.card_id && !cards.some((c: any) => c.id === data.card_id)) data.card_id = null;
    if (data.stage_id && !stages.some((s: any) => s.id === data.stage_id)) data.stage_id = null;
    return json({ data, transcript: text });
  } catch (e) {
    console.error(e);
    return json({ error: "Erro inesperado ao interpretar o áudio." }, 500);
  }
});
