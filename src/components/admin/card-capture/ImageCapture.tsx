import { useRef, useState, useCallback } from "react";
import { Camera, Upload, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  onImageReady: (base64: string, preview: string) => void;
}

export function ImageCapture({ onImageReady }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const processFile = useCallback(
    (file: File) => {
      const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
      if (!validTypes.includes(file.type)) {
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(",")[1];
        onImageReady(base64, dataUrl);
      };
      reader.readAsDataURL(file);
    },
    [onImageReady]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  return (
    <Card className="max-w-md mx-auto">
      <CardContent className="pt-6 space-y-4">
        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <ImageIcon className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-lg font-bold">Captura de Cartão de Visita</h2>
          <p className="text-sm text-muted-foreground">
            Tire uma foto ou envie uma imagem do cartão
          </p>
        </div>

        {/* Camera button */}
        <Button
          onClick={() => cameraInputRef.current?.click()}
          className="w-full gap-2 h-14 text-base"
          size="lg"
        >
          <Camera className="h-5 w-5" />
          Tirar Foto Agora
        </Button>
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) processFile(file);
            e.target.value = "";
          }}
        />

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground font-medium">ou</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Upload / Drop zone */}
        <div
          className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
            dragOver
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/20 hover:border-primary/50"
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium text-muted-foreground">
            Arraste ou clique para enviar
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            JPG, PNG ou WEBP
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) processFile(file);
            e.target.value = "";
          }}
        />
      </CardContent>
    </Card>
  );
}
