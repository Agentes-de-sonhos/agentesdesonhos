import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";
import { MediaManagerModal } from "@/components/media/MediaManagerModal";

interface HeroEditFormProps {
  name: string;
  logoUrl: string | null;
  onNameChange: (name: string) => void;
  onLogoChange: (url: string | null) => void;
}

export function HeroEditForm({ name, logoUrl, onNameChange, onLogoChange }: HeroEditFormProps) {
  const [mediaManagerOpen, setMediaManagerOpen] = useState(false);

  const handleMediaSelect = (url: string) => {
    onLogoChange(url);
    setMediaManagerOpen(false);
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
              onClick={() => setMediaManagerOpen(true)}
            >
              <Upload className="h-3.5 w-3.5" />
              {logoUrl ? "Trocar logo" : "Upload"}
            </Button>
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

      <MediaManagerModal
        open={mediaManagerOpen}
        onOpenChange={setMediaManagerOpen}
        onSelect={handleMediaSelect}
        accept="image"
      />
    </div>
  );
}
