import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, ArrowLeft, Check, Eye, History, Loader2, Settings2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSiteBlogAccess } from "@/hooks/useSiteBlogAccess";
import { ensureUniqueSlug, useBlogSettings, type BlogPostRow } from "@/hooks/useBlogAdmin";
import { blogExtensions } from "@/components/blog/editor/blogExtensions";
import { BlogEditorToolbar } from "@/components/blog/editor/BlogEditorToolbar";
import { BlogArticleSettingsSheet } from "@/components/blog/editor/BlogArticleSettingsSheet";
import { BlogPublishControls } from "@/components/blog/editor/BlogPublishControls";
import { BlogVersionsDialog } from "@/components/blog/editor/BlogVersionsDialog";
import { uploadBlogImage, signBlogPaths } from "@/lib/blog/blogMedia";
import { collectMediaPaths, slugify, statusLabel, suggestExcerpt, withSignedSources, type BlogSnapshot, type TiptapNode } from "@/lib/blog/blogUtils";

const sb = supabase as any;
type SaveState = "idle" | "pending" | "saving" | "saved" | "error";

export default function BlogEditorPage() {
  const { enabled, canManage, agencyId, loading } = useSiteBlogAccess();
  if (loading) return <DashboardLayout><div className="flex justify-center p-16"><Loader2 className="h-6 w-6 animate-spin" /></div></DashboardLayout>;
  if (!enabled || !canManage || !agencyId) return <Navigate to="/dashboard" replace />;
  return <DashboardLayout><EditorLoader agencyId={agencyId} /></DashboardLayout>;
}

function EditorLoader({ agencyId }: { agencyId: string }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: settings } = useBlogSettings(agencyId);
  const [post, setPost] = useState<BlogPostRow | null>(null);
  const [failed, setFailed] = useState(false);
  const creating = useRef(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (id === "novo") {
        // O rascunho é criado ANTES de qualquer upload (a mídia pertence ao artigo).
        if (creating.current) return;
        creating.current = true;
        const newId = crypto.randomUUID();
        const slug = await ensureUniqueSlug(agencyId, `rascunho-${newId.slice(0, 6)}`);
        const draft: BlogSnapshot = { title: "", content: { type: "doc", content: [{ type: "paragraph" }] }, author_name: settings?.default_author_name ?? user?.user_metadata?.name ?? "" };
        const { error } = await sb.from("site_blog_posts").insert({ id: newId, agency_id: agencyId, slug, draft, created_by: user?.id });
        if (error) { toast.error("Não foi possível criar o rascunho."); setFailed(true); return; }
        navigate(`/site/blog/${newId}`, { replace: true });
        return;
      }
      const { data, error } = await sb.from("site_blog_posts").select("*").eq("id", id).eq("agency_id", agencyId).maybeSingle();
      if (!alive) return;
      if (error || !data) { setFailed(true); return; }
      const row = data as BlogPostRow;
      const paths = collectMediaPaths(row.draft.content);
      if (paths.length && row.draft.content) {
        const map = await signBlogPaths(paths);
        row.draft = { ...row.draft, content: withSignedSources(row.draft.content, map) };
      }
      setPost(row);
    })();
    return () => { alive = false; };
  }, [id, agencyId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (failed) return <div className="p-10 text-center text-sm text-muted-foreground">Artigo não encontrado. <Link className="underline" to="/site/blog">Voltar ao blog</Link></div>;
  if (!post) return <div className="flex justify-center p-16"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  return <BlogEditor key={post.id} initial={post} agencyId={agencyId} defaultTz={settings?.timezone} />;
}

function BlogEditor({ initial, agencyId, defaultTz }: { initial: BlogPostRow; agencyId: string; defaultTz?: string }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [post, setPost] = useState(initial);
  const [snap, setSnap] = useState<BlogSnapshot>(initial.draft);
  const [slug, setSlug] = useState(initial.slug);
  const [slugManual, setSlugManual] = useState(!!initial.published_at || !initial.slug.startsWith("rascunho-"));
  const [save, setSave] = useState<SaveState>("idle");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const snapRef = useRef(snap);
  const slugRef = useRef(slug);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const inflight = useRef<Promise<boolean> | null>(null);
  const dirty = useRef(false);

  const upload = useCallback((file: File) => uploadBlogImage(agencyId, post.id, file), [agencyId, post.id]);

  const persist = useCallback(async (): Promise<boolean> => {
    if (inflight.current) await inflight.current;
    if (!dirty.current) return true;
    dirty.current = false;
    setSave("saving");
    const run = (async () => {
      const s = snapRef.current;
      const payload: BlogSnapshot = { ...s, excerpt: s.excerpt_manual ? s.excerpt : suggestExcerpt(s.content) };
      const update: Record<string, unknown> = { draft: payload, draft_updated_at: new Date().toISOString() };
      if (!post.published_at) {
        const wanted = slugManual ? slugRef.current : slugify(s.title || "") ;
        if (wanted && wanted !== post.slug) update.slug = await ensureUniqueSlug(agencyId, wanted, post.id);
      }
      const { data, error } = await sb.from("site_blog_posts").update(update).eq("id", post.id).select("*").single();
      if (error) {
        dirty.current = true;
        setSave("error");
        return false;
      }
      setPost((p) => ({ ...p, ...data, draft: p.draft }));
      if (data.slug !== slugRef.current) { slugRef.current = data.slug; setSlug(data.slug); }
      if (!dirty.current) setSave("saved");
      return true;
    })();
    inflight.current = run;
    const ok = await run;
    inflight.current = null;
    return ok;
  }, [agencyId, post.id, post.published_at, post.slug, slugManual]);

  const schedule = useCallback(() => {
    dirty.current = true;
    setSave("pending");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void persist(), 1200);
  }, [persist]);

  const patch = useCallback((p: Partial<BlogSnapshot>) => {
    setSnap((s) => {
      const next = { ...s, ...p };
      snapRef.current = next;
      return next;
    });
    schedule();
  }, [schedule]);

  const editor = useEditor({
    extensions: blogExtensions(),
    content: (initial.draft.content as any) ?? { type: "doc", content: [{ type: "paragraph" }] },
    editorProps: { attributes: { class: "blog-prose blog-editor min-h-[50vh] focus:outline-none", "aria-label": "Conteúdo do artigo" } },
    onUpdate: ({ editor }) => patch({ content: editor.getJSON() as TiptapNode }),
  });

  // Erro: nova tentativa automática.
  useEffect(() => {
    if (save !== "error") return;
    const t = setTimeout(() => { dirty.current = true; void persist(); }, 5000);
    return () => clearTimeout(t);
  }, [save, persist]);

  // Proteção ao sair com alterações pendentes.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty.current || inflight.current) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", handler);
    return () => {
      window.removeEventListener("beforeunload", handler);
      clearTimeout(timer.current);
      if (dirty.current) void persist();
    };
  }, [persist]);

  const flush = async () => {
    clearTimeout(timer.current);
    const ok = await persist();
    if (!ok) toast.error("Não foi possível salvar o rascunho. Tente novamente.");
    return ok;
  };

  const reload = async () => {
    const { data } = await sb.from("site_blog_posts").select("*").eq("id", post.id).single();
    if (!data) return;
    const row = data as BlogPostRow;
    const map = await signBlogPaths(collectMediaPaths(row.draft.content));
    const content = row.draft.content ? withSignedSources(row.draft.content, map) : undefined;
    setPost(row);
    const next = { ...row.draft, content };
    snapRef.current = next;
    setSnap(next);
    editor?.commands.setContent((content as any) ?? "", { emitUpdate: false });
    qc.invalidateQueries({ queryKey: ["blog-posts", agencyId] });
  };

  const goBack = async () => { await flush(); navigate("/site/blog"); };

  const pendingChanges = post.status === "published" && post.published_updated_at && new Date(post.draft_updated_at) > new Date(post.published_updated_at);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-24 pt-4 md:px-8">
      <div className="flex flex-wrap items-center gap-2 border-b pb-3">
        <Button variant="ghost" size="sm" onClick={goBack}><ArrowLeft className="mr-1 h-4 w-4" /> Blog</Button>
        <Badge variant="secondary">{statusLabel(post.status)}</Badge>
        {pendingChanges && <Badge variant="outline">Alterações não publicadas</Badge>}
        <SaveIndicator state={save} />
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setVersionsOpen(true)}><History className="mr-1 h-4 w-4" /> Versões</Button>
          <Button variant="ghost" size="sm" onClick={async () => { await flush(); navigate(`/site/blog/${post.id}/previa`); }}><Eye className="mr-1 h-4 w-4" /> Prévia</Button>
          <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}><Settings2 className="mr-1 h-4 w-4" /> Configurações do artigo</Button>
          <BlogPublishControls post={post} defaultTz={defaultTz} beforeAction={flush} onDone={reload} />
        </div>
      </div>

      <textarea
        value={snap.title ?? ""}
        onChange={(e) => patch({ title: e.target.value.replace(/\n/g, " ").slice(0, 160) })}
        placeholder="Título do artigo"
        rows={1}
        aria-label="Título do artigo"
        className="mt-8 w-full resize-none bg-transparent font-display text-3xl font-semibold leading-tight outline-none placeholder:text-muted-foreground/60 md:text-4xl"
      />
      {editor && <BlogEditorToolbar editor={editor} upload={upload} />}
      <EditorContent editor={editor} className="mt-4" />

      <BlogArticleSettingsSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        agencyId={agencyId}
        snap={snap}
        patch={patch}
        upload={upload}
        slug={slug}
        slugLocked={!!post.published_at}
        onSlugChange={(v) => { setSlugManual(true); slugRef.current = v; setSlug(v); schedule(); }}
      />
      <BlogVersionsDialog open={versionsOpen} onOpenChange={setVersionsOpen} postId={post.id} beforeRestore={flush} onRestored={reload} />
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "saving" || state === "pending") return <span className="flex items-center gap-1 text-xs text-muted-foreground" aria-live="polite"><Loader2 className="h-3 w-3 animate-spin" /> Salvando…</span>;
  if (state === "saved") return <span className="flex items-center gap-1 text-xs text-muted-foreground" aria-live="polite"><Check className="h-3 w-3" /> Rascunho salvo</span>;
  if (state === "error") return <span className="flex items-center gap-1 text-xs text-destructive" aria-live="assertive"><AlertCircle className="h-3 w-3" /> Erro ao salvar — tentando novamente</span>;
  return null;
}
