import { useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import { CheckCircle2, Link2, Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import type { AgencyDomainInfo } from "@/lib/agencyDomains";
import { agencyDisplayName, agencyWhatsappNumber } from "@/lib/agencyDomains";
import { usePublicBlogPost, type PublicBlogPost } from "@/hooks/usePublicBlog";
import { BlogArticleView } from "@/components/blog/BlogArticleView";
import { AgencyBrandSpinner } from "@/components/whitelabel/AgencyBrandSpinner";
import { PostCard } from "@/pages/whitelabel/AgencyBlogPage";
import { whatsappShareUrl } from "@/lib/blog/blogUtils";

export default function AgencyBlogPostPage({ info }: { info: AgencyDomainInfo }) {
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading } = usePublicBlogPost(info.hostname, slug);

  if (isLoading) return <div className="flex min-h-[60vh] items-center justify-center"><AgencyBrandSpinner size="lg" /></div>;
  if (!data) {
    return (
      <div className="min-h-[60vh] p-10 text-center">
        <Helmet><meta name="robots" content="noindex" /></Helmet>
        <h1 className="text-xl font-semibold">Artigo não encontrado</h1>
        <p className="mt-2 text-sm text-muted-foreground">Este conteúdo não está disponível.</p>
      </div>
    );
  }
  return <Article info={info} data={data} />;
}

function Article({ info, data }: { info: AgencyDomainInfo; data: PublicBlogPost }) {
  const { post, related, settings } = data;
  const name = agencyDisplayName(info);
  const url = `https://${info.hostname}/blog/${post.slug}`;
  const title = post.seo_title || post.title;
  const description = post.seo_description || post.excerpt;
  const jsonLd = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description,
      datePublished: post.published_at,
      dateModified: post.updated_at,
      mainEntityOfPage: url,
      ...(post.cover_url ? { image: [post.cover_url] } : {}),
      author: post.author_name ? { "@type": "Person", name: post.author_name } : { "@type": "Organization", name },
      publisher: { "@type": "Organization", name },
    }),
    [post, description, url, name],
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado.");
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  };

  return (
    <>
      <Helmet>
        <title>{`${title} | ${name}`}</title>
        {description && <meta name="description" content={description} />}
        <link rel="canonical" href={url} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={title} />
        {description && <meta property="og:description" content={description} />}
        <meta property="og:url" content={url} />
        {post.cover_url && <meta property="og:image" content={post.cover_url} />}
        <meta property="article:published_time" content={post.published_at} />
        <meta property="article:modified_time" content={post.updated_at} />
        <meta name="twitter:card" content={post.cover_url ? "summary_large_image" : "summary"} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>
      <BlogArticleView
        title={post.title}
        coverUrl={post.cover_url}
        coverAlt={post.cover_alt}
        author={post.author_name}
        categoryName={post.category?.name}
        publishedAt={post.published_at}
        updatedAt={post.updated_at}
        content={post.content}
      >
        <div className="mt-10 flex flex-wrap items-center gap-2 border-t pt-6">
          <span className="text-sm text-muted-foreground">Compartilhar:</span>
          <Button asChild variant="outline" size="sm">
            <a href={whatsappShareUrl(post.title, url)} target="_blank" rel="noopener noreferrer"><MessageCircle className="mr-1 h-4 w-4" /> WhatsApp</a>
          </Button>
          <Button variant="outline" size="sm" onClick={copy}><Link2 className="mr-1 h-4 w-4" /> Copiar link</Button>
        </div>
        <BlogCta info={info} postTitle={post.title} postSlug={post.slug} url={url}
          title={post.cta_title || settings?.cta_title || "Vamos planejar a sua viagem?"}
          text={post.cta_text || settings?.cta_text || `Conte o que você imagina e ${name} prepara uma proposta sob medida para você.`} />
      </BlogArticleView>
      {related.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-16">
          <h2 className="mb-6 font-display text-2xl font-semibold">Leia também</h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">{related.map((p) => <PostCard key={p.slug} post={p} />)}</div>
        </section>
      )}
    </>
  );
}

/** Convite ao final do artigo: grava lead real na Central de Solicitações (origem Blog). */
function BlogCta({ info, postTitle, postSlug, url, title, text }: { info: AgencyDomainInfo; postTitle: string; postSlug: string; url: string; title: string; text: string }) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", message: "", consent: false });
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState("");
  const openedAt = useRef(Date.now());
  const idem = useRef(crypto.randomUUID());
  const wa = agencyWhatsappNumber(info);
  const waHref = wa ? `https://wa.me/${wa}?text=${encodeURIComponent(`Olá! Li o artigo “${postTitle}” no site e gostaria de ajuda para planejar minha viagem. ${url}`)}` : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === "sending") return;
    setError(null);
    if (form.name.trim().length < 2) return setError("Informe seu nome.");
    if (!form.phone.trim() && !form.email.trim()) return setError("Informe seu WhatsApp ou e-mail.");
    if (!form.consent) return setError("É necessário aceitar o uso dos seus dados para contato.");
    setState("sending");
    const { data, error: fnError } = await supabase.functions.invoke("submit-agency-site-request", {
      body: {
        service_key: "blog",
        service_label: `Blog: ${postTitle}`.slice(0, 120),
        hostname: info.hostname,
        lead_name: form.name,
        lead_phone: form.phone,
        lead_email: form.email || null,
        summary: `Lead captado pelo artigo “${postTitle}”.`,
        notes: form.message || null,
        details: { origem: "blog", artigo_slug: postSlug, artigo_titulo: postTitle, artigo_url: url },
        consent: true,
        consent_version: "blog-v1",
        idempotency_key: `blog:${idem.current}`,
        source_url: url,
        elapsed_ms: Date.now() - openedAt.current,
        honeypot,
      },
    });
    if (fnError || (data as any)?.error || !(data as any)?.success) {
      let msg = (data as any)?.error as string | undefined;
      try {
        const ctx = (fnError as any)?.context as Response | undefined;
        if (ctx?.clone) msg = (await ctx.clone().json())?.error ?? msg;
      } catch { /* mensagem padrão */ }
      setError(msg ?? "Não foi possível enviar agora. Tente novamente.");
      setState("idle");
      return;
    }
    setState("done");
  };

  return (
    <section className="mt-12 rounded-3xl border bg-muted/40 p-6 md:p-10" aria-labelledby="blog-cta-title">
      {state === "done" ? (
        <div className="space-y-3 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
          <h2 id="blog-cta-title" className="font-display text-2xl font-semibold">Recebemos seu contato!</h2>
          <p className="text-muted-foreground">Em breve a equipe retorna pelo contato informado.</p>
        </div>
      ) : (
        <>
          <h2 id="blog-cta-title" className="font-display text-2xl font-semibold">{title}</h2>
          <p className="mt-2 text-muted-foreground">{text}</p>
          <form onSubmit={submit} className="mt-6 grid gap-3 md:grid-cols-2">
            <input type="text" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
            <Input placeholder="Seu nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-label="Seu nome" />
            <Input placeholder="WhatsApp com DDD" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} aria-label="WhatsApp" />
            <Input placeholder="E-mail (opcional)" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="md:col-span-2" aria-label="E-mail" />
            <Textarea placeholder="Para onde você quer ir? (opcional)" rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="md:col-span-2" />
            <label className="flex items-start gap-2 text-xs text-muted-foreground md:col-span-2">
              <Checkbox checked={form.consent} onCheckedChange={(v) => setForm({ ...form, consent: v === true })} className="mt-0.5" />
              Autorizo o uso dos meus dados para receber contato sobre a minha viagem.
            </label>
            {error && <p className="text-sm text-destructive md:col-span-2">{error}</p>}
            <div className="flex flex-wrap gap-2 md:col-span-2">
              <Button type="submit" disabled={state === "sending"}>{state === "sending" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Quero um orçamento</Button>
              {waHref && (
                <Button asChild variant="outline">
                  <a href={waHref} target="_blank" rel="noopener noreferrer"><MessageCircle className="mr-1 h-4 w-4" /> Falar pelo WhatsApp</a>
                </Button>
              )}
            </div>
          </form>
        </>
      )}
    </section>
  );
}
