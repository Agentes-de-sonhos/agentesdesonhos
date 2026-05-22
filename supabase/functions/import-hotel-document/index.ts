import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um extrator de RESERVAS / ORÇAMENTOS DE HOSPEDAGEM (hotéis, pousadas, resorts, apart-hotéis) para agências de viagens brasileiras.
Sua ÚNICA tarefa: ler vouchers, confirmações de reserva, e-mails, prints, PDFs e textos de HOSPEDAGEM (em IMAGEM, texto ou ambos)
e devolver os dados estruturados usando a função "extract_hotel_document".

REGRA #1 — POSTURA DE EXTRAÇÃO.
- NUNCA desista. Mesmo com campos ilegíveis, EXTRAIA TUDO o que conseguir.
- Deixe vazio/null o que não tiver certeza. Liste em "campos_nao_identificados" o nome dos campos que ficaram em branco.
- SEMPRE chame a função extract_hotel_document. NUNCA retorne texto explicando que o documento está ruim.

REGRA #2 — DATAS.
- Sempre que o ANO estiver visível no documento, preencha datas como "YYYY-MM-DD".
- Se o ano NÃO estiver explícito, preserve o formato curto exato como aparece (ex.: "25 Set", "25/09") e adicione "ano_pendente" em campos_nao_identificados.
- NUNCA invente ano.

REGRA #3 — VALORES.
- Use ponto como separador decimal nos NÚMEROS (ex.: "R$ 8.718,77" → 8718.77; "USD 1.775,07" → 1775.07).
- Preserve a moeda original em "moeda" (BRL, USD, EUR...).
- "valor_total" = total geral da reserva (já incluindo taxas, se vier consolidado).
- "valor_diaria" = diária média, se informada.
- "taxas" = lista de taxas adicionais com nome e valor (ex.: "ISS", "Taxa de turismo", "Resort fee").

CAMPOS A EXTRAIR:
- nome_hotel: nome comercial do hotel/pousada/resort.
- cidade / pais: cidade e país onde fica o hotel.
- endereco: endereço completo, se aparecer.
- check_in / check_out: "YYYY-MM-DD" (ou data curta se ano ausente).
- horario_check_in / horario_check_out: "HH:mm", se aparecer.
- noites: número de diárias (integer). Calcule a partir das datas se possível.
- tipo_acomodacao / categoria_quarto: ex.: "Standard", "Superior", "Deluxe", "Suíte", "Suíte Júnior", "Quarto Duplo", "Família".
- regime_alimentacao: ex.: "Sem refeição", "Café da manhã", "Meia pensão", "Pensão completa", "All Inclusive". Use o termo exato que aparece.
- hospedes_adultos / hospedes_criancas / hospedes_total: quantidades, quando informadas.
- quantidade_quartos: número de quartos reservados.
- moeda: "BRL", "USD", "EUR" etc.
- valor_total: número total (na moeda original).
- valor_total_brl: número total convertido em R$, quando aparecer.
- valor_diaria: diária média na moeda original.
- cambio: taxa de câmbio (ex.: "USD 1,00 = R$ 4,9118" → 4.9118).
- data_cambio: "YYYY-MM-DD" da cotação, se aparecer.
- taxas: array [{ nome, valor, moeda }] de taxas adicionais.
- politica_cancelamento: texto literal da política, se houver (gratuita até X, não reembolsável, etc.).
- inclusos: array de itens explicitamente inclusos (ex.: "Wi-Fi", "Estacionamento", "Translado").
- nao_inclusos: array de itens explicitamente não inclusos.
- observacoes: array de observações relevantes (textos do rodapé, regras tarifárias, notas).
- codigo_reserva / localizador: código/localizador da reserva, se houver.
- link_reserva: URL de gerenciamento/voucher, se houver.
- fornecedor: nome da operadora/agência/portal que emitiu (ex.: "Booking.com", "Hotelbeds", "RexturAdvance").

CONFIANÇA:
- Calcule "confianca_extracao" (0 a 1) para: geral, dados_principais (hotel/cidade/datas), valores, politicas — refletindo sua certeza real.

FONTES DE ENTRADA:
- Você pode receber a IMAGEM/PDF original e/ou texto extraído. Use AMBAS. A imagem é primária para logos e estrutura visual; o texto é confiável para números, datas e códigos.

IMPORTANTE FINAL:
- NÃO INVENTE ANO. NÃO INVENTE VALORES. SEMPRE chame extract_hotel_document.`;

const TOOL_SCHEMA = {
  type: "function",
  function: {
    name: "extract_hotel_document",
    description: "Extract structured hotel/lodging reservation data from a voucher/booking/email/PDF/image.",
    parameters: {
      type: "object",
      properties: {
        nome_hotel: { type: "string" },
        cidade: { type: "string" },
        pais: { type: "string" },
        endereco: { type: "string" },
        check_in: { type: "string", description: "YYYY-MM-DD or short date if year unknown" },
        check_out: { type: "string", description: "YYYY-MM-DD or short date if year unknown" },
        horario_check_in: { type: "string", description: "HH:mm" },
        horario_check_out: { type: "string", description: "HH:mm" },
        noites: { type: ["integer", "null"] },
        tipo_acomodacao: { type: "string" },
        categoria_quarto: { type: "string" },
        regime_alimentacao: { type: "string" },
        hospedes_adultos: { type: ["integer", "null"] },
        hospedes_criancas: { type: ["integer", "null"] },
        hospedes_total: { type: ["integer", "null"] },
        quantidade_quartos: { type: ["integer", "null"] },
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
        politica_cancelamento: { type: "string" },
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
      return debugFail(currentStage, "no_input", "Envie um arquivo (PDF/PNG/JPG) ou texto da reserva de hospedagem.", 400);
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
        "Este é um documento de RESERVA / ORÇAMENTO DE HOSPEDAGEM (hotel, pousada, resort, apart-hotel). " +
        "Extraia todos os dados que conseguir: nome do hotel, cidade/país, endereço, check-in/check-out (com horário se houver), " +
        "noites, tipo de acomodação, regime de alimentação, hóspedes (adultos/crianças/quartos), " +
        "valor total, valor diária, moeda, taxas adicionais, política de cancelamento, observações, código/localizador da reserva, link, e fornecedor. " +
        "Se o ANO não estiver visível, preserve a data curta exatamente como aparece (ex.: '25 Set') e adicione 'ano_pendente' em campos_nao_identificados. " +
        "SEMPRE chame extract_hotel_document — nunca retorne texto explicativo.",
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
        tool_choice: { type: "function", function: { name: "extract_hotel_document" } },
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

    // Normalização leve
    parsed.taxas = Array.isArray(parsed.taxas) ? parsed.taxas : [];
    parsed.inclusos = Array.isArray(parsed.inclusos) ? parsed.inclusos : [];
    parsed.nao_inclusos = Array.isArray(parsed.nao_inclusos) ? parsed.nao_inclusos : [];
    parsed.observacoes = Array.isArray(parsed.observacoes) ? parsed.observacoes : [];
    parsed.campos_nao_identificados = Array.isArray(parsed.campos_nao_identificados) ? parsed.campos_nao_identificados : [];
    parsed.confianca_extracao = parsed.confianca_extracao || {};

    const confidence = Number(parsed.confianca_extracao?.geral) || 0;
    const hasAnyUseful = !!(
      parsed.nome_hotel ||
      parsed.cidade ||
      parsed.check_in ||
      parsed.check_out ||
      parsed.codigo_reserva ||
      parsed.localizador ||
      typeof parsed.valor_total === "number" ||
      typeof parsed.valor_total_brl === "number"
    );

    if (!hasAnyUseful) {
      return debugFail(
        "low_confidence",
        "no_useful_data",
        "A IA não conseguiu identificar dados úteis da hospedagem. Tente uma imagem com melhor resolução ou preencha manualmente.",
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
    console.error("import-hotel-document fatal:", err);
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