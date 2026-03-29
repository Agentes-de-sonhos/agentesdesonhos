import { useState, useCallback } from "react";
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
  FileText, 
  Image as ImageIcon, 
  Video, 
  File,
  Calendar,
  Building2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  FolderDown,
  Layers
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import JSZip from "jszip";
import type { MaterialGallery, Material } from "@/types/materials";

interface GalleryModalProps {
  gallery: MaterialGallery | null;
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

// Get file extension from URL or material type
const getFileExtension = (url: string, materialType: string): string => {
  const urlMatch = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  if (urlMatch) return urlMatch[1].toLowerCase();
  
  const typeExtensions: Record<string, string> = {
    "Imagem": "jpg",
    "PDF": "pdf",
    "Lâmina": "pdf",
    "Vídeo": "mp4",
  };
  return typeExtensions[materialType] || "file";
};

// Sanitize filename for download
const sanitizeFilename = (title: string): string => {
  return title
    .replace(/[^a-zA-Z0-9áàâãéèêíìîóòôõúùûçÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ\s-]/g, "")
    .replace(/\s+/g, "_")
    .substring(0, 100);
};

// Check if video is from external platform
const isExternalVideo = (videoUrl: string): boolean => {
  return !!(
    videoUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/) ||
    videoUrl.match(/vimeo\.com\/(\d+)/)
  );
};

// Get embed URL for videos
const getEmbedUrl = (videoUrl: string): string => {
  const youtubeMatch = videoUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
  if (youtubeMatch) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}?autoplay=0&rel=0`;
  }
  
  const vimeoMatch = videoUrl.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }
  
  return videoUrl;
};

export function GalleryModal({ gallery, isOpen, onClose }: GalleryModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);

  if (!gallery) return null;

  const materials = gallery.materials;
  const currentMaterial = materials[currentIndex];
  
  const Icon = typeIcons[currentMaterial.material_type] || File;
  const typeColor = typeColors[currentMaterial.material_type] || "bg-muted text-muted-foreground";
  const isVideo = currentMaterial.material_type === "Vídeo";
  const isImage = currentMaterial.material_type === "Imagem";
  const isPDF = currentMaterial.material_type === "PDF" || currentMaterial.material_type === "Lâmina";
  const url = currentMaterial.video_url || currentMaterial.file_url;

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? materials.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === materials.length - 1 ? 0 : prev + 1));
  };

  const handleDownloadSingle = async () => {
    if (!url) return;

    // For external videos, open in new tab
    if (isVideo && currentMaterial.video_url && isExternalVideo(currentMaterial.video_url)) {
      window.open(currentMaterial.video_url, "_blank");
      toast.info("Vídeos externos abrem na plataforma original");
      return;
    }

    setIsDownloading(true);
    
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Falha ao baixar arquivo");
      
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      
      const extension = getFileExtension(url, currentMaterial.material_type);
      const filename = `${sanitizeFilename(currentMaterial.title)}.${extension}`;
      link.download = filename;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      
      toast.success("Download iniciado!");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Erro ao baixar arquivo. Tente novamente.");
      window.open(url, "_blank");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadAll = async () => {
    const downloadableMaterials = materials.filter((m) => {
      const fileUrl = m.file_url || m.video_url;
      if (!fileUrl) return false;
      if (m.video_url && isExternalVideo(m.video_url)) return false;
      return true;
    });

    if (downloadableMaterials.length === 0) {
      toast.info("Nenhum arquivo disponível para download em lote");
      return;
    }

    setIsDownloadingAll(true);
    const zip = new JSZip();

    try {
      toast.info(`Preparando ${downloadableMaterials.length} arquivos...`);

      const downloads = await Promise.allSettled(
        downloadableMaterials.map(async (material, index) => {
          const fileUrl = material.file_url || material.video_url;
          if (!fileUrl) return;

          const response = await fetch(fileUrl);
          if (!response.ok) throw new Error(`Failed to fetch ${fileUrl}`);
          
          const blob = await response.blob();
          const extension = getFileExtension(fileUrl, material.material_type);
          const filename = `${String(index + 1).padStart(2, "0")}_${sanitizeFilename(material.title)}.${extension}`;
          
          zip.file(filename, blob);
        })
      );

      const successful = downloads.filter((d) => d.status === "fulfilled").length;
      
      if (successful === 0) {
        throw new Error("Nenhum arquivo pôde ser baixado");
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const blobUrl = window.URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${sanitizeFilename(gallery.title)}.zip`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

      toast.success(`${successful} arquivos baixados com sucesso!`);
    } catch (error) {
      console.error("ZIP download error:", error);
      toast.error("Erro ao criar arquivo ZIP. Tente novamente.");
    } finally {
      setIsDownloadingAll(false);
    }
  };

  const formattedDate = format(new Date(gallery.published_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-4 sm:p-6 pb-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge className="bg-primary/10 text-primary border-0 font-medium">
                  <Layers className="h-3 w-3 mr-1" />
                  {gallery.fileCount} {gallery.fileCount === 1 ? 'arquivo' : 'arquivos'}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {gallery.category}
                </Badge>
                {gallery.destination && (
                  <Badge variant="secondary" className="text-xs">
                    {gallery.destination}
                  </Badge>
                )}
              </div>
              <DialogTitle className="text-lg sm:text-xl font-semibold line-clamp-2">
                {gallery.title}
              </DialogTitle>
            </div>
          </div>
          
          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
            {gallery.tour_operators && (
              <div className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4" />
                <span>{gallery.tour_operators.name}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span>{formattedDate}</span>
            </div>
          </div>
        </DialogHeader>

        {/* Content Preview with Carousel */}
        <div className="flex-1 overflow-hidden p-4 sm:p-6">
          <div className="relative bg-muted/30 rounded-lg overflow-hidden">
            {/* Navigation Arrows */}
            {materials.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-black/50 hover:bg-black/70 text-white"
                  onClick={goToPrevious}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-black/50 hover:bg-black/70 text-white"
                  onClick={goToNext}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </>
            )}

            {/* Current Material Type Badge */}
            <div className="absolute top-3 left-3 z-10">
              <Badge className={`${typeColor} border-0 font-medium`}>
                <Icon className="h-3 w-3 mr-1" />
                {currentMaterial.material_type}
              </Badge>
            </div>

            {/* Counter */}
            {materials.length > 1 && (
              <div className="absolute top-3 right-3 z-10">
                <Badge className="bg-black/70 text-white border-0">
                  {currentIndex + 1} / {materials.length}
                </Badge>
              </div>
            )}

            {/* Preview Content */}
            <div className="min-h-[300px] max-h-[50vh] flex items-center justify-center">
              {isVideo && currentMaterial.video_url ? (
                <div className="aspect-video w-full max-h-[50vh]">
                  <iframe
                    src={getEmbedUrl(currentMaterial.video_url)}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={currentMaterial.title}
                  />
                </div>
              ) : isImage && currentMaterial.file_url ? (
                <img
                  src={currentMaterial.file_url}
                  alt={currentMaterial.title}
                  className="max-w-full max-h-[50vh] object-contain"
                />
              ) : isPDF && currentMaterial.file_url ? (
                <div className="w-full aspect-[3/4] max-h-[50vh]">
                  <iframe
                    src={`${currentMaterial.file_url}#view=FitH`}
                    className="w-full h-full rounded-lg"
                    title={currentMaterial.title}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Icon className="h-16 w-16 mb-4 opacity-50" />
                  <p>Visualização não disponível</p>
                </div>
              )}
            </div>
          </div>

          {/* Thumbnail Strip for multiple files */}
          {materials.length > 1 && (
            <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
              {materials.map((material, index) => {
                const MaterialIcon = typeIcons[material.material_type] || File;
                const thumb = material.thumbnail_url || 
                  (material.material_type === "Imagem" ? material.file_url : null);
                
                return (
                  <button
                    key={material.id}
                    onClick={() => setCurrentIndex(index)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                      index === currentIndex 
                        ? "border-primary ring-2 ring-primary/20" 
                        : "border-transparent hover:border-muted-foreground/30"
                    }`}
                  >
                    {thumb ? (
                      <img 
                        src={thumb} 
                        alt={`Arquivo ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <MaterialIcon className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer with actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 sm:p-6 pt-0 border-t bg-background">
          <Button variant="outline" onClick={onClose} className="order-3 sm:order-1">
            Fechar
          </Button>
          
          <div className="flex flex-col sm:flex-row gap-2 order-1 sm:order-2">
            {materials.length > 1 && (
              <Button 
                variant="secondary"
                onClick={handleDownloadAll}
                className="gap-2"
                disabled={isDownloadingAll}
              >
                {isDownloadingAll ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FolderDown className="h-4 w-4" />
                )}
                {isDownloadingAll ? "Preparando ZIP..." : "Baixar Tudo (.zip)"}
              </Button>
            )}
            <Button 
              onClick={handleDownloadSingle}
              className="gap-2"
              disabled={isDownloading}
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {isDownloading ? "Baixando..." : "Baixar Este Arquivo"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
