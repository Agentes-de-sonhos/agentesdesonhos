import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado. Faça login para usar esta funcionalidade." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Token inválido ou expirado. Faça login novamente." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    console.log("Authenticated user:", userId);

    // Check subscription feature access
    const { data: hasAccess } = await supabase.rpc('has_feature_access', { _user_id: userId, _feature: 'ai_tools' });
    if (!hasAccess) {
      return new Response(JSON.stringify({ error: "Faça upgrade para o plano Profissional para acessar ferramentas de IA.", upgrade_required: true }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check and increment AI usage quota
    const { data: canUse } = await supabase.rpc('check_ai_usage', { _user_id: userId });
    if (!canUse) {
      return new Response(JSON.stringify({ error: "Cota mensal de IA esgotada. Faça upgrade para o plano Premium.", quota_exceeded: true }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { destination, startDate, endDate, travelersCount, tripType, budgetLevel } = await req.json();

    // Input validation
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
      throw new Error("AI key not configured");
    }

    const tripTypeLabels: Record<string, string> = {
      familia: "viagem em família",
      casal: "viagem de casal",
      lua_de_mel: "lua de mel",
      sozinho: "viagem solo",
      corporativo: "viagem corporativa"
    };

    const budgetLabels: Record<string, string> = {
      economico: "econômico (hotéis 3 estrelas, restaurantes acessíveis)",
      conforto: "conforto (hotéis 4 estrelas, restaurantes de qualidade)",
      luxo: "luxo (hotéis 5 estrelas, experiências premium)"
    };

    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    if (days < 1 || days > 30) {
      return new Response(JSON.stringify({ error: "Duração da viagem deve ser entre 1 e 30 dias." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Você é um especialista em turismo e roteiros de viagem. Crie roteiros detalhados, práticos e personalizados para agentes de viagem.

REGRAS:
- Responda APENAS com JSON válido, sem texto adicional
- Cada dia deve ter exatamente 3 atividades: manhã, tarde e noite
- Adapte as sugestões ao perfil do viajante e orçamento
- Inclua estimativas realistas de duração e custo
- Sugira locais específicos e conhecidos do destino
- Considere logística e deslocamento entre atividades`;

    const userPrompt = `Crie um roteiro completo para:
- Destino: ${destination}
- Período: ${days} dias (${startDate} a ${endDate})
- Viajantes: ${travelersCount} pessoa(s)
- Tipo de viagem: ${tripTypeLabels[tripType] || tripType}
- Nível de orçamento: ${budgetLabels[budgetLevel] || budgetLevel}

Retorne um JSON com a seguinte estrutura:
{
  "days": [
    {
      "dayNumber": 1,
      "date": "2024-01-15",
      "activities": [
        {
          "period": "manha",
          "title": "Título da atividade",
          "description": "Descrição detalhada da atividade",
          "location": "Nome do local",
          "estimatedDuration": "2 horas",
          "estimatedCost": "R$ 50 por pessoa"
        },
        {
          "period": "tarde",
          "title": "...",
          "description": "...",
          "location": "...",
          "estimatedDuration": "...",
          "estimatedCost": "..."
        },
        {
          "period": "noite",
          "title": "...",
          "description": "...",
          "location": "...",
          "estimatedDuration": "...",
          "estimatedCost": "..."
        }
      ]
    }
  ]
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos na sua conta." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI gateway error:", response.status);
      return new Response(JSON.stringify({ error: "Erro ao gerar roteiro. Tente novamente." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Empty AI response");
    }

    let itinerary;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      itinerary = JSON.parse(jsonString.trim());
    } catch {
      console.error("Failed to parse AI response");
      throw new Error("Parse error");
    }

    return new Response(JSON.stringify(itinerary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-itinerary error:", e);
    return new Response(JSON.stringify({ error: "Erro ao gerar roteiro. Tente novamente em alguns instantes." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
