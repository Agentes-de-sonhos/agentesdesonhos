import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { image_base64 } = await req.json();
    if (!image_base64 || typeof image_base64 !== "string") {
      return new Response(JSON.stringify({ error: "image_base64 is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Limit to 5MB
    if (image_base64.length > 7_000_000) {
      return new Response(JSON.stringify({ error: "Imagem muito grande (máximo 5MB)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Detect mime type from base64 prefix or default to jpeg
    let mimeType = "image/jpeg";
    if (image_base64.startsWith("/9j/")) mimeType = "image/jpeg";
    else if (image_base64.startsWith("iVBOR")) mimeType = "image/png";
    else if (image_base64.startsWith("UklGR")) mimeType = "image/webp";

    const systemPrompt = `You are a business card data extraction assistant. Analyze the image of a business card and extract ALL information visible on it.

Return a JSON object with these fields (use null for fields not found):
{
  "person_name": "Full name of the person",
  "job_title": "Job title / position",
  "company_name": "Company / organization name",
  "phone": "Phone number (with country code if visible)",
  "whatsapp": "WhatsApp number if different from phone, otherwise null",
  "email": "Email address",
  "website": "Website URL",
  "address": "Street address",
  "city": "City",
  "state": "State / Province",
  "country": "Country",
  "social_links": { "instagram": "", "linkedin": "", "facebook": "", "twitter": "" },
  "other_info": "Any other relevant info on the card",
  "confidence": {
    "person_name": "high|medium|low",
    "email": "high|medium|low",
    "phone": "high|medium|low",
    "company_name": "high|medium|low"
  },
  "has_logo": true/false
}

IMPORTANT:
- Extract EXACTLY what you see, do not invent data
- For phone numbers, keep the original format
- If WhatsApp is the same as the phone, set whatsapp to null
- Set confidence levels based on readability
- Return ONLY valid JSON, no markdown, no explanation`;

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
          {
            role: "user",
            content: [
              { type: "text", text: "Extract all data from this business card image." },
              {
                type: "image_url",
                image_url: { url: `data:${mimeType};base64,${image_base64}` },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI error:", response.status, errText);
      return new Response(JSON.stringify({ error: "Erro ao processar imagem" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    let content = result.choices?.[0]?.message?.content || "";

    // Clean markdown code blocks if present
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let extracted;
    try {
      extracted = JSON.parse(content);
    } catch {
      console.error("Failed to parse AI response:", content);
      return new Response(JSON.stringify({ error: "Não foi possível interpretar os dados do cartão. Tente outra foto." }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ data: extracted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-business-card error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
