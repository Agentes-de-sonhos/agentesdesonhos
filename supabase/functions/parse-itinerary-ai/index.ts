import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getClientIP, rateLimitResponse } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_TEXT_CHARS = 200_000;

interface ReqBody {
  // Conteúdo já extraído pelo client (PDF/DOCX/TXT/colado), concatenado.
  text: string;
  // Pistas opcionais para ajudar o modelo a desambiguar.
  destinationHint?: string;
  startDateHint?: string; // YYYY-MM-DD
  endDateHint?: string;   // YYYY-MM-DD
}

const SYSTEM_PROMPT = `Você é um especialista em turismo brasileiro. Sua tarefa é EXTRAIR — não inventar — a programação de viagem a partir de um conjunto de documentos enviados pelo agente de viagens (PDFs de operadora, programações de receptivo, e-mails, anotações, etc.).

REGRAS ABSOLUTAS DE FIDELIDADE (nunca quebre):
1. NUNCA invente atividades, hotéis, voos, horários, datas ou passeios que não estejam explicitamente nos textos enviados.
2. Se uma informação está vaga ou ausente, deixe o campo como null. NÃO preencha por suposição.
3. Cada atividade DEVE incluir um campo "source_excerpt" com um trecho LITERAL (até 200 caracteres) do texto original que comprova essa atividade. Se não conseguir produzir o trecho literal, NÃO inclua a atividade.
4. Indique a "confidence" como "high" quando data + atividade estiverem claramente no texto, "medium" quando há ambiguidade no período/horário, "low" quando o item é mencionado de passagem.

MELHORIAS PERMITIDAS (sem inventar fato novo):
- Corrigir erros gramaticais e padronizar maiúsculas/minúsculas no campo "title".
- Resumir descrições muito longas mantendo o sentido.
- Consolidar duplicidades óbvias do mesmo passeio mencionado em arquivos diferentes.
- Inferir o período (manha/tarde/noite) a partir do horário citado.

ESTRUTURA E PERÍODOS:
- "manha": 05:00–11:59
- "tarde": 12:00–17:59
- "noite": 18:00 em diante
- Se não houver horário, escolha o período mais plausível pelo tipo de atividade (ex.: check-in tarde, jantar noite). Se ainda assim for ambíguo, use "manha".

DATAS:
- Sempre devolver no formato YYYY-MM-DD.
- Use as pistas (destination_hint, start_date_hint, end_date_hint) APENAS quando o texto não trouxer a data; se houver conflito, prefira o texto e marque confidence="medium".

SAÍDA: APENAS JSON válido, sem markdown, sem comentários, sem texto extra. Schema:
{
  "destination": string,
  "start_date": "YYYY-MM-DD" | null,
  "end_date": "YYYY-MM-DD" | null,
  "travelers_count": number | null,
  "summary": string,
  "days": [
    {
      "day_number": number,
      "date": "YYYY-MM-DD" | null,
      "confidence": "high" | "medium" | "low",
      "activities": [
        {
          "period": "manha" | "tarde" | "noite",
          "title": string,
          "description": string | null,
          "location": string | null,
          "time": string | null,
          "estimated_duration": string | null,
          "estimated_cost": string | null,
          "source_excerpt": string,
          "confidence": "high" | "medium" | "low"
        }
      ]
    }
  ]
}`;

serve(async (req) => {
  const traceId = crypto.randomUUID().slice(0, 8);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const clientIP = getClientIP(req);
  const rateCheck = await checkRateLimit(clientIP, "parse-itinerary-ai", 6, 60);
  if (!rateCheck.allowed) {
    return rateLimitResponse(corsHeaders, rateCheck.retryAfterMs);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Não autorizado. Faça login para usar esta funcionalidade." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const token = authHeader.replace("Bearer ", "");

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Sessão expirada. Faça login novamente." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const userId = userData.user.id;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: hasAccess } = await supabase.rpc("has_feature_access", {
      _user_id: userId,
      _feature: "ai_tools",
    });
    if (!hasAccess) {
      return new Response(
        JSON.stringify({ error: "Faça upgrade para o plano Profissional para usar a importação inteligente.", upgrade_required: true }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: canUse } = await supabase.rpc("check_ai_usage", { _user_id: userId });
    if (!canUse) {
      return new Response(
        JSON.stringify({ error: "Cota mensal de IA esgotada. Faça upgrade para o plano Premium.", quota_exceeded: true }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = (await req.json().catch(() => null)) as ReqBody | null;
    if (!body || typeof body.text !== "string" || body.text.trim().length < 30) {
      return new Response(
        JSON.stringify({ error: "Conteúdo insuficiente. Envie textos ou arquivos com a programação da viagem." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const text = body.text.slice(0, MAX_TEXT_CHARS);
    const truncated = body.text.length > MAX_TEXT_CHARS;

    const hints: string[] = [];
    if (body.destinationHint) hints.push(`destino sugerido: ${body.destinationHint}`);
    if (body.startDateHint) hints.push(`data de início sugerida: ${body.startDateHint}`);
    if (body.endDateHint) hints.push(`data de término sugerida: ${body.endDateHint}`);

    const userPrompt = `${hints.length ? `PISTAS DO AGENTE (use só se o texto não disser):\n- ${hints.join("\n- ")}\n\n` : ""}TEXTOS ENVIADOS (transcrições e textos colados, separados por marcadores):\n\n${text}\n\n${truncated ? "[NOTA: textos foram truncados em 200k caracteres]\n\n" : ""}Devolva APENAS o JSON conforme o schema definido.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Configuração de IA indisponível. Tente novamente em alguns minutos." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${traceId}] parse-itinerary-ai user=${userId} chars=${text.length} truncated=${truncated}`);

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({ error: "Muitas requisições. Aguarde alguns segundos e tente novamente." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos para continuar." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.error(`[${traceId}] AI gateway error:`, aiResp.status, await aiResp.text());
      return new Response(
        JSON.stringify({ error: "Não foi possível analisar o roteiro. Tente novamente em instantes." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiJson = await aiResp.json();
    const raw = aiJson?.choices?.[0]?.message?.content;
    if (!raw) {
      return new Response(
        JSON.stringify({ error: "A IA não retornou conteúdo. Tente novamente." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let parsed: any;
    try {
      let s = String(raw).trim();
      if (s.startsWith("```json")) s = s.slice(7);
      else if (s.startsWith("```")) s = s.slice(3);
      if (s.endsWith("```")) s = s.slice(0, -3);
      parsed = JSON.parse(s.trim());
    } catch (e) {
      console.error(`[${traceId}] JSON parse failed:`, e, "raw:", String(raw).slice(0, 500));
      return new Response(
        JSON.stringify({ error: "A IA retornou um formato inesperado. Tente novamente." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!parsed?.days || !Array.isArray(parsed.days) || parsed.days.length === 0) {
      return new Response(
        JSON.stringify({ error: "Não conseguimos identificar dias de viagem nos documentos enviados." }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Best-effort consumption of monthly AI quota (mirror of other AI funcs).
    try {
      await supabase.rpc("increment_ai_usage", { _user_id: userId });
    } catch {
      /* no-op */
    }

    return new Response(JSON.stringify({ ...parsed, truncated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(`[${traceId}] parse-itinerary-ai error:`, e);
    return new Response(
      JSON.stringify({ error: "Erro inesperado ao analisar o roteiro. Tente novamente." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});