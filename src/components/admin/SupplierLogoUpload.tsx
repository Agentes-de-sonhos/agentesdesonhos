import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { MediaManagerModal } from "@/components/media/MediaManagerModal";

interface SupplierLogoUploadProps {
  logoUrl: string | null;
  onLogoChange: (url: string | null) => void;
  supplierId?: string;
}

export function SupplierLogoUpload({
  logoUrl,
  onLogoChange,
}: SupplierLogoUploadProps) {
  const [mediaManagerOpen, setMediaManagerOpen] = useState(false);

  const handleMediaSelect = (url: string) => {
    onLogoChange(url);
    setMediaManagerOpen(false);
  };

  const handleRemoveLogo = () => {
    onLogoChange(null);
  };

  return (
    <div className="space-y-3">
      <Label>Logotipo</Label>

      <div className="flex items-start gap-4">
        {/* Preview */}
        <div className="relative flex h-24 w-24 items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/25 bg-muted/50 overflow-hidden">
          {logoUrl ? (
            <>
              <img
                src={logoUrl}
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setMediaManagerOpen(true)}
          >
            <Upload className="mr-2 h-4 w-4" />
            {logoUrl ? "Trocar logo" : "Upload"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Selecione uma imagem do Gerenciador de Arquivos.
          </p>
        </div>
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
