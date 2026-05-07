import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um especialista em regras migratórias internacionais, vistos, exigências sanitárias e requisitos de embarque para companhias aéreas. Atua como organizador e interpretador de fontes oficiais (consulados, embaixadas, ANVISA, IATA, Timatic, sites de imigração, sites das companhias aéreas).

REGRAS CRÍTICAS:
1. NUNCA invente informações. Se não souber com segurança, sinalize com confidence baixo e oriente o agente a confirmar na fonte oficial.
2. SEMPRE forneça links oficiais reais (gov, embaixada, consulado, cia aérea, ANVISA).
3. SEMPRE cruze: nacionalidade, residência, validade do passaporte, conexões, idade do passageiro (menor / desacompanhado), tipo de viagem.
4. Considere conexões: trânsito nos EUA exige visto americano mesmo só em conexão; UK exige Direct Airside Transit ou TWOV; alguns países exigem visto de trânsito.
5. Para menores desacompanhados ou com apenas um responsável: sempre alertar sobre autorização de viagem (no Brasil: ECA / juiz / cartório).
6. Validade do passaporte: a maioria dos destinos exige 6 meses após o retorno. Sinalize ⚠️ se vencer antes.
7. Datas no formato ISO (YYYY-MM-DD). Calcule diferenças com base na data de ida.
8. Responda SEMPRE em português do Brasil.
9. Use APENAS a função fornecida para responder — nunca texto livre.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Não autenticado." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { passenger_data, trip_data } = body;
    if (!trip_data) {
      return new Response(JSON.stringify({ error: "Dados da viagem são obrigatórios." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const hasPassenger = !!passenger_data;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "IA não configurada." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userPrompt = hasPassenger
      ? `Avalie a elegibilidade de embarque desta viagem internacional cruzando todos os dados.

DADOS DO PASSAGEIRO:
${JSON.stringify(passenger_data, null, 2)}

DADOS DA VIAGEM:
${JSON.stringify(trip_data, null, 2)}

Gere uma análise estruturada em blocos: documentação obrigatória, vistos e autorizações, saúde e vacinas, alertas inteligentes (cruzando dados), links oficiais (URLs reais e verificáveis) e observações. Defina o status geral.`
      : `Gere os REQUISITOS GERAIS DE VIAGEM para o destino abaixo, SEM dados do passageiro. Considere o cenário padrão: passageiro brasileiro, adulto, viajando com passaporte brasileiro válido. NÃO invente dados pessoais. Sinalize claramente nas observações que a análise é genérica e que para validação completa de elegibilidade é necessário informar os dados do passageiro.

DADOS DA VIAGEM:
${JSON.stringify(trip_data, null, 2)}

Gere uma análise estruturada em blocos: documentação obrigatória, vistos e autorizações (assumindo nacionalidade brasileira), saúde e vacinas, alertas gerais do destino, links oficiais (URLs reais e verificáveis) e observações. Use confidence "medio" no máximo, pois faltam dados do passageiro. Defina o status geral como "attention" para reforçar a necessidade de validação individual.`;

    const model = "google/gemini-2.5-pro";

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "travel_requirements_report",
            description: "Relatório estruturado de requisitos de viagem",
            parameters: {
              type: "object",
              properties: {
                overall_status: { type: "string", enum: ["apt", "attention", "not_apt"], description: "apt=apto, attention=atenção, not_apt=não apto" },
                status_summary: { type: "string", description: "Resumo executivo em 1-2 linhas" },
                confidence: { type: "string", enum: ["baixo", "medio", "alto"] },
                documentation: {
                  type: "object",
                  properties: {
                    passport_required: { type: "boolean" },
                    rg_accepted: { type: "boolean" },
                    cnh_accepted: { type: "boolean" },
                    passport_min_validity_months: { type: "number", description: "Meses mínimos de validade após retorno" },
                    blank_pages_required: { type: "number" },
                    additional_proofs: { type: "array", items: { type: "string" }, description: "Comprovantes extras: passagem retorno, hospedagem, comprovação financeira etc" },
                    notes: { type: "string" },
                  },
                  required: ["passport_required", "rg_accepted", "cnh_accepted", "additional_proofs", "notes"],
                },
                visas: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      country: { type: "string" },
                      type: { type: "string", description: "Visto, ETA, eTA, ESTA, eVisa, Isenção etc" },
                      required: { type: "boolean" },
                      processing_time: { type: "string" },
                      recommended_advance: { type: "string" },
                      estimated_cost: { type: "string" },
                      official_url: { type: "string" },
                      notes: { type: "string" },
                    },
                    required: ["country", "type", "required", "official_url"],
                  },
                },
                health: {
                  type: "object",
                  properties: {
                    mandatory_vaccines: { type: "array", items: { type: "string" } },
                    recommended_vaccines: { type: "array", items: { type: "string" } },
                    international_certificate_required: { type: "boolean" },
                    travel_insurance_required: { type: "boolean" },
                    insurance_min_coverage: { type: "string" },
                    sanitary_requirements: { type: "array", items: { type: "string" } },
                    notes: { type: "string" },
                  },
                  required: ["mandatory_vaccines", "international_certificate_required", "travel_insurance_required", "notes"],
                },
                alerts: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      severity: { type: "string", enum: ["info", "warning", "critical"] },
                      title: { type: "string" },
                      message: { type: "string" },
                    },
                    required: ["severity", "title", "message"],
                  },
                },
                official_sources: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string", description: "Ex: Consulado Geral dos EUA, ANVISA, IATA Travel Centre" },
                      url: { type: "string" },
                      category: { type: "string", description: "Consulado, Embaixada, Imigração, Saúde, Cia Aérea, IATA" },
                      last_known_update: { type: "string", description: "Data aproximada de quando a info foi conhecida (texto livre)" },
                    },
                    required: ["name", "url", "category"],
                  },
                },
                observations: { type: "array", items: { type: "string" } },
              },
              required: ["overall_status", "status_summary", "confidence", "documentation", "visas", "health", "alerts", "official_sources", "observations"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "travel_requirements_report" } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos para continuar." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI error:", aiResp.status, await aiResp.text());
      return new Response(JSON.stringify({ error: "Erro na consulta de IA. Tente novamente." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResp.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "A IA não retornou dados estruturados." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result: any;
    try {
      result = JSON.parse(toolCall.function.arguments);
    } catch {
      return new Response(JSON.stringify({ error: "Erro ao processar resposta da IA." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const confidenceMap: Record<string, number> = { baixo: 0.4, medio: 0.7, alto: 0.95 };
    const confidenceScore = confidenceMap[result.confidence] ?? 0.5;

    // Persist consultation
    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: saved, error: saveErr } = await adminClient
      .from("travel_requirements_consultations")
      .insert({
        user_id: userData.user.id,
        passenger_data: passenger_data ?? {},
        trip_data,
        result,
        confidence_score: confidenceScore,
        model_used: model,
      })
      .select("id")
      .single();

    if (saveErr) console.error("Save error:", saveErr);

    return new Response(JSON.stringify({ id: saved?.id, result, confidence_score: confidenceScore, model_used: model }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("check-travel-requirements error:", e);
    return new Response(JSON.stringify({ error: "Erro ao verificar requisitos da viagem." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});