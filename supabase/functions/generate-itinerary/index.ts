import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { destination, startDate, endDate, travelersCount, tripType, budgetLevel } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
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
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos na sua conta." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Erro ao gerar roteiro com IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse the JSON from the response
    let itinerary;
    try {
      // Try to extract JSON from the response (it might be wrapped in markdown code blocks)
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      itinerary = JSON.parse(jsonString.trim());
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse itinerary from AI response");
    }

    return new Response(JSON.stringify(itinerary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-itinerary error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
