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
import { Input } from "@/components/ui/input";
import { ImageIcon, Loader2, X, ChevronLeft, ChevronRight, Video as VideoIcon, FileText, BarChart3, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { CommunityPost, PostDocument, PostPoll } from "@/types/community-members";
import { postImages } from "./PostImageGallery";
import { DOC_EXT_LABEL, formatBytes } from "@/lib/communityMedia";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_IMAGES = 8;
const MAX_CONTENT = 5000;
const POLL_MIN_OPTIONS = 2;
const POLL_MAX_OPTIONS = 6;
const POLL_QUESTION_MAX = 200;
const POLL_OPTION_MAX = 80;

interface EditPostDialogProps {
  post: CommunityPost | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (payload: {
    postId: string;
    content: string;
    imageUrls: string[];
    videoUrl?: string | null;
    documents?: PostDocument[];
    poll?: PostPoll | null;
  }) => Promise<void> | void;
  isSaving?: boolean;
}

type ImageItem =
  | { kind: "existing"; url: string }
  | { kind: "new"; file: File; previewUrl: string };

export function EditPostDialog({ post, open, onOpenChange, onSave, isSaving }: EditPostDialogProps) {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [images, setImages] = useState<ImageItem[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [documents, setDocuments] = useState<PostDocument[]>([]);
  const [poll, setPoll] = useState<PostPoll | null>(null);
  const [uploading, setUploading] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [initialSignature, setInitialSignature] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pollLocked = !!post && ((post as any).poll_votes?.length ?? 0) > 0;

  // Reset state when a new post is opened
  useEffect(() => {
    if (!open || !post) return;
    const startImages: ImageItem[] = postImages(post).map((url) => ({ kind: "existing", url }));
    const startContent = post.content ?? "";
    const startVideo = (post as any).video_url ?? null;
    const startDocs: PostDocument[] = Array.isArray((post as any).documents)
      ? (post as any).documents
      : [];
    const startPoll: PostPoll | null = (post as any).poll ?? null;
    setContent(startContent);
    setImages(startImages);
    setVideoUrl(startVideo);
    setDocuments(startDocs);
    setPoll(startPoll ? { question: startPoll.question, options: startPoll.options.map((o) => ({ ...o })) } : null);
    setInitialSignature(signatureOf(startContent, startImages, startVideo, startDocs, startPoll));
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

  const isDirty = signatureOf(content, images, videoUrl, documents, poll) !== initialSignature;
  const hasSomething =
    content.trim().length > 0 || images.length > 0 || !!videoUrl || documents.length > 0 || !!poll;

  const pollError: string | null = (() => {
    if (!poll) return null;
    const q = poll.question.trim();
    if (!q) return "Escreva a pergunta da enquete.";
    if (q.length > POLL_QUESTION_MAX) return `A pergunta deve ter até ${POLL_QUESTION_MAX} caracteres.`;
    const trimmed = poll.options.map((o) => o.text.trim());
    if (trimmed.some((t) => !t)) return "Preencha todas as opções ou remova as vazias.";
    if (trimmed.some((t) => t.length > POLL_OPTION_MAX))
      return `Cada opção deve ter até ${POLL_OPTION_MAX} caracteres.`;
    if (trimmed.length < POLL_MIN_OPTIONS) return `Adicione pelo menos ${POLL_MIN_OPTIONS} opções.`;
    if (trimmed.length > POLL_MAX_OPTIONS) return `Máximo de ${POLL_MAX_OPTIONS} opções.`;
    const seen = new Set<string>();
    for (const t of trimmed) {
      const key = t.toLowerCase();
      if (seen.has(key)) return "Não use opções duplicadas.";
      seen.add(key);
    }
    return null;
  })();

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
    setVideoUrl(null);
    setDocuments([]);
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
        toast.error("Cada imagem precisa ter até 10 MB.");
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
    if (!trimmed && images.length === 0 && !videoUrl && documents.length === 0 && !poll) {
      toast.error("A publicação não pode ficar vazia. Adicione texto ou pelo menos uma imagem.");
      return;
    }
    if (poll && pollError) {
      toast.error(pollError);
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
      // Only send poll when it changed AND the DB trigger will accept it (no votes yet).
      const pollPayload: PostPoll | null | undefined = pollLocked
        ? undefined
        : poll
          ? {
              question: poll.question.trim(),
              options: poll.options.map((o) => ({ id: o.id, text: o.text.trim() })),
            }
          : null;
      await onSave({
        postId: post.id,
        content: trimmed,
        imageUrls: finalUrls,
        videoUrl,
        documents,
        poll: pollPayload,
      });
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

            {videoUrl && (
              <div className="relative rounded-md overflow-hidden border border-border/60 bg-black">
                <video src={videoUrl} controls preload="metadata" className="w-full max-h-72" />
                <button
                  type="button"
                  onClick={() => setVideoUrl(null)}
                  disabled={busy}
                  className="absolute top-2 right-2 h-7 w-7 rounded-full bg-background/90 flex items-center justify-center text-destructive shadow disabled:opacity-40"
                  aria-label="Remover vídeo"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <p className="text-[11px] text-muted-foreground px-2 py-1 bg-background flex items-center gap-1">
                  <VideoIcon className="h-3 w-3" /> Vídeo anexado
                </p>
              </div>
            )}

            {documents.length > 0 && (
              <div className="space-y-1.5">
                {documents.map((d, i) => (
                  <div
                    key={`${d.url}-${i}`}
                    className="flex items-center gap-2 p-2 rounded-md border border-border/50 bg-muted/30"
                  >
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{d.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {DOC_EXT_LABEL[d.mime] || "Documento"} · {formatBytes(d.size)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setDocuments((prev) => prev.filter((_, idx) => idx !== i))}
                      disabled={busy}
                      aria-label="Remover documento"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
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
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                className="hidden"
                onChange={handlePickImages}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Máximo {MAX_IMAGES} imagens · JPG, PNG, WEBP ou GIF até 10 MB cada.
              </p>
              {(videoUrl || documents.length > 0) && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Vídeo e documentos anexados podem ser mantidos ou removidos. Adicionar novos anexos deste tipo pela edição ainda não está disponível.
                </p>
              )}
            </div>

            {poll && (
              <div className="rounded-lg border border-primary/30 bg-primary/[0.03] p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <BarChart3 className="h-3.5 w-3.5 text-primary" />
                    Enquete
                    {pollLocked && <Lock className="h-3 w-3 text-muted-foreground" />}
                  </div>
                  {!pollLocked && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[11px] text-muted-foreground"
                      onClick={() => setPoll(null)}
                      disabled={busy}
                    >
                      Remover enquete
                    </Button>
                  )}
                </div>
                {pollLocked && (
                  <p className="text-[11px] text-muted-foreground">
                    A enquete já recebeu votos e não pode mais ser alterada. Você ainda pode editar o texto da publicação.
                  </p>
                )}
                <Input
                  value={poll.question}
                  onChange={(e) =>
                    setPoll((p) => (p ? { ...p, question: e.target.value.slice(0, POLL_QUESTION_MAX) } : p))
                  }
                  placeholder="Pergunta da enquete"
                  className="text-sm h-9"
                  aria-label="Pergunta da enquete"
                  disabled={pollLocked}
                  maxLength={POLL_QUESTION_MAX}
                />
                <div className="space-y-1.5">
                  {poll.options.map((o, idx) => (
                    <div key={o.id} className="flex items-center gap-2">
                      <Input
                        value={o.text}
                        onChange={(e) =>
                          setPoll((p) =>
                            p
                              ? {
                                  ...p,
                                  options: p.options.map((x) =>
                                    x.id === o.id ? { ...x, text: e.target.value.slice(0, POLL_OPTION_MAX) } : x,
                                  ),
                                }
                              : p,
                          )
                        }
                        placeholder={`Opção ${idx + 1}`}
                        className="text-sm h-8"
                        aria-label={`Opção ${idx + 1}`}
                        disabled={pollLocked}
                        maxLength={POLL_OPTION_MAX}
                      />
                      {!pollLocked && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() =>
                            setPoll((p) =>
                              p && p.options.length > POLL_MIN_OPTIONS
                                ? { ...p, options: p.options.filter((x) => x.id !== o.id) }
                                : p,
                            )
                          }
                          disabled={poll.options.length <= POLL_MIN_OPTIONS || busy}
                          aria-label="Remover opção"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                {!pollLocked && (
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px]"
                      onClick={() =>
                        setPoll((p) =>
                          p && p.options.length < POLL_MAX_OPTIONS
                            ? {
                                ...p,
                                options: [
                                  ...p.options,
                                  {
                                    id:
                                      typeof crypto !== "undefined" && "randomUUID" in crypto
                                        ? crypto.randomUUID()
                                        : `opt_${Math.random().toString(36).slice(2, 10)}`,
                                    text: "",
                                  },
                                ],
                              }
                            : p,
                        )
                      }
                      disabled={poll.options.length >= POLL_MAX_OPTIONS || busy}
                    >
                      + Adicionar opção
                    </Button>
                    <p className="text-[10px] text-muted-foreground">Um voto por pessoa</p>
                  </div>
                )}
                {pollError && !pollLocked && (
                  <p className="text-[11px] text-destructive">{pollError}</p>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => handleClose(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={busy || !hasSomething || !isDirty || (!!poll && !!pollError && !pollLocked)}>
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

function signatureOf(
  content: string,
  images: ImageItem[],
  videoUrl: string | null,
  documents: PostDocument[],
  poll: PostPoll | null,
): string {
  const parts = images.map((i) =>
    i.kind === "existing" ? `E:${i.url}` : `N:${i.file.name}:${i.file.size}`,
  );
  const docs = documents.map((d) => `D:${d.url}`).join("|");
  const pollSig = poll
    ? `P:${poll.question}::${poll.options.map((o) => `${o.id}:${o.text}`).join("|")}`
    : "P:";
  return `${content}||${parts.join("|")}||V:${videoUrl || ""}||${docs}||${pollSig}`;
}