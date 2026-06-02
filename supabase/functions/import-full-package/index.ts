import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * import-full-package
 *
 * Orquestrador: recebe UM arquivo (PDF/imagem) ou texto que contém VÁRIOS
 * serviços de uma mesma viagem (aéreo + hotel + transfer + passeios...) e
 * devolve um conjunto de blocos estruturados, cada um no MESMO formato
 * que o importador individual correspondente já entende.
 *
 * NUNCA inventa valores. NUNCA grava no orçamento.
 */

const ALLOWED_TYPES = [
  "flight",
  "hotel",
  "car_rental",
  "transfer",
  "attraction",
  "insurance",
  "cruise",
  "circuit",
  "other",
] as const;

type ServiceType = typeof ALLOWED_TYPES[number];

const SYSTEM_PROMPT = `Você é um EXTRATOR DE PACOTES DE VIAGEM COMPLETOS para agências brasileiras.
Receberá UM documento (PDF, imagem ou texto) que pode conter VÁRIOS serviços da MESMA viagem: passagem aérea, hospedagem, locação de veículo, transfer/traslado, ingressos/atrações/passeios, seguro viagem, cruzeiro, circuito e outros serviços.

OBJETIVO ÚNICO: identificar cada serviço, separar em blocos e chamar a função "extract_full_package" com TODOS os dados que conseguir ler. NUNCA retorne texto explicativo — SEMPRE chame a função.

REGRAS CRÍTICAS:
1. NUNCA invente dados. Campos ausentes ficam vazios/null. Liste em "missing_fields" do bloco.
2. NUNCA invente ANO em datas. Se o ano não estiver visível, preserve a data curta como aparece (ex.: "25 Set") e marque "ano_pendente" em missing_fields.
3. NUNCA invente VALORES. Se só há um valor total do pacote, coloque em trip_meta.total_amount e DEIXE OS VALORES INDIVIDUAIS DOS SERVIÇOS COMO null.
4. CRIE UM BLOCO POR SERVIÇO. Se há 2 passeios distintos, crie 2 blocos type="attraction". Se há 2 hospedagens (cidades diferentes), crie 2 blocos type="hotel". Se há ida+volta em aéreo, é UM ÚNICO bloco type="flight" com os voos organizados em "voos".
5. CONFIANÇA por bloco (0 a 1) reflete sua certeza real.
6. A agência informa em "expected_types" quais serviços ela acredita estar no documento. Use isso como GUIA mas:
   - Se um expected_type não aparecer no documento, NÃO invente um bloco.
   - Se aparecer um serviço NÃO listado em expected_types, AINDA assim crie o bloco com "unexpected: true".

FORMATO DOS BLOCOS (cada type usa um schema próprio, em chaves portuguesas):

- type="flight" → data segue o schema do importador AÉREO:
  { resumo: { trecho_geral, origem_inicial, destino_final, data_ida, data_retorno, quantidade_passageiros, tipo_passageiro, tipo_tarifa, moeda_original, valor_total_original, valor_total_brl, cambio, data_cambio },
    voos: [ { ordem, companhia_aerea, numero_voo, data_saida, hora_saida, data_chegada, hora_chegada, duracao, origem_codigo, origem_nome, destino_codigo, destino_nome, numero_escalas, equipamento, cabine, base_tarifaria, bagagem_texto, bagagem_mochila_bolsa, bagagem_mao, bagagem_despachada, quantidade_bagagem_despachada, alerta, segment_type } ],
    valores: { tipo, taxa_combustivel, total_moeda_original, total_brl },
    observacoes: [], campos_nao_identificados: [], confianca_extracao: { geral, voos, valores, bagagem, observacoes } }

- type="hotel" → data segue o schema do importador HOSPEDAGEM (UM hotel por bloco):
  { nome_hotel, cidade, pais, endereco, check_in, check_out, horario_check_in, horario_check_out, noites, tipo_acomodacao, categoria_quarto, regime_alimentacao, hospedes_adultos, hospedes_criancas, hospedes_total, quantidade_quartos, moeda, valor_total, valor_total_brl, valor_diaria, cambio, data_cambio, taxas: [{nome, valor, moeda}], politica_cancelamento, inclusos: [], nao_inclusos: [], observacoes: [], codigo_reserva, localizador, link_reserva, fornecedor, confianca_extracao: { geral, dados_principais, valores, politicas } }

- type="car_rental" → data segue o schema da LOCAÇÃO:
  { locadora, categoria_veiculo, modelo_veiculo, transmissao, combustivel, passageiros, portas, bagagens, ar_condicionado, local_retirada, endereco_retirada, local_devolucao, endereco_devolucao, data_retirada, hora_retirada, data_devolucao, hora_devolucao, diarias, quilometragem, protecao_seguro, franquia, moeda, valor_total, valor_total_brl, valor_diaria, taxas: [], extras: [], inclusos: [], nao_inclusos: [], politica_cancelamento, observacoes: [], codigo_reserva, fornecedor, confianca_extracao: { geral } }

- type="transfer" → { empresa, tipo_transfer ("arrival"|"departure"|"round_trip"), categoria ("private"|"regular"), origem, destino, trajeto, data, hora, data_volta, hora_volta, passageiros, veiculo, moeda, valor_total, valor_total_brl, fornecedor, codigo_reserva, observacoes: [], confianca_extracao: { geral } }

- type="attraction" → UM passeio/ingresso por bloco:
  { nome_produto, tipo_ingresso, cidade, data, hora, duracao, quantidade_adultos, quantidade_criancas, valor_adulto, valor_crianca, ponto_encontro, moeda, valor_total, valor_total_brl, inclusos: [], nao_inclusos: [], observacoes: [], confianca_extracao: { geral } }

- type="insurance" → { seguradora, plano, cobertura, destino_cobertura, data_inicio, data_fim, dias, quantidade_passageiros, valor_por_pessoa, apolice, moeda, valor_total, valor_total_brl, coberturas_detalhadas: [], observacoes: [], confianca_extracao: { geral } }

- type="cruise" → { companhia, nome_navio, rota, porto_embarque, porto_desembarque, data_embarque, data_desembarque, noites, tipo_cabine, numero_cabine, regime, passageiros, taxas_portuarias, moeda, valor_total, valor_total_brl, portos_visitados: [], observacoes: [], confianca_extracao: { geral } }

- type="circuit" → { nome_circuito, operadora, duracao, data_inicio, data_fim, passageiros, moeda, valor_total, valor_total_brl, cidades: [], itinerario, inclusos: [], nao_inclusos: [], hoteis_previstos: [], observacoes: [], confianca_extracao: { geral } }

- type="other" → { titulo, empresa, data, moeda, valor_total, valor_total_brl, descricao, observacoes: [], confianca_extracao: { geral } }

trip_meta deve conter o que conseguir identificar do PACOTE como um todo: destination, start_date, end_date, adults, children, currency, total_amount.

warnings = lista curta de alertas em português (ex.: "Valor total do pacote sem valores individuais", "Datas sem ano explícito", "Política de cancelamento não localizada").`;

/**
 * Observação importante:
 * Não usamos mais tool/function calling com schema rígido para o pacote completo.
 * Motivo: o Gemini, ao receber `data: { type:"object", additionalProperties:true }`
 * (sem properties listadas), frequentemente retornava `data: {}` em todos os blocos,
 * porque tecnicamente "objeto vazio" satisfaz o schema. Resultado: a tela de
 * conferência ficava em branco.
 *
 * Trocamos para `response_format: json_object` + prompt com o schema descrito.
 * Isso obriga o modelo a entregar JSON e, livre da rigidez do tool-call, ele
 * preenche os campos descritos no system prompt.
 */

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function fail(stage: string, type: string, message: string, status: number, extras: Record<string, unknown> = {}) {
  return json({ success: false, stage, error_type: type, error_message: message, error: message, ...extras }, status);
}

function extractJSON(raw: string): unknown {
  let cleaned = String(raw || "")
    .replace(/^```json\s*/im, "")
    .replace(/^```\s*/im, "")
    .replace(/```\s*$/im, "")
    .trim();
  if (!cleaned.startsWith("{") && !cleaned.startsWith("[")) {
    const objStart = cleaned.indexOf("{");
    const arrStart = cleaned.indexOf("[");
    const isArray = arrStart !== -1 && (objStart === -1 || arrStart < objStart);
    const start = isArray ? arrStart : objStart;
    const end = isArray ? cleaned.lastIndexOf("]") : cleaned.lastIndexOf("}");
    if (start === -1 || end <= start) throw new Error("No JSON block found");
    cleaned = cleaned.slice(start, end + 1);
  }
  return JSON.parse(cleaned);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  let stage = "init";
  let rawAi = "";
  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return fail(stage, "unauthorized", "Não autorizado.", 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) return fail(stage, "unauthorized", "Não autorizado.", 401);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return fail("init", "missing_api_key", "Configuração de IA indisponível.", 500);

    stage = "input_validation";
    const body = await req.json().catch(() => ({}));
    const fileBase64: string | undefined = typeof body?.fileBase64 === "string" ? body.fileBase64 : undefined;
    const fileMimeType: string | undefined = typeof body?.fileMimeType === "string" ? body.fileMimeType : undefined;
    const fileName: string | undefined = typeof body?.fileName === "string" ? body.fileName : undefined;
    const text: string | undefined = typeof body?.text === "string" ? body.text : undefined;
    const quoteId: string | null = typeof body?.quoteId === "string" ? body.quoteId : null;
    const storagePath: string | null = typeof body?.storagePath === "string" ? body.storagePath : null;
    const expectedRaw = Array.isArray(body?.expectedTypes) ? body.expectedTypes : [];
    const expectedTypes: ServiceType[] = expectedRaw
      .filter((t: unknown): t is ServiceType => typeof t === "string" && (ALLOWED_TYPES as readonly string[]).includes(t));

    if (!fileBase64 && !text) return fail(stage, "no_input", "Envie um arquivo (PDF/imagem) ou cole o texto do pacote.", 400);
    if (text && text.length > 60000) return fail(stage, "text_too_long", "Texto muito longo (máx 60.000 caracteres).", 400);
    if (fileBase64 && fileBase64.length > 14_000_000) return fail(stage, "file_too_large", "Arquivo muito grande (máx 10MB).", 400);

    stage = "sent_to_ai";
    const userContent: Array<Record<string, unknown>> = [];
    const expectedListPt = expectedTypes.length
      ? `A agência indicou que o pacote contém: ${expectedTypes.join(", ")}.`
      : "A agência não pré-selecionou tipos de serviço. Identifique todos os serviços que conseguir.";
    userContent.push({
      type: "text",
      text:
        "Este documento é um PACOTE DE VIAGEM COMPLETO com VÁRIOS serviços. " +
        expectedListPt +
        " Separe cada serviço em um bloco individual no formato exato pedido em system. " +
        "Crie 1 bloco por serviço (1 passeio = 1 bloco; 2 hospedagens distintas = 2 blocos). " +
        "Se houver ida e volta no aéreo, mantenha em UM ÚNICO bloco flight com todos os voos. " +
        "Se só houver valor total do pacote, coloque em trip_meta.total_amount e NÃO invente valor individual. " +
        "SEMPRE chame extract_full_package.",
    });
    if (text) userContent.push({ type: "text", text: `TEXTO DO DOCUMENTO:\n\n${text}` });
    if (fileBase64) {
      const mime = fileMimeType || "application/pdf";
      userContent.push({ type: "image_url", image_url: { url: `data:${mime};base64,${fileBase64}` } });
    }

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
        temperature: 0,
        max_tokens: 12000,
      }),
    });

    stage = "ai_response";
    if (aiResp.status === 429) return fail(stage, "rate_limited", "Muitas requisições. Aguarde alguns segundos e tente novamente.", 429);
    if (aiResp.status === 402) return fail(stage, "credits_exhausted", "Créditos de IA esgotados. Adicione saldo em Configurações > Workspace > Uso.", 402);
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, t.slice(0, 500));
      return fail(stage, "ai_error", `Falha na chamada à IA (HTTP ${aiResp.status}).`, 502, { raw_ai_response: t.slice(0, 2000) });
    }

    const aiJson = await aiResp.json();
    const choice = aiJson?.choices?.[0];
    const contentText: string | undefined = choice?.message?.content;
    rawAi = contentText || JSON.stringify(aiJson).slice(0, 4000);

    stage = "json_parse";
    let parsed: any = null;
    if (contentText) {
      try { parsed = JSON.parse(contentText); }
      catch {
        try { parsed = extractJSON(contentText); } catch { /* noop */ }
      }
    }
    if (!parsed || typeof parsed !== "object") {
      return fail(stage, "parse_error", "A IA retornou uma resposta sem estrutura reconhecível. Tente novamente com um arquivo mais nítido.", 422, { raw_ai_response: rawAi });
    }

    // Normalize
    const blocks = Array.isArray(parsed.blocks) ? parsed.blocks : [];
    const tripMeta = (parsed.trip_meta && typeof parsed.trip_meta === "object") ? parsed.trip_meta : {};
    const warnings = Array.isArray(parsed.warnings) ? parsed.warnings.filter((w: unknown) => typeof w === "string") : [];

    const normalized = blocks
      .filter((b: any) => b && typeof b === "object" && (ALLOWED_TYPES as readonly string[]).includes(b.type))
      .map((b: any, idx: number) => ({
        id: `blk_${idx}_${Math.random().toString(36).slice(2, 8)}`,
        type: b.type as ServiceType,
        confidence: typeof b.confidence === "number" ? Math.max(0, Math.min(1, b.confidence)) : 0,
        label: typeof b.label === "string" ? b.label : "",
        raw_excerpt: typeof b.raw_excerpt === "string" ? b.raw_excerpt.slice(0, 1000) : "",
        missing_fields: Array.isArray(b.missing_fields) ? b.missing_fields.filter((x: unknown) => typeof x === "string") : [],
        unexpected: !!b.unexpected || (expectedTypes.length > 0 && !expectedTypes.includes(b.type)),
        data: (b.data && typeof b.data === "object") ? b.data : {},
      }));

    // Compute expected/found summary
    const foundTypes = new Set<string>(normalized.map((b: any) => b.type));
    const expectedMissing = expectedTypes.filter((t) => !foundTypes.has(t));
    const unexpectedExtra = normalized.filter((b: any) => b.unexpected).map((b: any) => b.type);

    if (expectedMissing.length) {
      warnings.push(`Serviços esperados não encontrados: ${expectedMissing.join(", ")}.`);
    }
    if (unexpectedExtra.length) {
      warnings.push(`Serviços encontrados fora do esperado: ${Array.from(new Set(unexpectedExtra)).join(", ")}.`);
    }

    const sourceKind: "pdf" | "image" | "text" = fileBase64
      ? ((fileMimeType || "").startsWith("image/") ? "image" : "pdf")
      : "text";

    // Persist audit log
    stage = "persist_log";
    let importId: string | null = null;
    try {
      const insertRes = await supabase
        .from("full_package_imports")
        .insert({
          user_id: user.id,
          quote_id: quoteId,
          expected_types: expectedTypes,
          source_kind: sourceKind,
          source_url: storagePath,
          source_text: text ? text.slice(0, 20000) : null,
          ai_blocks: normalized,
          trip_meta: tripMeta,
          warnings,
        })
        .select("id")
        .single();
      if (insertRes.error) console.warn("persist log error:", insertRes.error.message);
      else importId = insertRes.data?.id ?? null;
    } catch (e) {
      console.warn("persist log threw:", e);
    }

    return json({
      success: true,
      import_id: importId,
      source_kind: sourceKind,
      file_name: fileName ?? null,
      expected_types: expectedTypes,
      expected_missing: expectedMissing,
      unexpected_extra: Array.from(new Set(unexpectedExtra)),
      blocks: normalized,
      trip_meta: tripMeta,
      warnings,
    }, 200);
  } catch (err) {
    console.error("import-full-package fatal:", err);
    return fail(stage, "fatal", "Falha ao processar o pacote.", 500, { raw_ai_response: rawAi });
  }
});
