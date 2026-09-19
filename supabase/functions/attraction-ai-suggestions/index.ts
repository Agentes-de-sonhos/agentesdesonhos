import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const MAX_TEXT = 160;
const clean = (v: unknown) => String(v ?? "").trim().slice(0, MAX_TEXT);

/** Extrai o primeiro objeto JSON de uma resposta de texto do modelo. */
function parseJsonBlock(text: string): any {
  const raw = String(text || "").trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

const PROMPTS = {
  products: `Você conhece o mercado de atrações turísticas, parques, espetáculos e experiências.
Sugira até 6 produtos turísticos reais e conhecidos que correspondam ao texto pesquisado (parques, complexos, shows, museus, tours).
Regras:
- Não invente preços, horários, validade, políticas, inclusões ou disponibilidade.
- Use o nome comercial usual do produto.
- "location" traz apenas cidade/região quando for evidente; caso contrário use "".
- Responda APENAS JSON: {"products":[{"name":"...","location":"..."}]}`,
  ticket_types: `Você conhece as modalidades comerciais de ingressos de atrações turísticas.
Liste até 8 tipos/modalidades de ingresso plausíveis para o produto informado (ex.: passes de dias, park hopper, setores, categorias de assento, combos).
Regras:
- Não é catálogo oficial nem disponibilidade em tempo real.
- Não invente preço, data, validade ou política de cancelamento.
- "label" curto (até 60 caracteres).
- Responda APENAS JSON: {"ticket_types":[{"label":"..."}]}`,
  description: `Você é um copywriter de viagens.
Escreva uma descrição comercial curta (2 a 4 linhas, um parágrafo) sobre a modalidade de ingresso informada do produto informado.
Regras:
- Português do Brasil, linguagem leve e vendedora.
- NÃO cite preço, horário, data, validade, disponibilidade, inclusões específicas, políticas de cancelamento ou regras comerciais.
- Foque na experiência e no perfil de viajante.
- Responda APENAS JSON: {"text":"..."}`,
} as const;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => null);
    const mode = String(body?.mode ?? "");
    if (!(mode in PROMPTS)) return json({ error: "mode inválido" }, 400);

    const query = clean(body?.query);
    const product = clean(body?.product);
    const ticketType = clean(body?.ticket_type);
    const destination = clean(body?.destination);

    if (mode === "products" && query.length < 3) return json({ products: [] });
    if (mode !== "products" && product.length < 2) return json({ ticket_types: [], text: "" });
    if (mode === "description" && ticketType.length < 2) return json({ text: "" });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "AI não configurada" }, 500);

    const userContent = mode === "products"
      ? `Texto pesquisado: "${query}"${destination ? `\nDestino do orçamento: "${destination}"` : ""}`
      : mode === "ticket_types"
        ? `Produto: "${product}"${destination ? `\nDestino: "${destination}"` : ""}`
        : `Produto: "${product}"\nModalidade de ingresso: "${ticketType}"${destination ? `\nDestino: "${destination}"` : ""}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: PROMPTS[mode as keyof typeof PROMPTS] },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      console.error("[attraction-ai-suggestions] gateway", status);
      if (status === 429) return json({ error: "Muitas solicitações. Tente novamente em instantes." }, 429);
      if (status === 402) return json({ error: "Créditos de IA insuficientes." }, 402);
      return json({ error: "Não foi possível gerar sugestões agora." }, 502);
    }

    const data = await response.json();
    const parsed = parseJsonBlock(data?.choices?.[0]?.message?.content ?? "") ?? {};

    if (mode === "products") {
      const products = Array.isArray(parsed.products) ? parsed.products : [];
      return json({
        products: products
          .map((p: any) => ({ name: clean(p?.name), location: clean(p?.location) }))
          .filter((p: any) => p.name)
          .slice(0, 6),
      });
    }
    if (mode === "ticket_types") {
      const types = Array.isArray(parsed.ticket_types) ? parsed.ticket_types : [];
      return json({
        ticket_types: types
          .map((t: any) => ({ label: clean(typeof t === "string" ? t : t?.label).slice(0, 60) }))
          .filter((t: any) => t.label)
          .slice(0, 8),
      });
    }
    return json({ text: String(parsed.text ?? "").trim().slice(0, 700) });
  } catch (e) {
    console.error("[attraction-ai-suggestions]", (e as Error)?.message);
    return json({ error: "Não foi possível gerar sugestões agora." }, 500);
  }
});
