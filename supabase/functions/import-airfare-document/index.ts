import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um extrator TABULAR de ORÇAMENTOS AÉREOS (passagens) para agências de viagens brasileiras.
Sua ÚNICA tarefa: ler vouchers, cotações GDS, e-tickets, prints e PDFs de ORÇAMENTOS AÉREOS (em IMAGEM, texto ou ambos)
e devolver TODA a tabela de voos, LINHA POR LINHA, usando a função "extract_airfare_document".

REGRA #1 — NÃO RESUMA. EXTRAIA LINHA POR LINHA.
- O documento contém uma TABELA com colunas como: Cia, Voo, Saída (data+hora), Chegada (data+hora), Duração, Origem, Destino, Esc., Equip., Cabine, Base, Bagagem, Tipo, Tx Comb., Total, Total R$.
- CADA LINHA da tabela = UM voo separado no array "voos". NÃO agrupe voos. NÃO some campos. NÃO concatene companhias.
- Se a tabela tem 4 linhas de voo, "voos" DEVE ter 4 itens. Se tem 6 linhas, "voos" DEVE ter 6 itens.
- NUNCA devolva apenas o resumo. NUNCA devolva menos voos do que aparecem.

REGRA #2 — NÃO INVENTE ANO.
- Se o ano da data NÃO estiver explícito no documento, NÃO assuma 2024, 2025 nem nenhum outro ano.
- Preencha "data_saida" / "data_chegada" no formato curto exatamente como aparece (ex.: "25 Set", "06 Out", "26/09").
- Apenas use "YYYY-MM-DD" quando o ano estiver claramente visível no documento.
- Adicione "ano_pendente" em campos_nao_identificados se o ano não foi identificado.

REGRA #3 — POSTURA DE EXTRAÇÃO.
- NUNCA desista. Mesmo com campos ilegíveis, EXTRAIA TUDO o que conseguir. Deixe vazio/null o que não tiver certeza.
- SEMPRE chame a função extract_airfare_document. NUNCA retorne texto explicando que o documento está ruim.
- Liste em "campos_nao_identificados" o nome dos campos que ficaram em branco.

CAMPOS POR VOO (cada linha da tabela):
- ordem: número sequencial (1, 2, 3, 4...)
- companhia_aerea: nome comercial pelo LOGO ou TEXTO (LA→LATAM, LH→Lufthansa, IB→IBERIA, AF→Air France, AA→American Airlines, BA→British Airways, AD→Azul, G3→GOL, JJ→LATAM, UA→United, DL→Delta, AC→Air Canada, KL→KLM, TP→TAP, AZ→ITA Airways).
- numero_voo: preserve exatamente (ex.: "8070", "202", "782", "1572"). Não invente prefixos.
- data_saida / data_chegada: formato curto "DD MMM" (ex.: "25 Set") quando ano ausente; OU "YYYY-MM-DD" quando ano visível.
- hora_saida / hora_chegada: "HH:mm".
- duracao: "HH:mm".
- origem_codigo / destino_codigo: IATA 3 letras MAIÚSCULAS (ex.: "GRU", "FRA", "BER", "MAD").
- origem_nome / destino_nome: nome da cidade exatamente como aparece (ex.: "SAO PAULO", "FRANKFURT", "BERLIN", "MADRID").
- numero_escalas: número de escalas (0 se direto).
- equipamento: preserve exatamente (ex.: "773", "319", "321", "330").
- cabine: preserve como aparece (ex.: "Econ.", "Y", "W", "J", "C", "F").
- base_tarifaria: preserve exatamente (ex.: "S-SLESLU0E", "W-SLESLU0E", "M-MLEKD00E").
- bagagem_texto: o texto exato da célula bagagem (ex.: "LIG / 0 pc", "1PC 23kg", "---").
- bagagem_mochila_bolsa / bagagem_mao / bagagem_despachada: true/false/null por voo.
- quantidade_bagagem_despachada: número de peças despachadas, ou null.
- alerta: se houver ícone de alerta SEM descrição → "Ícone de alerta exibido no documento, mas sem descrição visível."

RESUMO (campos do orçamento, NÃO substituem os voos):
- trecho_geral: ex.: "SAO > BER - 25 Set - BER > MAD - 30 Set - MAD > SAO - 06 Out - 1 ADT".
- origem_inicial / destino_final: IATA de partida inicial e chegada final.
- tipo_tarifa: "RT" (ida e volta), "OW" (somente ida), "MT" (multi-trechos).
- quantidade_passageiros + tipo_passageiro (ADT / CHD / INF).
- moeda_original (USD, EUR, BRL...).
- valor_total_original e valor_total_brl: NÚMEROS (vírgula = decimal). "R$ 8.718,77" → 8718.77; "USD 1.775,07" → 1775.07.
- cambio: número (ex.: "USD 1,00 = R$ 4,9118" → 4.9118).
- data_cambio: "YYYY-MM-DD" (ex.: "do dia 14/05/2026" → "2026-05-14").

VALORES (rodapé financeiro):
- tipo: "RT" / "OW" / "MT".
- taxa_combustivel: texto exato (ex.: "USD 0,00").
- total_moeda_original / total_brl: números.

OBSERVAÇÕES:
- Capture TODAS as observações/regras tarifárias do rodapé. Uma por item no array "observacoes". Mantenha o texto literal.

CONFIANÇA:
- Calcule "confianca_extracao" (0 a 1) para: geral, voos, valores, bagagem, observacoes — refletindo sua certeza real.
- Quanto mais voos extraídos com campos essenciais (companhia, número, data+hora saída, data+hora chegada, origem, destino), maior a confiança em "voos".

FONTES DE ENTRADA:
- Você pode receber a IMAGEM/PDF original e/ou texto extraído. Use AMBAS. A imagem é primária para logos, ícones e estrutura de tabela; o texto é confiável para números, datas e câmbio.

IMPORTANTE FINAL:
- NÃO RESUMA. NÃO INVENTE ANO. NÃO devolva apenas 1 voo se a tabela tem 4. NÃO concatene companhias no array. SEMPRE chame extract_airfare_document.`;

const TOOL_SCHEMA = {
  type: "function",
  function: {
    name: "extract_airfare_document",
    description: "Extract structured airfare quote (orçamento aéreo) data from a voucher/quote/PDF/image.",
    parameters: {
      type: "object",
      properties: {
        resumo: {
          type: "object",
          properties: {
            trecho_geral: { type: "string" },
            origem_inicial: { type: "string" },
            destino_final: { type: "string" },
            data_ida: { type: "string", description: "YYYY-MM-DD" },
            data_retorno: { type: "string", description: "YYYY-MM-DD" },
            quantidade_passageiros: { type: "string" },
            tipo_passageiro: { type: "string", description: "ADT / CHD / INF" },
            tipo_tarifa: { type: "string", description: "RT, OW, MT" },
            moeda_original: { type: "string", description: "BRL, USD, EUR..." },
            valor_total_original: { type: ["number", "null"] },
            valor_total_brl: { type: ["number", "null"] },
            cambio: { type: ["number", "null"] },
            data_cambio: { type: "string", description: "YYYY-MM-DD" },
          },
          required: [],
          additionalProperties: false,
        },
        voos: {
          type: "array",
          items: {
            type: "object",
            properties: {
              ordem: { type: "integer" },
              companhia_aerea: { type: "string" },
              numero_voo: { type: "string" },
              data_saida: { type: "string", description: "YYYY-MM-DD" },
              hora_saida: { type: "string", description: "HH:mm" },
              data_chegada: { type: "string", description: "YYYY-MM-DD" },
              hora_chegada: { type: "string", description: "HH:mm" },
              duracao: { type: "string", description: "HH:mm" },
              origem_codigo: { type: "string", description: "IATA 3 letras" },
              origem_nome: { type: "string" },
              destino_codigo: { type: "string", description: "IATA 3 letras" },
              destino_nome: { type: "string" },
              numero_escalas: { type: "integer" },
              equipamento: { type: "string" },
              cabine: { type: "string" },
              base_tarifaria: { type: "string" },
              bagagem_texto: { type: "string" },
              bagagem_mochila_bolsa: { type: ["boolean", "null"] },
              bagagem_mao: { type: ["boolean", "null"] },
              bagagem_despachada: { type: ["boolean", "null"] },
              quantidade_bagagem_despachada: { type: ["integer", "null"] },
              alerta: { type: "string" },
            },
            required: ["ordem"],
            additionalProperties: false,
          },
        },
        valores: {
          type: "object",
          properties: {
            tipo: { type: "string" },
            taxa_combustivel: { type: "string" },
            total_moeda_original: { type: ["number", "null"] },
            total_brl: { type: ["number", "null"] },
          },
          required: [],
          additionalProperties: false,
        },
        observacoes: { type: "array", items: { type: "string" } },
        campos_nao_identificados: { type: "array", items: { type: "string" } },
        confianca_extracao: {
          type: "object",
          properties: {
            geral: { type: "number" },
            voos: { type: "number" },
            valores: { type: "number" },
            bagagem: { type: "number" },
            observacoes: { type: "number" },
          },
          required: [],
          additionalProperties: false,
        },
      },
      required: ["voos"],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stages: string[] = [];
  const log = (stage: string, payload?: any) => {
    stages.push(stage);
    if (payload !== undefined) {
      try { console.log(`[stage:${stage}]`, typeof payload === "string" ? payload : JSON.stringify(payload).slice(0, 800)); }
      catch { console.log(`[stage:${stage}]`); }
    } else {
      console.log(`[stage:${stage}]`);
    }
  };

  let currentStage = "init";
  let userId: string | null = null;
  let quoteId: string | undefined;
  let fileUrl: string | undefined;
  let fileName: string | undefined;
  let fileMimeType: string | undefined;
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
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return debugFail(currentStage, "unauthorized", "Não autorizado.", 401);
    }
    userId = user.id;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return debugFail("init", "missing_api_key", "Configuração de IA indisponível.", 500);
    }

    currentStage = "upload_received";
    const body = await req.json().catch(() => ({}));
    const fileBase64: string | undefined = typeof body?.fileBase64 === "string" ? body.fileBase64 : undefined;
    fileMimeType = typeof body?.fileMimeType === "string" ? body.fileMimeType : undefined;
    fileName = typeof body?.fileName === "string" ? body.fileName : undefined;
    fileUrl = typeof body?.fileUrl === "string" ? body.fileUrl : undefined;
    const text: string | undefined = typeof body?.text === "string" ? body.text : undefined;
    quoteId = typeof body?.quoteId === "string" ? body.quoteId : undefined;

    log("upload_received", {
      fileName, fileMimeType,
      fileBytes: fileBase64 ? Math.round(fileBase64.length * 0.75) : 0,
      textChars: text?.length || 0,
      hasStoragePath: !!fileUrl,
    });

    if (!fileBase64 && !text) {
      return debugFail(currentStage, "no_input", "Envie um arquivo (PDF/PNG/JPG) ou texto do orçamento aéreo.", 400);
    }
    if (text && text.length > 40000) {
      return debugFail(currentStage, "text_too_long", "Texto muito longo (máx 40.000 caracteres).", 400);
    }
    if (fileBase64 && fileBase64.length > 14_000_000) {
      return debugFail(currentStage, "file_too_large", "Arquivo muito grande (máx 10MB).", 400);
    }

    currentStage = "sent_to_ai";
    const userContent: any[] = [];
    userContent.push({
      type: "text",
      text: "Analise visualmente este documento de orçamento aéreo. Mesmo que alguns campos estejam incertos, EXTRAIA TUDO o que conseguir identificar. Não retorne erro nem texto explicativo: SEMPRE preencha a função extract_airfare_document. Identifique voos, datas, horários, companhias, aeroportos, bagagens, valores e observações. Se houver dúvida em algum campo, deixe-o vazio/null, adicione o nome em campos_nao_identificados e reduza a confiança correspondente — mas MANTENHA os demais campos identificados. Cada linha de voo é um voo separado. Não misture dados entre voos.",
    });
    if (text) {
      userContent.push({ type: "text", text: `TEXTO EXTRAÍDO DO DOCUMENTO:\n\n${text}` });
    }
    if (fileBase64) {
      const mime = fileMimeType || "application/pdf";
      const dataUrl = `data:${mime};base64,${fileBase64}`;
      userContent.push({ type: "image_url", image_url: { url: dataUrl } });
    }

    log("sent_to_ai", { model: "google/gemini-2.5-pro", hasImage: !!fileBase64, hasText: !!text });

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        tools: [TOOL_SCHEMA],
        tool_choice: { type: "function", function: { name: "extract_airfare_document" } },
        temperature: 0,
        max_tokens: 8000,
      }),
    });

    currentStage = "ai_response_received";
    log("ai_response_received", { status: aiResp.status });

    if (aiResp.status === 429) {
      await logError(supabase, userId, quoteId, fileUrl, fileName, fileMimeType, "rate_limited", "Rate limit");
      return debugFail(currentStage, "rate_limited", "Muitas requisições. Aguarde alguns segundos e tente novamente.", 429);
    }
    if (aiResp.status === 402) {
      await logError(supabase, userId, quoteId, fileUrl, fileName, fileMimeType, "credits_exhausted", "Sem créditos");
      return debugFail(currentStage, "credits_exhausted", "Créditos de IA esgotados. Adicione saldo em Configurações > Workspace > Uso.", 402);
    }
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, t.slice(0, 500));
      await logError(supabase, userId, quoteId, fileUrl, fileName, fileMimeType, "ai_error", `HTTP ${aiResp.status}`);
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
      // IA não estruturou via tool — tenta extrair JSON do texto livre
      try { parsed = extractJSON(fallbackText); }
      catch (e) { parseError = String(e); }
    }

    if (!parsed) {
      console.error("[json_parse] failed", parseError, "raw:", rawAiText.slice(0, 500));
      await logError(supabase, userId, quoteId, fileUrl, fileName, fileMimeType, "parse_error", parseError || "Sem tool_call e sem JSON extraível");
      return debugFail(
        currentStage,
        "parse_error",
        "A IA retornou uma resposta sem estrutura reconhecível. Tente novamente com uma imagem mais nítida.",
        422,
        { raw_ai_response: rawAiText },
      );
    }

    currentStage = "validation";
    // Normalização leve
    parsed.voos = Array.isArray(parsed.voos) ? parsed.voos : [];
    parsed.voos = parsed.voos
      .map((v: any, i: number) => ({
        ...v,
        ordem: typeof v.ordem === "number" ? v.ordem : i + 1,
        origem_codigo: v.origem_codigo ? String(v.origem_codigo).toUpperCase().trim() : "",
        destino_codigo: v.destino_codigo ? String(v.destino_codigo).toUpperCase().trim() : "",
        numero_voo: v.numero_voo ? String(v.numero_voo).replace(/\s+/g, "").toUpperCase() : "",
      }))
      .sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0));

    parsed.observacoes = Array.isArray(parsed.observacoes) ? parsed.observacoes : [];
    parsed.campos_nao_identificados = Array.isArray(parsed.campos_nao_identificados) ? parsed.campos_nao_identificados : [];
    parsed.confianca_extracao = parsed.confianca_extracao || {};
    parsed.resumo = parsed.resumo || {};
    parsed.valores = parsed.valores || {};

    const confidence = Number(parsed.confianca_extracao?.geral) || 0;
    const hasFlights = parsed.voos.length > 0;
    const hasAnyUseful = hasFlights
      || !!parsed.resumo?.trecho_geral
      || !!parsed.resumo?.origem_inicial
      || !!parsed.resumo?.destino_final
      || typeof parsed.resumo?.valor_total_brl === "number"
      || typeof parsed.resumo?.valor_total_original === "number";

    log("validation", { voos: parsed.voos.length, confidence, hasAnyUseful });

    // Log de sucesso (best effort, não bloqueia retorno)
    try {
      await supabase.from("airfare_import_logs").insert({
        user_id: userId,
        quote_id: quoteId || null,
        file_url: fileUrl || null,
        file_name: fileName || null,
        file_mime: fileMimeType || null,
        raw_ai_response: aiJson,
        parsed_data: parsed,
        confidence_score: confidence,
        status: hasFlights ? (confidence >= 0.5 ? "success" : "low_confidence") : (hasAnyUseful ? "partial" : "no_data"),
      });
    } catch (e) {
      console.error("Log insert failed (non-fatal):", e);
    }

    // Nova regra: só erro definitivo quando NÃO há voos e NÃO há nada útil
    if (!hasAnyUseful) {
      return debugFail(
        "low_confidence",
        "no_useful_data",
        "A IA não conseguiu identificar nenhum voo nem dado útil. Tente uma imagem com melhor resolução ou preencha manualmente.",
        200,
        { raw_ai_response: rawAiText, partial_data: parsed, confidence_score: confidence },
      );
    }

    console.log("[import-airfare-document]", {
      user: userId,
      voos: parsed.voos.length,
      confidence,
      missing: parsed.campos_nao_identificados.length,
      stages,
    });

    // SEMPRE devolve parsed (mesmo confiança baixa) — frontend decide UI de revisão
    return json({
      success: true,
      stage: "validation",
      confidence_score: confidence,
      data: parsed,
      // mantém compat com client antigo (espalha campos no topo)
      ...parsed,
    }, 200);
  } catch (err) {
    console.error("import-airfare-document fatal:", err);
    return debugFail(currentStage, "fatal", String((err as any)?.message || err), 500, { raw_ai_response: rawAiText });
  }
});

/** Limpa e tenta extrair o primeiro bloco JSON válido de uma string com ruído. */
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
  return json(
    {
      success: false,
      stage,
      error_type,
      error_message,
      raw_ai_response: extras?.raw_ai_response || "",
      partial_data: extras?.partial_data || {},
      confidence_score: extras?.confidence_score ?? null,
      // compat com client antigo
      error: error_message,
    },
    status,
  );
}

async function logError(
  supabase: any,
  userId: string,
  quoteId: string | undefined,
  fileUrl: string | undefined,
  fileName: string | undefined,
  fileMime: string | undefined,
  status: string,
  msg: string,
) {
  try {
    await supabase.from("airfare_import_logs").insert({
      user_id: userId,
      quote_id: quoteId || null,
      file_url: fileUrl || null,
      file_name: fileName || null,
      file_mime: fileMime || null,
      status,
      error_message: msg,
    });
  } catch (e) {
    console.error("Error log insert failed:", e);
  }
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}