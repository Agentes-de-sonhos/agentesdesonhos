import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* ─────────── Per-service prompt + tool schema ─────────── */
type ServiceKey = "transfer" | "attraction" | "insurance" | "cruise" | "circuit" | "rail_transport" | "other";

const SHARED_RULES = `
REGRA #1 — POSTURA DE EXTRAÇÃO.
- NUNCA desista. Mesmo com campos ilegíveis, EXTRAIA TUDO o que conseguir.
- Deixe vazio/null o que não tiver certeza. Liste em "campos_nao_identificados" o nome dos campos em branco.
- SEMPRE chame a função fornecida. NUNCA retorne texto explicando que o documento está ruim.
REGRA #2 — DATAS / HORÁRIOS.
- Se o ANO estiver visível, use "YYYY-MM-DD". Senão, preserve a data curta como aparece e adicione "ano_pendente" em campos_nao_identificados.
- Horários em "HH:mm" (24h). NUNCA invente ano nem hora.
REGRA #3 — VALORES.
- Use ponto como separador decimal ("R$ 1.250,90" → 1250.90).
- Preserve a moeda original ("moeda"): BRL, USD, EUR...
- "valor_total" = total geral (já incluindo taxas se consolidado).
- "valor_total_brl" = total convertido em R$ quando aparecer.
CONFIANÇA: calcule "confianca_extracao.geral" (0 a 1) com sua certeza real.
FONTES: pode receber IMAGEM/PDF e/ou texto extraído. Use AMBOS.
IMPORTANTE: NÃO INVENTE dados. SEMPRE chame a função.
`;

const CONFIDENCE_SCHEMA = {
  type: "object",
  properties: {
    geral: { type: "number" },
    dados_principais: { type: "number" },
    valores: { type: "number" },
  },
  required: [],
  additionalProperties: false,
};

const COMMON_META = {
  moeda: { type: "string" },
  valor_total: { type: ["number", "null"] },
  valor_total_brl: { type: ["number", "null"] },
  cambio: { type: ["number", "null"] },
  data_cambio: { type: "string" },
  codigo_reserva: { type: "string" },
  localizador: { type: "string" },
  link_reserva: { type: "string" },
  fornecedor: { type: "string" },
  observacoes: { type: "array", items: { type: "string" } },
  politica_cancelamento: { type: "string" },
  campos_nao_identificados: { type: "array", items: { type: "string" } },
  confianca_extracao: CONFIDENCE_SCHEMA,
};

const SCHEMAS: Record<ServiceKey, { fnName: string; description: string; properties: Record<string, any>; promptExtras: string }> = {
  transfer: {
    fnName: "extract_transfer_document",
    description: "Extract structured transfer/shuttle/translado reservation data.",
    properties: {
      empresa: { type: "string", description: "Operadora do transfer (Wemoov, TourTransfer, Get Transfer...)" },
      tipo_transfer: { type: "string", description: "arrival | departure | round_trip — chegada, saída ou ida e volta" },
      categoria: { type: "string", description: "regular | private (compartilhado/privativo)" },
      origem: { type: "string", description: "Local de origem (Aeroporto CDG, Hotel Marriott...)" },
      destino: { type: "string", description: "Local de destino" },
      trajeto: { type: "string", description: "Ex: 'Aeroporto CDG ↔ Hotel Marriott'" },
      data: { type: "string", description: "YYYY-MM-DD" },
      hora: { type: "string", description: "HH:mm" },
      data_volta: { type: "string", description: "YYYY-MM-DD se ida-e-volta" },
      hora_volta: { type: "string", description: "HH:mm" },
      passageiros: { type: ["integer", "null"] },
      veiculo: { type: "string", description: "Tipo de veículo (Sedan, Van, Minivan...)" },
      ...COMMON_META,
    },
    promptExtras: "Documento de TRANSFER/TRASLADO/SHUTTLE. Identifique empresa, tipo (chegada/saída/ida-volta), categoria (regular/privativo), origem, destino, datas, horários e valores.",
  },
  attraction: {
    fnName: "extract_attraction_document",
    description: "Extract structured attraction/ticket/tour reservation data.",
    properties: {
      nome_produto: { type: "string", description: "Nome do passeio/atração (Universal, Disney, City Tour...)" },
      tipo_ingresso: { type: "string", description: "Ex: 2day-2park, Park Hopper, Skip the Line" },
      cidade: { type: "string" },
      data: { type: "string", description: "YYYY-MM-DD" },
      hora: { type: "string", description: "HH:mm" },
      duracao: { type: "string", description: "Ex: 4h, dia inteiro" },
      quantidade_adultos: { type: ["integer", "null"] },
      quantidade_criancas: { type: ["integer", "null"] },
      valor_adulto: { type: ["number", "null"] },
      valor_crianca: { type: ["number", "null"] },
      inclusos: { type: "array", items: { type: "string" } },
      nao_inclusos: { type: "array", items: { type: "string" } },
      ponto_encontro: { type: "string" },
      ...COMMON_META,
    },
    promptExtras: "Documento de INGRESSO/PASSEIO/ATRAÇÃO TURÍSTICA. Identifique nome do produto, tipo, datas, quantidades e valores por adulto/criança.",
  },
  insurance: {
    fnName: "extract_insurance_document",
    description: "Extract structured travel insurance/policy data.",
    properties: {
      seguradora: { type: "string", description: "Assist Card, Travel Ace, Allianz, GTA..." },
      plano: { type: "string", description: "Nome do plano contratado" },
      cobertura: { type: "string", description: "Ex: USD 60.000, USD 100.000" },
      destino_cobertura: { type: "string", description: "Mundo todo, Europa..." },
      data_inicio: { type: "string", description: "YYYY-MM-DD" },
      data_fim: { type: "string", description: "YYYY-MM-DD" },
      dias: { type: ["integer", "null"] },
      quantidade_passageiros: { type: ["integer", "null"] },
      valor_por_pessoa: { type: ["number", "null"] },
      apolice: { type: "string" },
      coberturas_detalhadas: { type: "array", items: { type: "string" } },
      ...COMMON_META,
    },
    promptExtras: "Documento de SEGURO VIAGEM/APÓLICE. Identifique seguradora, plano, cobertura, datas, apólice e valores (por pessoa quando aplicável).",
  },
  cruise: {
    fnName: "extract_cruise_document",
    description: "Extract structured cruise reservation data.",
    properties: {
      companhia: { type: "string", description: "MSC, Costa, Royal Caribbean, Norwegian..." },
      nome_navio: { type: "string" },
      rota: { type: "string", description: "Ex: Santos → Búzios → Ilha Grande → Santos" },
      porto_embarque: { type: "string" },
      porto_desembarque: { type: "string" },
      data_embarque: { type: "string", description: "YYYY-MM-DD" },
      data_desembarque: { type: "string", description: "YYYY-MM-DD" },
      noites: { type: ["integer", "null"] },
      tipo_cabine: { type: "string", description: "interna | externa | varanda | suite" },
      numero_cabine: { type: "string" },
      regime: { type: "string", description: "Pensão completa, all-inclusive..." },
      portos_visitados: { type: "array", items: { type: "string" } },
      itinerario: {
        type: "array",
        description: "Itinerário dia a dia do cruzeiro. Inclua um item por dia, na ordem cronológica. NUNCA invente dados — se um campo não estiver no documento, deixe em branco/omita.",
        items: {
          type: "object",
          properties: {
            data: { type: "string", description: "YYYY-MM-DD se houver." },
            porto: { type: "string", description: "Porto/local do dia (Santos, Búzios, etc.). Use 'Navegação' para dias em alto-mar." },
            chegada: { type: "string", description: "HH:MM (24h) se houver." },
            saida: { type: "string", description: "HH:MM (24h) se houver." },
            tipo: { type: "string", description: "embarque | porto | navegacao | desembarque" },
            observacoes: { type: "string" },
          },
        },
      },
      taxas_portuarias: { type: ["number", "null"] },
      passageiros: { type: ["integer", "null"] },
      ...COMMON_META,
    },
    promptExtras:
      "Documento de CRUZEIRO MARÍTIMO/FLUVIAL. Identifique companhia, navio, rota, portos, datas, tipo de cabine, regime e valores. " +
      "Extraia também o ITINERÁRIO DIA A DIA em 'itinerario' (um item por dia, em ordem cronológica): " +
      "porto/local do dia, chegada, saída, tipo (embarque/porto/navegacao/desembarque) e observações. " +
      "Marque dias em alto-mar como tipo 'navegacao' e porto 'Navegação'. " +
      "Se uma informação não constar no documento, deixe o campo em branco — NUNCA invente horários, datas ou portos.",
  },
  circuit: {
    fnName: "extract_circuit_document",
    description: "Extract structured circuit/multi-city tour package data.",
    properties: {
      nome_circuito: { type: "string", description: "Ex: 'Circuito Itália Clássica', 'Maravilhas do Egito'" },
      operadora: { type: "string" },
      duracao: { type: "string", description: "Ex: '10 dias / 9 noites'" },
      cidades: { type: "array", items: { type: "string" } },
      data_inicio: { type: "string", description: "YYYY-MM-DD" },
      data_fim: { type: "string", description: "YYYY-MM-DD" },
      itinerario: { type: "string", description: "Itinerário detalhado dia a dia" },
      inclusos: { type: "array", items: { type: "string" } },
      nao_inclusos: { type: "array", items: { type: "string" } },
      hoteis_previstos: { type: "array", items: { type: "string" } },
      passageiros: { type: ["integer", "null"] },
      ...COMMON_META,
    },
    promptExtras: "Documento de CIRCUITO/PACOTE MULTI-CIDADES. Identifique nome do circuito, operadora, duração, cidades, itinerário dia a dia e valores.",
  },
  other: {
    fnName: "extract_other_service_document",
    description: "Extract structured data from any other travel service (chip, parking, mobile, etc).",
    properties: {
      titulo: { type: "string", description: "Título curto do serviço (Chip Internacional, Estacionamento, Wi-Fi pocket...)" },
      empresa: { type: "string" },
      descricao: { type: "string", description: "Descrição completa do serviço" },
      data: { type: "string", description: "YYYY-MM-DD se houver" },
      ...COMMON_META,
    },
    promptExtras: "Documento de SERVIÇO DIVERSO de viagem (chip, estacionamento, pocket wifi, ingresso avulso, transfer privado, etc). Identifique título, empresa, descrição e valor.",
  },
  rail_transport: {
    fnName: "extract_rail_transport_document",
    description: "Extract structured rail/train ticket, voucher or reservation data (SNCF, Trenitalia, Eurostar, Renfe, Deutsche Bahn, Italo, Amtrak, Rail Europe, etc).",
    properties: {
      operadora: { type: "string", description: "Operadora ferroviária (SNCF, Trenitalia, Eurostar, Renfe, DB, Italo, Amtrak, Rail Europe...)." },
      tipo_transporte: { type: "string", description: "Um de: high_speed | regional | night | panoramic | other" },
      classe: { type: "string", description: "Um de: economy | second | first | executive | sleeper" },
      cidade_origem: { type: "string" },
      estacao_origem: { type: "string", description: "Ex: Paris Gare du Nord, Roma Termini, London St Pancras" },
      cidade_destino: { type: "string" },
      estacao_destino: { type: "string" },
      data_viagem: { type: "string", description: "YYYY-MM-DD" },
      horario_saida: { type: "string", description: "HH:mm (24h)" },
      horario_chegada: { type: "string", description: "HH:mm (24h)" },
      adultos: { type: ["integer", "null"] },
      criancas: { type: ["integer", "null"] },
      valor_adulto: { type: ["number", "null"] },
      valor_crianca: { type: ["number", "null"] },
      wifi: { type: ["boolean", "null"], description: "true se o documento indicar Wi-Fi a bordo" },
      tomadas: { type: ["boolean", "null"], description: "true se indicar tomadas/power outlets" },
      refeicao_inclusa: { type: ["boolean", "null"], description: "true se indicar refeição inclusa" },
      assento_marcado: { type: ["boolean", "null"], description: "true se indicar assento marcado/reservado" },
      cabine_privativa: { type: ["boolean", "null"], description: "true se indicar cabine privativa (trens-leito)" },
      vista_panoramica: { type: ["boolean", "null"], description: "true se indicar carro/vista panorâmica (Glacier Express, Bernina...)" },
      descricao_cliente: { type: "string", description: "Descrição amigável para o cliente" },
      inclusos: { type: "array", items: { type: "string" }, description: "Itens inclusos (bagagem, refeição, lounge...)" },
      ...COMMON_META,
    },
    promptExtras:
      "Documento de TRANSPORTE FERROVIÁRIO / TREM (bilhete, e-ticket, voucher, reserva ou confirmação). " +
      "Operadoras comuns: SNCF, Trenitalia, Eurostar, Renfe, Deutsche Bahn, Italo, Amtrak, Rail Europe. " +
      "Identifique operadora, cidades e estações de origem/destino (não confunda cidade com estação), data, horários de saída e chegada, " +
      "classe/categoria, quantidade de adultos/crianças e valores por passageiro. " +
      "Marque as características (wifi, tomadas, refeição, assento marcado, cabine, vista panorâmica) APENAS quando estiverem explícitas no documento. " +
      "Mapeie tipo_transporte: TGV/AVE/Frecciarossa/Eurostar/ICE = high_speed; regionais/IC = regional; noturnos/night train/couchette = night; panorâmicos (Glacier, Bernina, Bernina Express) = panoramic. " +
      "Mapeie classe: Standard/2ª = second/economy; Premier/1ª = first; Business/Executive = executive; couchette/sleeper/cabine = sleeper.",
  },
  __placeholder_remove__: {
    description: "Extract structured data from any other travel service (chip, parking, mobile, etc).",
    properties: {
      titulo: { type: "string", description: "Título curto do serviço (Chip Internacional, Estacionamento, Wi-Fi pocket...)" },
      empresa: { type: "string" },
      descricao: { type: "string", description: "Descrição completa do serviço" },
      data: { type: "string", description: "YYYY-MM-DD se houver" },
      ...COMMON_META,
    },
    promptExtras: "Documento de SERVIÇO DIVERSO de viagem (chip, estacionamento, pocket wifi, ingresso avulso, transfer privado, etc). Identifique título, empresa, descrição e valor.",
  },
};

function buildSystemPrompt(key: ServiceKey): string {
  return `Você é um extrator de RESERVAS / ORÇAMENTOS para agências de viagens brasileiras, especializado em ${key.toUpperCase()}.
Sua ÚNICA tarefa: ler vouchers, confirmações, e-mails, prints, PDFs e textos e devolver os dados estruturados usando a função "${SCHEMAS[key].fnName}".
${SHARED_RULES}
CONTEXTO: ${SCHEMAS[key].promptExtras}`;
}

function buildTool(key: ServiceKey) {
  const s = SCHEMAS[key];
  return {
    type: "function",
    function: {
      name: s.fnName,
      description: s.description,
      parameters: {
        type: "object",
        properties: s.properties,
        required: [],
        additionalProperties: false,
      },
    },
  };
}

/* ─────────── Handler ─────────── */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let currentStage = "init";
  let rawAiText = "";

  try {
    currentStage = "auth";
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return debugFail(currentStage, "unauthorized", "Não autorizado.", 401);
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return debugFail(currentStage, "unauthorized", "Não autorizado.", 401);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return debugFail("init", "missing_api_key", "Configuração de IA indisponível.", 500);

    currentStage = "upload_received";
    const body = await req.json().catch(() => ({}));
    const serviceType: ServiceKey = body?.serviceType;
    if (!serviceType || !SCHEMAS[serviceType]) {
      return debugFail(currentStage, "invalid_service_type", "Tipo de serviço inválido.", 400);
    }
    const fileBase64: string | undefined = typeof body?.fileBase64 === "string" ? body.fileBase64 : undefined;
    const fileMimeType: string | undefined = typeof body?.fileMimeType === "string" ? body.fileMimeType : undefined;
    const text: string | undefined = typeof body?.text === "string" ? body.text : undefined;

    if (!fileBase64 && !text) {
      return debugFail(currentStage, "no_input", "Envie um arquivo (PDF/PNG/JPG) ou texto da reserva.", 400);
    }
    if (text && text.length > 40000) {
      return debugFail(currentStage, "text_too_long", "Texto muito longo (máx 40.000 caracteres).", 400);
    }
    if (fileBase64 && fileBase64.length > 14_000_000) {
      return debugFail(currentStage, "file_too_large", "Arquivo muito grande (máx 10MB).", 400);
    }

    currentStage = "sent_to_ai";
    const userContent: any[] = [
      { type: "text", text: `${SCHEMAS[serviceType].promptExtras} Se o ANO não estiver visível, preserve a data curta como aparece e adicione 'ano_pendente' em campos_nao_identificados. SEMPRE chame ${SCHEMAS[serviceType].fnName}.` },
    ];
    if (text) userContent.push({ type: "text", text: `TEXTO EXTRAÍDO DO DOCUMENTO:\n\n${text}` });
    if (fileBase64) {
      const mime = fileMimeType || "application/pdf";
      userContent.push({ type: "image_url", image_url: { url: `data:${mime};base64,${fileBase64}` } });
    }

    const tool = buildTool(serviceType);
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: buildSystemPrompt(serviceType) },
          { role: "user", content: userContent },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: tool.function.name } },
        temperature: 0,
        max_tokens: 6000,
      }),
    });

    currentStage = "ai_response_received";
    if (aiResp.status === 429) return debugFail(currentStage, "rate_limited", "Muitas requisições. Aguarde alguns segundos e tente novamente.", 429);
    if (aiResp.status === 402) return debugFail(currentStage, "credits_exhausted", "Créditos de IA esgotados. Adicione saldo em Configurações > Workspace > Uso.", 402);
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, t.slice(0, 500));
      return debugFail(currentStage, "ai_error", `Falha na chamada à IA (HTTP ${aiResp.status}).`, 502, { raw_ai_response: t.slice(0, 2000) });
    }

    const aiJson = await aiResp.json();
    const choice = aiJson?.choices?.[0];
    const toolCall = choice?.message?.tool_calls?.[0];
    const argsStr: string | undefined = toolCall?.function?.arguments;
    const fallbackText: string | undefined = choice?.message?.content;
    rawAiText = argsStr || fallbackText || JSON.stringify(aiJson).slice(0, 4000);

    currentStage = "json_parse";
    let parsed: any = null;
    let parseError: string | null = null;
    if (argsStr) {
      try { parsed = JSON.parse(argsStr); }
      catch (e) {
        parseError = String(e);
        try { parsed = extractJSON(argsStr); } catch (e2) { parseError = `${parseError} | fallback: ${e2}`; }
      }
    } else if (fallbackText) {
      try { parsed = extractJSON(fallbackText); }
      catch (e) { parseError = String(e); }
    }

    if (!parsed) {
      console.error("[json_parse] failed", parseError, "raw:", rawAiText.slice(0, 500));
      return debugFail(currentStage, "parse_error", "A IA retornou uma resposta sem estrutura reconhecível. Tente novamente com uma imagem mais nítida.", 422, { raw_ai_response: rawAiText });
    }

    parsed.observacoes = Array.isArray(parsed.observacoes) ? parsed.observacoes : [];
    parsed.campos_nao_identificados = Array.isArray(parsed.campos_nao_identificados) ? parsed.campos_nao_identificados : [];
    parsed.confianca_extracao = parsed.confianca_extracao || {};
    const confidence = Number(parsed.confianca_extracao?.geral) || 0;

    // Check usefulness — generic: any non-empty primary field
    const valueKeys = Object.keys(parsed).filter((k) => k !== "confianca_extracao" && k !== "campos_nao_identificados");
    const hasAnyUseful = valueKeys.some((k) => {
      const v = parsed[k];
      if (v == null || v === "") return false;
      if (Array.isArray(v)) return v.length > 0;
      if (typeof v === "object") return Object.keys(v).length > 0;
      return true;
    });

    if (!hasAnyUseful) {
      return debugFail("low_confidence", "no_useful_data", "A IA não conseguiu identificar dados úteis. Tente uma imagem com melhor resolução ou preencha manualmente.", 200, { raw_ai_response: rawAiText, partial_data: parsed, confidence_score: confidence });
    }

    return json({ success: true, stage: "validation", confidence_score: confidence, data: parsed, ...parsed }, 200);
  } catch (err) {
    console.error("import-generic-service-document fatal:", err);
    return debugFail(currentStage, "fatal", String((err as any)?.message || err), 500, { raw_ai_response: rawAiText });
  }
});

function extractJSON(raw: string): any {
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

function debugFail(
  stage: string,
  error_type: string,
  error_message: string,
  status: number,
  extras?: { raw_ai_response?: string; partial_data?: any; confidence_score?: number | null },
) {
  return json({
    success: false,
    stage,
    error_type,
    error_message,
    raw_ai_response: extras?.raw_ai_response || "",
    partial_data: extras?.partial_data || {},
    confidence_score: extras?.confidence_score ?? null,
    error: error_message,
  }, status);
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}