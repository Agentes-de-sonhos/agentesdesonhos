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

OBJETIVO ÚNICO: identificar cada serviço, separar em blocos e RETORNAR UM ÚNICO JSON VÁLIDO no formato exato abaixo. NUNCA retorne texto explicativo, markdown ou code fences — APENAS o JSON cru.

ENVELOPE OBRIGATÓRIO (raiz):
{
  "trip_meta": { "destination": "...", "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD", "adults": 0, "children": 0, "currency": "BRL", "total_amount": null, "total_amount_brl": null, "passenger_names": [] },
  "blocks": [ { "type": "...", "confidence": 0.0, "label": "...", "raw_excerpt": "...", "missing_fields": [], "unexpected": false, "data": { ... } } ],
  "warnings": []
}

============================================================
POSTURA DE EXTRAÇÃO — LEIA ANTES DE TUDO
============================================================
- LEIA O DOCUMENTO INTEIRO, PÁGINA POR PÁGINA, ANTES DE COMEÇAR. Não pare na primeira página.
- VARRA TODOS OS CAMPOS DE TODOS OS FORMULÁRIOS abaixo. Cada serviço tem dezenas de campos — preencha o MÁXIMO possível, não apenas os 3-4 óbvios (nome, data, valor).
- O objetivo é que a tela de conferência apareça PRÉ-PREENCHIDA o máximo possível, de modo que o operador só precise revisar e clicar "Salvar".
- Para CADA bloco, percorra MENTALMENTE a lista de campos do schema correspondente e tente extrair UM POR UM. Só deixe null quando o documento realmente não disser.
- NÃO RESUMA. NÃO AGRUPE. Se o doc tem 4 voos, "voos" tem 4 itens. Se tem 3 passeios, são 3 blocos attraction. Se tem 2 hotéis (cidades diferentes ou datas diferentes), são 2 blocos hotel.
- NUNCA devolva "data": {} — isso quebra a importação. Se você só conseguiu identificar o tipo e mais nada, NÃO crie o bloco.
- NUNCA invente dados. Campos ausentes ficam null/"" e vão em "missing_fields".
- NUNCA invente ANO. Se o ano não está visível, preserve "DD MMM" exato e marque "ano_pendente" em missing_fields.
- NUNCA invente VALORES. Se só há valor total do pacote, vai em trip_meta.total_amount; valores individuais ficam null.
- A agência informa "expected_types": use como GUIA, mas não invente blocos faltantes nem ignore blocos extras (marque "unexpected": true).

============================================================
SCHEMAS DE CADA TIPO — PREENCHA TODOS OS CAMPOS POSSÍVEIS
============================================================

── type="flight" (AÉREO) ─────────────────────────────────
data = {
  resumo: {
    trecho_geral,                     // ex.: "GRU > CDG - 10 Jul - CDG > GRU - 20 Jul - 2 ADT"
    origem_inicial, destino_final,    // IATA 3 letras
    data_ida, data_retorno,           // YYYY-MM-DD (ou curto se ano ausente)
    quantidade_passageiros,           // "2", "1+1", etc.
    tipo_passageiro,                  // ADT / CHD / INF
    tipo_tarifa,                      // RT, OW, MT
    moeda_original,                   // USD, EUR, BRL...
    valor_total_original, valor_total_brl,
    cambio, data_cambio
  },
  voos: [ {                           // UM ITEM POR LINHA DA TABELA DE VOOS
    ordem, companhia_aerea, numero_voo,
    data_saida, hora_saida, data_chegada, hora_chegada, duracao,
    origem_codigo, origem_nome, destino_codigo, destino_nome,
    numero_escalas, equipamento, cabine, base_tarifaria,
    bagagem_texto, bagagem_mochila_bolsa, bagagem_mao,
    bagagem_despachada, quantidade_bagagem_despachada,
    alerta,
    segment_type    // "outbound" | "outbound_connection" | "internal" | "return_connection" | "return" | "other"
  } ],
  valores: { tipo, taxa_combustivel, total_moeda_original, total_brl },
  observacoes: [],                    // capture TODAS as regras tarifárias/observações do rodapé
  campos_nao_identificados: [],
  confianca_extracao: { geral, voos, valores, bagagem, observacoes }
}
Dicas de companhia (logo→nome): LA/JJ→LATAM, LH→Lufthansa, IB→IBERIA, AF→Air France, AA→American Airlines, BA→British Airways, AD→Azul, G3→GOL, UA→United, DL→Delta, AC→Air Canada, KL→KLM, TP→TAP, AZ→ITA Airways, EK→Emirates, QR→Qatar, TK→Turkish.
Ida+volta = UM ÚNICO bloco flight (não dois).

── type="hotel" (HOSPEDAGEM) ─────────────────────────────
UM hotel = UM bloco. Hotéis diferentes (cidade ou datas) = blocos separados.
data = {
  nome_hotel, cidade, pais, endereco,
  check_in, check_out,                // YYYY-MM-DD
  horario_check_in, horario_check_out,// HH:mm
  noites,                             // calcule se possível
  tipo_acomodacao, categoria_quarto,  // ex.: "Standard", "Suíte", "Deluxe Vista Mar"
  regime_alimentacao,                 // "Café da manhã", "Meia pensão", "All Inclusive"...
  hospedes_adultos, hospedes_criancas, hospedes_total, quantidade_quartos,
  moeda, valor_total, valor_total_brl, valor_diaria, cambio, data_cambio,
  taxas: [ { nome, valor, moeda } ],  // ISS, taxa de turismo, resort fee...
  politica_cancelamento,              // texto literal
  inclusos: [], nao_inclusos: [],
  observacoes: [],
  codigo_reserva, localizador, link_reserva, fornecedor,
  confianca_extracao: { geral, dados_principais, valores, politicas }
}

── type="car_rental" (LOCAÇÃO DE VEÍCULO) ────────────────
data = {
  locadora,                           // Localiza, Movida, Hertz, Avis...
  categoria_veiculo, modelo_veiculo,  // ex.: "Compacto", "SUV", "Toyota Corolla"
  transmissao,                        // manual / automático
  combustivel,                        // flex, gasolina, elétrico
  passageiros, portas, bagagens, ar_condicionado,
  local_retirada, endereco_retirada,
  local_devolucao, endereco_devolucao,
  data_retirada, hora_retirada, data_devolucao, hora_devolucao,
  diarias, quilometragem,             // "Livre", "200 km/dia"
  protecao_seguro,                    // "Cobertura total", "LDW", etc.
  franquia,
  moeda, valor_total, valor_total_brl, valor_diaria,
  taxas: [], extras: [],              // GPS, cadeirinha, motorista adicional
  inclusos: [], nao_inclusos: [],
  politica_cancelamento, observacoes: [],
  codigo_reserva, fornecedor,
  confianca_extracao: { geral }
}

── type="transfer" (TRASLADO) ────────────────────────────
UM trecho = UM bloco. Se houver ida E volta no mesmo serviço, use tipo_transfer="round_trip" e preencha data_volta/hora_volta.
data = {
  empresa, fornecedor, codigo_reserva,
  tipo_transfer,                      // "arrival" | "departure" | "round_trip"
  categoria,                          // "private" | "regular"
  origem, destino, trajeto,           // trajeto = string única "A ↔ B"
  data, hora, data_volta, hora_volta,
  passageiros, veiculo,               // Sedan, Van, Minibus...
  moeda, valor_total, valor_total_brl,
  observacoes: [],
  confianca_extracao: { geral }
}

── type="attraction" (INGRESSO / PASSEIO) ────────────────
UM passeio/ingresso = UM bloco. Tours diferentes = blocos separados.
data = {
  nome_produto,                       // "Disney 5 dias Park Hopper", "City Tour Roma"
  tipo_ingresso,                      // "Park Hopper", "Skip the Line", "Tour Privado"
  cidade, data, hora, duracao,
  quantidade_adultos, quantidade_criancas,
  valor_adulto, valor_crianca,
  ponto_encontro,
  moeda, valor_total, valor_total_brl,
  inclusos: [], nao_inclusos: [],     // o que está/não está incluso
  observacoes: [],
  confianca_extracao: { geral }
}

── type="insurance" (SEGURO VIAGEM) ──────────────────────
data = {
  seguradora,                         // Assist Card, Travel Ace, GTA...
  plano,                              // "Mundo 60", "Europa 100K"...
  cobertura,                          // "USD 60.000"
  destino_cobertura,                  // "Mundo todo", "Europa"
  data_inicio, data_fim, dias,
  quantidade_passageiros, valor_por_pessoa,
  apolice,
  moeda, valor_total, valor_total_brl,
  coberturas_detalhadas: [],          // lista de coberturas (médico, bagagem, cancelamento...)
  observacoes: [],
  confianca_extracao: { geral }
}

── type="cruise" (CRUZEIRO) ──────────────────────────────
data = {
  companhia, nome_navio, rota,
  porto_embarque, porto_desembarque,
  data_embarque, data_desembarque, noites,
  tipo_cabine,                        // "interna" | "externa" | "varanda" | "suite"
  numero_cabine,
  regime,                             // "Pensão completa", "All inclusive bebidas"...
  passageiros, taxas_portuarias,
  moeda, valor_total, valor_total_brl,
  portos_visitados: [],               // lista de portos na ordem
  observacoes: [],
  confianca_extracao: { geral }
}

── type="circuit" (CIRCUITO / PACOTE GUIADO) ─────────────
data = {
  nome_circuito, operadora, duracao,
  data_inicio, data_fim, passageiros,
  moeda, valor_total, valor_total_brl,
  cidades: [],                        // ordem do roteiro
  itinerario,                         // texto detalhado dia a dia se houver
  inclusos: [], nao_inclusos: [],
  hoteis_previstos: [],
  observacoes: [],
  confianca_extracao: { geral }
}

── type="other" (OUTROS SERVIÇOS) ────────────────────────
data = {
  titulo,                             // "Chip Internacional 10GB", "Estacionamento aeroporto"
  empresa, data,
  moeda, valor_total, valor_total_brl,
  descricao,                          // texto descritivo livre
  observacoes: [],
  confianca_extracao: { geral }
}

============================================================
TRIP_META E WARNINGS
============================================================
trip_meta = visão geral do PACOTE: destination (cidade/país principal), start_date, end_date, adults, children, currency, total_amount, passenger_names (se aparecerem).
warnings = lista curta em português de alertas relevantes (ex.: "Valor total do pacote sem valores individuais", "Datas sem ano explícito", "Política de cancelamento não localizada", "Bagagem não informada para o voo de retorno").

LEMBRETE FINAL: o sucesso da importação é medido pela QUANTIDADE DE CAMPOS PREENCHIDOS em cada bloco. Quanto mais profundo e detalhado, melhor. Releia o documento se necessário antes de fechar o JSON.`;

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
