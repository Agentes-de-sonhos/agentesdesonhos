import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um parser estruturado de itinerários aéreos para agências de viagens brasileiras.
Sua tarefa: ler vouchers, e-mails, prints, cotações GDS, PDFs de consolidadoras e e-tickets, e devolver
a estrutura COMPLETA da viagem usando a função "extract_flight_itinerary".

Regras obrigatórias:
- Identifique TODOS os trechos do itinerário (ida, conexões e volta), na ordem cronológica.
- Para CADA trecho é OBRIGATÓRIO preencher TODOS estes campos: date, originAirport, destinationAirport,
  departureTime, arrivalTime, flightNumber e airline. NUNCA retorne um segmento com esses campos vazios
  se a informação estiver visível no documento (mesmo que precise inferir o ano da data ou o IATA da cidade).
- Datas SEMPRE no formato YYYY-MM-DD. Se o ano não estiver explícito, use o ano vigente ou o próximo, conforme a coerência das datas.
- Horários SEMPRE em HH:mm (24h).
- Códigos de aeroporto SEMPRE em IATA de 3 letras MAIÚSCULAS (GRU, FRA, BER, MAD, LAS, CDG, JFK, LHR, MAD, LIS, EZE, SCL...). Se só houver nome de cidade, deduza o IATA principal.
- Número do voo: concatene código IATA da cia + número, sem espaços, em maiúsculas (ex: LA8070, LH202, IB6824, AA904).
- Companhia aérea do trecho: use o nome comercial completo a partir do código (LA→LATAM, LH→Lufthansa, IB→Iberia, AF→Air France, AA→American Airlines, UA→United, BA→British Airways, etc.).
- Cidade de origem = cidade do PRIMEIRO trecho. Cidade de destino principal = primeira cidade INTERNACIONAL (ou a cidade de maior permanência se for doméstico).
- Se houver múltiplas cidades intermediárias, liste em "additionalCities".
- Se houver múltiplas companhias aéreas, concatene em "airlines" separadas por " / " (ex: "LATAM / Lufthansa / Iberia").
- "tripType":
    "ida" → só uma direção;
    "ida_volta" → origem == destino final e há retorno;
    "multi_trechos" → mais de 2 trechos sem retorno simples.
- Bagagem:
    "0 pc", "sem bagagem", "no checked bag" → checkedBaggage=false.
    "1 PC", "23kg", "1 peça despachada" → checkedBaggage=true.
    "carry on", "bagagem de mão", "8kg" → carryOn=true.
    Resuma detalhes em "baggageNotes".
- Valores: extraia totalPrice (número), currency (BRL, USD, EUR...), exchangeRate quando houver, boardingTax (taxa de embarque) quando houver.
- "fareNotes": observações tarifárias (não reembolsável, classe, regras de remarcação).
- "autoSummary": resumo curto em pt-BR (1-3 frases) descrevendo a viagem.
- "confidence": 0 a 1 (sua confiança na extração completa).
- "missingFields": campos importantes que NÃO foi possível extrair.

Nunca invente dados. Se um campo realmente não estiver presente no documento, deixe vazio e adicione em "missingFields".
Mas se a informação ESTÁ no documento (ex: tabela com data, horários e número do voo por trecho), você DEVE extraí-la para todos os trechos.`;

const TOOL_SCHEMA = {
  type: "function",
  function: {
    name: "extract_flight_itinerary",
    description: "Extract structured flight itinerary data from a voucher, email or PDF.",
    parameters: {
      type: "object",
      properties: {
        tripType: { type: "string", enum: ["ida", "ida_volta", "multi_trechos"] },
        originCity: { type: "string" },
        destinationCity: { type: "string" },
        additionalCities: { type: "array", items: { type: "string" } },
        airlines: { type: "string", description: "Companhias concatenadas com ' / '" },
        checkedBaggage: { type: "boolean" },
        carryOn: { type: "boolean" },
        baggageNotes: { type: "string" },
        totalPrice: { type: "number" },
        currency: { type: "string", description: "BRL, USD, EUR..." },
        exchangeRate: { type: "number" },
        boardingTax: { type: "number" },
        fareNotes: { type: "string" },
        autoSummary: { type: "string" },
        confidence: { type: "number" },
        missingFields: { type: "array", items: { type: "string" } },
        segments: {
          type: "array",
          items: {
            type: "object",
            properties: {
              date: { type: "string", description: "YYYY-MM-DD" },
              originAirport: { type: "string", description: "IATA 3 letras" },
              destinationAirport: { type: "string", description: "IATA 3 letras" },
              originCity: { type: "string" },
              destinationCity: { type: "string" },
              departureTime: { type: "string", description: "HH:mm" },
              arrivalTime: { type: "string", description: "HH:mm" },
              flightNumber: { type: "string" },
              airline: { type: "string" },
            },
            required: ["date", "originAirport", "destinationAirport", "departureTime", "arrivalTime", "flightNumber", "airline"],
            additionalProperties: false,
          },
        },
      },
      required: ["segments"],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth
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
    const text: string | undefined = typeof body?.text === "string" ? body.text : undefined;
    const fileBase64: string | undefined = typeof body?.fileBase64 === "string" ? body.fileBase64 : undefined;
    const fileMimeType: string | undefined = typeof body?.fileMimeType === "string" ? body.fileMimeType : undefined;

    if (!text && !fileBase64) {
      return json({ error: "Envie um texto ou arquivo da passagem aérea." }, 400);
    }

    // Limits
    if (text && text.length > 30000) {
      return json({ error: "Texto muito longo (máx 30.000 caracteres)." }, 400);
    }
    if (fileBase64 && fileBase64.length > 7_500_000) {
      // ~5.5 MB binário
      return json({ error: "Arquivo muito grande (máx 5MB)." }, 400);
    }

    const userContent: any[] = [];
    if (text) {
      userContent.push({ type: "text", text: `Texto do itinerário/voucher:\n\n${text}` });
    }
    if (fileBase64) {
      const mime = fileMimeType || "application/pdf";
      const dataUrl = `data:${mime};base64,${fileBase64}`;
      if (mime === "application/pdf") {
        // Gemini via OpenAI-compat aceita arquivo como image_url com data URL.
        userContent.push({
          type: "text",
          text: "Analise o PDF anexo (voucher/cotação aérea) e extraia o itinerário completo.",
        });
        userContent.push({ type: "image_url", image_url: { url: dataUrl } });
      } else {
        userContent.push({
          type: "text",
          text: "Analise a imagem anexa (voucher/cotação aérea) e extraia o itinerário completo.",
        });
        userContent.push({ type: "image_url", image_url: { url: dataUrl } });
      }
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
        tool_choice: { type: "function", function: { name: "extract_flight_itinerary" } },
      }),
    });

    if (aiResp.status === 429) {
      return json({ error: "Muitas requisições. Aguarde alguns segundos e tente novamente." }, 429);
    }
    if (aiResp.status === 402) {
      return json({ error: "Créditos de IA esgotados. Adicione saldo em Configurações > Workspace > Uso." }, 402);
    }
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, t.slice(0, 500));
      return json({ error: "Falha ao processar com a IA. Tente novamente." }, 500);
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    const argsStr = toolCall?.function?.arguments;
    if (!argsStr) {
      console.error("No tool call returned:", JSON.stringify(aiJson).slice(0, 500));
      return json({
        error: "A IA não conseguiu estruturar o itinerário. Tente colar o texto da confirmação ou anexar um PDF mais legível.",
      }, 422);
    }

    let parsed: any;
    try {
      parsed = JSON.parse(argsStr);
    } catch (e) {
      console.error("Tool args parse error:", e, argsStr.slice(0, 500));
      return json({ error: "Resposta da IA inválida. Tente novamente." }, 500);
    }

    // Normalização leve
    if (Array.isArray(parsed.segments)) {
      parsed.segments = parsed.segments
        .map((s: any) => ({
          ...s,
          originAirport: s.originAirport ? String(s.originAirport).toUpperCase().trim() : "",
          destinationAirport: s.destinationAirport ? String(s.destinationAirport).toUpperCase().trim() : "",
          flightNumber: s.flightNumber ? String(s.flightNumber).replace(/\s+/g, "").toUpperCase() : "",
        }))
        .filter((s: any) => s.originAirport && s.destinationAirport);
    } else {
      parsed.segments = [];
    }

    console.log("[parse-flight-itinerary]", {
      user: user.id,
      hasText: !!text,
      hasFile: !!fileBase64,
      fileMime: fileMimeType || null,
      segmentsDetected: parsed.segments.length,
      airlines: parsed.airlines || null,
      tripType: parsed.tripType || null,
      confidence: parsed.confidence ?? null,
      missingFields: parsed.missingFields || [],
    });

    // Per-segment completeness log to debug AI extractions
    parsed.segments.forEach((s: any, idx: number) => {
      const missing: string[] = [];
      if (!s.date) missing.push("date");
      if (!s.departureTime) missing.push("departureTime");
      if (!s.arrivalTime) missing.push("arrivalTime");
      if (!s.flightNumber) missing.push("flightNumber");
      if (!s.airline) missing.push("airline");
      console.log(`[parse-flight-itinerary] segment ${idx + 1}`, {
        route: `${s.originAirport || "?"} → ${s.destinationAirport || "?"}`,
        date: s.date || null,
        flight: s.flightNumber || null,
        airline: s.airline || null,
        dep: s.departureTime || null,
        arr: s.arrivalTime || null,
        missing,
      });
    });

    return json(parsed, 200);
  } catch (err) {
    console.error("parse-flight-itinerary fatal:", err);
    return json({ error: "Erro ao processar itinerário aéreo." }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}