import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, Check, Loader2, Search, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ImageGalleryPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string) => void;
  bucket?: string;
}

interface StorageFile {
  name: string;
  url: string;
}

export function ImageGalleryPicker({
  open,
  onOpenChange,
  onSelect,
  bucket = "academy-files",
}: ImageGalleryPickerProps) {
  const [images, setImages] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);

  const sanitizeFileName = (name: string) =>
    name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_");

  const loadImages = async () => {
    setLoading(true);
    try {
      const imageExts = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
      const allImages: StorageFile[] = [];

      // List folders recursively (top-level)
      const { data: folders } = await supabase.storage.from(bucket).list("", { limit: 100 });
      
      if (folders) {
        for (const item of folders) {
          if (item.id === null) {
            // It's a folder, list its contents
            const { data: subItems } = await supabase.storage.from(bucket).list(item.name, { limit: 500 });
            if (subItems) {
              for (const sub of subItems) {
                if (sub.id === null) {
                  // Nested folder
                  const { data: deepItems } = await supabase.storage.from(bucket).list(`${item.name}/${sub.name}`, { limit: 500 });
                  if (deepItems) {
                    for (const deep of deepItems) {
                      const ext = deep.name.substring(deep.name.lastIndexOf(".")).toLowerCase();
                      if (imageExts.includes(ext)) {
                        const path = `${item.name}/${sub.name}/${deep.name}`;
                        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
                        allImages.push({ name: deep.name, url: urlData.publicUrl });
                      }
                    }
                  }
                } else {
                  const ext = sub.name.substring(sub.name.lastIndexOf(".")).toLowerCase();
                  if (imageExts.includes(ext)) {
                    const path = `${item.name}/${sub.name}`;
                    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
                    allImages.push({ name: sub.name, url: urlData.publicUrl });
                  }
                }
              }
            }
          } else {
            const ext = item.name.substring(item.name.lastIndexOf(".")).toLowerCase();
            if (imageExts.includes(ext)) {
              const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(item.name);
              allImages.push({ name: item.name, url: urlData.publicUrl });
            }
          }
        }
      }

      setImages(allImages);
    } catch (err: any) {
      toast.error("Erro ao carregar imagens: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadImages();
      setSelectedUrl(null);
    }
  }, [open]);

  const handleUploadNew = async (file: File) => {
    setUploading(true);
    try {
      const sanitized = sanitizeFileName(file.name);
      const path = `thumbnails/${Date.now()}_${sanitized}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
      const newUrl = urlData.publicUrl;
      setImages((prev) => [{ name: sanitized, url: newUrl }, ...prev]);
      setSelectedUrl(newUrl);
      toast.success("Imagem carregada!");
    } catch (err: any) {
      toast.error("Erro ao enviar imagem: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const filtered = search
    ? images.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()))
    : images;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Selecionar Imagem de Capa
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload new + Search */}
          <div className="flex gap-2">
            <label className="inline-flex">
              <Button variant="outline" size="sm" disabled={uploading} asChild>
                <span className="cursor-pointer">
                  {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                  Enviar nova imagem
                </span>
              </Button>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUploadNew(file);
                }}
              />
            </label>
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar imagem..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
          </div>

          {/* Gallery */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma imagem encontrada. Envie uma nova imagem acima.
            </p>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 p-1">
                {filtered.map((img) => (
                  <button
                    key={img.url}
                    type="button"
                    onClick={() => setSelectedUrl(img.url)}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all hover:opacity-90 ${
                      selectedUrl === img.url
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <img
                      src={img.url}
                      alt={img.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {selectedUrl === img.url && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <Check className="h-8 w-8 text-primary-foreground bg-primary rounded-full p-1" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!selectedUrl}
              onClick={() => {
                if (selectedUrl) {
                  onSelect(selectedUrl);
                  onOpenChange(false);
                }
              }}
            >
              Usar esta imagem
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
