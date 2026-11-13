import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Loader2, MoreVertical, Printer, X } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { displayDocumentName, resolveDocumentPreviewKind } from "@/lib/publicDocumentViewer";

export interface PublicViewerDocument {
  id: string;
  file_name: string;
  file_type?: string | null;
}

/**
 * Visualizador de anexos exibido dentro do próprio orçamento público.
 * Não navega para o endereço de armazenamento: o endereço visível segue sendo o
 * do orçamento, e ao fechar o cliente volta ao mesmo ponto da página.
 */
export function PublicDocumentViewer({
  doc,
  signedUrl,
  loading,
  allowDownload,
  onClose,
  onDownload,
  closeLabel = "Fechar",
  downloadLabel = "Baixar",
}: {
  doc: PublicViewerDocument | null;
  signedUrl: string | null;
  loading?: boolean;
  allowDownload?: boolean;
  onClose: () => void;
  onDownload?: () => void;
  closeLabel?: string;
  downloadLabel?: string;
}) {
  const [errored, setErrored] = useState(false);
  useEffect(() => {
    setErrored(false);
  }, [signedUrl, doc?.id]);

  if (!doc) return null;
  const kind = resolveDocumentPreviewKind(doc.file_type, doc.file_name);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        data-testid="public-document-viewer"
        className="[&>button.absolute]:hidden flex flex-col w-screen max-w-none h-[100dvh] sm:w-[96vw] sm:max-w-[1100px] sm:h-[92vh] sm:rounded-lg p-0 gap-0 overflow-hidden"
      >
        <div className="flex items-center gap-1 border-b px-4 py-2">
          <DialogTitle className="flex-1 truncate text-sm font-semibold">{displayDocumentName(doc.file_name)}</DialogTitle>
          <DialogDescription className="sr-only">Anexo do orçamento aberto dentro da própria página.</DialogDescription>
          {(allowDownload && onDownload) || (kind === "pdf" && signedUrl) ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Mais opções">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-[100]">
                {allowDownload && onDownload ? (
                  <DropdownMenuItem onSelect={onDownload}>
                    <Download className="mr-2 h-4 w-4" />
                    {downloadLabel}
                  </DropdownMenuItem>
                ) : null}
                {kind === "pdf" && signedUrl ? (
                  <DropdownMenuItem asChild>
                    <a href={signedUrl} target="_blank" rel="noopener noreferrer">
                      <Printer className="mr-2 h-4 w-4" />
                      Imprimir / abrir no navegador
                    </a>
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
          <Button variant="ghost" size="icon" onClick={onClose} className="h-9 w-9" aria-label={closeLabel}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex-1 overflow-auto bg-muted/30">
          {loading || !signedUrl ? (
            <div className="flex h-full items-center justify-center p-10 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Carregando anexo…
            </div>
          ) : errored ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-10 text-center text-sm text-muted-foreground">
              <p>Não foi possível exibir este arquivo aqui.</p>
              {allowDownload && onDownload ? (
                <Button size="sm" onClick={onDownload}>
                  <Download className="mr-1.5 h-4 w-4" />
                  {downloadLabel}
                </Button>
              ) : null}
            </div>
          ) : kind === "image" ? (
            <div className="flex h-full items-center justify-center p-3">
              <img
                src={signedUrl}
                alt={doc.file_name}
                data-testid="public-document-image"
                onError={() => setErrored(true)}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          ) : (
            <iframe
              src={`${signedUrl}#toolbar=0&navpanes=0`}
              title={doc.file_name}
              data-testid="public-document-frame"
              onError={() => setErrored(true)}
              className="h-full w-full border-0"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
