import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      console.error("Auth error:", userError?.message);
      return new Response(JSON.stringify({ error: "Token inválido ou expirado." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;

    const { data: hasAccess, error: accessError } = await supabase.rpc('has_feature_access', { _user_id: userId, _feature: 'ai_tools' });
    if (accessError) {
      console.error("has_feature_access error:", accessError.message);
    }
    if (!hasAccess) {
      return new Response(JSON.stringify({ error: "Faça upgrade para o plano Profissional para acessar ferramentas de IA.", upgrade_required: true }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: canUse, error: usageError } = await supabase.rpc('check_ai_usage', { _user_id: userId });
    if (usageError) {
      console.error("check_ai_usage error:", usageError.message);
    }
    if (!canUse) {
      return new Response(JSON.stringify({ error: "Cota mensal de IA esgotada.", quota_exceeded: true }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { destination, startDate, endDate, travelersCount, tripType, budgetLevel, interests, travelPace, additionalPreferences } = body;

    // Validation
    if (!destination || typeof destination !== 'string' || destination.length > 200) {
      return new Response(JSON.stringify({ error: "Destino inválido." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const travelers = Number(travelersCount);
    if (isNaN(travelers) || travelers < 1 || travelers > 50) {
      return new Response(JSON.stringify({ error: "Número de viajantes deve ser entre 1 e 50." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("AI key not configured");
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    if (days < 1 || days > 30) {
      return new Response(JSON.stringify({ error: "Duração da viagem deve ser entre 1 e 30 dias." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build interest string
    const interestsList = (interests || [])
      .map((i: string) => interestLabels[i] || i)
      .filter(Boolean);
    const interestsText = interestsList.length > 0
      ? `\n- Interesses prioritários: ${interestsList.join(", ")}`
      : "";

    // Build pace string
    const paceText = travelPace ? `\n- Ritmo da viagem: ${paceLabels[travelPace] || travelPace}` : "";

    // Build additional preferences
    const prefs = additionalPreferences || {};
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
      ? "\n\nPREFERÊNCIAS ADICIONAIS:\n" + additionalLines.join("\n")
      : "";

    // Build profile-specific rules
    const profileRules = buildProfileRules(tripType);

    // Build dates array for the tool schema description
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

    console.log("Calling AI gateway for destination:", destination, "days:", days);

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
      const errBody = await response.text();
      console.error("AI gateway error:", response.status, errBody);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA insuficientes. Entre em contato com o suporte." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Erro ao gerar roteiro. Tente novamente." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    console.log("AI response received, choices:", data.choices?.length);

    // Extract from tool call response
    let itinerary;
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      // Tool calling response (preferred path)
      try {
        const args = typeof toolCall.function.arguments === 'string' 
          ? JSON.parse(toolCall.function.arguments) 
          : toolCall.function.arguments;
        itinerary = args;
        console.log("Parsed tool call response, days:", itinerary?.days?.length);
      } catch (e) {
        console.error("Failed to parse tool call arguments:", e, toolCall.function.arguments?.substring?.(0, 200));
        throw new Error("Parse error from tool call");
      }
    } else {
      // Fallback: try content as JSON
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        console.error("Empty AI response, no tool_calls and no content:", JSON.stringify(data).substring(0, 500));
        throw new Error("Empty AI response");
      }
      
      try {
        itinerary = JSON.parse(content.trim());
      } catch {
        try {
          const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
          const jsonString = jsonMatch ? jsonMatch[1] : content;
          itinerary = JSON.parse(jsonString.trim());
        } catch {
          console.error("Failed to parse AI content response:", content.substring(0, 500));
          throw new Error("Parse error");
        }
      }
    }

    // Validate structure
    if (!itinerary?.days || !Array.isArray(itinerary.days) || itinerary.days.length === 0) {
      console.error("Invalid itinerary structure:", JSON.stringify(itinerary).substring(0, 500));
      throw new Error("Invalid itinerary structure");
    }

    console.log("Successfully generated itinerary with", itinerary.days.length, "days");

    return new Response(JSON.stringify(itinerary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-itinerary error:", e);
    return new Response(JSON.stringify({ error: "Erro ao gerar roteiro. Tente novamente em alguns instantes." }), {
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
- Inclua locais onde é fácil socializar (cafés, food tours em grupo, walking tours)
- Considere segurança e praticidade para viajante solo
- Inclua dicas de locais com Wi-Fi para trabalho remoto se aplicável`,
  };
  return rules[tripType] || "";
}
