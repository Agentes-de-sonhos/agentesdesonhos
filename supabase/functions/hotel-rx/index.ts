import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { hotel_name, city, country, place_id: inputPlaceId, force_update } = await req.json();

    if (!inputPlaceId && (!hotel_name || !city)) {
      return new Response(
        JSON.stringify({ error: "place_id ou hotel_name + city são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const finalCountry = country || "Brasil";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check cache by place_id first (30-day window), then by cache_key
    if (!force_update) {
      let cached = null;

      if (inputPlaceId) {
        const { data } = await supabase
          .from("hotel_rx_cache")
          .select("result, created_at, updated_at")
          .eq("place_id", inputPlaceId)
          .order("updated_at", { ascending: false, nullsFirst: false })
          .limit(1)
          .single();
        cached = data;
      }

      if (!cached && hotel_name && city) {
        const cacheKey = `${hotel_name.toLowerCase().trim()}|${city.toLowerCase().trim()}|${finalCountry.toLowerCase().trim()}`;
        const { data } = await supabase
          .from("hotel_rx_cache")
          .select("result, created_at, updated_at")
          .eq("cache_key", cacheKey)
          .order("updated_at", { ascending: false, nullsFirst: false })
          .limit(1)
          .single();
        cached = data;
      }

      if (cached) {
        const analysisDate = cached.updated_at || cached.created_at;
        const daysSince = (Date.now() - new Date(analysisDate).getTime()) / (1000 * 60 * 60 * 24);
        const isRecent = daysSince < 30;

        return new Response(JSON.stringify({
          ...cached.result,
          _cache: {
            from_cache: true,
            analysis_date: analysisDate,
            is_recent: isRecent,
            days_since: Math.floor(daysSince),
            can_update: !isRecent,
          },
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Step 1: Find Place
    const GOOGLE_PLACES_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");
    if (!GOOGLE_PLACES_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GOOGLE_PLACES_API_KEY não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let placeId = inputPlaceId;

    if (!placeId) {
      const searchQuery = `${hotel_name} ${city} ${finalCountry}`;
      const findUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(searchQuery)}&inputtype=textquery&fields=place_id,name&key=${GOOGLE_PLACES_API_KEY}`;
      const findResp = await fetch(findUrl);
      const findData = await findResp.json();

      if (!findData.candidates || findData.candidates.length === 0) {
        return new Response(
          JSON.stringify({ error: "Hotel não encontrado no Google Places. Verifique o nome e a cidade." }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      placeId = findData.candidates[0].place_id;
    }

    // Step 2: Get Place Details
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,rating,user_ratings_total,reviews,formatted_address&key=${GOOGLE_PLACES_API_KEY}&language=pt-BR`;
    const detailsResp = await fetch(detailsUrl);
    const detailsData = await detailsResp.json();

    if (detailsData.status !== "OK" || !detailsData.result) {
      return new Response(
        JSON.stringify({ error: "Não foi possível obter detalhes do hotel." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const place = detailsData.result;
    const rating = place.rating || 0;
    const totalReviews = place.user_ratings_total || 0;
    const reviews = (place.reviews || []).slice(0, 10);

    const reviewsText = reviews
      .map((r: any, i: number) => `Review ${i + 1} (nota ${r.rating}/5): ${r.text || "Sem comentário"}`)
      .join("\n");

    // Step 3: AI Analysis
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prompt = `Analise os dados de um hotel e gere uma análise estratégica para um agente de viagens.

Considere:
- Nota média
- Volume de avaliações
- Comentários disponíveis

Gere:
- Score geral do hotel (0 a 10)
- Resumo estratégico (máx 3 linhas)
- Avaliação por critérios (nota de 0 a 10 + breve comentário para cada):
  - Atendimento
  - Limpeza
  - Localização
  - Conforto
  - Custo-benefício
- Principais pontos positivos (lista de strings)
- Principais pontos negativos (lista de strings)
- Perfil ideal de público (string descritiva)
- Alertas importantes (lista de strings, pode ser vazia)
- Nível de confiança da análise (baixo, médio ou alto)

Seja objetivo, confiável e útil para tomada de decisão.

Dados:
- Hotel: ${place.name}
- Endereço: ${place.formatted_address || "Não disponível"}
- Nota: ${rating}
- Total de avaliações: ${totalReviews}
- Comentários:
${reviewsText || "Nenhum comentário disponível"}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Você é um analista especializado em hotelaria. Responda usando a função fornecida." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "hotel_analysis",
              description: "Retorna a análise estruturada do hotel",
              parameters: {
                type: "object",
                properties: {
                  score: { type: "number", description: "Score geral de 0 a 10" },
                  summary: { type: "string", description: "Resumo estratégico em até 3 linhas" },
                  criteria: {
                    type: "object",
                    properties: {
                      service: { type: "object", properties: { score: { type: "number" }, comment: { type: "string" } }, required: ["score", "comment"] },
                      cleanliness: { type: "object", properties: { score: { type: "number" }, comment: { type: "string" } }, required: ["score", "comment"] },
                      location: { type: "object", properties: { score: { type: "number" }, comment: { type: "string" } }, required: ["score", "comment"] },
                      comfort: { type: "object", properties: { score: { type: "number" }, comment: { type: "string" } }, required: ["score", "comment"] },
                      value: { type: "object", properties: { score: { type: "number" }, comment: { type: "string" } }, required: ["score", "comment"] },
                    },
                    required: ["service", "cleanliness", "location", "comfort", "value"],
                  },
                  positives: { type: "array", items: { type: "string" } },
                  negatives: { type: "array", items: { type: "string" } },
                  ideal_for: { type: "string" },
                  alerts: { type: "array", items: { type: "string" } },
                  confidence: { type: "string", enum: ["baixo", "médio", "alto"] },
                },
                required: ["score", "summary", "criteria", "positives", "negatives", "ideal_for", "alerts", "confidence"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "hotel_analysis" } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResp.text();
      console.error("AI error:", aiResp.status, errText);
      return new Response(JSON.stringify({ error: "Erro na análise de IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResp.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      return new Response(JSON.stringify({ error: "Resposta da IA sem dados estruturados" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let analysis;
    try {
      analysis = JSON.parse(toolCall.function.arguments);
    } catch {
      return new Response(JSON.stringify({ error: "Erro ao processar resposta da IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = {
      hotel_name: place.name,
      address: place.formatted_address || "",
      rating,
      total_reviews: totalReviews,
      ...analysis,
    };

    const now = new Date().toISOString();
    const cacheKey = inputPlaceId
      ? `pid:${inputPlaceId}`
      : `${hotel_name.toLowerCase().trim()}|${city.toLowerCase().trim()}|${finalCountry.toLowerCase().trim()}`;

    // Upsert: if force_update and place_id exists, update existing row
    if (force_update && placeId) {
      const { data: existing } = await supabase
        .from("hotel_rx_cache")
        .select("id")
        .eq("place_id", placeId)
        .limit(1)
        .single();

      if (existing) {
        await supabase.from("hotel_rx_cache").update({
          result,
          hotel_name: place.name,
          city,
          country: finalCountry,
          updated_at: now,
        }).eq("id", existing.id);
      } else {
        await supabase.from("hotel_rx_cache").insert({
          cache_key: cacheKey,
          place_id: placeId,
          hotel_name: place.name,
          city,
          country: finalCountry,
          result,
          updated_at: now,
        });
      }
    } else {
      await supabase.from("hotel_rx_cache").insert({
        cache_key: cacheKey,
        place_id: placeId,
        hotel_name: place.name,
        city,
        country: finalCountry,
        result,
        updated_at: now,
      });
    }

    return new Response(JSON.stringify({
      ...result,
      _cache: {
        from_cache: false,
        analysis_date: now,
        is_recent: true,
        days_since: 0,
        can_update: false,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("hotel-rx error:", e);
    return new Response(
      JSON.stringify({ error: "Erro ao processar cotação de hotel." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
