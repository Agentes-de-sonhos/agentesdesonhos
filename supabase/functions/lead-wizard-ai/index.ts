import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkRateLimit, getClientIP, rateLimitResponse } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Rate limiting: 30 requests per minute for lead wizard
  const clientIP = getClientIP(req);
  const rateCheck = await checkRateLimit(clientIP, 'lead-wizard-ai', 30, 60);
  if (!rateCheck.allowed) {
    return rateLimitResponse(corsHeaders, rateCheck.retryAfterMs);
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { type, data, agentName, agentPhone } = await req.json();

    let systemPrompt = "";
    let userPrompt = "";

    if (type === "empathy") {
      // Generate empathetic micro-response between wizard steps
      systemPrompt = `Você é um assistente de viagens simpático e empático. Responda em português brasileiro com UMA frase curta (máximo 15 palavras) e animada como reação à resposta do cliente. Use emojis de forma moderada. Seja natural e conversacional.`;
      userPrompt = `O cliente respondeu a seguinte pergunta "${data.question}": "${data.answer}". Gere uma micro-resposta empática antes da próxima pergunta.`;
    } else if (type === "suggestion") {
      // Generate travel suggestion + personalized WhatsApp message
      systemPrompt = `Você é um consultor de viagens especialista. Com base nas preferências do cliente, gere:
1. Uma sugestão breve de viagem personalizada (2-3 frases)
2. Uma mensagem pronta para WhatsApp que o cliente enviará ao agente

A mensagem de WhatsApp deve incluir:
- Saudação mencionando o nome do agente
- Resumo do interesse do cliente
- Dados coletados de forma organizada

Responda em JSON com campos: "suggestion" (string) e "whatsapp_message" (string).
NÃO use markdown no JSON. Use texto puro com quebras de linha (\\n).`;

      userPrompt = `Dados do cliente:
- Nome: ${data.leadName}
- Destino de interesse: ${data.destination || "A definir"}
- Datas: ${data.travelDates || "Flexível"}
- Viajantes: ${data.travelersCount || "Não informado"}
- Orçamento: ${data.budget || "Não informado"}
- Informações adicionais: ${data.additionalInfo || "Nenhuma"}

Nome do agente: ${agentName || "o consultor"}
Telefone do agente: ${agentPhone || ""}`;
    } else {
      throw new Error("Invalid type");
    }

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
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    if (type === "empathy") {
      return new Response(JSON.stringify({ response: content.trim() }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse JSON from AI response for suggestion type
    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { suggestion: content, whatsapp_message: "" };
    } catch {
      parsed = { suggestion: content, whatsapp_message: "" };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("lead-wizard-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
