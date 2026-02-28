import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileText,
  Eye,
  Download,
  Maximize,
  Minimize,
  GitBranch,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { PlaybookPDFFile } from "@/types/playbook";
import { cn } from "@/lib/utils";
import { useRef, useCallback } from "react";
import { PdfMagnifier } from "./PdfMagnifier";

interface PlaybookMindMapsViewerProps {
  files: PlaybookPDFFile[];
}

export function PlaybookMindMapsViewer({ files }: PlaybookMindMapsViewerProps) {
  const [selectedFile, setSelectedFile] = useState<PlaybookPDFFile | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const viewerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = useCallback(async () => {
    if (!viewerRef.current) return;
    if (!document.fullscreenElement) {
      await viewerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  if (!files || files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="p-5 rounded-2xl bg-muted mb-5">
          <GitBranch className="h-12 w-12 text-muted-foreground/40" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">Mapas Mentais</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Os mapas mentais deste treinamento ainda não foram adicionados. Em breve estarão disponíveis aqui.
        </p>
      </div>
    );
  }

  const categories = [...new Set(files.map((f) => f.category || "Geral"))];

  return (
    <>
      <div className="space-y-6">
        <div>
          <h3 className="text-base font-semibold text-foreground mb-1">Mapas Mentais</h3>
          <p className="text-sm text-muted-foreground">
            Mapas mentais do treinamento, por tema, empresa ou especialista
          </p>
        </div>

        {categories.map((category) => {
          const categoryFiles = files.filter((f) => (f.category || "Geral") === category);
          return (
            <div key={category} className="space-y-3">
              {categories.length > 1 && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{category}</Badge>
                  <div className="flex-1 h-px bg-border" />
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {categoryFiles.map((file) => (
                  <Card
                    key={file.id}
                    className="group cursor-pointer border hover:border-primary/40 hover:shadow-md transition-all duration-200"
                    onClick={() => setSelectedFile(file)}
                  >
                    <CardContent className="p-0">
                      {file.thumbnail_url ? (
                        <div className="overflow-hidden rounded-t-lg bg-muted/30 flex items-center justify-center p-2">
                          <img src={file.thumbnail_url} alt={file.name} className="max-w-full max-h-48 object-contain" />
                        </div>
                      ) : null}
                      <div className={`p-4 ${file.thumbnail_url ? '' : ''}`}>
                        <div className="flex items-start gap-3">
                          {!file.thumbnail_url && (
                            <div className="p-2.5 rounded-xl bg-primary/10 shrink-0 group-hover:bg-primary/20 transition-colors">
                              <FileText className="h-5 w-5 text-primary" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm text-foreground truncate group-hover:text-primary transition-colors">
                              {file.name}
                            </h4>
                            {file.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                {file.description}
                              </p>
                            )}
                            <div className="flex items-center gap-1.5 mt-2 text-xs text-primary font-medium">
                              <Eye className="h-3.5 w-3.5" />
                              Visualizar
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* PDF Viewer Modal */}
      <Dialog open={!!selectedFile} onOpenChange={(open) => !open && setSelectedFile(null)}>
        <DialogContent className="max-w-[95vw] w-full h-[95vh] p-0 gap-0 overflow-hidden">
          <div ref={viewerRef} className={cn("flex flex-col h-full", isFullscreen && "fixed inset-0 z-50 bg-background")}>
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30 shrink-0">
              <div className="min-w-0">
                <DialogHeader className="p-0 space-y-0">
                  <DialogTitle className="text-sm font-semibold truncate">
                    {selectedFile?.name}
                  </DialogTitle>
                </DialogHeader>
                {selectedFile?.description && (
                  <p className="text-[11px] text-muted-foreground truncate">{selectedFile.description}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          if (!selectedFile) return;
                          const a = document.createElement("a");
                          a.href = selectedFile.pdf_url;
                          a.download = "";
                          a.target = "_blank";
                          a.click();
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Baixar PDF</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleFullscreen}>
                        {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{isFullscreen ? "Sair da tela cheia" : "Tela cheia"}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            {/* PDF with magnifier */}
            <div className="flex-1">
              {selectedFile && (
                <PdfMagnifier
                  src={`${selectedFile.pdf_url}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                  title={selectedFile.name}
                  height="100%"
                />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
