import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um extrator de RESERVAS / ORÇAMENTOS DE LOCAÇÃO DE VEÍCULOS (aluguel de carro, RAC, locadoras como Localiza, Hertz, Movida, Avis, Europcar, Budget, RentCars, etc.) para agências de viagens brasileiras.
Sua ÚNICA tarefa: ler vouchers, confirmações de reserva, e-mails, prints, PDFs e textos de LOCAÇÃO DE VEÍCULOS (em IMAGEM, texto ou ambos)
e devolver os dados estruturados usando a função "extract_car_rental_document".

REGRA #1 — POSTURA DE EXTRAÇÃO.
- NUNCA desista. Mesmo com campos ilegíveis, EXTRAIA TUDO o que conseguir.
- Deixe vazio/null o que não tiver certeza. Liste em "campos_nao_identificados" o nome dos campos que ficaram em branco.
- SEMPRE chame a função extract_car_rental_document. NUNCA retorne texto explicando que o documento está ruim.

REGRA #2 — DATAS / HORÁRIOS.
- Sempre que o ANO estiver visível no documento, preencha datas como "YYYY-MM-DD".
- Se o ano NÃO estiver explícito, preserve a data curta exatamente como aparece (ex.: "25 Set", "25/09") e adicione "ano_pendente" em campos_nao_identificados.
- Horários no formato "HH:mm" (24h). NUNCA invente ano nem hora.

REGRA #3 — VALORES.
- Use ponto como separador decimal (ex.: "R$ 1.250,90" → 1250.90; "USD 380,50" → 380.50).
- Preserve a moeda original em "moeda" (BRL, USD, EUR...).
- "valor_total" = total geral da locação (já incluindo taxas, se vier consolidado).
- "valor_diaria" = diária média, quando informada.
- "taxas" = lista de taxas/encargos extras com nome e valor (ex.: "Taxa de aeroporto", "Young driver", "Cadeirinha", "GPS", "Proteção LDW").

CAMPOS A EXTRAIR:
- locadora: nome da locadora/empresa (Localiza, Hertz, Movida, Avis, Europcar, Budget, Sixt, Enterprise, Alamo, Thrifty, Dollar, etc.).
- categoria_veiculo: ex.: "Econômico", "Compacto", "Intermediário", "SUV", "Premium", "Minivan", "Pickup".
- modelo_veiculo: modelo específico (ex.: "Fiat Mobi", "Chevrolet Onix", "VW T-Cross", "Toyota Corolla"). Use o que aparecer; se vier como "ou similar", preserve.
- transmissao: "Manual", "Automático", "Automática".
- combustivel: "Gasolina", "Etanol", "Flex", "Diesel", "Híbrido", "Elétrico".
- passageiros / portas / bagagens: capacidade informada.
- ar_condicionado: true/false quando o documento indicar explicitamente.
- local_retirada / local_devolucao: nome do local (ex.: "Aeroporto CDG - Terminal 2", "Loja Centro Lisboa").
- endereco_retirada / endereco_devolucao: endereço completo, se aparecer.
- data_retirada / hora_retirada / data_devolucao / hora_devolucao.
- diarias: número de diárias (integer). Calcule a partir das datas se possível.
- quilometragem: "Livre", "Limitada XXX km/dia", ou texto literal.
- protecao_seguro: nome do pacote/cobertura contratada (ex.: "Proteção Total", "LDW", "Básica"). Se houver mais de uma, junte separadas por vírgula.
- franquia: valor da franquia (texto literal — pode incluir moeda).
- moeda: "BRL", "USD", "EUR" etc.
- valor_total: número total (na moeda original).
- valor_total_brl: número total convertido em R$, quando aparecer.
- valor_diaria: diária média na moeda original.
- cambio: taxa de câmbio (ex.: "USD 1,00 = R$ 4,9118" → 4.9118).
- data_cambio: "YYYY-MM-DD" da cotação, se aparecer.
- taxas: array [{ nome, valor, moeda }] de taxas/encargos extras.
- extras: array de adicionais contratados ([{ nome, valor, moeda, quantidade }]) — cadeirinha, GPS, condutor adicional, etc.
- politica_combustivel: ex.: "Cheio-Cheio", "Cheio-Vazio", "Pré-pago".
- politica_cancelamento: texto literal da política, se houver.
- requisitos_motorista: idade mínima, tempo de habilitação, cartão de crédito exigido, etc.
- inclusos: array de itens explicitamente inclusos.
- nao_inclusos: array de itens explicitamente não inclusos.
- observacoes: array de observações relevantes (notas de rodapé, regras tarifárias).
- codigo_reserva / localizador: código/localizador da reserva, se houver.
- link_reserva: URL de gerenciamento/voucher, se houver.
- fornecedor: nome da operadora/agência/portal que emitiu (ex.: "RentCars", "RexturAdvance", "Booking Cars").

CONFIANÇA:
- Calcule "confianca_extracao" (0 a 1) para: geral, dados_principais (locadora/veículo/datas/locais), valores, politicas — refletindo sua certeza real.

FONTES DE ENTRADA:
- Você pode receber a IMAGEM/PDF original e/ou texto extraído. Use AMBAS. A imagem é primária para logos e estrutura visual; o texto é confiável para números, datas e códigos.

IMPORTANTE FINAL:
- NÃO INVENTE ANO. NÃO INVENTE VALORES. SEMPRE chame extract_car_rental_document.`;

const TOOL_SCHEMA = {
  type: "function",
  function: {
    name: "extract_car_rental_document",
    description: "Extract structured car rental reservation data from a voucher/booking/email/PDF/image.",
    parameters: {
      type: "object",
      properties: {
        locadora: { type: "string" },
        categoria_veiculo: { type: "string" },
        modelo_veiculo: { type: "string" },
        transmissao: { type: "string" },
        combustivel: { type: "string" },
        passageiros: { type: ["integer", "null"] },
        portas: { type: ["integer", "null"] },
        bagagens: { type: ["integer", "null"] },
        ar_condicionado: { type: ["boolean", "null"] },
        local_retirada: { type: "string" },
        endereco_retirada: { type: "string" },
        local_devolucao: { type: "string" },
        endereco_devolucao: { type: "string" },
        data_retirada: { type: "string", description: "YYYY-MM-DD or short date if year unknown" },
        hora_retirada: { type: "string", description: "HH:mm" },
        data_devolucao: { type: "string", description: "YYYY-MM-DD or short date if year unknown" },
        hora_devolucao: { type: "string", description: "HH:mm" },
        diarias: { type: ["integer", "null"] },
        quilometragem: { type: "string" },
        protecao_seguro: { type: "string" },
        franquia: { type: "string" },
        moeda: { type: "string" },
        valor_total: { type: ["number", "null"] },
        valor_total_brl: { type: ["number", "null"] },
        valor_diaria: { type: ["number", "null"] },
        cambio: { type: ["number", "null"] },
        data_cambio: { type: "string" },
        taxas: {
          type: "array",
          items: {
            type: "object",
            properties: {
              nome: { type: "string" },
              valor: { type: ["number", "null"] },
              moeda: { type: "string" },
            },
            required: [],
            additionalProperties: false,
          },
        },
        extras: {
          type: "array",
          items: {
            type: "object",
            properties: {
              nome: { type: "string" },
              valor: { type: ["number", "null"] },
              moeda: { type: "string" },
              quantidade: { type: ["integer", "null"] },
            },
            required: [],
            additionalProperties: false,
          },
        },
        politica_combustivel: { type: "string" },
        politica_cancelamento: { type: "string" },
        requisitos_motorista: { type: "string" },
        inclusos: { type: "array", items: { type: "string" } },
        nao_inclusos: { type: "array", items: { type: "string" } },
        observacoes: { type: "array", items: { type: "string" } },
        codigo_reserva: { type: "string" },
        localizador: { type: "string" },
        link_reserva: { type: "string" },
        fornecedor: { type: "string" },
        campos_nao_identificados: { type: "array", items: { type: "string" } },
        confianca_extracao: {
          type: "object",
          properties: {
            geral: { type: "number" },
            dados_principais: { type: "number" },
            valores: { type: "number" },
            politicas: { type: "number" },
          },
          required: [],
          additionalProperties: false,
        },
      },
      required: [],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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
    if (userError || !user) {
      return debugFail(currentStage, "unauthorized", "Não autorizado.", 401);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return debugFail("init", "missing_api_key", "Configuração de IA indisponível.", 500);
    }

    currentStage = "upload_received";
    const body = await req.json().catch(() => ({}));
    const fileBase64: string | undefined = typeof body?.fileBase64 === "string" ? body.fileBase64 : undefined;
    const fileMimeType: string | undefined = typeof body?.fileMimeType === "string" ? body.fileMimeType : undefined;
    const text: string | undefined = typeof body?.text === "string" ? body.text : undefined;

    if (!fileBase64 && !text) {
      return debugFail(currentStage, "no_input", "Envie um arquivo (PDF/PNG/JPG) ou texto da reserva de locação.", 400);
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
      text:
        "Este é um documento de RESERVA / ORÇAMENTO DE LOCAÇÃO DE VEÍCULOS (aluguel de carro). " +
        "Extraia todos os dados que conseguir: locadora, categoria/modelo do veículo, transmissão, combustível, " +
        "locais de retirada e devolução, datas e horários, diárias, quilometragem, proteção, franquia, " +
        "valores (total, diária, moeda, câmbio), taxas e extras, políticas de combustível/cancelamento, " +
        "requisitos do motorista, observações, código/localizador da reserva, link, e fornecedor. " +
        "Se o ANO não estiver visível, preserve a data curta exatamente como aparece e adicione 'ano_pendente' em campos_nao_identificados. " +
        "SEMPRE chame extract_car_rental_document — nunca retorne texto explicativo.",
    });
    if (text) {
      userContent.push({ type: "text", text: `TEXTO EXTRAÍDO DO DOCUMENTO:\n\n${text}` });
    }
    if (fileBase64) {
      const mime = fileMimeType || "application/pdf";
      const dataUrl = `data:${mime};base64,${fileBase64}`;
      userContent.push({ type: "image_url", image_url: { url: dataUrl } });
    }

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
        tool_choice: { type: "function", function: { name: "extract_car_rental_document" } },
        temperature: 0,
        max_tokens: 6000,
      }),
    });

    currentStage = "ai_response_received";

    if (aiResp.status === 429) {
      return debugFail(currentStage, "rate_limited", "Muitas requisições. Aguarde alguns segundos e tente novamente.", 429);
    }
    if (aiResp.status === 402) {
      return debugFail(currentStage, "credits_exhausted", "Créditos de IA esgotados. Adicione saldo em Configurações > Workspace > Uso.", 402);
    }
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
      return debugFail(
        currentStage,
        "parse_error",
        "A IA retornou uma resposta sem estrutura reconhecível. Tente novamente com uma imagem mais nítida.",
        422,
        { raw_ai_response: rawAiText },
      );
    }

    parsed.taxas = Array.isArray(parsed.taxas) ? parsed.taxas : [];
    parsed.extras = Array.isArray(parsed.extras) ? parsed.extras : [];
    parsed.inclusos = Array.isArray(parsed.inclusos) ? parsed.inclusos : [];
    parsed.nao_inclusos = Array.isArray(parsed.nao_inclusos) ? parsed.nao_inclusos : [];
    parsed.observacoes = Array.isArray(parsed.observacoes) ? parsed.observacoes : [];
    parsed.campos_nao_identificados = Array.isArray(parsed.campos_nao_identificados) ? parsed.campos_nao_identificados : [];
    parsed.confianca_extracao = parsed.confianca_extracao || {};

    const confidence = Number(parsed.confianca_extracao?.geral) || 0;
    const hasAnyUseful = !!(
      parsed.locadora ||
      parsed.categoria_veiculo ||
      parsed.modelo_veiculo ||
      parsed.local_retirada ||
      parsed.data_retirada ||
      parsed.data_devolucao ||
      parsed.codigo_reserva ||
      parsed.localizador ||
      typeof parsed.valor_total === "number" ||
      typeof parsed.valor_total_brl === "number"
    );

    if (!hasAnyUseful) {
      return debugFail(
        "low_confidence",
        "no_useful_data",
        "A IA não conseguiu identificar dados úteis da locação. Tente uma imagem com melhor resolução ou preencha manualmente.",
        200,
        { raw_ai_response: rawAiText, partial_data: parsed, confidence_score: confidence },
      );
    }

    return json({
      success: true,
      stage: "validation",
      confidence_score: confidence,
      data: parsed,
      ...parsed,
    }, 200);
  } catch (err) {
    console.error("import-car-rental-document fatal:", err);
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
  return json(
    {
      success: false,
      stage,
      error_type,
      error_message,
      raw_ai_response: extras?.raw_ai_response || "",
      partial_data: extras?.partial_data || {},
      confidence_score: extras?.confidence_score ?? null,
      error: error_message,
    },
    status,
  );
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}