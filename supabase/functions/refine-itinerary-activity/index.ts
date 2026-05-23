import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODEL = "google/gemini-3-flash-preview";
const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

type Mode = "suggest_alternatives" | "refine" | "suggest_new" | "search";

interface ContextPayload {
  destination?: string;
  tripType?: string;
  budgetLevel?: string;
  travelPace?: string;
  travelersCount?: number;
  interests?: string[];
  observations?: string;
  dayNumber?: number;
  date?: string;
  period?: "manha" | "tarde" | "noite";
  existingActivities?: { title: string; period?: string; isApproved?: boolean }[];
  approvedHighlights?: string[];
  memory?: {
    avoid?: string[];
    preferred_style?: string[];
    pace?: string;
  };
}

interface ReqBody {
  mode: Mode;
  context: ContextPayload;
  current?: {
    title?: string;
    description?: string;
    location?: string;
    estimatedDuration?: string;
    estimatedCost?: string;
  };
  instruction?: string; // for "refine"
  query?: string; // for "search"
}

function buildContextBlock(ctx: ContextPayload) {
  const lines: string[] = [];
  if (ctx.destination) lines.push(`Destino: ${ctx.destination}`);
  if (ctx.dayNumber) lines.push(`Dia: ${ctx.dayNumber}${ctx.date ? ` (${ctx.date})` : ""}`);
  if (ctx.period) lines.push(`Período: ${ctx.period}`);
  if (ctx.tripType) lines.push(`Perfil: ${ctx.tripType}`);
  if (ctx.travelersCount) lines.push(`Viajantes: ${ctx.travelersCount}`);
  if (ctx.budgetLevel) lines.push(`Orçamento: ${ctx.budgetLevel}`);
  if (ctx.travelPace) lines.push(`Ritmo: ${ctx.travelPace}`);
  if (ctx.interests?.length) lines.push(`Interesses: ${ctx.interests.join(", ")}`);
  if (ctx.observations) lines.push(`Observações: ${ctx.observations}`);
  if (ctx.existingActivities?.length) {
    lines.push(
      `Atividades já no dia: ${ctx.existingActivities
        .map((a) => `[${a.period ?? "?"}] ${a.title}${a.isApproved ? " (aprovada)" : ""}`)
        .join(" | ")}`
    );
  }
  if (ctx.approvedHighlights?.length) {
    lines.push(`Atividades aprovadas previamente: ${ctx.approvedHighlights.slice(0, 8).join(" | ")}`);
  }
  if (ctx.memory) {
    if (ctx.memory.avoid?.length) lines.push(`EVITAR (cliente não gosta): ${ctx.memory.avoid.join(", ")}`);
    if (ctx.memory.preferred_style?.length)
      lines.push(`Estilo preferido: ${ctx.memory.preferred_style.join(", ")}`);
    if (ctx.memory.pace) lines.push(`Ritmo memorizado: ${ctx.memory.pace}`);
  }
  return lines.join("\n");
}

function buildMessages(body: ReqBody): { system: string; user: string; tool: any } {
  const ctxBlock = buildContextBlock(body.context);
  const base =
    "Você é um consultor de viagens especialista. Gere sugestões curtas, realistas, coerentes com o destino, período do dia, logística (não pular região da cidade) e perfil do cliente. Responda SEMPRE em português brasileiro.";

  if (body.mode === "suggest_alternatives") {
    return {
      system: base,
      user: `Contexto:\n${ctxBlock}\n\nAtividade atual a substituir: ${body.current?.title ?? ""}${
        body.current?.description ? ` — ${body.current.description}` : ""
      }\n\nGere 3 alternativas DIFERENTES da atual, mantendo o mesmo período (${body.context.period}). Cada alternativa deve ser curta (title até 60 chars, short_description até 110 chars).`,
      tool: {
        type: "function",
        function: {
          name: "return_alternatives",
          description: "Retorna 3 alternativas de atividade.",
          parameters: {
            type: "object",
            properties: {
              alternatives: {
                type: "array",
                minItems: 3,
                maxItems: 3,
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    short_description: { type: "string" },
                    location: { type: "string" },
                    estimated_duration: { type: "string" },
                    estimated_cost: { type: "string" },
                  },
                  required: ["title", "short_description"],
                  additionalProperties: false,
                },
              },
            },
            required: ["alternatives"],
            additionalProperties: false,
          },
        },
      },
    };
  }

  if (body.mode === "search") {
    return {
      system: base,
      user: `Contexto:\n${ctxBlock}\n\nO agente está buscando manualmente por: "${body.query ?? ""}"\n\nInterprete a busca de forma semântica (não literal). Considere o destino, cidade, período, perfil e interesses. Retorne 5 sugestões REAIS e RECONHECÍVEIS que atendam à intenção da busca, coerentes com o destino. Pode incluir atrações famosas, restaurantes, tours, experiências, museus, etc. Curto e direto (title até 70 chars, short_description até 130 chars).`,
      tool: {
        type: "function",
        function: {
          name: "return_search_results",
          description: "Retorna resultados de busca de atividades.",
          parameters: {
            type: "object",
            properties: {
              results: {
                type: "array",
                minItems: 1,
                maxItems: 5,
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    short_description: { type: "string" },
                    category: { type: "string" },
                    location: { type: "string" },
                    estimated_duration: { type: "string" },
                    estimated_cost: { type: "string" },
                  },
                  required: ["title", "short_description"],
                  additionalProperties: false,
                },
              },
            },
            required: ["results"],
            additionalProperties: false,
          },
        },
      },
    };
  }

  if (body.mode === "suggest_new") {
    return {
      system: base,
      user: `Contexto:\n${ctxBlock}\n\nO período ${body.context.period} está vazio. Sugira UMA atividade ideal para preencher esse período, coerente com o restante do dia.`,
      tool: {
        type: "function",
        function: {
          name: "return_activity",
          description: "Retorna uma atividade.",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              location: { type: "string" },
              estimated_duration: { type: "string" },
              estimated_cost: { type: "string" },
            },
            required: ["title", "description"],
            additionalProperties: false,
          },
        },
      },
    };
  }

  // refine
  return {
    system: base,
    user: `Contexto:\n${ctxBlock}\n\nAtividade atual:\nTítulo: ${body.current?.title ?? ""}\nDescrição: ${body.current?.description ?? ""}\nLocal: ${body.current?.location ?? ""}\n\nInstrução do agente: "${body.instruction ?? ""}"\n\nReescreva a atividade aplicando a instrução, mantendo o período (${body.context.period}) e coerência geográfica. Mantenha conciso.`,
    tool: {
      type: "function",
      function: {
        name: "return_activity",
        description: "Retorna a atividade refinada.",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            location: { type: "string" },
            estimated_duration: { type: "string" },
            estimated_cost: { type: "string" },
          },
          required: ["title", "description"],
          additionalProperties: false,
        },
      },
    },
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as ReqBody;
    if (!body?.mode || !body?.context) {
      return new Response(JSON.stringify({ error: "Missing mode or context" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (body.mode === "refine" && !body.instruction?.trim()) {
      return new Response(JSON.stringify({ error: "Missing instruction" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (body.mode === "search" && !body.query?.trim()) {
      return new Response(JSON.stringify({ error: "Missing query" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { system, user, tool } = buildMessages(body);

    const resp = await fetch(GATEWAY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: tool.function.name } },
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429)
        return new Response(JSON.stringify({ error: "Muitas solicitações. Aguarde alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      if (resp.status === 402)
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      const t = await resp.text();
      console.error("Gateway error", resp.status, t);
      return new Response(JSON.stringify({ error: "Falha na IA. Tente novamente." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    const argsStr = call?.function?.arguments;
    if (!argsStr) {
      console.error("No tool call in response", JSON.stringify(data).slice(0, 500));
      return new Response(JSON.stringify({ error: "Resposta inválida da IA." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    let parsed: any;
    try {
      parsed = JSON.parse(argsStr);
    } catch {
      return new Response(JSON.stringify({ error: "JSON inválido da IA." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ mode: body.mode, result: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("refine-itinerary-activity error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro inesperado" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
