import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Download, 
  X, 
  FileText, 
  Image as ImageIcon, 
  Video, 
  File,
  Calendar,
  Building2,
  ChevronLeft,
  ChevronRight,
  ExternalLink
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Material {
  id: string;
  title: string;
  material_type: string;
  category: string;
  destination?: string | null;
  file_url?: string | null;
  video_url?: string | null;
  thumbnail_url?: string | null;
  published_at: string;
  trade_suppliers?: {
    id: string;
    name: string;
  } | null;
}

interface MaterialPreviewModalProps {
  material: Material | null;
  isOpen: boolean;
  onClose: () => void;
}

const typeIcons: Record<string, React.ElementType> = {
  "Lâmina": FileText,
  "PDF": File,
  "Imagem": ImageIcon,
  "Vídeo": Video,
};

const typeColors: Record<string, string> = {
  "Lâmina": "bg-primary/10 text-primary",
  "PDF": "bg-destructive/10 text-destructive",
  "Imagem": "bg-accent text-accent-foreground",
  "Vídeo": "bg-secondary text-secondary-foreground",
};

export function MaterialPreviewModal({ material, isOpen, onClose }: MaterialPreviewModalProps) {
  const [pdfPage, setPdfPage] = useState(1);

  if (!material) return null;

  const Icon = typeIcons[material.material_type] || File;
  const typeColor = typeColors[material.material_type] || "bg-muted text-muted-foreground";
  const isVideo = material.material_type === "Vídeo";
  const isImage = material.material_type === "Imagem";
  const isPDF = material.material_type === "PDF" || material.material_type === "Lâmina";
  const url = material.video_url || material.file_url;

  // Extract YouTube video ID
  const getYouTubeEmbedUrl = (videoUrl: string) => {
    const match = videoUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    if (match) {
      return `https://www.youtube.com/embed/${match[1]}?autoplay=0&rel=0`;
    }
    return null;
  };

  // Extract Vimeo video ID
  const getVimeoEmbedUrl = (videoUrl: string) => {
    const match = videoUrl.match(/vimeo\.com\/(\d+)/);
    if (match) {
      return `https://player.vimeo.com/video/${match[1]}`;
    }
    return null;
  };

  const getEmbedUrl = (videoUrl: string) => {
    return getYouTubeEmbedUrl(videoUrl) || getVimeoEmbedUrl(videoUrl) || videoUrl;
  };

  const handleDownload = () => {
    if (url) {
      window.open(url, "_blank");
    }
  };

  const formattedDate = format(new Date(material.published_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-4 sm:p-6 pb-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge className={`${typeColor} border-0 font-medium`}>
                  <Icon className="h-3 w-3 mr-1" />
                  {material.material_type}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {material.category}
                </Badge>
                {material.destination && (
                  <Badge variant="secondary" className="text-xs">
                    {material.destination}
                  </Badge>
                )}
              </div>
              <DialogTitle className="text-lg sm:text-xl font-semibold line-clamp-2">
                {material.title}
              </DialogTitle>
            </div>
          </div>
          
          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
            {material.trade_suppliers && (
              <div className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4" />
                <span>{material.trade_suppliers.name}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span>{formattedDate}</span>
            </div>
          </div>
        </DialogHeader>

        {/* Content Preview */}
        <div className="flex-1 overflow-auto p-4 sm:p-6">
          <div className="bg-muted/30 rounded-lg overflow-hidden">
            {isVideo && material.video_url ? (
              <div className="aspect-video w-full">
                <iframe
                  src={getEmbedUrl(material.video_url)}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={material.title}
                />
              </div>
            ) : isImage && material.file_url ? (
              <div className="flex items-center justify-center min-h-[300px] max-h-[60vh]">
                <img
                  src={material.file_url}
                  alt={material.title}
                  className="max-w-full max-h-[60vh] object-contain"
                />
              </div>
            ) : isPDF && material.file_url ? (
              <div className="flex flex-col items-center">
                {/* PDF Preview using embed */}
                <div className="w-full aspect-[3/4] max-h-[60vh]">
                  <iframe
                    src={`${material.file_url}#view=FitH`}
                    className="w-full h-full rounded-lg"
                    title={material.title}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-3">
                  Visualização do PDF. Clique em "Baixar" para ver em tamanho completo.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Icon className="h-16 w-16 mb-4 opacity-50" />
                <p>Visualização não disponível</p>
                <p className="text-sm">Clique em baixar para acessar o arquivo</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer with actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 sm:p-6 pt-0 border-t bg-background">
          <Button variant="outline" onClick={onClose} className="order-2 sm:order-1">
            Fechar
          </Button>
          <Button onClick={handleDownload} className="gap-2 order-1 sm:order-2">
            <Download className="h-4 w-4" />
            Baixar Material
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
