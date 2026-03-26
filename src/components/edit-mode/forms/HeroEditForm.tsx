import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface HeroEditFormProps {
  name: string;
  logoUrl: string | null;
  onNameChange: (name: string) => void;
  onLogoChange: (url: string | null) => void;
}

export function HeroEditForm({ name, logoUrl, onNameChange, onLogoChange }: HeroEditFormProps) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `logos/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("supplier-logos").upload(path, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("supplier-logos").getPublicUrl(path);
      onLogoChange(publicUrl);
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-start gap-4">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Logotipo</p>
          <div className="flex items-center gap-3">
            {logoUrl && (
              <div className="relative h-16 w-16 rounded-xl border overflow-hidden">
                <img src={logoUrl} alt="" className="h-full w-full object-contain p-1" />
                <button
                  onClick={() => onLogoChange(null)}
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl gap-1.5"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="h-3.5 w-3.5" />
              {uploading ? "Enviando..." : "Upload"}
            </Button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
          </div>
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Nome da empresa</label>
        <Input
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className="mt-1 rounded-xl"
        />
      </div>
    </div>
  );
}
