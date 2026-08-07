import { useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Send, Loader2, Image as ImageIcon, Video, FileText, BarChart3, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  IMAGE_TYPES,
  VIDEO_TYPES,
  DOC_TYPES,
  DOC_EXT_LABEL,
  MAX_IMAGES,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  MAX_VIDEO_SECONDS,
  MAX_DOCS,
  MAX_DOC_BYTES,
  formatBytes,
  probeVideo,
  uploadCommunityFile,
} from "@/lib/communityMedia";
import type { PostDocument, PostPoll } from "@/types/community-members";

interface CreatePostPayload {
  content: string;
  tags: string[];
  imageUrls?: string[];
  videoUrl?: string | null;
  documents?: PostDocument[];
  poll?: PostPoll | null;
}

interface CreatePostFormProps {
  onSubmit: (data: CreatePostPayload) => void;
  isCreating: boolean;
  /** Starts as a single-line box and expands on focus (used in the dashboard). */
  collapsible?: boolean;
}

type PickedImage = { file: File; previewUrl: string };
type PickedVideo = { file: File; previewUrl: string; duration: number };
type PickedDoc = { file: File };
type PollDraftOption = { id: string; text: string };

const VIDEO_EXTS = ["mp4", "mov", "webm"];
const DOC_EXTS = ["pdf", "docx", "xlsx", "pptx"];
const POLL_MIN_OPTIONS = 2;
const POLL_MAX_OPTIONS = 6;
const POLL_QUESTION_MAX = 200;
const POLL_OPTION_MAX = 80;

const newOption = (): PollDraftOption => ({
  id: (typeof crypto !== "undefined" && "randomUUID" in crypto)
    ? crypto.randomUUID()
    : `opt_${Math.random().toString(36).slice(2, 10)}`,
  text: "",
});

function extOf(name: string) {
  return name.split(".").pop()?.toLowerCase() || "";
}

export function CreatePostForm({ onSubmit, isCreating, collapsible = false }: CreatePostFormProps) {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [expanded, setExpanded] = useState(!collapsible);
  const [images, setImages] = useState<PickedImage[]>([]);
  const [video, setVideo] = useState<PickedVideo | null>(null);
  const [docs, setDocs] = useState<PickedDoc[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  const [pollOpen, setPollOpen] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<PollDraftOption[]>([]);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const { data: profile } = useQuery({
    queryKey: ["my-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("profiles")
        .select("name, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const name = profile?.name || "Você";
  const initials = name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

  const hasMedia = images.length > 0 || video !== null || docs.length > 0;

  const pollValidation = (() => {
    if (!pollOpen) return { valid: false, error: null as string | null, cleaned: null as PostPoll | null };
    const q = pollQuestion.trim();
    if (!q) return { valid: false, error: "Escreva a pergunta da enquete.", cleaned: null };
    if (q.length > POLL_QUESTION_MAX)
      return { valid: false, error: `A pergunta deve ter até ${POLL_QUESTION_MAX} caracteres.`, cleaned: null };
    const trimmed = pollOptions.map((o) => ({ ...o, text: o.text.trim() }));
    if (trimmed.some((o) => !o.text))
      return { valid: false, error: "Preencha todas as opções ou remova as vazias.", cleaned: null };
    if (trimmed.some((o) => o.text.length > POLL_OPTION_MAX))
      return { valid: false, error: `Cada opção deve ter até ${POLL_OPTION_MAX} caracteres.`, cleaned: null };
    if (trimmed.length < POLL_MIN_OPTIONS)
      return { valid: false, error: `Adicione pelo menos ${POLL_MIN_OPTIONS} opções.`, cleaned: null };
    if (trimmed.length > POLL_MAX_OPTIONS)
      return { valid: false, error: `Máximo de ${POLL_MAX_OPTIONS} opções.`, cleaned: null };
    const seen = new Set<string>();
    for (const o of trimmed) {
      const key = o.text.toLowerCase();
      if (seen.has(key)) return { valid: false, error: "Não use opções duplicadas.", cleaned: null };
      seen.add(key);
    }
    return {
      valid: true,
      error: null,
      cleaned: { question: q, options: trimmed.map((o) => ({ id: o.id, text: o.text })) },
    };
  })();

  const canSubmit =
    (content.trim().length > 0 || hasMedia || pollValidation.valid) &&
    (!pollOpen || pollValidation.valid) &&
    !isCreating &&
    !uploading;

  const openPoll = () => {
    if (pollOpen) return;
    setPollOpen(true);
    setPollQuestion("");
    setPollOptions([newOption(), newOption()]);
  };

  const cancelPoll = () => {
    setPollOpen(false);
    setPollQuestion("");
    setPollOptions([]);
  };

  const addPollOption = () => {
    setPollOptions((prev) =>
      prev.length >= POLL_MAX_OPTIONS ? prev : [...prev, newOption()],
    );
  };

  const removePollOption = (id: string) => {
    setPollOptions((prev) =>
      prev.length <= POLL_MIN_OPTIONS ? prev : prev.filter((o) => o.id !== id),
    );
  };

  const updatePollOption = (id: string, text: string) => {
    setPollOptions((prev) => prev.map((o) => (o.id === id ? { ...o, text } : o)));
  };

  // ---- IMAGES ----
  const addImageFiles = (files: File[]) => {
    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      toast.error(`Máximo de ${MAX_IMAGES} imagens por publicação.`);
      return;
    }
    if (files.length > remaining) {
      toast.info(`Limite de ${MAX_IMAGES} imagens: as primeiras ${remaining} foram adicionadas.`);
    }
    const accepted: PickedImage[] = [];
    for (const file of files.slice(0, remaining)) {
      if (!IMAGE_TYPES.includes(file.type)) {
        toast.error(`"${file.name}" não é um formato suportado (JPG, PNG, WebP ou GIF).`);
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        toast.error(`"${file.name}" excede 10 MB (${formatBytes(file.size)}).`);
        continue;
      }
      accepted.push({ file, previewUrl: URL.createObjectURL(file) });
    }
    if (accepted.length) setImages((prev) => [...prev, ...accepted]);
  };

  const handleImageInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    addImageFiles(files);
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      URL.revokeObjectURL(prev[index]?.previewUrl || "");
      return prev.filter((_, i) => i !== index);
    });
  };

  // ---- VIDEO ----
  const handleVideoInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const ext = extOf(file.name);
    if (!VIDEO_TYPES.includes(file.type) || !VIDEO_EXTS.includes(ext)) {
      toast.error("Formato de vídeo não suportado. Use MP4, MOV ou WebM.");
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      toast.error(`O vídeo excede 100 MB (arquivo tem ${formatBytes(file.size)}).`);
      return;
    }
    try {
      const { duration } = await probeVideo(file);
      if (!isFinite(duration) || duration <= 0) {
        toast.error("Não foi possível ler a duração do vídeo. Tente outro arquivo.");
        return;
      }
      if (duration > MAX_VIDEO_SECONDS + 0.5) {
        toast.error(`O vídeo excede 2 minutos (duração: ${Math.round(duration)}s).`);
        return;
      }
      setVideo({ file, previewUrl: URL.createObjectURL(file), duration });
    } catch {
      toast.error("Não foi possível ler o vídeo. Tente outro arquivo.");
    }
  };

  const removeVideo = () => {
    if (video) URL.revokeObjectURL(video.previewUrl);
    setVideo(null);
  };

  // ---- DOCS ----
  const handleDocInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    const remaining = MAX_DOCS - docs.length;
    if (remaining <= 0) {
      toast.error(`Máximo de ${MAX_DOCS} documentos por publicação.`);
      return;
    }
    if (files.length > remaining) {
      toast.info(`Limite de ${MAX_DOCS} documentos: apenas ${remaining} adicionados.`);
    }
    const accepted: PickedDoc[] = [];
    for (const file of files.slice(0, remaining)) {
      const ext = extOf(file.name);
      if (!DOC_TYPES.includes(file.type) || !DOC_EXTS.includes(ext)) {
        toast.error(`"${file.name}" não é um formato suportado (PDF, DOCX, XLSX ou PPTX).`);
        continue;
      }
      if (file.size > MAX_DOC_BYTES) {
        toast.error(`"${file.name}" excede 25 MB (${formatBytes(file.size)}).`);
        continue;
      }
      accepted.push({ file });
    }
    if (accepted.length) setDocs((prev) => [...prev, ...accepted]);
  };

  const removeDoc = (index: number) => {
    setDocs((prev) => prev.filter((_, i) => i !== index));
  };

  // ---- PASTE / DROP (images only) ----
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files: File[] = [];
    for (const item of Array.from(e.clipboardData.items)) {
      if (item.kind === "file") {
        const f = item.getAsFile();
        if (f && IMAGE_TYPES.includes(f.type)) files.push(f);
      }
    }
    if (files.length > 0) {
      e.preventDefault();
      addImageFiles(files);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => IMAGE_TYPES.includes(f.type));
    if (files.length > 0) addImageFiles(files);
  };

  const reset = () => {
    images.forEach((i) => URL.revokeObjectURL(i.previewUrl));
    if (video) URL.revokeObjectURL(video.previewUrl);
    setContent("");
    setImages([]);
    setVideo(null);
    setDocs([]);
    setUploadProgress(0);
    setPollOpen(false);
    setPollQuestion("");
    setPollOptions([]);
    if (collapsible) setExpanded(false);
  };

  const cleanupOrphans = async (urls: string[]) => {
    const paths = urls
      .map((u) => u.split("/community-feed/")[1])
      .filter(Boolean) as string[];
    if (paths.length) {
      await supabase.storage.from("community-feed").remove(paths).catch(() => {});
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit || !user?.id) return;
    setUploading(true);
    setUploadProgress(5);
    const uploadedImages: string[] = [];
    let uploadedVideo: string | null = null;
    const uploadedDocs: PostDocument[] = [];
    const totalSteps = images.length + (video ? 1 : 0) + docs.length;
    let step = 0;
    const bump = () => {
      step += 1;
      setUploadProgress(Math.min(95, 5 + Math.round((step / Math.max(1, totalSteps)) * 90)));
    };
    try {
      for (const img of images) {
        const url = await uploadCommunityFile(user.id, img.file, "images");
        uploadedImages.push(url);
        bump();
      }
      if (video) {
        uploadedVideo = await uploadCommunityFile(user.id, video.file, "videos");
        bump();
      }
      for (const d of docs) {
        const url = await uploadCommunityFile(user.id, d.file, "docs");
        uploadedDocs.push({ name: d.file.name, url, size: d.file.size, mime: d.file.type });
        bump();
      }
      onSubmit({
        content: content.trim(),
        tags: [],
        imageUrls: uploadedImages,
        videoUrl: uploadedVideo,
        documents: uploadedDocs,
        poll: pollValidation.valid ? pollValidation.cleaned : null,
      });
      reset();
    } catch (err: any) {
      const orphans = [...uploadedImages, ...uploadedDocs.map((d) => d.url)];
      if (uploadedVideo) orphans.push(uploadedVideo);
      if (orphans.length) await cleanupOrphans(orphans);
      toast.error(err?.message || "Falha ao publicar. Tente novamente.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <Card className="border-primary/30 shadow-sm ring-1 ring-primary/10">
      <CardContent className="pt-4 pb-3 space-y-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Compartilhe com a comunidade</p>
          <p className="text-xs text-muted-foreground">
            Uma dúvida, experiência, dica, oportunidade ou conteúdo — todo mundo aprende junto.
          </p>
        </div>
        <div
          className={`flex gap-3 rounded-lg transition ${dragOver ? "ring-2 ring-primary/40 bg-primary/[0.03]" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            if (!dragOver) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={profile?.avatar_url || ""} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <Textarea
            placeholder="O que você quer compartilhar hoje? Dúvida, experiência, dica, oportunidade..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onPaste={handlePaste}
            rows={3}
            className="resize-none text-sm"
          />
        </div>

        {images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {images.map((img, i) => (
              <div
                key={i}
                className="relative aspect-square rounded-md overflow-hidden border border-border/50 bg-muted"
              >
                <img src={img.previewUrl} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  disabled={uploading}
                  className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/70 text-white flex items-center justify-center disabled:opacity-40"
                  aria-label="Remover imagem"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {video && (
          <div className="relative rounded-md overflow-hidden border border-border/50 bg-black">
            <video src={video.previewUrl} controls preload="metadata" className="w-full max-h-80" />
            <button
              type="button"
              onClick={removeVideo}
              disabled={uploading}
              className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/70 text-white flex items-center justify-center disabled:opacity-40"
              aria-label="Remover vídeo"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <p className="text-[11px] text-muted-foreground px-2 py-1 bg-background truncate">
              {video.file.name} · {formatBytes(video.file.size)} · {Math.round(video.duration)}s
            </p>
          </div>
        )}

        {docs.length > 0 && (
          <div className="space-y-1.5">
            {docs.map((d, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-md border border-border/50 bg-muted/30">
                <FileText className="h-4 w-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{d.file.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {DOC_EXT_LABEL[d.file.type] || "Documento"} · {formatBytes(d.file.size)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => removeDoc(i)}
                  disabled={uploading}
                  aria-label="Remover documento"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {pollOpen && (
          <div className="rounded-lg border border-primary/30 bg-primary/[0.03] p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <BarChart3 className="h-3.5 w-3.5 text-primary" />
                Nova enquete
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-[11px] text-muted-foreground"
                onClick={cancelPoll}
                disabled={uploading}
              >
                Cancelar enquete
              </Button>
            </div>
            <Input
              value={pollQuestion}
              onChange={(e) => setPollQuestion(e.target.value.slice(0, POLL_QUESTION_MAX))}
              placeholder="Pergunta da enquete"
              className="text-sm h-9"
              aria-label="Pergunta da enquete"
              maxLength={POLL_QUESTION_MAX}
            />
            <div className="space-y-1.5">
              {pollOptions.map((o, idx) => (
                <div key={o.id} className="flex items-center gap-2">
                  <Input
                    value={o.text}
                    onChange={(e) => updatePollOption(o.id, e.target.value.slice(0, POLL_OPTION_MAX))}
                    placeholder={`Opção ${idx + 1}`}
                    className="text-sm h-8"
                    aria-label={`Opção ${idx + 1}`}
                    maxLength={POLL_OPTION_MAX}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => removePollOption(o.id)}
                    disabled={pollOptions.length <= POLL_MIN_OPTIONS || uploading}
                    aria-label="Remover opção"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-[11px]"
                onClick={addPollOption}
                disabled={pollOptions.length >= POLL_MAX_OPTIONS || uploading}
              >
                + Adicionar opção
              </Button>
              <p className="text-[10px] text-muted-foreground">Um voto por pessoa</p>
            </div>
            {pollValidation.error && (
              <p className="text-[11px] text-destructive">{pollValidation.error}</p>
            )}
          </div>
        )}

        {uploading && (
          <div className="space-y-1">
            <Progress value={uploadProgress} className="h-1.5" />
            <p className="text-[11px] text-muted-foreground">Enviando anexos... {uploadProgress}%</p>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/40">
          <div className="flex items-center gap-1 flex-wrap">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-primary"
              onClick={() => imageInputRef.current?.click()}
              disabled={uploading || images.length >= MAX_IMAGES}
              title={`Foto — até ${MAX_IMAGES} · 10 MB cada`}
            >
              <ImageIcon className="h-4 w-4" /> Foto
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-primary"
              onClick={() => videoInputRef.current?.click()}
              disabled={uploading || !!video}
              title="Vídeo — 1 por post · até 100 MB · 2 min"
            >
              <Video className="h-4 w-4" /> Vídeo
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-primary"
              onClick={() => docInputRef.current?.click()}
              disabled={uploading || docs.length >= MAX_DOCS}
              title={`Documento — até ${MAX_DOCS} · 25 MB cada`}
            >
              <FileText className="h-4 w-4" /> Documento
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-primary"
              onClick={openPoll}
              disabled={pollOpen || uploading}
              title="Enquete — 2 a 6 opções · um voto por pessoa"
            >
              <BarChart3 className="h-4 w-4" /> Enquete
            </Button>
          </div>

          <Button size="sm" onClick={handleSubmit} disabled={!canSubmit} className="gap-1.5">
            {uploading || isCreating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Publicar
          </Button>
        </div>

        <input
          ref={imageInputRef}
          type="file"
          accept={IMAGE_TYPES.join(",")}
          multiple
          className="hidden"
          onChange={handleImageInput}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept={VIDEO_TYPES.join(",")}
          className="hidden"
          onChange={handleVideoInput}
        />
        <input
          ref={docInputRef}
          type="file"
          accept={DOC_TYPES.join(",")}
          multiple
          className="hidden"
          onChange={handleDocInput}
        />
      </CardContent>
    </Card>
  );
}
