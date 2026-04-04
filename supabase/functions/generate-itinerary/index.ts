import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getClientIP, rateLimitResponse } from "../_shared/rate-limiter.ts";
import {
  validateString,
  validateEnum,
  validateNumber,
  validateStringArray,
  sanitizeText,
  detectPromptInjection,
  whitelistKeys,
  validationError,
} from "../_shared/input-validator.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_TRIP_TYPES = ["casal", "familia", "familia_crianca_pequena", "familia_adolescentes", "grupo_amigos", "solo", "lua_de_mel", "melhor_idade", "corporativo"];
const ALLOWED_BUDGET_LEVELS = ["economico", "conforto", "luxo"];
const ALLOWED_INTERESTS = ["gastronomia", "vinhos", "cultura_historia", "religioso", "aventura", "natureza", "praia", "neve_esqui", "luxo", "compras", "vida_noturna", "parques_tematicos", "bem_estar_spa", "instagramaveis"];
const ALLOWED_PACES = ["leve", "moderado", "intenso"];
const ALLOWED_BODY_KEYS = ["destination", "startDate", "endDate", "travelersCount", "tripType", "budgetLevel", "interests", "travelPace", "additionalPreferences"];
const ALLOWED_PREF_KEYS = ["dietaryRestrictions", "localOrTouristy", "exclusiveOrPopular", "mobilityLimitations", "serviceContext"];

const tripTypeLabels: Record<string, string> = {
  casal: "viagem de casal",
  familia: "viagem em família",
  familia_crianca_pequena: "viagem em família com crianças pequenas (até 5 anos)",
  familia_adolescentes: "viagem em família com adolescentes",
  grupo_amigos: "viagem em grupo de amigos",
  solo: "viagem solo",
  lua_de_mel: "lua de mel",
  melhor_idade: "viagem para melhor idade (60+)",
  corporativo: "viagem corporativa",
};

const budgetLabels: Record<string, string> = {
  economico: "econômico (hotéis 3 estrelas, restaurantes acessíveis)",
  conforto: "conforto (hotéis 4 estrelas, restaurantes de qualidade)",
  luxo: "luxo (hotéis 5 estrelas, experiências premium)",
};

const interestLabels: Record<string, string> = {
  gastronomia: "gastronomia e culinária local",
  vinhos: "vinhos e vinícolas",
  cultura_historia: "cultura, história e museus",
  religioso: "turismo religioso e espiritual",
  aventura: "aventura e esportes radicais",
  natureza: "natureza e ecoturismo",
  praia: "praia e relaxamento",
  neve_esqui: "neve e esqui",
  luxo: "experiências de luxo e premium",
  compras: "compras e shopping",
  vida_noturna: "vida noturna, bares e baladas",
  parques_tematicos: "parques temáticos e diversão",
  bem_estar_spa: "bem-estar, spa e relaxamento",
  instagramaveis: "lugares instagramáveis e fotogênicos",
};

const paceLabels: Record<string, string> = {
  leve: "leve (poucas atividades por dia, bastante tempo livre para descansar)",
  moderado: "moderado (equilíbrio entre passeios e descanso)",
  intenso: "intenso (aproveitar ao máximo cada momento do dia)",
};

serve(async (req) => {
  const traceId = crypto.randomUUID().slice(0, 8);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIP = getClientIP(req);
  const rateCheck = await checkRateLimit(clientIP, 'generate-itinerary', 10, 60);
  if (!rateCheck.allowed) {
    return rateLimitResponse(corsHeaders, rateCheck.retryAfterMs);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Token inválido ou expirado." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;

    const { data: hasAccess, error: accessError } = await supabase.rpc("has_feature_access", {
      _user_id: userId, _feature: "itinerary",
    });
    if (accessError) {
      console.error("has_feature_access error:", accessError.message);
      return new Response(JSON.stringify({ error: "Erro ao validar acesso ao recurso." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!hasAccess) {
      return new Response(JSON.stringify({ error: "Seu plano atual não inclui a criação de roteiros.", upgrade_required: true }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: canUse } = await supabase.rpc("check_ai_usage", { _user_id: userId });
    if (!canUse) {
      return new Response(JSON.stringify({ error: "Cota mensal de IA esgotada.", quota_exceeded: true }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- INPUT VALIDATION ---
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return validationError("Corpo da requisição inválido.", corsHeaders);
    }

    if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
      return validationError("Corpo da requisição inválido.", corsHeaders);
    }

    // Whitelist fields
    const body = whitelistKeys<Record<string, unknown>>(rawBody, ALLOWED_BODY_KEYS);

    // Validate destination (1-200 chars, injection check)
    const destCheck = validateString(body.destination, "Destino", 1, 200);
    if (!destCheck.valid) return validationError(destCheck.error, corsHeaders);
    const destination = destCheck.value;

    // Validate dates
    if (typeof body.startDate !== "string" || typeof body.endDate !== "string") {
      return validationError("Datas de início e fim são obrigatórias.", corsHeaders);
    }
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(body.startDate as string) || !dateRegex.test(body.endDate as string)) {
      return validationError("Formato de data inválido. Use AAAA-MM-DD.", corsHeaders);
    }
    const startDate = body.startDate as string;
    const endDate = body.endDate as string;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return validationError("Datas inválidas.", corsHeaders);
    }
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (days < 1 || days > 30) {
      return validationError("Duração da viagem deve ser entre 1 e 30 dias.", corsHeaders);
    }

    // Validate travelersCount
    const tcCheck = validateNumber(body.travelersCount, "Número de viajantes", 1, 50);
    if (!tcCheck.valid) return validationError(tcCheck.error, corsHeaders);
    const travelersCount = tcCheck.value;

    // Validate tripType
    const ttCheck = validateEnum(body.tripType, "Tipo de viagem", ALLOWED_TRIP_TYPES);
    if (!ttCheck.valid) return validationError(ttCheck.error, corsHeaders);
    const tripType = ttCheck.value;

    // Validate budgetLevel
    const blCheck = validateEnum(body.budgetLevel, "Nível de orçamento", ALLOWED_BUDGET_LEVELS);
    if (!blCheck.valid) return validationError(blCheck.error, corsHeaders);
    const budgetLevel = blCheck.value;

    // Validate interests (optional array)
    let interests: string[] = [];
    if (body.interests !== undefined) {
      const intCheck = validateStringArray(body.interests, "Interesses", ALLOWED_INTERESTS, 14);
      if (!intCheck.valid) return validationError(intCheck.error, corsHeaders);
      interests = intCheck.value;
    }

    // Validate travelPace (optional)
    let travelPace: string | undefined;
    if (body.travelPace !== undefined) {
      const paceCheck = validateEnum(body.travelPace, "Ritmo de viagem", ALLOWED_PACES);
      if (!paceCheck.valid) return validationError(paceCheck.error, corsHeaders);
      travelPace = paceCheck.value;
    }

    // Validate additionalPreferences (optional, whitelist + sanitize)
    const rawPrefs = whitelistKeys<Record<string, unknown>>(body.additionalPreferences, ALLOWED_PREF_KEYS);
    const prefs: Record<string, string | undefined> = {};
    if (rawPrefs.dietaryRestrictions) {
      const drCheck = validateString(rawPrefs.dietaryRestrictions, "Restrições alimentares", 0, 300);
      if (!drCheck.valid) return validationError(drCheck.error, corsHeaders);
      prefs.dietaryRestrictions = drCheck.value;
    }
    if (rawPrefs.localOrTouristy) {
      const ltCheck = validateEnum(rawPrefs.localOrTouristy, "Preferência local/turístico", ["local", "touristy", "mix"]);
      if (!ltCheck.valid) return validationError(ltCheck.error, corsHeaders);
      prefs.localOrTouristy = ltCheck.value;
    }
    if (rawPrefs.exclusiveOrPopular) {
      const epCheck = validateEnum(rawPrefs.exclusiveOrPopular, "Preferência exclusivo/popular", ["exclusive", "popular", "mix"]);
      if (!epCheck.valid) return validationError(epCheck.error, corsHeaders);
      prefs.exclusiveOrPopular = epCheck.value;
    }
    if (rawPrefs.mobilityLimitations) {
      const mlCheck = validateString(rawPrefs.mobilityLimitations, "Limitações de mobilidade", 0, 500);
      if (!mlCheck.valid) return validationError(mlCheck.error, corsHeaders);
      prefs.mobilityLimitations = mlCheck.value;
    }
    if (rawPrefs.serviceContext) {
      const scCheck = validateString(rawPrefs.serviceContext, "Contexto de serviços", 0, 5000);
      if (!scCheck.valid) return validationError(scCheck.error, corsHeaders);
      prefs.serviceContext = scCheck.value;
    }

    // --- BUILD AI REQUEST ---
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Erro de configuração do servidor." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build interest string
    const interestsList = interests.map((i) => interestLabels[i] || i).filter(Boolean);
    const interestsText = interestsList.length > 0
      ? `\n- Interesses prioritários: ${interestsList.join(", ")}` : "";

    const paceText = travelPace ? `\n- Ritmo da viagem: ${paceLabels[travelPace] || travelPace}` : "";

    const additionalLines: string[] = [];
    if (prefs.dietaryRestrictions) {
      additionalLines.push(`- Restrições alimentares: ${prefs.dietaryRestrictions}. Sugira restaurantes adequados.`);
    }
    if (prefs.localOrTouristy === "local") {
      additionalLines.push("- Priorizar experiências locais e autênticas, fora dos circuitos turísticos tradicionais.");
    } else if (prefs.localOrTouristy === "touristy") {
      additionalLines.push("- Priorizar pontos turísticos clássicos e mais conhecidos.");
    }
    if (prefs.exclusiveOrPopular === "exclusive") {
      additionalLines.push("- Priorizar locais exclusivos, reservados e menos lotados.");
    } else if (prefs.exclusiveOrPopular === "popular") {
      additionalLines.push("- Incluir locais populares e movimentados com grande apelo.");
    }
    if (prefs.mobilityLimitations) {
      additionalLines.push(`- IMPORTANTE — Limitações de mobilidade: ${prefs.mobilityLimitations}. Evite atividades incompatíveis e garanta acessibilidade.`);
    }
    const additionalText = additionalLines.length > 0
      ? "\n\nPREFERÊNCIAS ADICIONAIS:\n" + additionalLines.join("\n") : "";

    const profileRules = buildProfileRules(tripType);

    const datesInfo: string[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      datesInfo.push(`Dia ${i + 1}: ${d.toISOString().split('T')[0]}`);
    }

    const systemPrompt = `Você é um especialista em turismo e roteiros de viagem, contratado para auxiliar agentes de viagem a criar roteiros altamente personalizados para seus clientes.

REGRAS FUNDAMENTAIS:
- Cada dia deve ter exatamente 3 atividades: manhã, tarde e noite
- PRIORIZE os interesses selecionados pelo agente na distribuição das atividades
- Adapte RIGOROSAMENTE ao perfil do viajante — nunca sugira atividades incompatíveis
- Ajuste o número e a intensidade das atividades conforme o ritmo escolhido
- Inclua estimativas realistas de duração e custo
- Sugira locais específicos, conhecidos e de qualidade no destino
- Considere logística e deslocamento entre atividades
- Para ritmo "leve", sugira atividades mais curtas e com intervalos entre elas
- Para ritmo "intenso", maximize o aproveitamento de cada período do dia
- Estas são SUGESTÕES para o agente validar e ajustar — seja criativo mas realista

${profileRules}`;

    const userPrompt = `Crie um roteiro completo para:
- Destino: ${destination}
- Período: ${days} dias (${startDate} a ${endDate})
- Viajantes: ${travelersCount} pessoa(s)
- Tipo de viagem: ${tripTypeLabels[tripType] || tripType}
- Nível de orçamento: ${budgetLabels[budgetLevel] || budgetLevel}${interestsText}${paceText}${additionalText}

Datas dos dias: ${datesInfo.join(', ')}

Use a função generate_itinerary para retornar o roteiro completo.`;

    console.log(`[${traceId}] Calling AI for destination:`, destination, "days:", days, "user:", userId);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_itinerary",
              description: "Gera um roteiro de viagem completo com atividades para cada dia.",
              parameters: {
                type: "object",
                properties: {
                  days: {
                    type: "array",
                    description: "Lista de dias do roteiro",
                    items: {
                      type: "object",
                      properties: {
                        dayNumber: { type: "number", description: "Número do dia (1, 2, 3...)" },
                        date: { type: "string", description: "Data no formato YYYY-MM-DD" },
                        activities: {
                          type: "array",
                          description: "Exatamente 3 atividades: manhã, tarde e noite",
                          items: {
                            type: "object",
                            properties: {
                              period: { type: "string", enum: ["manha", "tarde", "noite"], description: "Período do dia" },
                              title: { type: "string", description: "Título da atividade" },
                              description: { type: "string", description: "Descrição detalhada e personalizada" },
                              location: { type: "string", description: "Nome do local específico" },
                              estimatedDuration: { type: "string", description: "Duração estimada (ex: 2 horas)" },
                              estimatedCost: { type: "string", description: "Custo estimado (ex: R$ 50 por pessoa)" },
                            },
                            required: ["period", "title", "description", "location", "estimatedDuration", "estimatedCost"],
                            additionalProperties: false,
                          },
                        },
                      },
                      required: ["dayNumber", "date", "activities"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["days"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_itinerary" } },
      }),
    });

    if (!response.ok) {
      const errStatus = response.status;
      console.error("AI gateway error:", errStatus);
      if (errStatus === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (errStatus === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA insuficientes. Entre em contato com o suporte." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Erro ao gerar roteiro. Tente novamente." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const responseText = await response.text();
    if (!responseText || responseText.trim().length === 0) {
      console.error("AI gateway returned empty response");
      return new Response(JSON.stringify({ error: "Erro ao gerar roteiro. Tente novamente." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error("Failed to parse AI response");
      return new Response(JSON.stringify({ error: "Erro ao gerar roteiro. Tente novamente." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let itinerary;
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (toolCall?.function?.arguments) {
      try {
        const args = typeof toolCall.function.arguments === 'string'
          ? JSON.parse(toolCall.function.arguments)
          : toolCall.function.arguments;
        itinerary = args;
      } catch {
        console.error("Failed to parse tool call arguments");
        return new Response(JSON.stringify({ error: "Erro ao processar roteiro. Tente novamente." }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        console.error("Empty AI response content");
        return new Response(JSON.stringify({ error: "Erro ao gerar roteiro. Tente novamente." }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      try {
        itinerary = JSON.parse(content.trim());
      } catch {
        try {
          const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
          const jsonString = jsonMatch ? jsonMatch[1] : content;
          itinerary = JSON.parse(jsonString.trim());
        } catch {
          console.error("Failed to parse AI content");
          return new Response(JSON.stringify({ error: "Erro ao processar roteiro. Tente novamente." }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    if (!itinerary?.days || !Array.isArray(itinerary.days) || itinerary.days.length === 0) {
      console.error("Invalid itinerary structure");
      return new Response(JSON.stringify({ error: "Erro ao gerar roteiro. Tente novamente." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Successfully generated itinerary with", itinerary.days.length, "days");

    return new Response(JSON.stringify(itinerary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(`[${traceId}] generate-itinerary error:`, e);
    return new Response(JSON.stringify({ success: false, error: "Não foi possível processar sua solicitação. Tente novamente.", code: "GENERIC_ERROR" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function buildProfileRules(tripType: string): string {
  const rules: Record<string, string> = {
    familia_crianca_pequena: `REGRAS PARA FAMÍLIA COM CRIANÇAS PEQUENAS:
- Evite atividades de longa duração ou que exijam muito esforço físico
- Priorize locais com infraestrutura para crianças (trocador, cadeirão, etc.)
- Inclua parques, aquários, zoológicos ou atividades interativas
- Sugira restaurantes family-friendly
- Considere horários de soneca e alimentação`,
    familia_adolescentes: `REGRAS PARA FAMÍLIA COM ADOLESCENTES:
- Inclua atividades dinâmicas e interativas que engajam adolescentes
- Considere experiências tecnológicas, parques radicais ou esportes
- Equilibre atividades culturais com diversão
- Sugira locais "instagramáveis" que agradem teens`,
    melhor_idade: `REGRAS PARA MELHOR IDADE (60+):
- Evite atividades que exijam grande esforço físico ou longas caminhadas
- Priorize conforto, acessibilidade e ritmo tranquilo
- Sugira restaurantes com boa estrutura e conforto
- Considere passeios panorâmicos e experiências culturais
- Evite atividades radicais ou aventureiras`,
    lua_de_mel: `REGRAS PARA LUA DE MEL:
- Priorize experiências românticas e exclusivas
- Sugira restaurantes sofisticados com ambiente intimista
- Inclua spas, passeios de barco, pôr-do-sol em mirantes
- Evite atividades em grupo ou locais muito lotados
- Considere jantares privativos e experiências surpresa`,
    corporativo: `REGRAS PARA VIAGEM CORPORATIVA:
- Considere horários de reuniões e compromissos profissionais
- Sugira restaurantes adequados para jantares de negócios
- Inclua opções de entretenimento para networking
- Priorize locais de fácil acesso e com boa infraestrutura`,
    solo: `REGRAS PARA VIAGEM SOLO:
- Sugira atividades que funcionem bem para uma pessoa
- Inclua locais sociais onde seja fácil conhecer outros viajantes
- Considere segurança e praticidade
- Priorize experiências imersivas e autênticas`,
  };

  return rules[tripType] || "";
}
