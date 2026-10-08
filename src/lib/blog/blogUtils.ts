/** Utilidades puras do módulo Site → Blog (testáveis, sem dependência de React). */

export const BLOG_ENTITLEMENT = "site_blog";
export const BLOG_PERMISSION = "site.blog.manage";
export const BLOG_MEDIA_BUCKET = "site-blog-media";
export const BLOG_DEFAULT_TZ = "America/Sao_Paulo";

export type BlogStatus = "draft" | "scheduled" | "published" | "unpublished";

export interface TiptapNode {
  type: string;
  attrs?: Record<string, any>;
  marks?: { type: string; attrs?: Record<string, any> }[];
  text?: string;
  content?: TiptapNode[];
}

/** Snapshot editável do artigo (rascunho de trabalho / versão publicada). */
export interface BlogSnapshot {
  title?: string;
  content?: TiptapNode;
  excerpt?: string;
  excerpt_manual?: boolean;
  cover_path?: string | null;
  cover_alt?: string;
  category_id?: string | null;
  author_name?: string;
  featured?: boolean;
  seo_title?: string;
  seo_description?: string;
  cta_title?: string;
  cta_text?: string;
}

export function slugify(input: string): string {
  return (
    input
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 100)
      .replace(/-+$/g, "") || "artigo"
  );
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) && slug.length <= 120;
}

/** Extrai o ID de vídeo de uma URL do YouTube; null se não for YouTube válido. */
export function parseYouTubeId(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.replace(/^www\.|^m\./, "");
  let id: string | null = null;
  if (host === "youtu.be") id = url.pathname.slice(1).split("/")[0];
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") id = url.searchParams.get("v");
    else {
      const m = url.pathname.match(/^\/(embed|shorts|live)\/([^/]+)/);
      if (m) id = m[2];
    }
  }
  return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
}

/** Links permitidos no conteúdo: somente http(s), mailto, tel e âncoras/relativos. */
export function safeHref(href: unknown): string | null {
  if (typeof href !== "string") return null;
  const h = href.trim();
  if (!h) return null;
  if (h.startsWith("/") || h.startsWith("#")) return h;
  try {
    const u = new URL(h);
    return ["http:", "https:", "mailto:", "tel:"].includes(u.protocol) ? u.toString() : null;
  } catch {
    return null;
  }
}

export function plainText(node?: TiptapNode | null): string {
  if (!node) return "";
  if (node.type === "text") return node.text ?? "";
  const inner = (node.content ?? []).map(plainText).join(node.type === "doc" ? "\n" : "");
  return ["paragraph", "heading", "blockquote", "listItem"].includes(node.type) ? `${inner} ` : inner;
}

/** Sugestão de resumo baseada no texto do artigo (até ~160 caracteres, sem cortar palavra). */
export function suggestExcerpt(content?: TiptapNode | null, max = 160): string {
  const text = plainText(content).replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), 40)).trim()}…`;
}

export function readingMinutes(content?: TiptapNode | null): number {
  const words = plainText(content).trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/**
 * Converte data/hora "de parede" (YYYY-MM-DD + HH:mm) num fuso IANA para um
 * instante UTC. Funciona sem bibliotecas usando o offset do próprio fuso.
 */
export function zonedWallTimeToUtc(date: string, time: string, timeZone: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const asUtc = Date.UTC(y, m - 1, d, hh, mm);
  const offset = tzOffsetMs(new Date(asUtc), timeZone);
  let result = asUtc - offset;
  // Ajuste em transições de horário de verão.
  const offset2 = tzOffsetMs(new Date(result), timeZone);
  if (offset2 !== offset) result = asUtc - offset2;
  return new Date(result);
}

function tzOffsetMs(at: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

export function formatInZone(iso: string | Date, timeZone = BLOG_DEFAULT_TZ): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(typeof iso === "string" ? new Date(iso) : iso);
}

export function formatDateLong(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: BLOG_DEFAULT_TZ, day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
}

/** Coleta caminhos de mídia do conteúdo (imagens e galerias). */
export function collectMediaPaths(node?: TiptapNode | null, out: string[] = []): string[] {
  if (!node) return out;
  if (typeof node.attrs?.path === "string") out.push(node.attrs.path);
  if (Array.isArray(node.attrs?.images)) node.attrs!.images.forEach((i: any) => typeof i?.path === "string" && out.push(i.path));
  node.content?.forEach((c) => collectMediaPaths(c, out));
  return out;
}

/** Atualiza `src` de imagens/galerias a partir de um mapa caminho → URL assinada. */
export function withSignedSources(node: TiptapNode, map: Record<string, string>): TiptapNode {
  const n: TiptapNode = { ...node };
  if (n.attrs) {
    n.attrs = { ...n.attrs };
    if (typeof n.attrs.path === "string" && map[n.attrs.path]) n.attrs.src = map[n.attrs.path];
    if (Array.isArray(n.attrs.images)) n.attrs.images = n.attrs.images.map((i: any) => ({ ...i, src: map[i.path] ?? i.src }));
  }
  if (n.content) n.content = n.content.map((c) => withSignedSources(c, map));
  return n;
}

export function statusLabel(s: BlogStatus): string {
  return { draft: "Rascunho", scheduled: "Agendado", published: "Publicado", unpublished: "Fora do ar" }[s];
}

export function whatsappShareUrl(text: string, url: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
}
