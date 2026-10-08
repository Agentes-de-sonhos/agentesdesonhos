import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Copy, Eye, FileText, Loader2, MoreHorizontal, Pencil, Plus, Search, Settings2, Tags, Undo2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSiteBlogAccess } from "@/hooks/useSiteBlogAccess";
import { blogAction, ensureUniqueSlug, useBlogCategories, useBlogPosts, type BlogPostRow } from "@/hooks/useBlogAdmin";
import { collectMediaPaths, formatInZone, statusLabel, type BlogSnapshot } from "@/lib/blog/blogUtils";
import { copyBlogMedia, signBlogPaths } from "@/lib/blog/blogMedia";
import { BlogCategoriesDialog, BlogSettingsDialog } from "@/components/blog/BlogPanelDialogs";
import { useAuth } from "@/hooks/useAuth";

type Tab = "published" | "draft" | "scheduled";

export default function BlogPanel() {
  const { enabled, canManage, agencyId, loading } = useSiteBlogAccess();
  if (loading) return <DashboardLayout><div className="flex justify-center p-16"><Loader2 className="h-6 w-6 animate-spin" /></div></DashboardLayout>;
  if (!enabled || !canManage || !agencyId) return <Navigate to="/dashboard" replace />;
  return <DashboardLayout><BlogPanelInner agencyId={agencyId} /></DashboardLayout>;
}

function BlogPanelInner({ agencyId }: { agencyId: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: posts = [], isLoading } = useBlogPosts(agencyId);
  const { data: categories = [] } = useBlogCategories(agencyId);
  const [tab, setTab] = useState<Tab>("published");
  const [q, setQ] = useState("");
  const [catOpen, setCatOpen] = useState(false);
  const [setOpen, setSetOpen] = useState(false);
  const [covers, setCovers] = useState<Record<string, string>>({});

  const catName = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);

  const inTab = (p: BlogPostRow) =>
    tab === "published" ? p.status === "published" : tab === "scheduled" ? p.status === "scheduled" : p.status === "draft" || p.status === "unpublished";
  const visible = posts.filter(inTab).filter((p) => !q || (p.draft.title ?? "").toLowerCase().includes(q.toLowerCase()));
  const counts = {
    published: posts.filter((p) => p.status === "published").length,
    draft: posts.filter((p) => p.status === "draft" || p.status === "unpublished").length,
    scheduled: posts.filter((p) => p.status === "scheduled").length,
  };

  // Capas: URLs assinadas da mídia privada da agência.
  useEffect(() => {
    const paths = posts.map((p) => p.draft.cover_path).filter(Boolean) as string[];
    const missing = paths.filter((p) => !covers[p]);
    if (missing.length) signBlogPaths(missing).then((m) => setCovers((c) => ({ ...c, ...m })));
  }, [posts]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = () => qc.invalidateQueries({ queryKey: ["blog-posts", agencyId] });

  const duplicate = async (p: BlogPostRow) => {
    try {
      const id = crypto.randomUUID();
      const slug = await ensureUniqueSlug(agencyId, `${p.slug}-copia`);
      const { error } = await (supabase as any).from("site_blog_posts").insert({ id, agency_id: agencyId, slug, draft: {}, created_by: user?.id });
      if (error) throw error;
      const paths = [...collectMediaPaths(p.draft.content), ...(p.draft.cover_path ? [p.draft.cover_path] : [])];
      const moved = await copyBlogMedia(paths, p.id, id);
      const rewritten = JSON.parse(JSON.stringify(p.draft), (_k, v) => (typeof v === "string" && moved[v] ? moved[v] : v)) as BlogSnapshot;
      rewritten.title = `${p.draft.title ?? "Artigo"} (cópia)`;
      rewritten.featured = false;
      await (supabase as any).from("site_blog_posts").update({ draft: rewritten, draft_updated_at: new Date().toISOString() }).eq("id", id);
      toast.success("Cópia criada como rascunho.");
      navigate(`/site/blog/${id}`);
    } catch {
      toast.error("Não foi possível duplicar o artigo.");
    }
  };

  const unpublish = async (p: BlogPostRow) => {
    try {
      await blogAction(p.id, "unpublish");
      toast.success("Artigo retirado do ar. O conteúdo foi mantido.");
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Site</p>
          <h1 className="font-display text-2xl font-semibold">Blog</h1>
          <p className="text-sm text-muted-foreground">Escreva artigos que aparecem no site da sua agência.</p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Mais opções do blog"><Settings2 className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setCatOpen(true)}><Tags className="mr-2 h-4 w-4" /> Categorias</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSetOpen(true)}><Settings2 className="mr-2 h-4 w-4" /> Configurações do blog</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button asChild><Link to="/site/blog/novo"><Plus className="mr-1 h-4 w-4" /> Novo artigo</Link></Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
          <TabsList>
            <TabsTrigger value="published">Publicados ({counts.published})</TabsTrigger>
            <TabsTrigger value="draft">Rascunhos ({counts.draft})</TabsTrigger>
            <TabsTrigger value="scheduled">Agendados ({counts.scheduled})</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative ml-auto w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar artigo" className="pl-9" aria-label="Buscar artigo" />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center">
          <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-3 text-lg font-semibold">Seu blog ainda não tem artigos</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Conte dicas de destinos, novidades e experiências dos seus clientes. Tudo é salvo automaticamente como rascunho e só aparece no site quando você publicar.
          </p>
          <Button asChild className="mt-5"><Link to="/site/blog/novo"><Plus className="mr-1 h-4 w-4" /> Escrever o primeiro artigo</Link></Button>
        </div>
      ) : visible.length === 0 ? (
        <p className="rounded-xl border p-8 text-center text-sm text-muted-foreground">Nenhum artigo nesta aba.</p>
      ) : (
        <ul className="divide-y rounded-2xl border">
          {visible.map((p) => {
            const cover = p.draft.cover_path ? covers[p.draft.cover_path] : null;
            const date = p.status === "scheduled" && p.scheduled_at
              ? `Agendado para ${formatInZone(p.scheduled_at, p.schedule_timezone ?? undefined)} (${p.schedule_timezone})`
              : p.published_at
                ? `Publicado em ${formatInZone(p.published_at)}`
                : `Editado em ${formatInZone(p.draft_updated_at)}`;
            return (
              <li key={p.id} className="flex items-center gap-4 p-3 md:p-4">
                <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {cover ? <img src={cover} alt={p.draft.cover_alt ?? ""} className="h-full w-full object-cover" /> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <Link to={`/site/blog/${p.id}`} className="line-clamp-1 font-medium hover:underline">{p.draft.title || "Sem título"}</Link>
                  <p className="text-xs text-muted-foreground">
                    {p.draft.category_id ? `${catName.get(p.draft.category_id) ?? "—"} · ` : ""}{date}
                  </p>
                </div>
                <Badge variant={p.status === "published" ? "default" : "secondary"}>{statusLabel(p.status)}</Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Ações do artigo"><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate(`/site/blog/${p.id}`)}><Pencil className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => duplicate(p)}><Copy className="mr-2 h-4 w-4" /> Duplicar como rascunho</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate(`/site/blog/${p.id}/previa`)}><Eye className="mr-2 h-4 w-4" /> Visualizar</DropdownMenuItem>
                    {(p.status === "published" || p.status === "scheduled") && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => unpublish(p)}><Undo2 className="mr-2 h-4 w-4" /> Retirar do ar</DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            );
          })}
        </ul>
      )}

      <BlogCategoriesDialog open={catOpen} onOpenChange={setCatOpen} agencyId={agencyId} />
      <BlogSettingsDialog open={setOpen} onOpenChange={setSetOpen} agencyId={agencyId} />
    </div>
  );
}
