import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { AgencyDomainInfo } from "@/lib/agencyDomains";
import { agencyDisplayName } from "@/lib/agencyDomains";
import { usePublicBlogList, type PublicBlogCard } from "@/hooks/usePublicBlog";
import { formatDateLong } from "@/lib/blog/blogUtils";
import { AgencyBrandSpinner } from "@/components/whitelabel/AgencyBrandSpinner";
import { cn } from "@/lib/utils";

export default function AgencyBlogPage({ info }: { info: AgencyDomainInfo }) {
  const [params, setParams] = useSearchParams();
  const q = params.get("busca") ?? "";
  const category = params.get("categoria") ?? "";
  const page = Math.max(1, Number(params.get("pagina")) || 1);
  const [term, setTerm] = useState(q);
  const { data, isLoading } = usePublicBlogList(info.hostname, { q, category, page });
  const name = agencyDisplayName(info);
  const canonical = `https://${info.hostname}/blog${page > 1 ? `?pagina=${page}` : ""}`;

  const href = (p: Record<string, string | number | null>) => {
    const next = new URLSearchParams(params);
    Object.entries(p).forEach(([k, v]) => (v === null || v === "" || v === 1 && k === "pagina" ? next.delete(k) : next.set(k, String(v))));
    const s = next.toString();
    return `/blog${s ? `?${s}` : ""}`;
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 md:py-16">
      <Helmet>
        <title>{`Blog | ${name}`}</title>
        <meta name="description" content={`Dicas, roteiros e novidades de viagem por ${name}.`} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={`Blog | ${name}`} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonical} />
        {(q || category) && <meta name="robots" content="noindex,follow" />}
      </Helmet>
      <header className="max-w-2xl space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Blog</p>
        <h1 className="font-display text-3xl font-semibold md:text-5xl">Ideias e dicas para a sua próxima viagem</h1>
      </header>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <form
          className="relative w-full max-w-sm"
          onSubmit={(e) => { e.preventDefault(); setParams(new URLSearchParams(href({ busca: term.trim(), pagina: null }).split("?")[1] ?? "")); }}
        >
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Buscar no blog" className="pl-9" aria-label="Buscar no blog" />
        </form>
        {data?.categories?.length ? (
          <nav aria-label="Categorias" className="flex flex-wrap gap-2">
            <Link to={href({ categoria: null, pagina: null })} className={cn("rounded-full border px-3 py-1 text-sm", !category && "bg-foreground text-background")}>Todas</Link>
            {data.categories.map((c) => (
              <Link key={c.slug} to={href({ categoria: c.slug, pagina: null })} className={cn("rounded-full border px-3 py-1 text-sm", category === c.slug && "bg-foreground text-background")}>{c.name}</Link>
            ))}
          </nav>
        ) : null}
      </div>

      {isLoading ? (
        <div className="flex justify-center p-16"><AgencyBrandSpinner size="lg" /></div>
      ) : !data || (!data.featured && data.items.length === 0) ? (
        <p className="mt-12 text-center text-muted-foreground">Nenhum artigo encontrado.</p>
      ) : (
        <>
          {data.featured && <FeaturedCard post={data.featured} />}
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((p) => <PostCard key={p.slug} post={p} />)}
          </div>
          {data.pages > 1 && (
            <nav aria-label="Paginação" className="mt-12 flex items-center justify-center gap-2">
              {Array.from({ length: data.pages }, (_, i) => i + 1).map((n) => (
                <Link key={n} to={href({ pagina: n })} aria-current={n === page ? "page" : undefined} className={cn("flex h-9 w-9 items-center justify-center rounded-full border text-sm", n === page && "bg-foreground text-background")}>{n}</Link>
              ))}
            </nav>
          )}
        </>
      )}
    </div>
  );
}

function FeaturedCard({ post }: { post: PublicBlogCard }) {
  return (
    <Link to={`/blog/${post.slug}`} className="group mt-10 grid overflow-hidden rounded-3xl border bg-card md:grid-cols-2">
      <div className="aspect-[16/10] bg-muted md:aspect-auto">
        {post.cover_url && <img src={post.cover_url} alt={post.cover_alt} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" />}
      </div>
      <div className="flex flex-col justify-center gap-3 p-6 md:p-10">
        {post.category && <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{post.category.name}</p>}
        <h2 className="font-display text-2xl font-semibold leading-tight md:text-3xl">{post.title}</h2>
        <p className="text-muted-foreground">{post.excerpt}</p>
        <p className="text-xs text-muted-foreground">{formatDateLong(post.published_at)}</p>
      </div>
    </Link>
  );
}

export function PostCard({ post }: { post: PublicBlogCard }) {
  return (
    <Link to={`/blog/${post.slug}`} className="group flex flex-col gap-3">
      <div className="aspect-[16/10] overflow-hidden rounded-2xl bg-muted">
        {post.cover_url && <img src={post.cover_url} alt={post.cover_alt} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />}
      </div>
      {post.category && <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{post.category.name}</p>}
      <h3 className="font-display text-lg font-semibold leading-snug group-hover:underline">{post.title}</h3>
      <p className="line-clamp-3 text-sm text-muted-foreground">{post.excerpt}</p>
    </Link>
  );
}
