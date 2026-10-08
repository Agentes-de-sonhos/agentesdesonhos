// Leitura pública do blog white-label.
// Só devolve a versão PUBLICADA (ou agendada já vencida) de agência com o recurso
// `site_blog` ativo e domínio público ativo. Mídia fica em bucket privado e só é
// assinada quando pertence ao próprio artigo publicado ({agency}/{post}/...).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json", ...extra } });

const BUCKET = "site-blog-media";
const SIGN_SECONDS = 60 * 60 * 24 * 7;
const PAGE_SIZE = 9;

type Row = { id: string; slug: string; content: Record<string, any>; published_at: string; updated_at: string };
type Cat = { id: string; name: string; slug: string };

function cleanHost(v: unknown) {
  return typeof v === "string" ? v.trim().toLowerCase().replace(/:\d+$/, "").slice(0, 120) : "";
}
function cleanSlug(v: unknown) {
  const s = typeof v === "string" ? v.trim().toLowerCase() : "";
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s) && s.length <= 120 ? s : "";
}

function collectPaths(node: any, out: Set<string>) {
  if (!node || typeof node !== "object") return;
  if (typeof node.attrs?.path === "string") out.add(node.attrs.path);
  if (Array.isArray(node.attrs?.images)) node.attrs.images.forEach((i: any) => typeof i?.path === "string" && out.add(i.path));
  if (Array.isArray(node.content)) node.content.forEach((c: any) => collectPaths(c, out));
}
function applySigned(node: any, map: Map<string, string>): any {
  if (!node || typeof node !== "object") return node;
  const n = { ...node };
  if (n.attrs) {
    n.attrs = { ...n.attrs };
    if (typeof n.attrs.path === "string") {
      n.attrs.src = map.get(n.attrs.path) ?? null;
      delete n.attrs.path;
    }
    if (Array.isArray(n.attrs.images)) {
      n.attrs.images = n.attrs.images
        .map((i: any) => ({ src: map.get(i?.path) ?? null, alt: String(i?.alt ?? ""), caption: String(i?.caption ?? "") }))
        .filter((i: any) => i.src);
    }
  }
  if (Array.isArray(n.content)) n.content = n.content.map((c: any) => applySigned(c, map));
  return n;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  let body: Record<string, unknown> = {};
  try {
    body = req.method === "POST" ? await req.json() : Object.fromEntries(new URL(req.url).searchParams);
  } catch {
    return json({ error: "Requisição inválida." }, 400);
  }
  const hostname = cleanHost(body.hostname);
  const action = String(body.action ?? "status");
  if (!hostname) return json({ error: "Site não encontrado." }, 400);

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  const { data: agencyId } = await sb.rpc("blog_public_agency", { p_hostname: hostname });
  if (!agencyId) {
    // Recurso desligado ou domínio inexistente: nada vaza.
    if (action === "status") return json({ enabled: false, has_posts: false });
    if (action === "sitemap") return new Response("", { status: 404, headers: corsHeaders });
    return json({ error: "Conteúdo não encontrado." }, 404);
  }

  const [{ data: rowsRaw, error }, { data: catsRaw }] = await Promise.all([
    sb.rpc("blog_public_posts", { p_hostname: hostname }),
    sb.rpc("blog_public_categories", { p_hostname: hostname }),
  ]);
  if (error) {
    console.error("[public-blog] posts", error.message);
    return json({ error: "Não foi possível carregar o blog agora." }, 500);
  }
  const rows = ((rowsRaw ?? []) as Row[]).sort((a, b) => (a.published_at < b.published_at ? 1 : -1));
  const cats = (catsRaw ?? []) as Cat[];
  const catById = new Map(cats.map((c) => [c.id, c]));

  const sign = async (paths: string[]) => {
    const map = new Map<string, string>();
    if (!paths.length) return map;
    const { data } = await sb.storage.from(BUCKET).createSignedUrls(paths, SIGN_SECONDS);
    (data ?? []).forEach((d: any) => d.signedUrl && d.path && map.set(d.path, d.signedUrl));
    return map;
  };
  const ownPath = (r: Row, p: unknown): p is string =>
    typeof p === "string" && p.startsWith(`${agencyId}/${r.id}/`) && !p.includes("..");

  const card = (r: Row, map: Map<string, string>) => {
    const c = r.content ?? {};
    const cat = catById.get(c.category_id);
    return {
      slug: r.slug,
      title: String(c.title ?? ""),
      excerpt: String(c.excerpt ?? ""),
      cover_url: ownPath(r, c.cover_path) ? map.get(c.cover_path) ?? null : null,
      cover_alt: String(c.cover_alt ?? ""),
      category: cat ? { name: cat.name, slug: cat.slug } : null,
      author_name: String(c.author_name ?? ""),
      featured: c.featured === true,
      published_at: r.published_at,
      updated_at: r.updated_at,
    };
  };

  if (action === "status") return json({ enabled: true, has_posts: rows.length > 0 });

  if (action === "sitemap") {
    const origin = `https://${hostname}`;
    const urls = [`<url><loc>${origin}/blog</loc></url>`].concat(
      rows.map((r) => `<url><loc>${origin}/blog/${r.slug}</loc><lastmod>${new Date(r.updated_at).toISOString()}</lastmod></url>`),
    );
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}</urlset>`,
      { headers: { ...corsHeaders, "Content-Type": "application/xml" } },
    );
  }

  if (action === "list") {
    const q = typeof body.q === "string" ? body.q.trim().toLowerCase().slice(0, 80) : "";
    const catSlug = cleanSlug(body.category);
    const page = Math.max(1, Math.min(500, Number(body.page) || 1));
    let filtered = rows;
    if (catSlug) {
      const cat = cats.find((c) => c.slug === catSlug);
      filtered = cat ? filtered.filter((r) => r.content?.category_id === cat.id) : [];
    }
    if (q) {
      filtered = filtered.filter((r) =>
        `${r.content?.title ?? ""} ${r.content?.excerpt ?? ""}`.toLowerCase().includes(q),
      );
    }
    const featuredRow = !q && !catSlug && page === 1 ? filtered.find((r) => r.content?.featured === true) ?? filtered[0] : null;
    const rest = featuredRow ? filtered.filter((r) => r !== featuredRow) : filtered;
    const total = rest.length;
    const slice = rest.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const all = featuredRow ? [featuredRow, ...slice] : slice;
    const map = await sign(all.map((r) => r.content?.cover_path).filter((p, i) => ownPath(all[i], p)) as string[]);
    const usedCats = new Set(rows.map((r) => r.content?.category_id));
    return json({
      featured: featuredRow ? card(featuredRow, map) : null,
      items: slice.map((r) => card(r, map)),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      categories: cats.filter((c) => usedCats.has(c.id)).map((c) => ({ name: c.name, slug: c.slug })),
    });
  }

  if (action === "post") {
    const slug = cleanSlug(body.slug);
    const r = rows.find((x) => x.slug === slug);
    if (!r) return json({ error: "Artigo não encontrado." }, 404);
    const c = r.content ?? {};
    const paths = new Set<string>();
    collectPaths(c.content, paths);
    if (c.cover_path) paths.add(c.cover_path);
    const relatedRows = rows
      .filter((x) => x.id !== r.id)
      .sort((a, b) => Number(b.content?.category_id === c.category_id) - Number(a.content?.category_id === c.category_id))
      .slice(0, 3);
    relatedRows.forEach((x) => ownPath(x, x.content?.cover_path) && paths.add(x.content.cover_path));
    const allowed = [...paths].filter((p) => ownPath(r, p) || relatedRows.some((x) => ownPath(x, p)));
    const map = await sign(allowed);
    const { data: settings } = await sb.rpc("blog_public_settings", { p_hostname: hostname });
    const cleanMap = new Map([...map].filter(([p]) => ownPath(r, p)));
    return json({
      post: {
        ...card(r, map),
        content: applySigned(c.content ?? { type: "doc", content: [] }, cleanMap),
        seo_title: String(c.seo_title ?? ""),
        seo_description: String(c.seo_description ?? ""),
        cta_title: String(c.cta_title ?? ""),
        cta_text: String(c.cta_text ?? ""),
      },
      related: relatedRows.map((x) => card(x, map)),
      settings: settings ?? null,
    });
  }

  return json({ error: "Ação inválida." }, 400);
});
