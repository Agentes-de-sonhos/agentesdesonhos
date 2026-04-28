import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { destination } = await req.json();
    if (!destination || typeof destination !== "string" || destination.trim().length < 2) {
      return new Response(JSON.stringify({ error: "Destino inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Support multi-destination strings like "Paris, Roma, Florença".
    const cities = destination
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean);
    const isMulti = cities.length > 1;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: isMulti
              ? `Você é um copywriter especializado em viagens. Gere uma descrição curta e atrativa sobre um roteiro combinado de várias cidades.

Regras:
- Máximo de 5 linhas (um único parágrafo)
- Linguagem simples, leve e envolvente
- NÃO parecer texto de guia turístico ou Wikipedia
- NÃO usar termos técnicos
- Mencionar todas as cidades de forma fluida, destacando a complementaridade entre elas (sem listar uma por uma de forma robótica)
- Criar conexão emocional leve, sem exageros
- Escrever em português do Brasil
- Retornar APENAS o parágrafo, sem título ou formatação`
              : `Você é um copywriter especializado em viagens. Gere uma descrição curta e atrativa sobre um destino de viagem.

Regras:
- Máximo de 4 linhas (um único parágrafo curto)
- Linguagem simples, leve e envolvente
- NÃO parecer texto de guia turístico ou Wikipedia
- NÃO usar termos técnicos
- Misturar: o que é o destino, principal atrativo, perfil de viagem e sensação/experiência
- Criar conexão emocional leve, sem exageros
- Escrever em português do Brasil
- Retornar APENAS o parágrafo, sem título ou formatação`,
          },
          {
            role: "user",
            content: isMulti
              ? `Gere uma descrição curta e envolvente sobre um roteiro combinado entre as cidades: ${cities.join(", ")}.`
              : `Gere uma descrição curta e envolvente sobre: ${destination.trim()}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro ao gerar texto" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content?.trim() || "";

    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-destination-intro error:", e);
    return new Response(JSON.stringify({ error: "Erro ao gerar introdução. Tente novamente." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
