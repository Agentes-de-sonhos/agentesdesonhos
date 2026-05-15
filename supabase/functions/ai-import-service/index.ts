import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getClientIP, rateLimitResponse } from "../_shared/rate-limiter.ts";
import { sanitizeText, detectPromptInjection } from "../_shared/input-validator.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_FILE_BASE64 = 10_000_000; // ~10MB
const MAX_TEXT_LEN = 30_000;
const ALLOWED_MIME = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp"];
const ALLOWED_TYPES = [
  "flight",
  "hotel",
  "car_rental",
  "transfer",
  "attraction",
  "insurance",
  "cruise",
  "train",
  "other",
] as const;
type ImportType = typeof ALLOWED_TYPES[number];

/**
 * Schemas (tool calling) — describe ALL the fields existing in src/types/trip.ts
 * for each service type. The AI fills only what it can find with evidence.
 */
const FLIGHT_SCHEMA = {
  type: "object",
  properties: {
    extracted: {
      type: "object",
      description: "Dados encontrados explicitamente no documento/texto.",
      properties: {
        main_airline: { type: "string" },
        origin_city: { type: "string" },
        destination_city: { type: "string" },
        trip_type: { type: "string", enum: ["ida", "ida_volta", "multi_trechos", ""] },
        locator_code: { type: "string", description: "Código localizador / PNR" },
        flight_status: { type: "string", enum: ["confirmado", "emitido", "pendente", ""] },
        segments: {
          type: "array",
          items: {
            type: "object",
            properties: {
              origin_airport: { type: "string", description: "IATA 3 letras" },
              origin_city: { type: "string" },
              destination_airport: { type: "string", description: "IATA 3 letras" },
              destination_city: { type: "string" },
              flight_date: { type: "string", description: "YYYY-MM-DD" },
              departure_time: { type: "string", description: "HH:MM" },
              arrival_time: { type: "string", description: "HH:MM" },
              flight_number: { type: "string" },
              airline: { type: "string" },
              terminal: { type: "string" },
              gate: { type: "string" },
              segment_type: { type: "string", enum: ["ida", "conexao", "volta", ""] },
            },
          },
        },
        passengers: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              passenger_type: { type: "string", enum: ["adulto", "crianca", "bebe", ""] },
              document: { type: "string" },
              seat: { type: "string" },
              notes: { type: "string" },
            },
          },
        },
        carry_on: { type: "string" },
        checked_baggage: { type: "string" },
        extra_baggage: { type: "string" },
        baggage_rules: { type: "string" },
        baggage_notes: { type: "string" },
        checkin_url: { type: "string" },
        checkin_status: { type: "string", enum: ["pendente", "realizado", ""] },
        checkin_open_date: { type: "string" },
        checkin_notes: { type: "string" },
        recommended_arrival: { type: "string" },
        boarding_terminal: { type: "string" },
        required_documents: { type: "string" },
        immigration_rules: { type: "string" },
        boarding_notes: { type: "string" },
      },
    },
    suggested: {
      type: "object",
      description:
        "Sugestões baseadas em conhecimento público (ex: URL oficial de check-in). Use apenas com alta confiança. Caso contrário, deixe vazio.",
      properties: {
        checkin_url: { type: "string", description: "URL oficial de check-in da companhia" },
        recommended_arrival: { type: "string", description: "Antecedência recomendada" },
        baggage_rules: { type: "string" },
      },
    },
    confidence_notes: {
      type: "string",
      description: "Observações curtas sobre o que NÃO foi possível identificar com clareza.",
    },
  },
  required: ["extracted"],
};

const HOTEL_SCHEMA = {
  type: "object",
  properties: {
    extracted: {
      type: "object",
      properties: {
        hotel_name: { type: "string" },
        hotel_category: { type: "string" },
        city: { type: "string" },
        country: { type: "string" },
        check_in: { type: "string", description: "YYYY-MM-DD" },
        check_out: { type: "string", description: "YYYY-MM-DD" },
        room_type: { type: "string" },
        reservation_status: { type: "string", enum: ["confirmada", "emitida", "pre_reserva", ""] },
        reservation_code: { type: "string" },
        checkin_time: { type: "string" },
        early_checkin: { type: "string" },
        checkin_holder: { type: "string" },
        checkin_instructions: { type: "string" },
        late_arrival_policy: { type: "string" },
        checkout_time: { type: "string" },
        late_checkout: { type: "string" },
        late_checkout_fee: { type: "string" },
        checkout_instructions: { type: "string" },
        checkout_procedure: { type: "string" },
        bed_type: { type: "string" },
        guest_count: { type: "string" },
        room_view: { type: "string" },
        meal_plan: { type: "string" },
        cleaning_policy: { type: "string" },
        amenities: { type: "string" },
        address: { type: "string" },
        hotel_phone: { type: "string" },
        hotel_email: { type: "string" },
        hotel_website: { type: "string" },
        maps_url: { type: "string" },
        breakfast_hours: { type: "string" },
        restaurants_included: { type: "string" },
        food_notes: { type: "string" },
        all_inclusive_rules: { type: "string" },
        breakfast_included: { type: "string" },
        wifi_included: { type: "string" },
        taxes_included: { type: "string" },
        resort_fee: { type: "string" },
        parking_included: { type: "string" },
        transfer_included: { type: "string" },
        other_inclusions: { type: "string" },
        cancellation_policy: { type: "string" },
        change_policy: { type: "string" },
        children_policy: { type: "string" },
        pet_policy: { type: "string" },
        mandatory_fees: { type: "string" },
        hotel_deposit: { type: "string" },
        hotel_deposit_method: { type: "string" },
        guests: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              age: { type: "string" },
              notes: { type: "string" },
            },
          },
        },
        special_requests: { type: "string" },
      },
    },
    suggested: {
      type: "object",
      description:
        "Sugestões baseadas em conhecimento público sobre o hotel identificado (site oficial, telefone, endereço). Apenas com alta confiança.",
      properties: {
        hotel_website: { type: "string" },
        hotel_phone: { type: "string" },
        address: { type: "string" },
        hotel_category: { type: "string" },
      },
    },
    confidence_notes: { type: "string" },
  },
  required: ["extracted"],
};

const SCHEMAS: Record<ImportType, unknown> = {
  flight: FLIGHT_SCHEMA,
  hotel: HOTEL_SCHEMA,
  car_rental: makeSchema([
    "rental_company","reservation_code","reservation_status","pickup_location","pickup_address","pickup_city","pickup_country","pickup_date","pickup_time","pickup_terminal","pickup_instructions","pickup_phone","dropoff_location","dropoff_address","dropoff_city","dropoff_country","dropoff_date","dropoff_time","dropoff_instructions","car_type","car_model","transmission","fuel_type","doors","passenger_capacity","luggage_capacity","plate","basic_insurance","full_insurance","deductible","deposit_amount","deposit_method","payment_method","fuel_policy","required_documents","minimum_age","notes",
  ], { drivers: ["name","document","age","notes"] }),
  transfer: makeSchema([
    "transfer_type","transfer_mode","transfer_status","city","date","time","origin_location","destination_location","company_name","reservation_code","flight_number","arrival_time","arrival_airport","arrival_terminal","hotel_departure_time","departure_flight_time","departure_airport","pickup_address","destination_address","driver_name","driver_phone","driver_language","vehicle_plate","vehicle_type","vehicle_capacity","adults_count","children_count","location","notes",
  ], { passengers: ["name","age","passenger_type","notes"] }),
  attraction: makeSchema([
    "name","attraction_type","city","country","date","status","entry_time","usage_window","duration","access_type","ticket_code","confirmation_code","order_number","address","venue_name","maps_url","entry_point","cancellation_policy","attraction_rules","required_documents","attraction_contact","agency_notes","notes",
  ], { passengers: ["name","ticket_type","document","notes"] }),
  insurance: makeSchema([
    "provider","plan_name","policy_number","destination_covered","coverage_type","start_date","end_date","status","medical_assistance","hospital_expenses","lost_baggage","trip_cancellation","dental_assistance","medical_repatriation","covid_coverage","coverage","emergency_phone","emergency_whatsapp","emergency_email","emergency_24h","insurer_website","how_to_activate","notes",
  ], { insured_persons: ["name","birth_date","document","notes"] }),
  cruise: makeSchema([
    "cruise_company","ship_name","route","embarkation_port","disembarkation_port","start_date","end_date","booking_number","cabin_type","cabin_number","cabin_category","deck","occupancy","meal_plan","checkin_url","boarding_terminal","port_address","recommended_arrival","required_documents","baggage_policy","dress_code",
  ], {
    passengers: ["name","document","notes"],
    itinerary: ["date","port","arrival_time","departure_time","stop_type"],
  }),
  train: makeSchema([
    "origin_city","origin_station","destination_city","destination_station","travel_date","departure_time","arrival_time","train_company","train_number","travel_class","coach","seat","platform","boarding_notes",
  ], { passengers: ["name","notes"] }),
  other: makeSchema([
    "service_name","other_service_type","custom_type_name","city","country","date","time","duration","status","location_name","address","maps_url","meeting_point","contact_name","contact_company","contact_phone","contact_whatsapp","contact_email","reservation_code","description","notes",
  ]),
};

function makeSchema(stringFields: string[], arrayFields: Record<string, string[]> = {}) {
  const props: Record<string, unknown> = {};
  for (const f of stringFields) props[f] = { type: "string" };
  for (const [k, sub] of Object.entries(arrayFields)) {
    const itemProps: Record<string, unknown> = {};
    for (const s of sub) itemProps[s] = { type: "string" };
    props[k] = { type: "array", items: { type: "object", properties: itemProps } };
  }
  return {
    type: "object",
    properties: {
      extracted: { type: "object", properties: props, description: "Dados encontrados explicitamente no documento/texto." },
      suggested: { type: "object", properties: {}, description: "Sugestões opcionais baseadas em conhecimento público; vazio em caso de dúvida." },
      confidence_notes: { type: "string" },
    },
    required: ["extracted"],
  };
}

const SYSTEM_PROMPTS: Record<ImportType, string> = {
  flight: `Você é um assistente especialista em ler vouchers, e-mails e confirmações de PASSAGENS AÉREAS.
REGRAS CRÍTICAS:
- Preencha APENAS campos com evidência clara no documento/texto fornecido.
- NUNCA invente nomes de passageiros, números de voo, códigos localizadores, horários ou datas.
- Se houver dúvida, deixe o campo vazio (string vazia).
- Datas SEMPRE no formato YYYY-MM-DD. Horários no formato HH:MM (24h).
- Códigos de aeroporto sempre em IATA (3 letras maiúsculas).
- Identifique TODOS os trechos do itinerário (ida, conexões e volta) na ordem cronológica.
- Para CADA trecho preencha TODOS estes campos quando visíveis no documento: flight_date, origin_airport, destination_airport, departure_time, arrival_time, flight_number e airline. Não retorne segmentos com esses campos vazios se a informação estiver na tabela/itinerário (mesmo que precise inferir o ano da data).
- Número do voo: concatene código IATA da cia + número, sem espaços, em maiúsculas (ex: LA8070, LH202, IB782, AF459).
- Companhia aérea do trecho (campo airline do segmento): use o nome comercial completo a partir do código (LA→LATAM, LH→Lufthansa, IB→Iberia, AF→Air France, AA→American Airlines, UA→United, BA→British Airways, KL→KLM, TP→TAP, AZ→ITA Airways, etc.). Em main_airline, se houver mais de uma cia, concatene separadas por " / " (ex: "LATAM / Lufthansa / Iberia").
- trip_type: "ida" se só uma direção; "ida_volta" se origem == destino final; "multi_trechos" se mais de 2 trechos sem retorno simples.
- Bagagem: detecte "0 pc"/"sem bagagem"/"no checked bag" → checked_baggage="Não inclui bagagem despachada"; "1 PC"/"23kg" → "Inclui bagagem despachada"; "carry on"/"bagagem de mão" → carry_on="Inclui bagagem de mão".
- Para "suggested": preencha SOMENTE se tiver conhecimento confiável (ex: URL oficial de check-in da companhia identificada). Caso contrário, deixe vazio.
- Em "confidence_notes" liste de forma curta o que ficou ambíguo ou não foi possível identificar.`,
  hotel: `Você é um assistente especialista em ler vouchers e confirmações de HOSPEDAGEM.
REGRAS CRÍTICAS:
- Preencha APENAS campos com evidência clara no documento/texto.
- NUNCA invente nome de hotel, código de reserva, datas ou políticas.
- Datas SEMPRE no formato YYYY-MM-DD. Horários HH:MM.
- Para "suggested": preencha apenas dados públicos confiáveis do hotel identificado (site oficial, telefone, endereço completo, categoria). Em caso de dúvida, deixe vazio.
- Em "confidence_notes" liste o que ficou incerto.`,
  car_rental: `Você é especialista em vouchers de LOCAÇÃO DE VEÍCULO. Preencha apenas com evidência clara. Datas YYYY-MM-DD, horários HH:MM. Nunca invente locadora, código, placa ou condutor.`,
  transfer: `Você é especialista em vouchers de TRANSFER (receptivo). Preencha apenas com evidência clara. Datas YYYY-MM-DD, horários HH:MM. Nunca invente motorista, placa, voo ou ponto de encontro.`,
  attraction: `Você é especialista em vouchers de INGRESSOS / ATRAÇÕES / PASSEIOS. Preencha apenas com evidência clara. Datas YYYY-MM-DD. Nunca invente código de ingresso, atração, data ou horário.`,
  insurance: `Você é especialista em apólices de SEGURO VIAGEM. Preencha apenas com evidência clara. Datas YYYY-MM-DD. Nunca invente número de apólice, seguradora, coberturas ou telefones.`,
  cruise: `Você é especialista em vouchers de CRUZEIRO. Preencha apenas com evidência clara. Datas YYYY-MM-DD, horários HH:MM. Nunca invente navio, cabine, código ou portos.`,
  train: `Você é especialista em bilhetes de TREM. Preencha apenas com evidência clara. Datas YYYY-MM-DD, horários HH:MM. Nunca invente código, vagão, assento ou estação.`,
  other: `Você é especialista em interpretar QUALQUER tipo de serviço turístico (restaurante, guia, chip, experiência, evento, spa, concierge, etc.). Preencha apenas com evidência clara. Datas YYYY-MM-DD, horários HH:MM. Nunca invente dados.`,
};

function errorResponse(error: string, status = 400) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  const traceId = crypto.randomUUID().slice(0, 8);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Rate limit
  const ip = getClientIP(req);
  const rateCheck = await checkRateLimit(ip, "ai-import-service", 10, 60);
  if (!rateCheck.allowed) return rateLimitResponse(corsHeaders, rateCheck.retryAfterMs);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return errorResponse("Não autorizado. Faça login para usar esta funcionalidade.", 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const token = authHeader.replace("Bearer ", "");

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData?.user) {
      return errorResponse("Token inválido ou expirado. Faça login novamente.", 401);
    }
    const userId = userData.user.id;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    // Feature access + quota
    const { data: hasAccess } = await supabase.rpc("has_feature_access", {
      _user_id: userId,
      _feature: "ai_tools",
    });
    if (!hasAccess) {
      return new Response(
        JSON.stringify({
          error: "Faça upgrade para o plano Profissional para usar a IA de importação.",
          upgrade_required: true,
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const { data: canUse } = await supabase.rpc("check_ai_usage", { _user_id: userId });
    if (!canUse) {
      return new Response(
        JSON.stringify({
          error: "Cota mensal de IA esgotada. Faça upgrade para o plano Premium.",
          quota_exceeded: true,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Parse body
    let body: any;
    try {
      body = await req.json();
    } catch {
      return errorResponse("Corpo da requisição inválido.");
    }

    const serviceType = body?.service_type;
    if (!ALLOWED_TYPES.includes(serviceType)) {
      return errorResponse("Tipo de serviço inválido.");
    }

    const fileBase64: string | undefined = body?.file_base64;
    const fileMime: string | undefined = body?.file_mime;
    const text: string | undefined = body?.text;

    if (!fileBase64 && !text) {
      return errorResponse("Envie um arquivo (PDF/imagem) ou texto para análise.");
    }

    if (fileBase64) {
      if (typeof fileBase64 !== "string" || fileBase64.length > MAX_FILE_BASE64) {
        return errorResponse("Arquivo muito grande. Máximo 10MB.");
      }
      if (!fileMime || !ALLOWED_MIME.includes(fileMime)) {
        return errorResponse("Formato de arquivo não suportado. Use PDF, PNG, JPG ou WEBP.");
      }
    }

    let cleanText = "";
    if (text) {
      if (typeof text !== "string" || text.length > MAX_TEXT_LEN) {
        return errorResponse("Texto muito longo. Máximo 30.000 caracteres.");
      }
      cleanText = sanitizeText(text);
      if (detectPromptInjection(cleanText)) {
        return errorResponse("Texto contém padrões não permitidos. Reescreva sem instruções para a IA.");
      }
    }

    // Build AI request
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error(`[${traceId}] LOVABLE_API_KEY missing`);
      return errorResponse("IA indisponível no momento. Tente novamente em instantes.", 500);
    }

    const systemPrompt = SYSTEM_PROMPTS[serviceType as ImportType];
    const schema = SCHEMAS[serviceType as ImportType];

    const userParts: Array<Record<string, unknown>> = [];
    if (fileBase64 && fileMime) {
      const base64Data = fileBase64.includes(",") ? fileBase64.split(",")[1] : fileBase64;
      userParts.push({
        type: "image_url",
        image_url: { url: `data:${fileMime};base64,${base64Data}` },
      });
    }
    if (cleanText) {
      userParts.push({
        type: "text",
        text: `Texto fornecido pelo usuário (voucher/confirmação):\n\n${cleanText}`,
      });
    }
    userParts.push({
      type: "text",
      text:
        'Analise o material acima e chame a função "import_service" preenchendo APENAS os campos com evidência clara. Em caso de dúvida, deixe vazio.',
    });

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: serviceType === "flight" ? "google/gemini-2.5-pro" : "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userParts },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "import_service",
              description: "Retorna os campos extraídos e sugeridos para o serviço.",
              parameters: schema,
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "import_service" } },
        temperature: 0.1,
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text().catch(() => "");
      console.error(`[${traceId}] AI gateway error ${aiResp.status}: ${errText.slice(0, 300)}`);
      if (aiResp.status === 429) {
        return errorResponse("Limite de requisições da IA. Tente novamente em alguns segundos.", 429);
      }
      if (aiResp.status === 402) {
        return errorResponse("Créditos de IA insuficientes. Adicione créditos à conta.", 402);
      }
      return errorResponse("Não foi possível processar com a IA. Tente novamente.", 500);
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    const argsRaw = toolCall?.function?.arguments;
    if (!argsRaw) {
      return errorResponse(
        "Não consegui identificar dados suficientes nesse documento. Tente outro arquivo ou preencha manualmente.",
        422,
      );
    }

    let parsed: any;
    try {
      parsed = typeof argsRaw === "string" ? JSON.parse(argsRaw) : argsRaw;
    } catch {
      return errorResponse("Resposta da IA inválida. Tente novamente.", 500);
    }

    const extracted = parsed?.extracted ?? {};
    const suggested = parsed?.suggested ?? {};
    const confidence_notes = typeof parsed?.confidence_notes === "string" ? parsed.confidence_notes : "";

    return new Response(
      JSON.stringify({ service_type: serviceType, extracted, suggested, confidence_notes }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error(`[${traceId}] ai-import-service error:`, e);
    return errorResponse("Não foi possível processar sua solicitação. Tente novamente.", 500);
  }
});