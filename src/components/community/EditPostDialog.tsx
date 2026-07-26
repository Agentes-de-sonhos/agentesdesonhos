import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ImageIcon, Loader2, X, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { CommunityPost } from "@/types/community-members";
import { postImages } from "./PostImageGallery";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGES = 6;
const MAX_CONTENT = 5000;

interface EditPostDialogProps {
  post: CommunityPost | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (payload: { postId: string; content: string; imageUrls: string[] }) => Promise<void> | void;
  isSaving?: boolean;
}

type ImageItem =
  | { kind: "existing"; url: string }
  | { kind: "new"; file: File; previewUrl: string };

export function EditPostDialog({ post, open, onOpenChange, onSave, isSaving }: EditPostDialogProps) {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [images, setImages] = useState<ImageItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [initialSignature, setInitialSignature] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when a new post is opened
  useEffect(() => {
    if (!open || !post) return;
    const startImages: ImageItem[] = postImages(post).map((url) => ({ kind: "existing", url }));
    const startContent = post.content ?? "";
    setContent(startContent);
    setImages(startImages);
    setInitialSignature(signatureOf(startContent, startImages));
  }, [open, post]);

  // Revoke object URLs on unmount / change
  useEffect(() => {
    return () => {
      images.forEach((i) => {
        if (i.kind === "new") URL.revokeObjectURL(i.previewUrl);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isDirty = signatureOf(content, images) !== initialSignature;
  const hasSomething = content.trim().length > 0 || images.length > 0;

  const handleClose = (nextOpen: boolean) => {
    if (nextOpen) {
      onOpenChange(true);
      return;
    }
    if (isDirty) {
      setConfirmDiscard(true);
      return;
    }
    finalizeClose();
  };

  const finalizeClose = () => {
    images.forEach((i) => {
      if (i.kind === "new") URL.revokeObjectURL(i.previewUrl);
    });
    setImages([]);
    setContent("");
    onOpenChange(false);
  };

  const handlePickImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length === 0) return;
    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      toast.error(`Você pode anexar no máximo ${MAX_IMAGES} imagens.`);
      return;
    }
    const accepted: ImageItem[] = [];
    for (const file of files.slice(0, remaining)) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.error("Use imagens JPG, PNG ou WEBP.");
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        toast.error("Cada imagem precisa ter até 5 MB.");
        continue;
      }
      accepted.push({ kind: "new", file, previewUrl: URL.createObjectURL(file) });
    }
    if (accepted.length) setImages((prev) => [...prev, ...accepted]);
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      const target = prev[index];
      if (target?.kind === "new") URL.revokeObjectURL(target.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const move = (index: number, dir: -1 | 1) => {
    setImages((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleSave = async () => {
    if (!post || !user) return;
    const trimmed = content.trim();
    if (!trimmed && images.length === 0) {
      toast.error("A publicação não pode ficar vazia. Adicione texto ou pelo menos uma imagem.");
      return;
    }
    try {
      setUploading(true);
      const finalUrls: string[] = [];
      for (const item of images) {
        if (item.kind === "existing") {
          finalUrls.push(item.url);
        } else {
          const ext = item.file.name.split(".").pop()?.toLowerCase() || "jpg";
          const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from("community-feed")
            .upload(path, item.file, { contentType: item.file.type });
          if (upErr) throw upErr;
          const { data } = supabase.storage.from("community-feed").getPublicUrl(path);
          finalUrls.push(data.publicUrl);
        }
      }
      await onSave({ postId: post.id, content: trimmed, imageUrls: finalUrls });
      finalizeClose();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar alterações.");
    } finally {
      setUploading(false);
    }
  };

  const busy = uploading || !!isSaving;

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar publicação</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Compartilhe uma dúvida ou oportunidade com a comunidade..."
              className="resize-none min-h-[140px]"
              maxLength={MAX_CONTENT}
            />
            <p className="text-[11px] text-muted-foreground text-right">
              {content.length}/{MAX_CONTENT}
            </p>

            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {images.map((img, i) => {
                  const url = img.kind === "existing" ? img.url : img.previewUrl;
                  return (
                    <div
                      key={`${img.kind}-${i}-${url}`}
                      className="relative group rounded-lg overflow-hidden border border-border/60 bg-muted/30 aspect-square"
                    >
                      <img src={url} alt={`Imagem ${i + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition" />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute top-1 right-1 h-6 w-6 rounded-full bg-background/90 flex items-center justify-center text-destructive shadow"
                        aria-label="Remover imagem"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                      <div className="absolute bottom-1 left-1 flex gap-1">
                        <button
                          type="button"
                          onClick={() => move(i, -1)}
                          disabled={i === 0}
                          className="h-6 w-6 rounded-full bg-background/90 flex items-center justify-center disabled:opacity-40"
                          aria-label="Mover para a esquerda"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => move(i, 1)}
                          disabled={i === images.length - 1}
                          className="h-6 w-6 rounded-full bg-background/90 flex items-center justify-center disabled:opacity-40"
                          aria-label="Mover para a direita"
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px]">
                        {i + 1}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy || images.length >= MAX_IMAGES}
              >
                <ImageIcon className="h-4 w-4 mr-2" />
                Adicionar fotos
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={handlePickImages}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Máximo {MAX_IMAGES} imagens · JPG, PNG ou WEBP até 5 MB cada.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => handleClose(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={busy || !hasSomething || !isDirty}>
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Salvar alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar alterações?</AlertDialogTitle>
            <AlertDialogDescription>
              Você possui alterações não salvas. Deseja descartar as alterações?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmDiscard(false);
                finalizeClose();
              }}
            >
              Descartar alterações
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function signatureOf(content: string, images: ImageItem[]): string {
  const parts = images.map((i) => (i.kind === "existing" ? `E:${i.url}` : `N:${i.file.name}:${i.file.size}`));
  return `${content}||${parts.join("|")}`;
}