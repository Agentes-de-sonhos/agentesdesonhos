// Extrai dados de uma oferta a partir de texto ou imagem (material de fornecedor).
// Nunca publica: o painel abre o resultado como rascunho e exige revisão manual.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const TOOL = {
  type: "function",
  function: {
    name: "extract_offer",
    description: "Dados comerciais públicos de uma oferta de viagem.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Título comercial curto" },
        description: { type: "string", description: "Descrição de vendas, 2 a 4 frases, sem inventar dados" },
        destination: { type: "string" },
        category: { type: "string", enum: ["Pacotes", "Cruzeiros", "Resorts", "Hospedagem", "Aéreo", "Ingressos", "Experiências"] },
        travel_start: { type: "string", description: "YYYY-MM-DD ou vazio" },
        travel_end: { type: "string", description: "YYYY-MM-DD ou vazio" },
        nights: { type: "number" },
        price_from: { type: "number", description: "Menor preço explícito no material; 0 se não houver" },
        currency: { type: "string", enum: ["BRL", "USD", "EUR"] },
        price_note: { type: "string", description: "Ex.: por pessoa em apto duplo" },
        payment_conditions: { type: "string" },
        included_services: {
          type: "array",
          items: {
            type: "object",
            properties: { type: { type: "string" }, name: { type: "string" }, detail: { type: "string" } },
            required: ["type"],
          },
        },
      },
      required: ["title", "destination"],
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") || "";
    if (!auth.startsWith("Bearer ")) return json({ error: "Sessão expirada. Faça login novamente." }, 401);
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user?.id) return json({ error: "Sessão expirada. Faça login novamente." }, 401);

    const body = await req.json().catch(() => ({}));
    const text = typeof body.text === "string" ? body.text.slice(0, 12000) : "";
    const image = typeof body.image_data_url === "string" && body.image_data_url.startsWith("data:image/") ? body.image_data_url : "";
    if (!text.trim() && !image) return json({ error: "Envie um texto ou uma imagem da oferta." }, 400);
    if (image.length > 7_000_000) return json({ error: "Imagem muito grande (máximo 5 MB)." }, 400);

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "Importação por IA indisponível no momento." }, 500);

    const content: unknown[] = [
      {
        type: "text",
        text:
          "Extraia os dados públicos desta oferta de viagem. Use somente informações presentes no material. " +
          "Não inclua dados de clientes, fornecedores internos, comissões ou localizadores. Datas em YYYY-MM-DD.\n\n" +
          text,
      },
    ];
    if (image) content.push({ type: "image_url", image_url: { url: image } });

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content }],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "extract_offer" } },
      }),
    });
    if (res.status === 429) return json({ error: "Muitas solicitações. Tente novamente em instantes." }, 429);
    if (res.status === 402) return json({ error: "Créditos de IA esgotados." }, 402);
    if (!res.ok) {
      console.error("[import-offer-ai] gateway", res.status, await res.text());
      return json({ error: "Não foi possível analisar o material agora." }, 500);
    }
    const data = await res.json();
    const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    let offer: Record<string, unknown> = {};
    try {
      offer = typeof args === "string" ? JSON.parse(args) : args ?? {};
    } catch {
      return json({ error: "Não foi possível interpretar o material." }, 500);
    }
    const date = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
    const price = Number(offer.price_from);
    return json({
      offer: {
        title: String(offer.title ?? "").slice(0, 160),
        description: String(offer.description ?? "").slice(0, 2000) || null,
        destination: String(offer.destination ?? "").slice(0, 200) || null,
        category: typeof offer.category === "string" ? offer.category : "Pacotes",
        travel_start: date(offer.travel_start),
        travel_end: date(offer.travel_end),
        nights: Number.isFinite(Number(offer.nights)) && Number(offer.nights) > 0 ? Math.round(Number(offer.nights)) : null,
        price_from: Number.isFinite(price) && price > 0 ? Math.round(price * 100) / 100 : null,
        currency: ["BRL", "USD", "EUR"].includes(String(offer.currency)) ? offer.currency : "BRL",
        price_note: String(offer.price_note ?? "").slice(0, 200) || null,
        payment_conditions: String(offer.payment_conditions ?? "").slice(0, 500) || null,
        included_services: Array.isArray(offer.included_services)
          ? (offer.included_services as Record<string, unknown>[]).slice(0, 20).map((s) => ({
              type: String(s.type ?? "Outros").slice(0, 40),
              name: s.name ? String(s.name).slice(0, 160) : null,
              detail: s.detail ? String(s.detail).slice(0, 200) : null,
            }))
          : [],
      },
    });
  } catch (e) {
    console.error("[import-offer-ai] unexpected", String(e));
    return json({ error: "Não foi possível analisar o material agora." }, 500);
  }
});
