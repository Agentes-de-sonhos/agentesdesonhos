import { useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Send, Loader2, Image as ImageIcon, Video, FileText, BarChart3, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  IMAGE_TYPES,
  MAX_IMAGES,
  MAX_IMAGE_BYTES,
  formatBytes,
  uploadCommunityFile,
} from "@/lib/communityMedia";

interface CreatePostPayload {
  content: string;
  tags: string[];
  imageUrls?: string[];
}

interface CreatePostFormProps {
  onSubmit: (data: CreatePostPayload) => void;
  isCreating: boolean;
}

type PickedImage = { file: File; previewUrl: string };

export function CreatePostForm({ onSubmit, isCreating }: CreatePostFormProps) {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [images, setImages] = useState<PickedImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

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

  const hasImages = images.length > 0;
  const canSubmit = (content.trim().length > 0 || hasImages) && !isCreating && !uploading;

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
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) addImageFiles(files);
  };

  const reset = () => {
    images.forEach((i) => URL.revokeObjectURL(i.previewUrl));
    setContent("");
    setImages([]);
    setUploadProgress(0);
  };

  const handleSubmit = async () => {
    if (!canSubmit || !user?.id) return;
    setUploading(true);
    setUploadProgress(images.length ? 5 : 100);
    const uploaded: string[] = [];
    try {
      for (const [i, img] of images.entries()) {
        const url = await uploadCommunityFile(user.id, img.file, "images");
        uploaded.push(url);
        setUploadProgress(Math.round(((i + 1) / images.length) * 90) + 5);
      }
      onSubmit({ content: content.trim(), tags: [], imageUrls: uploaded });
      reset();
    } catch (err: any) {
      // Best-effort orphan cleanup if some uploaded but publish path fails
      if (uploaded.length > 0) {
        const paths = uploaded
          .map((u) => u.split("/community-feed/")[1])
          .filter(Boolean) as string[];
        if (paths.length) {
          await supabase.storage.from("community-feed").remove(paths).catch(() => {});
        }
      }
      toast.error(err?.message || "Falha ao publicar. Tente novamente.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const notifyComingSoon = (feature: string) => {
    toast.info(`${feature}: recurso sendo preparado — em breve.`);
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

        {uploading && images.length > 0 && (
          <div className="space-y-1">
            <Progress value={uploadProgress} className="h-1.5" />
            <p className="text-[11px] text-muted-foreground">
              Enviando imagens... {uploadProgress}%
            </p>
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
            >
              <ImageIcon className="h-4 w-4" /> Foto
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-primary"
              onClick={() => notifyComingSoon("Vídeo")}
            >
              <Video className="h-4 w-4" /> Vídeo
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-primary"
              onClick={() => notifyComingSoon("Documento")}
            >
              <FileText className="h-4 w-4" /> Documento
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-primary"
              onClick={() => notifyComingSoon("Enquete")}
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
      </CardContent>
    </Card>
  );
}
