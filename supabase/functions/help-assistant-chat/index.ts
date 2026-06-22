import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";
const MAX_MESSAGE_LEN = 1000;
const MAX_HISTORY = 8;
const TOP_K = 8;

const SYSTEM_PROMPT = `Você é o Assistente da Central de Ajuda do Agentes de Sonhos.

Sua função é ajudar usuários autenticados a entender e usar a plataforma, com base APENAS nos trechos da base de conhecimento fornecidos abaixo (CONTEXTO).

# Regras de resposta
- Responda em português do Brasil, com tom claro, direto e cordial. Use linguagem simples.
- Primeiro dê a resposta objetiva, depois um passo a passo, se útil.
- Use APENAS os trechos do CONTEXTO. Se a base não tiver informação suficiente, diga isso explicitamente.
- NÃO invente funcionalidades, atalhos, automações ou regras não confirmadas.
- NÃO prometa SLA, recorrência nativa, sincronização bidirecional total, emissão de nota fiscal integrada, lançamento automático de entradas a partir de faturas, baixa automática de despesas, notificações automáticas, propagação automática de logo/cor.
- NÃO exponha nomes de tabelas, Edge Functions, migrations, políticas RLS, secrets, tokens, URLs internas, dados reais de clientes/vendas/faturas, logs ou mecanismos internos.
- NÃO oriente burlar permissões, acessar dados de outros usuários, nem aceite/solicite senhas, dados de cartão ou documentos completos.
- Para perguntas envolvendo risco financeiro, exclusão de dados, permissões, integrações, alteração de e-mail principal, mudanças sensíveis ou regras ainda não confirmadas, oriente abrir um chamado no Suporte ou confirmar com o titular da conta.
- Para módulos fora das Ondas 1 e 2 (Captação de Leads, Marketing, Materiais, Bloqueios Aéreos, Mapa do Turismo, Raio-X do Hotel, Travel Advisor, Requisitos de Viagem, Benefícios, EducaTravel Academy, Cursos, Mentorias, Notícias, Comunidade, Ferramentas de IA, Planos e Assinatura, Painel do Fornecedor, Admin), responda que ainda não há orientação confirmada na Central de Ajuda e sugira abrir um chamado no Suporte.
- Você NÃO executa ações: não cria, edita, exclui, cancela, move, paga, emite, conecta ou sincroniza nada.
- Se o usuário pedir para você executar algo, explique que você é consultivo e oriente o passo a passo manual.
- Nunca peça ou registre dados sensíveis. Se o usuário enviar, recuse e peça para remover.

# Formato preferido
1. Resposta direta (1–3 linhas).
2. Passo a passo numerado, se aplicável.
3. Aviso/observação importante, se houver.
4. (As fontes serão exibidas separadamente pela interface — não as repita.)

Se o CONTEXTO estiver vazio ou não responder à pergunta, use o fallback padrão:
"Não encontrei uma orientação confirmada para essa situação na Central de Ajuda. Para evitar uma instrução incorreta, recomendo abrir um chamado no Suporte."`;

interface ChunkRow {
  id: string;
  title: string;
  content: string;
  module: string | null;
  submodule: string | null;
  intents: string[] | null;
  keywords: string[] | null;
  search_text: string | null;
  source_reference: string | null;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ");
}

function tokens(text: string): string[] {
  const stop = new Set([
    "a","o","as","os","de","da","do","das","dos","e","ou","um","uma","para","por","com",
    "no","na","nos","nas","em","que","se","sao","é","eh","como","ao","aos","à","às","mais",
    "menos","ser","estar","ter","posso","podemos","quero","preciso","fazer","faco","faço",
    "meu","minha","seus","sua","você","voce","tem","ha","há","esta","essa","esse","isso",
  ]);
  return normalize(text)
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !stop.has(t));
}

function scoreChunk(qTokens: string[], chunk: ChunkRow): number {
  if (qTokens.length === 0) return 0;
  const hay = normalize(
    `${chunk.title} ${chunk.module ?? ""} ${chunk.submodule ?? ""} ${
      (chunk.intents ?? []).join(" ")
    } ${(chunk.keywords ?? []).join(" ")} ${chunk.content}`,
  );
  const hayIntents = normalize((chunk.intents ?? []).join(" "));
  const hayTitle = normalize(`${chunk.title} ${chunk.module ?? ""}`);
  let score = 0;
  for (const t of qTokens) {
    const inText = (hay.match(new RegExp(`\\b${escapeRegex(t)}\\b`, "g")) || []).length;
    if (inText > 0) score += inText;
    if (hayTitle.includes(t)) score += 3;
    if (hayIntents.includes(t)) score += 2;
  }
  // boost por densidade
  return score / Math.sqrt(Math.max(1, chunk.content.length / 200));
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function detectSensitive(message: string): string | null {
  const lower = message.toLowerCase();
  if (/\b\d{13,19}\b/.test(message.replace(/\s|-/g, "")))
    return "Por segurança, não compartilhe números de cartão neste chat.";
  if (/(senha|password|cvv|cvc)\s*[:=]?\s*\S+/i.test(message))
    return "Por segurança, não compartilhe senhas, CVV ou credenciais neste chat.";
  return null;
}

async function getOrCreateConversation(
  admin: ReturnType<typeof createClient>,
  userId: string,
  conversationId: string | undefined,
  firstMessage: string,
): Promise<string> {
  if (conversationId) {
    const { data } = await admin
      .from("help_assistant_conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("user_id", userId)
      .maybeSingle();
    if (data?.id) return data.id as string;
  }
  const title = firstMessage.slice(0, 80);
  const { data, error } = await admin
    .from("help_assistant_conversations")
    .insert({ user_id: userId, title })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Não autenticado." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit por usuário: 20 req / minuto
    const rl = await checkRateLimit(user.id, "help-assistant-chat", 20, 60);
    if (!rl.allowed) return rateLimitResponse(corsHeaders, rl.retryAfterMs);

    const body = await req.json().catch(() => ({}));
    const rawMessage = String(body?.message ?? "").trim();
    const conversationIdInput: string | undefined = body?.conversation_id;
    const moduleHint: string | undefined = body?.module_hint;

    if (!rawMessage) {
      return new Response(JSON.stringify({ error: "Mensagem vazia." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (rawMessage.length > MAX_MESSAGE_LEN) {
      return new Response(
        JSON.stringify({
          error:
            "Sua mensagem é muito longa. Resuma e tente novamente (limite ~1000 caracteres).",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const sensitive = detectSensitive(rawMessage);
    if (sensitive) {
      return new Response(
        JSON.stringify({
          answer: `${sensitive} Reformule sua pergunta sem dados sigilosos.`,
          sources: [],
          fallback_used: true,
          sensitive_blocked: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!lovableKey) {
      return new Response(
        JSON.stringify({ error: "Assistente indisponível no momento." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // 1) Buscar chunks candidatos (filtro server-side + ranking local)
    const qTokens = tokens(rawMessage);
    let candidatesQuery = admin
      .from("help_center_chunks")
      .select(
        "id,title,content,module,submodule,intents,keywords,search_text,source_reference",
      )
      .eq("status", "pronto")
      .eq("confidence", "confirmado")
      .limit(300);

    if (moduleHint) {
      candidatesQuery = candidatesQuery.ilike("module", `%${moduleHint}%`);
    }

    const { data: candidates, error: candErr } = await candidatesQuery;
    if (candErr) {
      console.error("chunks query error:", candErr.message);
    }
    const pool = (candidates ?? []) as ChunkRow[];

    const scored = pool
      .map((c) => ({ c, s: scoreChunk(qTokens, c) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, TOP_K);

    // Se houver poucos hits, tentar fallback amplo por trigram via search_text ILIKE
    let topChunks = scored.map((x) => x.c);
    if (topChunks.length < 3 && qTokens.length > 0) {
      const broad = await admin
        .from("help_center_chunks")
        .select(
          "id,title,content,module,submodule,intents,keywords,search_text,source_reference",
        )
        .eq("status", "pronto")
        .eq("confidence", "confirmado")
        .ilike("search_text", `%${qTokens[0]}%`)
        .limit(30);
      const extras = (broad.data ?? []) as ChunkRow[];
      const seen = new Set(topChunks.map((c) => c.id));
      for (const e of extras) {
        if (!seen.has(e.id)) topChunks.push(e);
        if (topChunks.length >= TOP_K) break;
      }
    }

    // 2) Carregar histórico curto (se conversa existir)
    let conversationId = conversationIdInput;
    let history: { role: string; content: string }[] = [];
    if (conversationId) {
      const { data: msgs } = await admin
        .from("help_assistant_messages")
        .select("role,content,created_at")
        .eq("conversation_id", conversationId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(MAX_HISTORY);
      history = (msgs ?? [])
        .reverse()
        .map((m) => ({ role: m.role, content: m.content }));
    }

    // 3) Montar contexto
    const contextBlock =
      topChunks.length === 0
        ? "(Nenhum trecho relevante encontrado na base.)"
        : topChunks
            .map(
              (c, i) =>
                `### Fonte ${i + 1} — [${c.module ?? "Geral"}] ${c.title}\n${c.content}`,
            )
            .join("\n\n");

    const userPrompt = `# Pergunta do usuário\n${rawMessage}\n\n# CONTEXTO (base de conhecimento confirmada)\n${contextBlock}`;

    // 4) Chamar Lovable AI Gateway
    const aiResp = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...history,
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
      }),
    });

    if (aiResp.status === 429) {
      return new Response(
        JSON.stringify({
          error:
            "Você atingiu o limite temporário de mensagens do assistente. Tente novamente em alguns minutos.",
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (aiResp.status === 402) {
      return new Response(
        JSON.stringify({
          error:
            "O assistente está temporariamente indisponível por limite de créditos. Tente mais tarde.",
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, errText.slice(0, 400));
      return new Response(
        JSON.stringify({ error: "Falha temporária ao consultar o assistente." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const aiJson = await aiResp.json();
    const answer: string =
      aiJson?.choices?.[0]?.message?.content?.trim() ??
      "Não encontrei uma orientação confirmada para essa situação na Central de Ajuda. Para evitar uma instrução incorreta, recomendo abrir um chamado no Suporte.";

    const fallbackUsed = topChunks.length === 0 || /não encontrei|não há orientação confirmada|abra um chamado/i.test(answer);

    // 5) Persistir conversa + mensagens
    conversationId = await getOrCreateConversation(
      admin,
      user.id,
      conversationId,
      rawMessage,
    );

    await admin.from("help_assistant_messages").insert({
      conversation_id: conversationId,
      user_id: user.id,
      role: "user",
      content: rawMessage,
    });

    const sourcesPayload = topChunks.map((c) => ({
      id: c.id,
      title: c.title,
      module: c.module ?? "Geral",
    }));

    const { data: assistantInsert } = await admin
      .from("help_assistant_messages")
      .insert({
        conversation_id: conversationId,
        user_id: user.id,
        role: "assistant",
        content: answer,
        sources: sourcesPayload,
        fallback_used: fallbackUsed,
      })
      .select("id")
      .single();

    await admin
      .from("help_assistant_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);

    if (topChunks.length === 0) {
      await admin.from("help_assistant_unanswered").insert({
        user_id: user.id,
        question: rawMessage,
        reason: "no_chunks_match",
        module_hint: moduleHint ?? null,
      });
    }

    return new Response(
      JSON.stringify({
        answer,
        sources: sourcesPayload,
        fallback_used: fallbackUsed,
        conversation_id: conversationId,
        message_id: assistantInsert?.id ?? null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("help-assistant-chat error:", err);
    return new Response(
      JSON.stringify({ error: "Falha temporária. Tente novamente em instantes." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});