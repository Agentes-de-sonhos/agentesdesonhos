import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, X, ImagePlus } from "lucide-react";
import { toast } from "sonner";

interface GuideGalleryUploaderProps {
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
  /** Optional uid to namespace files (used in public registration before auth). */
  uid?: string;
}

export function GuideGalleryUploader({ value, onChange, max = 20, uid }: GuideGalleryUploaderProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  // Public registration (no auth yet) MUST upload to "temp/" — required by RLS policy.
  const folder = user?.id ? user.id : `temp/${uid || "anon"}`;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (value.length + files.length > max) {
      toast.error(`Máximo de ${max} fotos.`);
      return;
    }

    setUploading(true);
    try {
      const newUrls: string[] = [];
      for (const file of Array.from(files)) {
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name}: máx 5MB`);
          continue;
        }
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${folder}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage
          .from("tour-guides-gallery")
          .upload(path, file, { upsert: false, contentType: file.type });
        if (error) {
          toast.error(`Erro: ${error.message}`);
          continue;
        }
        const { data } = supabase.storage.from("tour-guides-gallery").getPublicUrl(path);
        newUrls.push(data.publicUrl);
      }
      onChange([...value, ...newUrls]);
      if (newUrls.length > 0) toast.success(`${newUrls.length} foto(s) enviada(s)`);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleRemove = (url: string) => {
    onChange(value.filter((u) => u !== url));
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {value.map((url) => (
          <div key={url} className="relative aspect-square rounded-xl overflow-hidden bg-muted group">
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => handleRemove(url)}
              className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {value.length < max && (
          <label className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition text-muted-foreground">
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <ImagePlus className="h-5 w-5" />
                <span className="text-[10px] mt-1">Adicionar</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {value.length}/{max} fotos · Recomendado: pelo menos 3 fotos · Máx 5MB cada
      </p>
    </div>
  );
}

interface GuidePhotoUploaderProps {
  value: string | null;
  onChange: (url: string | null) => void;
  uid?: string;
}

export function GuidePhotoUploader({ value, onChange, uid }: GuidePhotoUploaderProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const folder = user?.id ? user.id : `temp/${uid || "anon"}`;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Máx 5MB");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${folder}/avatar-${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("tour-guides-gallery")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (error) {
        toast.error(error.message);
        return;
      }
      const { data } = supabase.storage.from("tour-guides-gallery").getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success("Foto enviada");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="h-24 w-24 rounded-full overflow-hidden bg-muted ring-2 ring-border flex items-center justify-center">
        {value ? (
          <img src={value} alt="" className="w-full h-full object-cover" />
        ) : (
          <Upload className="h-7 w-7 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 space-y-2">
        <label>
          <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
          <Button type="button" variant="outline" disabled={uploading} asChild>
            <span className="cursor-pointer">
              {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              {value ? "Trocar foto" : "Enviar foto"}
            </span>
          </Button>
        </label>
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
            <X className="h-3.5 w-3.5 mr-1" /> Remover
          </Button>
        )}
        <p className="text-xs text-muted-foreground">JPG/PNG · Máx 5MB · Foto de perfil obrigatória</p>
      </div>
    </div>
  );
}
