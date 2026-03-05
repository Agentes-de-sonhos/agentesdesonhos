import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Plus, Trash2, Upload, Loader2 } from "lucide-react";
import { PlaybookPDFViewer } from "./PlaybookPDFViewer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PlaybookPdfSectionProps {
  pdfUrl: string | undefined;
  onSavePdfUrl?: (url: string | null) => Promise<void>;
  tabLabel?: string;
}

function sanitizeFileName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function PlaybookPdfSection({ pdfUrl, onSavePdfUrl, tabLabel }: PlaybookPdfSectionProps) {
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(async (file: File) => {
    if (!onSavePdfUrl) return;
    if (!file.type.includes("pdf")) {
      toast.error("Por favor, selecione um arquivo PDF.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("O arquivo deve ter no máximo 20MB.");
      return;
    }

    setUploading(true);
    try {
      const safeName = sanitizeFileName(file.name);
      const path = `pdfs/${Date.now()}_${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("playbook-files")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("playbook-files")
        .getPublicUrl(path);

      await onSavePdfUrl(urlData.publicUrl);
      toast.success("PDF enviado com sucesso!");
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao enviar PDF: " + (err.message || "Tente novamente."));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [onSavePdfUrl]);

  const handleRemove = useCallback(async () => {
    if (!onSavePdfUrl) return;
    setSaving(true);
    try {
      await onSavePdfUrl(null);
    } finally {
      setSaving(false);
    }
  }, [onSavePdfUrl]);

  const hiddenInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept=".pdf,application/pdf"
      className="hidden"
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) handleUpload(file);
      }}
    />
  );

  // Admin mode
  if (onSavePdfUrl) {
    if (!pdfUrl) {
      return (
        <>
          {hiddenInput}
          <Button
            variant="outline"
            className="w-full border-dashed border-2 h-14 text-muted-foreground hover:text-foreground hover:border-primary/40 gap-2"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando PDF...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                <FileText className="h-4 w-4" />
                Adicionar PDF a esta aba
              </>
            )}
          </Button>
        </>
      );
    }

    // Has PDF — show viewer with replace/remove controls
    return (
      <div className="space-y-2">
        {hiddenInput}
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Upload className="h-3 w-3" />
            )}
            {uploading ? "Enviando..." : "Substituir PDF"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
            onClick={handleRemove}
            disabled={saving || uploading}
          >
            <Trash2 className="h-3 w-3" />
            Remover
          </Button>
        </div>
        <PlaybookPDFViewer
          pdfUrl={pdfUrl}
          title={tabLabel || "Documento PDF"}
          subtitle="Material complementar"
        />
      </div>
    );
  }

  // Agent mode
  if (!pdfUrl) return null;

  return (
    <PlaybookPDFViewer
      pdfUrl={pdfUrl}
      title={tabLabel || "Documento PDF"}
      subtitle="Material complementar"
    />
  );
}
