import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, Sparkles } from "lucide-react";
import { useBlogCategories } from "@/hooks/useBlogAdmin";
import { signBlogPath } from "@/lib/blog/blogMedia";
import { isValidSlug, slugify, suggestExcerpt, type BlogSnapshot } from "@/lib/blog/blogUtils";

export function BlogArticleSettingsSheet({
  open,
  onOpenChange,
  agencyId,
  snap,
  patch,
  upload,
  slug,
  slugLocked,
  onSlugChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  agencyId: string;
  snap: BlogSnapshot;
  patch: (p: Partial<BlogSnapshot>) => void;
  upload: (f: File) => Promise<{ path: string; src: string }>;
  slug: string;
  slugLocked: boolean;
  onSlugChange: (v: string) => void;
}) {
  const { data: cats = [] } = useBlogCategories(agencyId);
  const [cover, setCover] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [slugDraft, setSlugDraft] = useState(slug);
  const [advanced, setAdvanced] = useState(!!(snap.seo_title || snap.seo_description));
  useEffect(() => setSlugDraft(slug), [slug]);
  useEffect(() => {
    if (snap.cover_path) signBlogPath(snap.cover_path).then(setCover);
    else setCover(null);
  }, [snap.cover_path]);

  const pickCover = async (f?: File) => {
    if (!f) return;
    setBusy(true);
    try {
      const r = await upload(f);
      setCover(r.src);
      patch({ cover_path: r.path });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const suggestion = suggestExcerpt(snap.content);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Configurações do artigo</SheetTitle>
          <SheetDescription>Tudo é salvo automaticamente no rascunho.</SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-5">
          <section className="space-y-2">
            <Label>Capa</Label>
            {cover ? <img src={cover} alt={snap.cover_alt ?? ""} className="aspect-[16/9] w-full rounded-lg object-cover" /> : <div className="flex aspect-[16/9] items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">Sem capa</div>}
            <div className="flex items-center gap-2">
              <Input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(e) => pickCover(e.target.files?.[0])} />
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
            {snap.cover_path && <Button variant="ghost" size="sm" onClick={() => patch({ cover_path: null })}>Remover capa</Button>}
            <Input value={snap.cover_alt ?? ""} onChange={(e) => patch({ cover_alt: e.target.value.slice(0, 200) })} placeholder="Descrição da capa (texto alternativo)" />
          </section>

          <section className="space-y-2">
            <Label>Resumo</Label>
            <Textarea
              rows={3}
              value={snap.excerpt_manual ? snap.excerpt ?? "" : suggestion}
              onChange={(e) => patch({ excerpt: e.target.value.slice(0, 300), excerpt_manual: true })}
            />
            <Button variant="ghost" size="sm" onClick={() => patch({ excerpt: suggestion, excerpt_manual: false })}>
              <Sparkles className="mr-1 h-4 w-4" /> Usar sugestão baseada no texto
            </Button>
          </section>

          <section className="space-y-2">
            <Label>Categoria</Label>
            <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={snap.category_id ?? ""} onChange={(e) => patch({ category_id: e.target.value || null })}>
              <option value="">Sem categoria</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </section>

          <section className="space-y-2">
            <Label>Autoria</Label>
            <Input value={snap.author_name ?? ""} onChange={(e) => patch({ author_name: e.target.value.slice(0, 120) })} placeholder="Nome de quem assina" />
          </section>

          <section className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Destaque</p>
              <p className="text-xs text-muted-foreground">Aparece em evidência no topo do blog.</p>
            </div>
            <Switch checked={!!snap.featured} onCheckedChange={(v) => patch({ featured: v })} />
          </section>

          <section className="space-y-2">
            <Label>Endereço do artigo</Label>
            <div className="flex gap-2">
              <Input value={slugDraft} disabled={slugLocked} onChange={(e) => setSlugDraft(slugify(e.target.value))} />
              {!slugLocked && <Button variant="outline" disabled={!isValidSlug(slugDraft) || slugDraft === slug} onClick={() => onSlugChange(slugDraft)}>Aplicar</Button>}
            </div>
            <p className="text-xs text-muted-foreground">/blog/{slug}{slugLocked ? " — fixo depois da primeira publicação, para não quebrar links." : ""}</p>
          </section>

          <section className="space-y-2">
            <Label>Convite ao final do artigo (opcional)</Label>
            <Input value={snap.cta_title ?? ""} onChange={(e) => patch({ cta_title: e.target.value.slice(0, 120) })} placeholder="Usa o convite padrão do blog se vazio" />
            <Textarea rows={2} value={snap.cta_text ?? ""} onChange={(e) => patch({ cta_text: e.target.value.slice(0, 400) })} />
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>SEO avançado</Label>
              <Switch checked={advanced} onCheckedChange={setAdvanced} />
            </div>
            {advanced && (
              <>
                <Input value={snap.seo_title ?? ""} onChange={(e) => patch({ seo_title: e.target.value.slice(0, 70) })} placeholder="Título para o Google (até 70 caracteres)" />
                <Textarea rows={2} value={snap.seo_description ?? ""} onChange={(e) => patch({ seo_description: e.target.value.slice(0, 160) })} placeholder="Descrição para o Google (até 160 caracteres)" />
              </>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
