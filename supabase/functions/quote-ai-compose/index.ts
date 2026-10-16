/**
 * quote-ai-compose — PILOTO NÃO PUBLICADO (somente administradores).
 *
 * mode "compose":  descrição livre (texto/ditado) → blocos de serviço no MESMO
 *                  formato do importador de pacote completo (prévia; nada é gravado).
 * mode "document": texto extraído de UM PDF → um bloco do tipo informado
 *                  (para comparação campo a campo no frontend).
 *
 * Segurança/custo: exige login + papel admin, check_ai_usage, limite diário
 * próprio (daily_feature_usage, feature "quote_ai_pilot") e tamanho máximo.
 * Não grava orçamento, não envia mensagens.
 */
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_TEXT = 6000;
const MAX_DOC_TEXT = 28000;
const TYPES = ["flight", "hotel", "attraction", "insurance", "transfer", "car_rental", "other"];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const SCHEMAS = `
flight: { resumo: { origem_inicial, destino_final, data_ida, data_retorno, quantidade_passageiros },
          voos: [ { companhia_aerea, numero_voo, data_saida, hora_saida, data_chegada, hora_chegada,
                    origem_codigo, origem_nome, destino_codigo, destino_nome, segment_type } ],
          observacoes: [] }   // ida+volta = UM bloco
hotel: { nome_hotel, cidade, pais, check_in, check_out, noites, tipo_acomodacao, regime_alimentacao,
         hospedes_adultos, hospedes_criancas, quantidade_quartos, moeda, valor_total, codigo_reserva, observacoes: [] }
         // cada hotel/período = UM bloco
attraction: { nome_produto, tipo_ingresso, cidade, data, quantidade_adultos, quantidade_criancas,
              moeda, valor_total, inclusos: [], observacoes: [] }  // um parque/ingresso por bloco
insurance: { seguradora, plano, cobertura, destino_cobertura, data_inicio, data_fim, dias,
             quantidade_passageiros, moeda, valor_total, observacoes: [] }
transfer: { empresa, tipo_transfer, origem, destino, data, hora, passageiros, observacoes: [] }
car_rental: { locadora, categoria_veiculo, local_retirada, data_retirada, hora_retirada,
              local_devolucao, data_devolucao, hora_devolucao, observacoes: [] }
other: { titulo, empresa, descricao }`;

const RULES = `REGRAS ABSOLUTAS:
- NUNCA invente valores, localizadores, reservas, companhias, hotéis ou horários. Ausente = null.
- NUNCA ajuste/complete datas. Use YYYY-MM-DD somente se dia, mês e ANO estiverem explícitos ou forem
  inequívocos pelo texto; caso contrário preserve o texto original (ex.: "12 jan") e cite em missing_fields.
- Não deduza datas de hotel a partir da passagem; se faltarem, deixe null.
- Datas no passado: mantenha como informado.`;

const blockSchema = {
  type: "object",
  additionalProperties: false,
  required: ["type", "label", "data_json", "missing_fields"],
  properties: {
    type: { type: "string", enum: TYPES },
    label: { type: "string" },
    data_json: { type: "string", description: "Objeto JSON (string) no schema do tipo." },
    missing_fields: { type: "array", items: { type: "string" } },
  },
};

const composeSchema = {
  type: "object",
  additionalProperties: false,
  required: ["titulo", "cliente_nome", "destino", "data_inicio", "data_fim", "adultos", "criancas", "idades_criancas", "blocks", "nao_incluidos", "informacoes_importantes", "duvidas"],
  properties: {
    titulo: { type: ["string", "null"] },
    cliente_nome: { type: ["string", "null"] },
    destino: { type: ["string", "null"] },
    adultos: { type: ["integer", "null"] },
    criancas: { type: ["integer", "null"] },
    idades_criancas: { type: "array", items: { type: "integer" } },
    data_inicio: { type: ["string", "null"] },
    data_fim: { type: ["string", "null"] },
    blocks: { type: "array", items: blockSchema },
    nao_incluidos: { type: "array", items: { type: "string" } },
    informacoes_importantes: { type: "array", items: { type: "string" } },
    duvidas: { type: "array", items: { type: "string" } },
  },
};

const documentSchema = {
  type: "object",
  additionalProperties: false,
  required: ["block"],
  properties: { block: blockSchema },
};

const MODEL = "google/gemini-2.5-flash";
const MAX_OUTPUT_TOKENS = 4000;
const AI_TIMEOUT_MS = 45_000;

async function callModel(apiKey: string, system: string, user: string, schemaName: string, schema: unknown) {
  const t0 = Date.now();
  let resp: Response;
  try {
    resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: `${system}\nResponda SOMENTE com um objeto json válido no formato:\n${JSON.stringify(schema)}` },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
        temperature: 0,
        max_tokens: MAX_OUTPUT_TOKENS,
      }),
      signal: AbortSignal.timeout(AI_TIMEOUT_MS),
    });
  } catch (e) {
    const timeout = (e as { name?: string })?.name === "TimeoutError";
    logUsage({ schema: schemaName, status: timeout ? "timeout" : "fetch_error", ms: Date.now() - t0 });
    return { ok: false as const, status: timeout ? 504 : 502, detail: timeout ? "timeout" : "fetch" };
  }
  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    logUsage({ schema: schemaName, status: resp.status, ms: Date.now() - t0 });
    return { ok: false as const, status: resp.status, detail: t.slice(0, 200) };
  }
  const j = await resp.json().catch(() => null);
  logUsage({
    schema: schemaName, status: 200, ms: Date.now() - t0,
    prompt_tokens: j?.usage?.prompt_tokens ?? null,
    completion_tokens: j?.usage?.completion_tokens ?? null,
    total_tokens: j?.usage?.total_tokens ?? null,
    finish_reason: j?.choices?.[0]?.finish_reason ?? null,
  });
  const content = j?.choices?.[0]?.message?.content;
  try {
    return { ok: true as const, data: JSON.parse(String(content || "").replace(/^```json\s*|```$/g, "")) };
  } catch {
    return { ok: false as const, status: 502, detail: "resposta inválida" };
  }
}

/** Log técnico: sem texto do cliente, só métricas. */
function logUsage(m: Record<string, unknown>) {
  console.log(JSON.stringify({ fn: "quote-ai-compose", event: "ai_call", model: MODEL, at: new Date().toISOString(), ...m }));
}

function parseBlock(b: any, i: number) {
  let data: Record<string, unknown> = {};
  try { const p = JSON.parse(b?.data_json || "{}"); if (p && typeof p === "object" && !Array.isArray(p)) data = p; } catch { /* vazio */ }
  return {
    id: `ai-${i + 1}`,
    type: TYPES.includes(b?.type) ? b.type : "other",
    confidence: 0.6,
    label: String(b?.label || "").slice(0, 160),
    raw_excerpt: "",
    missing_fields: Array.isArray(b?.missing_fields) ? b.missing_fields.slice(0, 30).map(String) : [],
    unexpected: false,
    data,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  try {
    // KILL SWITCH: desligado por padrão. Só funciona com config explícita no servidor.
    const enabled = Deno.env.get("QUOTE_AI_PILOT_ENABLED") === "true";
    const allow = new Set((Deno.env.get("QUOTE_AI_PILOT_ALLOWED_USER_IDS") || "").split(",").map((x) => x.trim()).filter(Boolean));
    if (!enabled || allow.size === 0) return json({ error: "Recurso em teste, indisponível." }, 403);

    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Não autorizado." }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const { data: u, error: uErr } = await admin.auth.getUser(auth.slice(7));
    if (uErr || !u?.user) return json({ error: "Sessão inválida. Faça login novamente." }, 401);
    const userId = u.user.id;

    if (!allow.has(userId)) return json({ error: "Recurso em teste, indisponível." }, 403);
    const { data: roles, error: rErr } = await admin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin");
    if (rErr || !roles || roles.length === 0) return json({ error: "Recurso em teste, indisponível." }, 403);

    const { data: canUse, error: cErr } = await admin.rpc("check_ai_usage", { _user_id: userId });
    if (cErr || canUse !== true) return json({ error: "Cota de IA indisponível." }, 429);

    let body: any;
    try { body = await req.json(); } catch { return json({ error: "Corpo inválido." }, 400); }
    const mode = body?.mode;
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "Configuração de IA indisponível." }, 500);

    const today = spDate();
    const todayInfo = `Hoje é ${today}.`;
    let result;
    if (mode === "compose") {
      const text = String(body?.text || "").trim();
      if (text.length < 10) return json({ error: "Descreva a viagem com um pouco mais de detalhe." }, 400);
      if (text.length > MAX_TEXT) return json({ error: `Texto muito longo (máx. ${MAX_TEXT} caracteres).` }, 400);
      const system = `Você estrutura orçamentos de viagem para agências brasileiras a partir de uma descrição livre (às vezes ditada).
Devolva blocos de serviço; data_json é um objeto JSON (em string) no schema do tipo:
${SCHEMAS}
Itens que o agente disser que NÃO estão incluídos vão em nao_incluidos; avisos/regras ao cliente em informacoes_importantes.
Identifique cliente (cliente_nome), adultos, crianças e idades se ditos; senão null/[].
Pontos ambíguos vão em duvidas (perguntas curtas). ${RULES}
${todayInfo}`;
      const r = await reserve(admin, userId, today);
      if (!r.ok) return json({ error: r.error }, 429);
      result = await callModel(apiKey, system, text, "quote_compose", composeSchema);
      if (!result.ok) return failFromModel(result);
      const d = result.data || {};
      return json({
        success: true,
        trip_meta: { titulo: d.titulo ?? null, cliente_nome: d.cliente_nome ?? null, adultos: d.adultos ?? null, criancas: d.criancas ?? null, idades_criancas: Array.isArray(d.idades_criancas) ? d.idades_criancas : [], destino: d.destino ?? null, data_inicio: d.data_inicio ?? null, data_fim: d.data_fim ?? null },
        blocks: (Array.isArray(d.blocks) ? d.blocks : []).slice(0, 25).map(parseBlock),
        nao_incluidos: (d.nao_incluidos || []).slice(0, 30).map(String),
        informacoes_importantes: (d.informacoes_importantes || []).slice(0, 30).map(String),
        duvidas: (d.duvidas || []).slice(0, 15).map(String),
      });
    }
    if (mode === "document") {
      const type = body?.service_type;
      if (!TYPES.includes(type)) return json({ error: "Tipo de serviço inválido." }, 400);
      const text = String(body?.text || "").trim();
      if (text.length < 50) return json({ error: "Não foi possível ler texto neste PDF. No piloto, só PDFs com texto são aceitos." }, 400);
      const system = `Extraia UM serviço do tipo "${type}" do documento. data_json no schema:
${SCHEMAS}
${RULES}
${todayInfo}`;
      const r = await reserve(admin, userId, today);
      if (!r.ok) return json({ error: r.error }, 429);
      result = await callModel(apiKey, system, text.slice(0, MAX_DOC_TEXT), "service_document", documentSchema);
      if (!result.ok) return failFromModel(result);
      const block = parseBlock({ ...result.data?.block, type }, 0);
      return json({ success: true, block });
    }
    return json({ error: "Modo inválido." }, 400);
  } catch (e) {
    console.error("quote-ai-compose error", e instanceof Error ? e.message : e);
    return json({ error: "Falha inesperada. Tente novamente." }, 500);
  }
});

function failFromModel(r: { status: number; detail: string }) {
  console.error("quote-ai-compose model error", r.status, r.detail);
  if (r.status === 429) return json({ error: "Muitas requisições. Aguarde e tente novamente." }, 429);
  if (r.status === 402) return json({ error: "Créditos de IA esgotados." }, 402);
  if (r.status === 403) return json({ error: "Acesso ao modelo de IA negado para este workspace." }, 403);
  return json({ error: "A IA não conseguiu estruturar o pedido. Tente novamente." }, 502);
}

const USER_DAILY_LIMIT = 5;
const GLOBAL_DAILY_LIMIT = Math.max(1, Math.min(50, Number(Deno.env.get("QUOTE_AI_PILOT_GLOBAL_DAILY_LIMIT")) || 10));
const GLOBAL_ROW_USER = "00000000-0000-0000-0000-000000000000";
const FEATURE = "quote_ai_pilot";

/** Data de hoje em São Paulo (YYYY-MM-DD). */
function spDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

/**
 * Incremento atômico com trava otimista (UPDATE ... WHERE usage_count = lido;
 * INSERT protegido pela UNIQUE user_id+feature+usage_date). Reserva ANTES da IA,
 * conta tentativas que falharem. Qualquer erro = nega (fail closed).
 */
async function bumpRow(admin: any, uid: string, today: string, limit: number): Promise<boolean> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const { data: row, error } = await admin.from("daily_feature_usage").select("id, usage_count")
      .eq("user_id", uid).eq("feature", FEATURE).eq("usage_date", today).maybeSingle();
    if (error) return false;
    if (!row) {
      const { error: insErr } = await admin.from("daily_feature_usage")
        .insert({ user_id: uid, feature: FEATURE, usage_date: today, usage_count: 1 });
      if (!insErr) return true;
      if (insErr.code !== "23505") return false;
      continue; // concorrência: outro pedido criou a linha
    }
    if (row.usage_count >= limit) return false;
    const { data: upd, error: updErr } = await admin.from("daily_feature_usage")
      .update({ usage_count: row.usage_count + 1 }).eq("id", row.id).eq("usage_count", row.usage_count).select("id");
    if (updErr) return false;
    if (upd && upd.length === 1) return true;
  }
  return false;
}

async function reserve(admin: any, uid: string, today: string): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!(await bumpRow(admin, GLOBAL_ROW_USER, today, GLOBAL_DAILY_LIMIT))) return { ok: false, error: "Limite diário geral do piloto atingido." };
    if (!(await bumpRow(admin, uid, today, USER_DAILY_LIMIT))) return { ok: false, error: `Limite diário do piloto atingido (${USER_DAILY_LIMIT}).` };
    return { ok: true };
  } catch {
    return { ok: false, error: "Controle de uso indisponível." };
  }
}
