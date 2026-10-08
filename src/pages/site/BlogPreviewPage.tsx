import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Loader2, Monitor, Smartphone, ArrowLeft } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSiteBlogAccess } from "@/hooks/useSiteBlogAccess";
import { useBlogCategories, type BlogPostRow } from "@/hooks/useBlogAdmin";
import { BlogArticleView } from "@/components/blog/BlogArticleView";
import { signBlogPaths } from "@/lib/blog/blogMedia";
import { collectMediaPaths, statusLabel, withSignedSources } from "@/lib/blog/blogUtils";
import { cn } from "@/lib/utils";

/** Prévia protegida (exige login e permissão; noindex) do RASCUNHO de trabalho. */
export default function BlogPreviewPage() {
  const { enabled, canManage, agencyId, loading } = useSiteBlogAccess();
  if (loading) return <DashboardLayout><div className="flex justify-center p-16"><Loader2 className="h-6 w-6 animate-spin" /></div></DashboardLayout>;
  if (!enabled || !canManage || !agencyId) return <Navigate to="/dashboard" replace />;
  return <DashboardLayout><Preview agencyId={agencyId} /></DashboardLayout>;
}

function Preview({ agencyId }: { agencyId: string }) {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<BlogPostRow | null>(null);
  const [cover, setCover] = useState<string | null>(null);
  const [mode, setMode] = useState<"desktop" | "mobile">("desktop");
  const { data: cats = [] } = useBlogCategories(agencyId);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).from("site_blog_posts").select("*").eq("id", id).eq("agency_id", agencyId).maybeSingle();
      if (!data) return;
      const row = data as BlogPostRow;
      const paths = [...collectMediaPaths(row.draft.content), ...(row.draft.cover_path ? [row.draft.cover_path] : [])];
      const map = await signBlogPaths(paths);
      if (row.draft.content) row.draft = { ...row.draft, content: withSignedSources(row.draft.content, map) };
      setCover(row.draft.cover_path ? map[row.draft.cover_path] ?? null : null);
      setPost(row);
    })();
  }, [id, agencyId]);

  if (!post) return <div className="flex justify-center p-16"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  return (
    <div className="space-y-4 p-4">
      <Helmet><meta name="robots" content="noindex,nofollow" /></Helmet>
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="ghost" size="sm"><Link to={`/site/blog/${post.id}`}><ArrowLeft className="mr-1 h-4 w-4" /> Voltar ao editor</Link></Button>
        <span className="text-xs text-muted-foreground">Prévia do rascunho · {statusLabel(post.status)} · não visível ao público</span>
        <div className="ml-auto flex gap-1">
          <Button size="sm" variant={mode === "desktop" ? "default" : "outline"} onClick={() => setMode("desktop")}><Monitor className="mr-1 h-4 w-4" /> Computador</Button>
          <Button size="sm" variant={mode === "mobile" ? "default" : "outline"} onClick={() => setMode("mobile")}><Smartphone className="mr-1 h-4 w-4" /> Celular</Button>
        </div>
      </div>
      <div className={cn("mx-auto overflow-y-auto rounded-2xl border bg-background shadow-sm transition-all", mode === "mobile" ? "h-[780px] w-[390px]" : "w-full max-w-5xl")}>
        <BlogArticleView
          title={post.draft.title ?? ""}
          coverUrl={cover}
          coverAlt={post.draft.cover_alt}
          author={post.draft.author_name}
          categoryName={cats.find((c) => c.id === post.draft.category_id)?.name}
          publishedAt={post.published_at}
          updatedAt={post.draft_updated_at}
          content={post.draft.content}
        />
      </div>
    </div>
  );
}
