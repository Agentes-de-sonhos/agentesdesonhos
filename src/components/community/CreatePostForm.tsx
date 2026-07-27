import { useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Send,
  Loader2,
  Image as ImageIcon,
  Video,
  FileText,
  BarChart3,
  X,
  Plus,
} from "lucide-react";
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
}

type PickedImage = { file: File; previewUrl: string };
type PickedVideo = { file: File; previewUrl: string; duration: number };

export function CreatePostForm({ onSubmit, isCreating }: CreatePostFormProps) {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [images, setImages] = useState<PickedImage[]>([]);
  const [video, setVideo] = useState<PickedVideo | null>(null);
  const [docs, setDocs] = useState<{ file: File }[]>([]);
  const [poll, setPoll] = useState<PostPoll | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);

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

  const hasAttachment = images.length > 0 || video !== null || docs.length > 0 || poll !== null;
  const canSubmit = (content.trim().length > 0 || hasAttachment) && !isCreating && !uploading;

  const addImageFiles = (files: File[]) => {
    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      toast.error(`Máximo de ${MAX_IMAGES} imagens por publicação.`);
      return;
    }
    const accepted: PickedImage[] = [];
    for (const file of files.slice(0, remaining)) {
      if (!IMAGE_TYPES.includes(file.type)) {
        toast.error(`"${file.name}" não é um formato de imagem suportado (JPG, PNG, WebP ou GIF).`);
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        toast.error(`"${file.name}" excede 10 MB.`);
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

  const handleVideoInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!VIDEO_TYPES.includes(file.type)) {
      toast.error("Formato não suportado. Use MP4, MOV ou WebM.");
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      toast.error(`Vídeo excede 100 MB (arquivo tem ${formatBytes(file.size)}).`);
      return;
    }
    try {
      const { duration } = await probeVideo(file);
      if (duration > MAX_VIDEO_SECONDS + 0.5) {
        toast.error(`Vídeo excede 2 minutos (duração: ${duration.toFixed(0)}s).`);
        return;
      }
      setVideo({ file, previewUrl: URL.createObjectURL(file), duration });
    } catch {
      toast.error("Não foi possível ler o vídeo. Tente outro arquivo.");
    }
  };

  const handleDocInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    const remaining = MAX_DOCS - docs.length;
    if (remaining <= 0) {
      toast.error(`Máximo de ${MAX_DOCS} documentos por publicação.`);
      return;
    }
    const accepted: { file: File }[] = [];
    for (const file of files.slice(0, remaining)) {
      if (!DOC_TYPES.includes(file.type)) {
        toast.error(`"${file.name}" não é um formato suportado (PDF, DOCX, XLSX ou PPTX).`);
        continue;
      }
      if (file.size > MAX_DOC_BYTES) {
        toast.error(`"${file.name}" excede 25 MB.`);
        continue;
      }
      accepted.push({ file });
    }
    if (accepted.length) setDocs((prev) => [...prev, ...accepted]);
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      URL.revokeObjectURL(prev[index]?.previewUrl || "");
      return prev.filter((_, i) => i !== index);
    });
  };

  const removeVideo = () => {
    if (video) URL.revokeObjectURL(video.previewUrl);
    setVideo(null);
  };

  const removeDoc = (index: number) => {
    setDocs((prev) => prev.filter((_, i) => i !== index));
  };

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
    setPoll(null);
    setUploadProgress(0);
  };

  const handleSubmit = async () => {
    if (!canSubmit || !user?.id) return;
    setUploading(true);
    setUploadProgress(5);
    try {
      const imageUrls: string[] = [];
      for (const [i, img] of images.entries()) {
        const url = await uploadCommunityFile(user.id, img.file, "images");
        imageUrls.push(url);
        setUploadProgress(5 + Math.round(((i + 1) / (images.length + docs.length + (video ? 1 : 0))) * 80));
      }
      let videoUrl: string | null = null;
      if (video) {
        videoUrl = await uploadCommunityFile(user.id, video.file, "videos");
        setUploadProgress((p) => Math.max(p, 60));
      }
      const documents: PostDocument[] = [];
      for (const d of docs) {
        const url = await uploadCommunityFile(user.id, d.file, "docs");
        documents.push({ name: d.file.name, url, size: d.file.size, mime: d.file.type });
      }
      setUploadProgress(95);
      onSubmit({
        content: content.trim(),
        tags: [],
        imageUrls,
        videoUrl,
        documents,
        poll,
      });
      reset();
    } catch (err: any) {
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
            setDragOver(true);
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
              <div key={i} className="relative aspect-square rounded-md overflow-hidden border border-border/50">
                <img src={img.previewUrl} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/70 text-white flex items-center justify-center"
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
            <video src={video.previewUrl} controls className="w-full max-h-80" />
            <button
              type="button"
              onClick={removeVideo}
              className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/70 text-white flex items-center justify-center"
              aria-label="Remover vídeo"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <p className="text-[11px] text-muted-foreground px-2 py-1 bg-background">
              {video.file.name} · {formatBytes(video.file.size)} · {video.duration.toFixed(0)}s
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
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeDoc(i)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {poll && (
          <PollBuilder poll={poll} onChange={setPoll} onRemove={() => setPoll(null)} />
        )}

        {uploading && <Progress value={uploadProgress} className="h-1.5" />}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/40">
          <div className="flex items-center gap-1 flex-wrap">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-primary"
              onClick={() => imageInputRef.current?.click()}
              disabled={uploading || images.length >= MAX_IMAGES}
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
            >
              <FileText className="h-4 w-4" /> Documento
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-primary"
              onClick={() =>
                setPoll(poll ?? { question: "", options: [{ id: "o1", text: "" }, { id: "o2", text: "" }] })
              }
              disabled={uploading || !!poll}
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

function PollBuilder({
  poll,
  onChange,
  onRemove,
}: {
  poll: PostPoll;
  onChange: (p: PostPoll) => void;
  onRemove: () => void;
}) {
  const setOption = (idx: number, text: string) => {
    const options = poll.options.map((o, i) => (i === idx ? { ...o, text } : o));
    onChange({ ...poll, options });
  };
  const addOption = () => {
    if (poll.options.length >= 6) return;
    onChange({
      ...poll,
      options: [...poll.options, { id: `o${poll.options.length + 1}_${Date.now()}`, text: "" }],
    });
  };
  const removeOption = (idx: number) => {
    if (poll.options.length <= 2) return;
    onChange({ ...poll, options: poll.options.filter((_, i) => i !== idx) });
  };
  return (
    <div className="rounded-md border border-border/50 bg-muted/20 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <BarChart3 className="h-3.5 w-3.5 text-primary" /> Enquete
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onRemove}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      <Input
        placeholder="Faça uma pergunta..."
        value={poll.question}
        onChange={(e) => onChange({ ...poll, question: e.target.value })}
        className="h-8 text-sm"
        maxLength={200}
      />
      <div className="space-y-1.5">
        {poll.options.map((o, i) => (
          <div key={o.id} className="flex items-center gap-1.5">
            <Input
              placeholder={`Opção ${i + 1}`}
              value={o.text}
              onChange={(e) => setOption(i, e.target.value)}
              className="h-8 text-sm"
              maxLength={80}
            />
            {poll.options.length > 2 && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeOption(i)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ))}
      </div>
      {poll.options.length < 6 && (
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={addOption}>
          <Plus className="h-3.5 w-3.5" /> Adicionar opção
        </Button>
      )}
      <p className="text-[10px] text-muted-foreground">
        Um voto por pessoa. As opções não podem ser alteradas depois que houver votos.
      </p>
    </div>
  );
}
