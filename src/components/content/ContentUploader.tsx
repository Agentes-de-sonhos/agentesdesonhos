import { useState, useCallback } from 'react';
import { Upload, Image, FileText, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { MediaManagerModal } from '@/components/media/MediaManagerModal';

interface ContentUploaderProps {
  onFileSelected: (file: File, base64: string) => void;
  selectedFile: File | null;
  onClear: () => void;
}

export function ContentUploader({ onFileSelected, selectedFile, onClear }: ContentUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [mediaManagerOpen, setMediaManagerOpen] = useState(false);

  const handleFile = useCallback((file: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast.error('Formato não suportado. Use imagens (JPG, PNG, WebP) ou PDF.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 10MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      onFileSelected(file, base64);
      if (file.type.startsWith('image/')) {
        setPreview(base64);
      } else {
        setPreview(null);
      }
    };
    reader.readAsDataURL(file);
  }, [onFileSelected]);

  const handleClear = () => {
    setPreview(null);
    onClear();
  };

  const handleMediaSelect = useCallback((url: string) => {
    // Create a virtual File from the URL for backwards compatibility
    setPreview(url);
    fetch(url)
      .then(res => res.blob())
      .then(blob => {
        const fileName = url.split('/').pop() || 'file';
        const file = new File([blob], fileName, { type: blob.type });
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64 = e.target?.result as string;
          onFileSelected(file, base64);
        };
        reader.readAsDataURL(blob);
      })
      .catch(() => {
        toast.error('Erro ao carregar arquivo do gerenciador.');
      });
  }, [onFileSelected]);

  if (selectedFile) {
    return (
      <Card className="border-2 border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {preview ? (
              <img 
                src={preview} 
                alt="Preview" 
                className="w-24 h-24 object-cover rounded-lg border"
              />
            ) : (
              <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center">
                <FileText className="h-10 w-10 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{selectedFile.name}</p>
              <p className="text-sm text-muted-foreground">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleClear}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card 
        className="border-2 border-dashed transition-colors cursor-pointer border-muted-foreground/25 hover:border-primary/50"
        onClick={() => setMediaManagerOpen(true)}
      >
        <CardContent className="p-8">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-medium">Clique para abrir o Gerenciador de Arquivos</p>
              <p className="text-sm text-muted-foreground mt-1">
                ou selecione um arquivo já enviado
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Image className="h-3 w-3" /> JPG, PNG, WebP
              </span>
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" /> PDF
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <MediaManagerModal
        open={mediaManagerOpen}
        onOpenChange={setMediaManagerOpen}
        onSelect={handleMediaSelect}
      />
    </>
  );
}
