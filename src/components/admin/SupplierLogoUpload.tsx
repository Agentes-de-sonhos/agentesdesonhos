import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface SupplierLogoUploadProps {
  logoUrl: string | null;
  onLogoChange: (url: string | null) => void;
  supplierId?: string;
}

export function SupplierLogoUpload({
  logoUrl,
  onLogoChange,
  supplierId,
}: SupplierLogoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(logoUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }

    setIsUploading(true);

    try {
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Resize image before upload
      const resizedBlob = await resizeImage(file, 400, 400);

      // Generate unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${supplierId || Date.now()}-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("supplier-logos")
        .upload(filePath, resizedBlob, {
          contentType: file.type,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from("supplier-logos")
        .getPublicUrl(filePath);

      onLogoChange(publicUrlData.publicUrl);
      setPreviewUrl(publicUrlData.publicUrl);
      toast.success("Logo enviado com sucesso!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Erro ao enviar logo");
      setPreviewUrl(logoUrl);
    } finally {
      setIsUploading(false);
    }
  };

  const resizeImage = (
    file: File,
    maxWidth: number,
    maxHeight: number
  ): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions maintaining aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        // Use white background for transparency
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Could not create blob"));
            }
          },
          "image/jpeg",
          0.85
        );
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  const handleRemoveLogo = async () => {
    if (logoUrl) {
      try {
        // Extract file path from URL
        const urlParts = logoUrl.split("/supplier-logos/");
        if (urlParts.length > 1) {
          const filePath = urlParts[1];
          await supabase.storage.from("supplier-logos").remove([filePath]);
        }
      } catch (error) {
        console.error("Error removing logo:", error);
      }
    }
    setPreviewUrl(null);
    onLogoChange(null);
  };

  return (
    <div className="space-y-3">
      <Label>Logo do Fornecedor</Label>
      
      <div className="flex items-start gap-4">
        {/* Preview */}
        <div className="relative flex h-24 w-24 items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/25 bg-muted/50 overflow-hidden">
          {previewUrl ? (
            <>
              <img
                src={previewUrl}
                alt="Logo preview"
                className="h-full w-full object-contain p-2"
              />
              <button
                type="button"
                onClick={handleRemoveLogo}
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-md hover:bg-destructive/90"
              >
                <X className="h-3 w-3" />
              </button>
            </>
          ) : (
            <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
          )}
        </div>

        {/* Upload button */}
        <div className="flex-1 space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                {previewUrl ? "Trocar logo" : "Enviar logo"}
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground">
            PNG, JPG ou WEBP. Máx 5MB. Redimensionado automaticamente.
          </p>
        </div>
      </div>
    </div>
  );
}
