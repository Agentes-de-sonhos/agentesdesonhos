import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um extrator estruturado de ORÇAMENTOS AÉREOS para agências de viagens brasileiras.
Sua tarefa: ler vouchers, cotações GDS, e-tickets, prints e PDFs de orçamentos aéreos (em IMAGEM, texto ou ambos)
e devolver os dados COMPLETOS da viagem aérea usando a função "extract_airfare_document".

REGRAS GERAIS:
- Trate o documento como uma TABELA. Cada linha de voo é um voo separado. NÃO misture campos entre linhas/voos.
- A coluna "Saída" pode conter DATA e HORA em linhas separadas — extraia ambos para cada voo.
- A coluna "Chegada" pode conter DATA e HORA em linhas separadas — extraia ambos para cada voo.
- Companhia aérea pode aparecer por LOGOTIPO ou TEXTO — identifique pelo nome comercial sempre que possível
  (LA→LATAM, LH→Lufthansa, IB→IBERIA, AF→Air France, AA→American Airlines, BA→British Airways, AD→Azul, G3→GOL, JJ→LATAM).
- O número do voo deve ser preservado exatamente como aparece (ex.: 8070, 202, 782, 1572).
- Origem/Destino: separe SEMPRE em código IATA (3 letras MAIÚSCULAS) e nome da cidade.
  Ex.: "GRU - SAO PAULO" → origem_codigo="GRU", origem_nome="SAO PAULO".
- Base tarifária: preserve exatamente (ex.: S-SLESLU0E, W-SLESLU0E, M-MLEKD00E).
- Equipamento: preserve exatamente (ex.: 773, 319, 321, 330).
- Cabine: identifique e NORMALIZE quando óbvio (Econ./Y → "Econômica"; W → "Premium Economy"; J/C → "Executiva"; F → "Primeira").
- Bagagem: interprete com atenção. Tente reconhecer: mochila/bolsa, bagagem de mão, bagagem despachada,
  "0 pc" (= 0 peças despachadas), "1 PC"/"23kg" (= 1 peça despachada). Preencha booleanos e quantidade quando seguro.
- Ícone de alerta SEM descrição visível → preencha alerta="Ícone de alerta exibido no documento, mas sem descrição visível."
- Datas em DD/MM/AAAA ou YYYY-MM-DD; horas em HH:mm. Se o ano não estiver explícito, infira do cabeçalho/rodapé/contexto cronológico.
- Valores brasileiros: vírgula = decimal, ponto = milhar. Extraia como número (ex.: "R$ 8.718,77" → 8718.77, "USD 1.775,07" → 1775.07).
- Câmbio: capture quando aparecer "USD 1,00 = R$ 4,9118" → cambio=4.9118 e moeda_original="USD".
- Data do câmbio: capture quando aparecer (ex.: "do dia 14/05/2026" → "2026-05-14").
- Tipo de tarifa: identifique RT (ida e volta), OW (somente ida), MT (multi-trechos).
- Resumo: trecho_geral em formato "SAO > BER - 25 Set - BER > MAD - 30 Set - MAD > SAO - 06 Out - 1 ADT" quando reconhecível.
- Observações: capture TODAS as observações/regras tarifárias do rodapé, uma por item no array.
- NÃO INVENTE. Se algum campo estiver ilegível/ausente, retorne string vazia ou null e inclua o nome do campo em "campos_nao_identificados".
- Calcule "confianca_extracao" (0 a 1) para: geral, voos, valores, bagagem, observacoes — refletindo sua certeza real.

IMPORTANTE — fontes de entrada:
- Você pode receber (a) a IMAGEM/PDF original e/ou (b) texto extraído. Use AMBAS as fontes. A imagem é primária para
  logos, ícones, estrutura de tabela; o texto é confiável para números, datas e câmbio.
- NUNCA retorne menos voos do que aparecem no documento.`;

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

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Não autorizado." }, 401);
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return json({ error: "Não autorizado." }, 401);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return json({ error: "Configuração de IA indisponível." }, 500);
    }

    const body = await req.json().catch(() => ({}));
    const fileBase64: string | undefined = typeof body?.fileBase64 === "string" ? body.fileBase64 : undefined;
    const fileMimeType: string | undefined = typeof body?.fileMimeType === "string" ? body.fileMimeType : undefined;
    const fileName: string | undefined = typeof body?.fileName === "string" ? body.fileName : undefined;
    const fileUrl: string | undefined = typeof body?.fileUrl === "string" ? body.fileUrl : undefined;
    const text: string | undefined = typeof body?.text === "string" ? body.text : undefined;
    const quoteId: string | undefined = typeof body?.quoteId === "string" ? body.quoteId : undefined;

    if (!fileBase64 && !text) {
      return json({ error: "Envie um arquivo (PDF/PNG/JPG) ou texto do orçamento aéreo." }, 400);
    }
    if (text && text.length > 40000) {
      return json({ error: "Texto muito longo (máx 40.000 caracteres)." }, 400);
    }
    if (fileBase64 && fileBase64.length > 14_000_000) {
      return json({ error: "Arquivo muito grande (máx 10MB)." }, 400);
    }

    const userContent: any[] = [];
    userContent.push({
      type: "text",
      text: "Extraia os dados COMPLETOS do orçamento aéreo abaixo, seguindo TODAS as regras do sistema e preenchendo a função extract_airfare_document. Cada linha de voo é um voo separado. Não misture dados entre voos.",
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
        tool_choice: { type: "function", function: { name: "extract_airfare_document" } },
        temperature: 0.1,
      }),
    });

    if (aiResp.status === 429) {
      await logError(supabase, user.id, quoteId, fileUrl, fileName, fileMimeType, "rate_limited", "Rate limit");
      return json({ error: "Muitas requisições. Aguarde alguns segundos e tente novamente." }, 429);
    }
    if (aiResp.status === 402) {
      await logError(supabase, user.id, quoteId, fileUrl, fileName, fileMimeType, "credits_exhausted", "Sem créditos");
      return json({ error: "Créditos de IA esgotados. Adicione saldo em Configurações > Workspace > Uso." }, 402);
    }
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, t.slice(0, 500));
      await logError(supabase, user.id, quoteId, fileUrl, fileName, fileMimeType, "ai_error", `HTTP ${aiResp.status}`);
      return json({ error: "Não foi possível identificar os dados do orçamento com precisão. Tente enviar uma imagem com melhor resolução ou preencha os campos manualmente." }, 500);
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    const argsStr = toolCall?.function?.arguments;
    if (!argsStr) {
      console.error("No tool call returned:", JSON.stringify(aiJson).slice(0, 500));
      await logError(supabase, user.id, quoteId, fileUrl, fileName, fileMimeType, "no_tool_call", "IA não estruturou");
      return json({ error: "Não foi possível identificar os dados do orçamento com precisão. Tente enviar uma imagem com melhor resolução ou preencha os campos manualmente." }, 422);
    }

    let parsed: any;
    try {
      parsed = JSON.parse(argsStr);
    } catch (e) {
      console.error("Tool args parse error:", e);
      await logError(supabase, user.id, quoteId, fileUrl, fileName, fileMimeType, "parse_error", "JSON inválido");
      return json({ error: "Resposta da IA inválida. Tente novamente." }, 500);
    }

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

    const confidence = Number(parsed.confianca_extracao?.geral) || 0;

    // Log de sucesso (best effort, não bloqueia retorno)
    try {
      await supabase.from("airfare_import_logs").insert({
        user_id: user.id,
        quote_id: quoteId || null,
        file_url: fileUrl || null,
        file_name: fileName || null,
        file_mime: fileMimeType || null,
        raw_ai_response: aiJson,
        parsed_data: parsed,
        confidence_score: confidence,
        status: "success",
      });
    } catch (e) {
      console.error("Log insert failed (non-fatal):", e);
    }

    console.log("[import-airfare-document]", {
      user: user.id,
      voos: parsed.voos.length,
      confidence,
      missing: parsed.campos_nao_identificados.length,
    });

    return json(parsed, 200);
  } catch (err) {
    console.error("import-airfare-document fatal:", err);
    return json({ error: "Erro ao processar orçamento aéreo." }, 500);
  }
});

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