import { useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Bold, Heading2, Image as ImageIcon, Images, Italic, Link2, List, ListOrdered, Loader2, Plus, Quote, Type, Youtube } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseYouTubeId, safeHref } from "@/lib/blog/blogUtils";

type Uploader = (file: File) => Promise<{ path: string; src: string }>;

export function BlogEditorToolbar({ editor, upload }: { editor: Editor; upload: Uploader }) {
  const [dialog, setDialog] = useState<null | "image" | "gallery" | "youtube" | "link">(null);
  const btn = (active: boolean) => cn("h-8 w-8", active && "bg-muted");

  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 border-b bg-background/95 py-2 backdrop-blur">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" className="mr-1"><Plus className="mr-1 h-4 w-4" /> Adicionar</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => editor.chain().focus().setParagraph().run()}><Type className="mr-2 h-4 w-4" /> Texto</DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="mr-2 h-4 w-4" /> Subtítulo</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setDialog("image")}><ImageIcon className="mr-2 h-4 w-4" /> Imagem</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setDialog("gallery")}><Images className="mr-2 h-4 w-4" /> Galeria</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setDialog("youtube")}><Youtube className="mr-2 h-4 w-4" /> Vídeo do YouTube</DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote className="mr-2 h-4 w-4" /> Citação</DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="mr-2 h-4 w-4" /> Lista</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button type="button" size="icon" variant="ghost" className={btn(editor.isActive("bold"))} aria-label="Negrito" onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="h-4 w-4" /></Button>
      <Button type="button" size="icon" variant="ghost" className={btn(editor.isActive("italic"))} aria-label="Itálico" onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" /></Button>
      <Button type="button" size="icon" variant="ghost" className={btn(editor.isActive("heading", { level: 2 }))} aria-label="Subtítulo" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="h-4 w-4" /></Button>
      <Button type="button" size="icon" variant="ghost" className={btn(editor.isActive("link"))} aria-label="Link" onClick={() => setDialog("link")}><Link2 className="h-4 w-4" /></Button>
      <Button type="button" size="icon" variant="ghost" className={btn(editor.isActive("bulletList"))} aria-label="Lista" onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="h-4 w-4" /></Button>
      <Button type="button" size="icon" variant="ghost" className={btn(editor.isActive("orderedList"))} aria-label="Lista numerada" onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="h-4 w-4" /></Button>
      <Button type="button" size="icon" variant="ghost" className={btn(editor.isActive("blockquote"))} aria-label="Citação" onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote className="h-4 w-4" /></Button>

      <ImageDialog open={dialog === "image"} onClose={() => setDialog(null)} upload={upload} onInsert={(img) => editor.chain().focus().insertContent({ type: "blogImage", attrs: img }).run()} />
      <GalleryDialog open={dialog === "gallery"} onClose={() => setDialog(null)} upload={upload} onInsert={(images) => editor.chain().focus().insertContent({ type: "blogGallery", attrs: { images } }).run()} />
      <YoutubeDialog open={dialog === "youtube"} onClose={() => setDialog(null)} onInsert={(videoId) => editor.chain().focus().insertContent({ type: "blogYoutube", attrs: { videoId } }).run()} />
      <LinkDialog open={dialog === "link"} onClose={() => setDialog(null)} initial={editor.getAttributes("link").href ?? ""} onApply={(href) => {
        if (!href) editor.chain().focus().extendMarkRange("link").unsetLink().run();
        else editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
      }} />
    </div>
  );
}

function ImageDialog({ open, onClose, upload, onInsert }: { open: boolean; onClose: () => void; upload: Uploader; onInsert: (a: { path: string; src: string; alt: string; caption: string }) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState("");
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!file) return toast.error("Escolha uma imagem.");
    if (!alt.trim()) return toast.error("Descreva a imagem (texto alternativo) para acessibilidade e SEO.");
    setBusy(true);
    try {
      const r = await upload(file);
      onInsert({ ...r, alt: alt.trim(), caption: caption.trim() });
      setFile(null); setAlt(""); setCaption("");
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Adicionar imagem</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <div className="space-y-1"><Label>Descrição da imagem (obrigatória)</Label><Input value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Ex.: Praia de águas claras em Maragogi" /></div>
          <div className="space-y-1"><Label>Legenda (opcional)</Label><Input value={caption} onChange={(e) => setCaption(e.target.value)} /></div>
          <Button className="w-full" disabled={busy} onClick={submit}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Inserir imagem</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function GalleryDialog({ open, onClose, upload, onInsert }: { open: boolean; onClose: () => void; upload: Uploader; onInsert: (imgs: { path: string; src: string; alt: string; caption: string }[]) => void }) {
  const [items, setItems] = useState<{ file: File; alt: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (items.length < 2) return toast.error("Escolha pelo menos 2 imagens.");
    if (items.some((i) => !i.alt.trim())) return toast.error("Descreva todas as imagens.");
    setBusy(true);
    try {
      const out = [];
      for (const i of items) out.push({ ...(await upload(i.file)), alt: i.alt.trim(), caption: "" });
      onInsert(out);
      setItems([]);
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Adicionar galeria</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(e) => setItems(Array.from(e.target.files ?? []).slice(0, 12).map((file) => ({ file, alt: "" })))} />
          {items.map((it, idx) => (
            <div key={idx} className="space-y-1">
              <Label className="text-xs">{it.file.name}</Label>
              <Input value={it.alt} placeholder="Descrição da imagem" onChange={(e) => setItems((arr) => arr.map((x, j) => (j === idx ? { ...x, alt: e.target.value } : x)))} />
            </div>
          ))}
          <Button className="w-full" disabled={busy} onClick={submit}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Inserir galeria</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function YoutubeDialog({ open, onClose, onInsert }: { open: boolean; onClose: () => void; onInsert: (id: string) => void }) {
  const [url, setUrl] = useState("");
  const id = parseYouTubeId(url);
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Vídeo do YouTube</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" />
          {url && !id && <p className="text-xs text-destructive">Cole um link válido do YouTube.</p>}
          <Button className="w-full" disabled={!id} onClick={() => { onInsert(id!); setUrl(""); onClose(); }}>Inserir vídeo</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LinkDialog({ open, onClose, initial, onApply }: { open: boolean; onClose: () => void; initial: string; onApply: (href: string | null) => void }) {
  const [href, setHref] = useState(initial);
  const ref = useRef(initial);
  if (open && ref.current !== initial) { ref.current = initial; setHref(initial); }
  const valid = !href || !!safeHref(href.match(/^[a-z]+:|^\/|^#/i) ? href : `https://${href}`);
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Link</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input value={href} onChange={(e) => setHref(e.target.value)} placeholder="https://…" />
          {!valid && <p className="text-xs text-destructive">Use um endereço http(s), e-mail ou telefone.</p>}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => { onApply(null); onClose(); }}>Remover link</Button>
            <Button className="flex-1" disabled={!valid} onClick={() => { const h = href.trim(); onApply(h ? safeHref(h.match(/^[a-z]+:|^\/|^#/i) ? h : `https://${h}`) : null); onClose(); }}>Aplicar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
