import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Plus, Trash2 } from "lucide-react";
import { PlaybookPDFViewer } from "./PlaybookPDFViewer";

interface PlaybookPdfSectionProps {
  pdfUrl: string | undefined;
  onSavePdfUrl?: (url: string | null) => Promise<void>;
  tabLabel?: string;
}

/**
 * Optional PDF section for any playbook tab.
 * Admin: shows input to add/remove PDF URL.
 * Agent: shows the PDF viewer if a URL exists.
 */
export function PlaybookPdfSection({ pdfUrl, onSavePdfUrl, tabLabel }: PlaybookPdfSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [urlInput, setUrlInput] = useState(pdfUrl || "");
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!onSavePdfUrl) return;
    setSaving(true);
    try {
      await onSavePdfUrl(urlInput.trim() || null);
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  }, [onSavePdfUrl, urlInput]);

  const handleRemove = useCallback(async () => {
    if (!onSavePdfUrl) return;
    setSaving(true);
    try {
      await onSavePdfUrl(null);
      setUrlInput("");
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  }, [onSavePdfUrl]);

  // Admin mode
  if (onSavePdfUrl) {
    if (!pdfUrl && !isEditing) {
      return (
        <Button
          variant="outline"
          className="w-full border-dashed border-2 h-14 text-muted-foreground hover:text-foreground hover:border-primary/40 gap-2"
          onClick={() => setIsEditing(true)}
        >
          <Plus className="h-4 w-4" />
          <FileText className="h-4 w-4" />
          Adicionar PDF a esta aba
        </Button>
      );
    }

    if (isEditing || (!pdfUrl && isEditing)) {
      return (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <Label className="text-sm font-medium">URL do PDF</Label>
          <div className="flex gap-2">
            <Input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://exemplo.com/documento.pdf"
              className="flex-1"
            />
            <Button onClick={handleSave} disabled={saving} size="sm">
              {saving ? "Salvando..." : "Salvar"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsEditing(false);
                setUrlInput(pdfUrl || "");
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      );
    }

    // Has PDF — show viewer with edit/remove controls
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => {
              setUrlInput(pdfUrl || "");
              setIsEditing(true);
            }}
          >
            <FileText className="h-3 w-3" />
            Alterar PDF
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
            onClick={handleRemove}
            disabled={saving}
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

  // Agent mode — only show viewer if there's a PDF
  if (!pdfUrl) return null;

  return (
    <PlaybookPDFViewer
      pdfUrl={pdfUrl}
      title={tabLabel || "Documento PDF"}
      subtitle="Material complementar"
    />
  );
}
