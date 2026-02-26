import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Download,
  Maximize,
  Minimize,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PlaybookPDFViewerProps {
  pdfUrl: string | undefined;
  title?: string;
  subtitle?: string;
}

export function PlaybookPDFViewer({
  pdfUrl,
  title = "Visão Geral",
  subtitle = "Resumo Estratégico do Treinamento",
}: PlaybookPDFViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);


  const handleDownload = () => {
    if (!pdfUrl) return;
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = "";
    a.target = "_blank";
    a.click();
  };

  if (!pdfUrl) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="p-5 rounded-2xl bg-muted mb-5">
          <FileText className="h-12 w-12 text-muted-foreground/40" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          O PDF de visão geral deste destino ainda não foi adicionado. Em breve estará disponível aqui.
        </p>
      </div>
    );
  }

  const embedUrl = `${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`;

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex flex-col rounded-2xl border border-border bg-card overflow-hidden",
        isFullscreen && "fixed inset-0 z-50 rounded-none border-0"
      )}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground truncate">{title}</h3>
          {subtitle && (
            <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Download */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleDownload}
            title="Baixar PDF"
          >
            <Download className="h-4 w-4" />
          </Button>

          {/* Fullscreen */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
          >
            {isFullscreen ? (
              <Minimize className="h-4 w-4" />
            ) : (
              <Maximize className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* PDF Embed */}
      <div
        className={cn(
          "flex-1 overflow-x-hidden overflow-y-auto bg-muted/20",
          isFullscreen ? "h-[calc(100vh-52px)]" : "h-[80vh] min-h-[500px]"
        )}
      >
        <iframe
          src={embedUrl}
          className="w-full h-full border-0"
          title="Visualizador de PDF"
          loading="eager"
          style={{ overflow: "hidden" }}
        />
      </div>
    </div>
  );
}
