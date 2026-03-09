import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, Trash2, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ImageCropDialog } from "./ImageCropDialog";

export function AcademyHeroBannerManager() {
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [pendingFileName, setPendingFileName] = useState<string>("");

  const fetchBanner = async () => {
    const { data } = await supabase
      .from("academy_settings")
      .select("value")
      .eq("key", "hero_banner_url")
      .single();
    setCurrentUrl(data?.value || null);
    setLoading(false);
  };

  useEffect(() => { fetchBanner(); }, []);

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem (JPG, PNG, WebP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande. Máximo 5MB.");
      return;
    }
    setPendingFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  const handleCropConfirm = async (blob: Blob) => {
    setCropSrc(null);
    setUploading(true);
    try {
      const sanitized = pendingFileName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `hero/${Date.now()}_${sanitized}`;
      const { error: uploadError } = await supabase.storage.from("academy-files").upload(path, blob, { contentType: "image/jpeg" });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("academy-files").getPublicUrl(path);
      const newUrl = urlData.publicUrl;

      const { error: updateError } = await supabase
        .from("academy_settings")
        .update({ value: newUrl, updated_at: new Date().toISOString() })
        .eq("key", "hero_banner_url");
      if (updateError) throw updateError;

      setCurrentUrl(newUrl);
      toast.success("Capa atualizada com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao fazer upload: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    const { error } = await supabase
      .from("academy_settings")
      .update({ value: null, updated_at: new Date().toISOString() })
      .eq("key", "hero_banner_url");
    if (error) {
      toast.error("Erro ao remover capa.");
      return;
    }
    setCurrentUrl(null);
    toast.success("Capa removida. A imagem padrão será usada.");
  };

  if (loading) return null;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            Capa da Academy (Hero Banner)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentUrl ? (
            <div className="space-y-3">
              <img
                src={currentUrl}
                alt="Hero banner atual"
                className="w-full h-40 object-cover rounded-lg border"
              />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild className="flex-1">
                  <label className="cursor-pointer">
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                    Trocar imagem
                    <input type="file" accept="image/*" onChange={handleFileSelected} className="sr-only" disabled={uploading} />
                  </label>
                </Button>
                <Button variant="outline" size="sm" onClick={handleRemove}>
                  <Trash2 className="h-4 w-4 mr-1" /> Remover
                </Button>
              </div>
            </div>
          ) : (
            <label className="flex flex-col items-center gap-3 p-6 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
              {uploading ? (
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              ) : (
                <Upload className="h-8 w-8 text-muted-foreground" />
              )}
              <div className="text-center">
                <p className="font-medium text-sm">Clique para enviar a capa</p>
                <p className="text-xs text-muted-foreground">Recomendado: 1920×512px · JPG ou PNG · Máx. 5MB</p>
              </div>
              <input type="file" accept="image/*" onChange={handleFileSelected} className="sr-only" disabled={uploading} />
            </label>
          )}
        </CardContent>
      </Card>

      <ImageCropDialog
        open={!!cropSrc}
        imageSrc={cropSrc || ""}
        aspect={1920 / 512}
        title="Posicionar capa da Academy"
        onClose={() => setCropSrc(null)}
        onConfirm={handleCropConfirm}
      />
    </>
  );
}
