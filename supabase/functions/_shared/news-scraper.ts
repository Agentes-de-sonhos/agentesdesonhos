// Shared utilities for news collector edge functions.
// Handles: RSS fetch/parse, canonical URL, content hashing, admin auth, AI classification, DB writes and run logging.
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-collector-secret",
};

export type PortalKey = "PANROTAS" | "Mercado & Eventos" | "Brasilturis";

export interface PortalConfig {
  key: PortalKey;
  slug: string; // used for function name / cron
  feedUrl: string;
  maxItems: number;
}

export const PORTAL_CONFIGS: Record<PortalKey, PortalConfig> = {
  "PANROTAS": {
    key: "PANROTAS",
    slug: "panrotas",
    feedUrl: "https://www.panrotas.com.br/feed",
    maxItems: 60,
  },
  "Mercado & Eventos": {
    key: "Mercado & Eventos",
    slug: "mercado-eventos",
    feedUrl: "https://www.mercadoeeventos.com.br/feed/",
    maxItems: 60,
  },
  "Brasilturis": {
    key: "Brasilturis",
    slug: "brasilturis",
    feedUrl: "https://brasilturis.com.br/feed/?withoutcomments=1",
    maxItems: 60,
  },
};

// Categorias oficiais (alinhadas com src/pages/Noticias.tsx)
export const CATEGORIES = [
  "Aéreo",
  "Hotelaria & Resorts",
  "Cruzeiros",
  "Destinos",
  "Operadoras & Trade",
  "Mercado & Economia",
  "Eventos & Feiras",
  "Ingressos & Atrações",
  "Turismo Sustentável",
  "Educação & Certificações",
  "Tecnologia & Inovação",
  "Regulamentação & Vistos",
  "Curiosidades",
  "Outros",
] as const;

export interface RawItem {
  titulo_original: string;
  conteudo: string;
  url: string;
  url_canonical: string;
  data_publicacao: string | null; // ISO
  content_hash: string;
}

// ── XML parsing ─────────────────────────────────────────────
function extractTag(xml: string, tag: string): string {
  const cdata = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, "i");
  const m1 = xml.match(cdata);
  if (m1) return m1[1].trim();
  const plain = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const m2 = xml.match(plain);
  return m2 ? m2[1].trim().replace(/<[^>]+>/g, "").trim() : "";
}

function extractItems(xml: string): string[] {
  const items: string[] = [];
  let idx = 0;
  while (true) {
    const s = xml.indexOf("<item", idx);
    if (s === -1) break;
    const e = xml.indexOf("</item>", s);
    if (e === -1) break;
    items.push(xml.substring(s, e + 7));
    idx = e + 7;
  }
  return items;
}

export function canonicalizeUrl(raw: string): string {
  try {
    const u = new URL(raw.trim());
    // Strip common tracking params
    const drop = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid", "mc_cid", "mc_eid"];
    drop.forEach((k) => u.searchParams.delete(k));
    u.hash = "";
    // Remove trailing slash except root
    let s = u.toString();
    if (s.endsWith("/") && u.pathname !== "/") s = s.slice(0, -1);
    return s;
  } catch {
    return raw.trim();
  }
}

// Simple non-crypto hash (djb2). Enough to add a portal+title+date-day guard.
function stableHash(...parts: string[]): string {
  const s = parts.join("|").toLowerCase().normalize("NFKD").replace(/\s+/g, " ").trim();
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return "h" + (h >>> 0).toString(36);
}

// ── URL/article validation ──────────────────────────────────
// Rejeita páginas institucionais / categorias / tags
const INVALID_PATH_PATTERNS = [
  /\/categoria\//i,
  /\/category\//i,
  /\/tag\//i,
  /\/author\//i,
  /\/page\//i,
  /\/feed\/?$/i,
  /\/sobre-?nos/i,
  /\/contato/i,
  /\/politica/i,
  /\/anuncie/i,
  /\/#/i,
];

export function isProbablyArticleUrl(u: string): boolean {
  try {
    const url = new URL(u);
    if (!/^https?:$/.test(url.protocol)) return false;
    if (!url.hostname) return false;
    if (INVALID_PATH_PATTERNS.some((rx) => rx.test(url.pathname))) return false;
    // Precisa ter algo além de "/"
    if (url.pathname.length < 6) return false;
    return true;
  } catch {
    return false;
  }
}

// ── RSS fetch ───────────────────────────────────────────────
export async function fetchRSSItems(portal: PortalConfig): Promise<RawItem[]> {
  const res = await fetch(portal.feedUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; AgentesdeSonhosBot/1.0; +https://agentesdesonhos.com.br)",
      "Accept": "application/rss+xml, application/xml, text/xml, */*",
    },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${portal.feedUrl}`);
  const xml = await res.text();
  if (!xml || xml.length < 100) throw new Error(`Empty feed body (${xml.length} bytes)`);

  const items = extractItems(xml).slice(0, portal.maxItems);
  const parsed: RawItem[] = items.map((it) => {
    const title = extractTag(it, "title");
    const link = extractTag(it, "link");
    const desc = extractTag(it, "description") || extractTag(it, "content:encoded");
    const pubDate = extractTag(it, "pubDate");
    const canonical = canonicalizeUrl(link);
    const iso = pubDate ? new Date(pubDate).toISOString() : null;
    const dayKey = iso ? iso.slice(0, 10) : "";
    return {
      titulo_original: title,
      conteudo: desc,
      url: link,
      url_canonical: canonical,
      data_publicacao: iso && !Number.isNaN(new Date(iso).getTime()) ? iso : null,
      content_hash: stableHash(portal.key, title, dayKey),
    };
  });

  // Filtra: precisa ter título, url válida e ser matéria
  return parsed.filter((n) => n.titulo_original && n.url_canonical && isProbablyArticleUrl(n.url_canonical));
}

// ── AI classification ───────────────────────────────────────
export interface AiClassification {
  titulo_curto: string;
  resumo: string;
  categoria: string;
  relevancia_score: number;
  confidence: number; // 0..1
}

export type AiErrorKind = "no_api_key" | "credits" | "rate_limit" | "timeout" | "api_error" | "invalid_response";

export interface AiFailure {
  kind: AiErrorKind;
  message: string;
  status?: number;
}

export interface AiClassifyResult {
  ok: boolean;
  items: AiClassification[]; // vazio quando ok=false
  failure?: AiFailure;
}

const AI_TIMEOUT_MS = 45_000;

export async function classifyItemsWithAI(items: RawItem[], portal: PortalKey): Promise<AiClassifyResult> {
  const KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!KEY) return { ok: false, items: [], failure: { kind: "no_api_key", message: "LOVABLE_API_KEY não configurada" } };
  if (items.length === 0) return { ok: true, items: [] };

  const prompt = `Você é curador de notícias do trade de turismo B2B brasileiro. Para cada notícia abaixo retorne UM objeto JSON com:
- titulo_curto: título curto e claro (até 12 palavras)
- resumo: 2 linhas com o essencial
- categoria: EXATAMENTE uma das opções: ${CATEGORIES.join(" | ")}
- relevancia_score: inteiro 0-10 (relevância para agentes de viagens)
- confidence: número 0.0-1.0 (confiança da classificação de categoria). Use <0.5 se não tiver certeza — nesse caso a categoria será convertida em "Outros".

Retorne APENAS um array JSON válido, sem markdown, sem comentários, com um objeto por notícia na mesma ordem.

Notícias (portal: ${portal}):
${items.map((n, i) => `${i + 1}. Título: ${n.titulo_original}\nConteúdo: ${(n.conteudo || "").substring(0, 400)}`).join("\n\n")}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Curador editorial. Responda apenas com JSON válido." },
          { role: "user", content: prompt },
        ],
      }),
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    if ((e as Error).name === "AbortError") {
      return { ok: false, items: [], failure: { kind: "timeout", message: `Timeout após ${AI_TIMEOUT_MS}ms` } };
    }
    return { ok: false, items: [], failure: { kind: "api_error", message: (e as Error).message || String(e) } };
  }
  clearTimeout(timer);

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let kind: AiErrorKind = "api_error";
    if (res.status === 402) kind = "credits";
    else if (res.status === 429) kind = "rate_limit";
    return {
      ok: false,
      items: [],
      failure: { kind, status: res.status, message: `AI gateway ${res.status}: ${text.slice(0, 200)}` },
    };
  }

  const data = await res.json().catch(() => null);
  const raw = (data?.choices?.[0]?.message?.content ?? "[]").replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  try {
    const parsed = JSON.parse(raw) as AiClassification[];
    if (!Array.isArray(parsed)) throw new Error("not-array");
    return { ok: true, items: parsed };
  } catch (_e) {
    console.error("AI parse fail:", raw.slice(0, 300));
    return { ok: false, items: [], failure: { kind: "invalid_response", message: "JSON inválido retornado pelo modelo" } };
  }
}

// ── Auth ────────────────────────────────────────────────────
export interface AuthResult {
  ok: boolean;
  reason?: string;
  triggerSource: "cron" | "manual";
  userId?: string;
}

export async function authorizeCollectorRequest(req: Request): Promise<AuthResult> {
  const secretHeader = req.headers.get("x-collector-secret");
  const acceptedSecrets = [
    Deno.env.get("NEWS_COLLECTOR_SECRET"),
    Deno.env.get("NEWS_CRON_TOKEN"),
  ].filter(Boolean) as string[];
  if (secretHeader && acceptedSecrets.some((s) => s === secretHeader)) {
    return { ok: true, triggerSource: "cron" };
  }

  const auth = req.headers.get("Authorization") ?? req.headers.get("authorization");
  if (!auth || !auth.toLowerCase().startsWith("bearer ")) {
    return { ok: false, reason: "missing_authorization", triggerSource: "manual" };
  }
  const token = auth.slice(7).trim();
  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const sr = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  // Service role JWT (cron via pg_net) → allow as cron
  if (token === sr) return { ok: true, triggerSource: "cron" };
  const supa = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: claims, error } = await supa.auth.getClaims(token);
  if (error || !claims?.claims?.sub) {
    return { ok: false, reason: "invalid_token", triggerSource: "manual" };
  }
  const userId = claims.claims.sub as string;
  // Verify admin role via has_role RPC (bypasses RLS complexity)
  const admin = createClient(url, sr);
  const { data: hasRole } = await admin.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!hasRole) return { ok: false, reason: "not_admin", triggerSource: "manual", userId };
  return { ok: true, triggerSource: "manual", userId };
}

// ── Run logging ─────────────────────────────────────────────
export interface RunCounters {
  found: number;
  inserted: number;
  updated: number;
  skipped_duplicates: number;
  invalid: number;
  others: number;
  broken_links: number;
  errors: unknown[];
}

export function newCounters(): RunCounters {
  return {
    found: 0,
    inserted: 0,
    updated: 0,
    skipped_duplicates: 0,
    invalid: 0,
    others: 0,
    broken_links: 0,
    errors: [],
  };
}

export async function startRun(sb: SupabaseClient, portal: string, trigger: "cron" | "manual"): Promise<string | null> {
  const { data, error } = await sb
    .from("news_collector_runs")
    .insert({ portal, status: "running", trigger_source: trigger })
    .select("id")
    .single();
  if (error) {
    console.error("startRun error:", error);
    return null;
  }
  return data.id;
}

export async function finishRun(
  sb: SupabaseClient,
  runId: string | null,
  status: "success" | "partial" | "error",
  counters: RunCounters,
  startedAtMs: number,
): Promise<void> {
  if (!runId) return;
  await sb
    .from("news_collector_runs")
    .update({
      status,
      finished_at: new Date().toISOString(),
      found_count: counters.found,
      inserted_count: counters.inserted,
      updated_count: counters.updated,
      skipped_duplicates_count: counters.skipped_duplicates,
      invalid_count: counters.invalid,
      others_count: counters.others,
      broken_links_count: counters.broken_links,
      errors: counters.errors,
      duration_ms: Date.now() - startedAtMs,
    })
    .eq("id", runId);
}

// ── Main collect flow (per portal) ──────────────────────────
export interface CollectResult {
  portal: PortalKey;
  status: "success" | "partial" | "error";
  counters: RunCounters;
  run_id: string | null;
  message?: string;
}

export async function runCollectPortal(portalKey: PortalKey, trigger: "cron" | "manual"): Promise<CollectResult> {
  const started = Date.now();
  const portal = PORTAL_CONFIGS[portalKey];
  const url = Deno.env.get("SUPABASE_URL")!;
  const sr = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(url, sr);

  const counters = newCounters();
  const runId = await startRun(sb, portalKey, trigger);

  let items: RawItem[] = [];
  try {
    items = await fetchRSSItems(portal);
  } catch (e) {
    counters.errors.push({ step: "fetch", message: (e as Error).message });
    await finishRun(sb, runId, "error", counters, started);
    return { portal: portalKey, status: "error", counters, run_id: runId, message: (e as Error).message };
  }
  counters.found = items.length;

  if (items.length === 0) {
    await finishRun(sb, runId, "success", counters, started);
    return { portal: portalKey, status: "success", counters, run_id: runId };
  }

  // Dedup #1: URL canônica já em noticias_brutas
  const canonicals = items.map((i) => i.url_canonical);
  const hashes = items.map((i) => i.content_hash);
  const { data: existingByUrl } = await sb
    .from("noticias_brutas")
    .select("url, content_hash")
    .in("url", canonicals);
  const knownUrls = new Set((existingByUrl ?? []).map((r: any) => r.url));
  // Dedup #2: content_hash
  const { data: existingByHash } = await sb
    .from("noticias_brutas")
    .select("content_hash")
    .in("content_hash", hashes);
  const knownHashes = new Set((existingByHash ?? []).map((r: any) => r.content_hash));

  const fresh: RawItem[] = [];
  for (const it of items) {
    if (knownUrls.has(it.url_canonical) || knownHashes.has(it.content_hash)) {
      counters.skipped_duplicates++;
      continue;
    }
    if (!isProbablyArticleUrl(it.url_canonical)) {
      counters.invalid++;
      continue;
    }
    fresh.push(it);
  }

  if (fresh.length === 0) {
    await finishRun(sb, runId, "success", counters, started);
    return { portal: portalKey, status: "success", counters, run_id: runId };
  }

  // Insert brutas
  const brutasPayload = fresh.map((n) => ({
    titulo_original: n.titulo_original.slice(0, 500),
    conteudo: (n.conteudo || "").substring(0, 5000) || null,
    fonte: portalKey,
    url: n.url_canonical,
    data_publicacao: n.data_publicacao,
    content_hash: n.content_hash,
    processado: false,
  }));
  const { data: insertedRaw, error: rawErr } = await sb
    .from("noticias_brutas")
    .upsert(brutasPayload, { onConflict: "url", ignoreDuplicates: true })
    .select("id, titulo_original, conteudo, url, data_publicacao");
  if (rawErr) counters.errors.push({ step: "insert_brutas", message: rawErr.message });

  const raws = insertedRaw ?? [];
  if (raws.length === 0) {
    await finishRun(sb, runId, "success", counters, started);
    return { portal: portalKey, status: "success", counters, run_id: runId };
  }

  // Classify with AI (best effort — falha detalhada não marca run como parcial)
  const aiResult = await classifyItemsWithAI(
    raws.map((r: any) => ({
      titulo_original: r.titulo_original,
      conteudo: r.conteudo || "",
      url: r.url,
      url_canonical: r.url,
      data_publicacao: r.data_publicacao,
      content_hash: "",
    })),
    portalKey,
  );
  const classifications: AiClassification[] = aiResult.items;
  const aiFailure: AiFailure | undefined = aiResult.ok ? undefined : aiResult.failure;
  if (aiFailure) console.warn(`[news-scraper] AI classify failed for ${portalKey}:`, aiFailure);

  // Insert dashboard rows as APROVADO (auto-publish)
  for (let i = 0; i < raws.length; i++) {
    const raw = raws[i] as any;
    const ai = classifications[i];
    const aiWorked = !aiFailure && !!ai;
    // classification_confidence NULL → pendente de reclassificação
    const confidence: number | null = aiWorked && typeof ai?.confidence === "number"
      ? Math.max(0, Math.min(1, ai.confidence))
      : null;
    let categoria = aiWorked && ai?.categoria && (CATEGORIES as readonly string[]).includes(ai.categoria) ? ai.categoria : "Outros";
    if (confidence != null && confidence < 0.5) categoria = "Outros";
    if (categoria === "Outros") counters.others++;

    const score = aiWorked && ai?.relevancia_score != null ? Math.max(0, Math.min(10, Math.round(Number(ai.relevancia_score)))) : 5;
    const titulo_curto = (aiWorked && ai?.titulo_curto ? ai.titulo_curto : raw.titulo_original || "").toString().slice(0, 160) || raw.titulo_original.slice(0, 160);
    const resumo = ((aiWorked && ai?.resumo) || (raw.conteudo || "").substring(0, 240) || titulo_curto).toString().slice(0, 500);

    const { error: dashErr } = await sb.from("noticias_dashboard").insert({
      noticia_bruta_id: raw.id,
      titulo_curto,
      resumo,
      categoria,
      fonte: portalKey,
      url_original: raw.url,
      relevancia_score: score,
      score_perfil: score,
      classification_confidence: confidence,
      tipo_exibicao: score >= 8 ? "destaque" : "secundaria",
      status: "aprovado",
      data_publicacao: raw.data_publicacao || new Date().toISOString(),
      hidden: false,
    });
    if (dashErr) {
      counters.errors.push({ step: "insert_dashboard", raw_id: raw.id, message: dashErr.message });
      continue;
    }
    counters.inserted++;
    await sb.from("noticias_brutas").update({ processado: true }).eq("id", raw.id);
  }

  // partial só quando há erro de fetch/insert (falha de IA não conta como parcial)
  const finalStatus: "success" | "partial" = counters.errors.length > 0 ? "partial" : "success";
  if (aiFailure) counters.errors.push({ step: "ai_classify", ...aiFailure });
  await finishRun(sb, runId, finalStatus, counters, started);
  return {
    portal: portalKey,
    status: finalStatus,
    counters,
    run_id: runId,
    message: aiFailure ? `IA indisponível (${aiFailure.kind})` : undefined,
  };
}