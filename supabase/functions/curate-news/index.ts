import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// RSS feed sources com peso de prioridade (maior = mais relevante)
// Brasilturis usa ?withoutcomments=1 para driblar o bloqueio do Yoast SEO no /feed/
const RSS_SOURCES = [
  { name: "Panrotas", url: "https://www.panrotas.com.br/feed", priority: 3, maxItems: 30 },
  { name: "Brasilturis", url: "https://brasilturis.com.br/feed/?withoutcomments=1", priority: 2, maxItems: 25 },
  { name: "Mercado & Eventos", url: "https://www.mercadoeeventos.com.br/feed/", priority: 1, maxItems: 20 },
];

interface RawNewsItem {
  titulo_original: string;
  conteudo: string;
  fonte: string;
  url: string;
  data_publicacao: string | null;
}

// Simple XML tag extraction
function extractTag(xml: string, tag: string): string {
  // Try CDATA first
  const cdataRegex = new RegExp(`<${tag}>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, "i");
  const cdataMatch = xml.match(cdataRegex);
  if (cdataMatch) return cdataMatch[1].trim();

  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const match = xml.match(regex);
  return match ? match[1].trim().replace(/<[^>]+>/g, "") : "";
}

function extractItems(xml: string): string[] {
  const items: string[] = [];
  let idx = 0;
  while (true) {
    const start = xml.indexOf("<item", idx);
    if (start === -1) break;
    const end = xml.indexOf("</item>", start);
    if (end === -1) break;
    items.push(xml.substring(start, end + 7));
    idx = end + 7;
  }
  return items;
}

async function fetchRSS(source: { name: string; url: string; maxItems: number }): Promise<RawNewsItem[]> {
  try {
    console.log(`Fetching RSS from ${source.name}: ${source.url}`);
    const response = await fetch(source.url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AgentesdeSonhosBot/1.0; +https://agentesdesonhos.com.br)",
        "Accept": "application/rss+xml, application/xml, text/xml, */*",
      },
      redirect: "follow",
    });
    if (!response.ok) {
      console.error(`[CURATION] Failed to fetch ${source.name}: HTTP ${response.status} - feed pode estar bloqueado/movido`);
      return [];
    }
    const xml = await response.text();
    if (!xml || xml.length < 100) {
      console.error(`[CURATION] ${source.name} retornou corpo vazio (${xml.length} bytes)`);
      return [];
    }
    const items = extractItems(xml);
    console.log(`[CURATION] ${source.name}: ${items.length} items encontrados no feed`);

    const parsed = items.slice(0, source.maxItems).map((item) => ({
      titulo_original: extractTag(item, "title"),
      conteudo: extractTag(item, "description") || extractTag(item, "content:encoded"),
      fonte: source.name,
      url: extractTag(item, "link"),
      data_publicacao: extractTag(item, "pubDate") || null,
    })).filter((n) => n.titulo_original && n.url);
    console.log(`[CURATION] ${source.name}: ${parsed.length} items válidos (com título + url)`);

    // Filtrar apenas notícias das últimas 24h (com base em pubDate)
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const recent = parsed.filter((n) => {
      if (!n.data_publicacao) return false; // Sem data confiável → descartar
      const ts = new Date(n.data_publicacao).getTime();
      if (Number.isNaN(ts)) return false;
      return ts >= cutoff;
    });
    console.log(`[CURATION] ${source.name}: ${recent.length} items das últimas 24h`);
    return recent;
  } catch (error) {
    console.error(`[CURATION] Erro ao buscar ${source.name}:`, error);
    return [];
  }
}

async function processWithAI(newsItems: RawNewsItem[]): Promise<any[]> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const prompt = `Você é um curador de notícias especializado no mercado de turismo B2B brasileiro.
Analise as seguintes notícias e para cada uma, retorne um JSON com:
- titulo_curto: título curto e atrativo (máximo 12 palavras)
- resumo: resumo em até 2 linhas
- categoria: uma de [Aéreo, Turismo, Destinos, Cruzeiros, Mercado, Eventos]
- relevancia_score: score de 0 a 10 de relevância para agentes de viagens
- tipo_exibicao: "destaque" ou "secundaria"
- ignorar: true se for conteúdo promocional ou irrelevante para o trade turístico

Retorne APENAS um array JSON válido, sem markdown.

Notícias:
${newsItems.map((n, i) => `${i + 1}. Título: ${n.titulo_original}\nConteúdo: ${(n.conteudo || "").substring(0, 300)}\nFonte: ${n.fonte}`).join("\n\n")}`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "Você é um curador de notícias do trade turístico brasileiro. Responda apenas com JSON válido." },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const t = await response.text();
    console.error("AI gateway error:", response.status, t);
    throw new Error(`AI gateway error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "[]";

  // Clean potential markdown wrapping
  const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    console.error("Failed to parse AI response:", cleaned);
    return [];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 0. Cleanup: delete news older than 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: deletedDashboard, error: delDashErr } = await supabase
      .from("noticias_dashboard")
      .delete()
      .lt("data_publicacao", twentyFourHoursAgo)
      .select("id");
    
    if (delDashErr) console.error("Error cleaning dashboard news:", delDashErr);
    else console.log(`Cleaned ${deletedDashboard?.length || 0} old dashboard news`);

    const { data: deletedBrutas, error: delBrutErr } = await supabase
      .from("noticias_brutas")
      .delete()
      .lt("data_coleta", twentyFourHoursAgo)
      .select("id");
    
    if (delBrutErr) console.error("Error cleaning raw news:", delBrutErr);
    else console.log(`Cleaned ${deletedBrutas?.length || 0} old raw news`);

    // 1. Fetch RSS feeds em paralelo (mais rápido + maior volume)
    const fetchResults = await Promise.all(RSS_SOURCES.map((s) => fetchRSS(s)));
    const allNews: RawNewsItem[] = fetchResults.flat();
    const perSourceCount = RSS_SOURCES.map((s, i) => `${s.name}=${fetchResults[i].length}`).join(", ");
    console.log(`[CURATION] Fetched ${allNews.length} total items (${perSourceCount})`);

    // Alerta se Brasilturis voltou a falhar
    const brasilturisIdx = RSS_SOURCES.findIndex((s) => s.name === "Brasilturis");
    if (brasilturisIdx !== -1 && fetchResults[brasilturisIdx].length === 0) {
      console.error("[CURATION][ALERTA] Brasilturis não retornou itens — verificar feed");
    }

    if (allNews.length === 0) {
      return new Response(JSON.stringify({ message: "No news fetched", inserted: 0, curated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Insert raw news (skip duplicates via ON CONFLICT)
    const { data: insertedRaw, error: rawError } = await supabase
      .from("noticias_brutas")
      .upsert(
        allNews.map((n) => ({
          titulo_original: n.titulo_original,
          conteudo: n.conteudo?.substring(0, 5000) || null,
          fonte: n.fonte,
          url: n.url,
          data_publicacao: n.data_publicacao ? new Date(n.data_publicacao).toISOString() : null,
        })),
        { onConflict: "url", ignoreDuplicates: true }
      )
      .select();

    if (rawError) {
      console.error("Error inserting raw news:", rawError);
    }

    // 3. Get unprocessed news (limite maior para aumentar volume curado)
    const { data: unprocessed } = await supabase
      .from("noticias_brutas")
      .select("*")
      .eq("processado", false)
      .order("data_coleta", { ascending: false })
      .limit(40);

    if (!unprocessed || unprocessed.length === 0) {
      return new Response(JSON.stringify({ message: "No new news to process", inserted: insertedRaw?.length || 0, curated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Process with AI
    const newsForAI = unprocessed.map((n) => ({
      titulo_original: n.titulo_original,
      conteudo: n.conteudo,
      fonte: n.fonte,
      url: n.url,
      data_publicacao: n.data_publicacao,
    }));

    const aiResults = await processWithAI(newsForAI);

    // 5. Insert curated news (only score >= 7 and not ignored)
    let curatedCount = 0;
    for (let i = 0; i < aiResults.length; i++) {
      const ai = aiResults[i];
      const raw = unprocessed[i];

      if (!raw || !ai || ai.ignorar || ai.relevancia_score < 7) {
        // Mark as processed
        if (raw) {
          await supabase.from("noticias_brutas").update({ processado: true }).eq("id", raw.id);
        }
        continue;
      }

      // Garante que o score informado pela IA fique entre 0 e 10
      const rawScore = Math.max(0, Math.min(10, Number(ai.relevancia_score) || 0));
      const isAlertaTrade = rawScore >= 9;
      const nivelAlerta = rawScore >= 9 ? "alto" : rawScore >= 7 ? "medio" : "nenhum";

      // Peso de prioridade da fonte é aplicado apenas para ordenação interna,
      // mas o score final exibido nunca pode passar de 10.
      const sourceWeight = RSS_SOURCES.find((s) => s.name === raw.fonte)?.priority ?? 1;
      // A coluna relevancia_score é INTEGER, então arredondamos para garantir compatibilidade.
      const scoreWithPriority = Math.min(10, Math.round(rawScore + sourceWeight * 0.1));

      const { error: curatedError } = await supabase.from("noticias_dashboard").insert({
        noticia_bruta_id: raw.id,
        titulo_curto: ai.titulo_curto || raw.titulo_original.substring(0, 80),
        resumo: ai.resumo || "",
        categoria: ai.categoria || "Turismo",
        fonte: raw.fonte,
        url_original: raw.url,
        relevancia_score: scoreWithPriority,
        tipo_exibicao: isAlertaTrade ? "destaque" : (ai.tipo_exibicao || "secundaria"),
        status: "pendente",
        data_publicacao: raw.data_publicacao || new Date().toISOString(),
        alerta_trade: isAlertaTrade,
        nivel_alerta: nivelAlerta,
      });

      if (curatedError) {
        console.error("Error inserting curated news:", curatedError);
      } else {
        curatedCount++;
      }

      // Mark raw as processed
      await supabase.from("noticias_brutas").update({ processado: true }).eq("id", raw.id);
    }

    return new Response(
      JSON.stringify({
        message: "News curation complete",
        fetched: allNews.length,
        inserted: insertedRaw?.length || 0,
        processed: unprocessed.length,
        curated: curatedCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Curation error:", error);
    return new Response(
      JSON.stringify({ error: "Erro ao processar curadoria de notícias." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
