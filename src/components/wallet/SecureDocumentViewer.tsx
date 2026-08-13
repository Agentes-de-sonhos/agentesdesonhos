import { AlertCircle, Download, FileText, Loader2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SecureDocumentBlob } from "@/lib/secureDocumentFetch";

interface Props {
  open: boolean;
  loading: boolean;
  downloading?: boolean;
  error: string | null;
  doc: SecureDocumentBlob | null;
  /** Nome exibido enquanto o arquivo carrega. */
  fileName: string;
  fileMeta?: string | null;
  onClose: () => void;
  onRetry: () => void;
  onDownload: () => void;
}

/**
 * Visualizador de documentos dentro da própria Carteira Digital.
 * Sempre usa blob: URLs locais — a URL do endpoint seguro nunca é exposta.
 */
export function SecureDocumentViewer({
  open,
  loading,
  downloading,
  error,
  doc,
  fileName,
  fileMeta,
  onClose,
  onRetry,
  onDownload,
}: Props) {
  const canPreview = doc?.kind === "pdf" || doc?.kind === "image";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className={cn(
          "max-w-[96vw] p-0 gap-0 sm:max-w-[90vw] lg:max-w-5xl",
          "h-[92vh] sm:h-[88vh] flex flex-col overflow-hidden",
        )}
      >
        <DialogHeader className="shrink-0 border-b border-border/60 px-4 py-3 text-left sm:px-5">
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
            >
              <FileText className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate text-[15px] font-semibold">
                {fileName || doc?.fileName}
              </DialogTitle>
              <DialogDescription className="text-[11px] uppercase tracking-wide">
                {fileMeta || doc?.contentType || "Documento do serviço"}
              </DialogDescription>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onDownload}
                disabled={downloading}
                aria-label={`Baixar arquivo ${fileName || doc?.fileName || ""}`.trim()}
                className="h-9 rounded-full px-3 text-[12px] font-semibold"
              >
                {downloading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : (
                  <Download className="h-3.5 w-3.5" aria-hidden />
                )}
                <span className="ml-1.5 hidden sm:inline">Baixar</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onClose}
                aria-label="Fechar visualizador"
                className="h-9 w-9 rounded-full"
              >
                <X className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="relative flex-1 overflow-auto bg-muted/40">
          {loading && (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
              <p className="text-sm">Carregando documento…</p>
            </div>
          )}

          {!loading && error && (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
              <AlertCircle className="h-7 w-7 text-destructive" aria-hidden />
              <p className="max-w-xs text-sm text-muted-foreground">{error}</p>
              <Button type="button" size="sm" onClick={onRetry} className="rounded-full">
                Tentar novamente
              </Button>
            </div>
          )}

          {!loading && !error && doc && doc.kind === "pdf" && (
            <iframe
              src={doc.objectUrl}
              title={doc.fileName}
              className="h-full w-full border-0 bg-background"
            />
          )}

          {!loading && !error && doc && doc.kind === "image" && (
            <div className="flex h-full items-center justify-center p-3">
              <img
                src={doc.objectUrl}
                alt={doc.fileName}
                className="max-h-full max-w-full rounded-lg object-contain"
              />
            </div>
          )}

          {!loading && !error && doc && !canPreview && (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
              <FileText className="h-8 w-8 text-muted-foreground" aria-hidden />
              <div>
                <p className="text-sm font-medium text-foreground break-words">{doc.fileName}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Este formato não pode ser visualizado aqui.
                </p>
              </div>
              <Button
                type="button"
                onClick={onDownload}
                disabled={downloading}
                className="rounded-full"
                aria-label={`Baixar arquivo ${doc.fileName}`}
              >
                <Download className="mr-1.5 h-4 w-4" aria-hidden />
                Baixar arquivo
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}