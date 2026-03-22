import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Image, 
  Video, 
  File, 
  Layers,
  Eye
} from "lucide-react";
import type { MaterialGallery } from "@/types/materials";

interface GalleryCardProps {
  gallery: MaterialGallery;
  variant?: "default" | "large";
  onOpen?: () => void;
}

const typeIcons: Record<string, React.ElementType> = {
  "Lâmina": FileText,
  "PDF": File,
  "Imagem": Image,
  "Vídeo": Video,
};

export function GalleryCard({ gallery, variant = "default", onOpen }: GalleryCardProps) {
  const isLarge = variant === "large";
  
  // Determine primary type for icon
  const getPrimaryType = () => {
    if (gallery.hasVideos) return "Vídeo";
    if (gallery.hasImages) return "Imagem";
    if (gallery.hasPDFs) return "PDF";
    return gallery.materials[0]?.material_type || "Imagem";
  };
  
  const primaryType = getPrimaryType();
  const Icon = typeIcons[primaryType] || File;

  // Get thumbnail from first material with image
  const getThumbnail = () => {
    if (gallery.thumbnail_url) return gallery.thumbnail_url;
    
    for (const material of gallery.materials) {
      if (material.thumbnail_url) return material.thumbnail_url;
      if (material.material_type === "Imagem" && material.file_url) return material.file_url;
      if (material.video_url) {
        const youtubeMatch = material.video_url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
        if (youtubeMatch) {
          return `https://img.youtube.com/vi/${youtubeMatch[1]}/maxresdefault.jpg`;
        }
      }
    }
    return null;
  };

  const thumbnail = getThumbnail();

  return (
    <Card 
      className={`group border-0 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden bg-card hover:scale-[1.02] w-full ${
        isLarge 
          ? "min-w-[280px] sm:min-w-[320px] max-w-full sm:max-w-[320px]" 
          : "min-w-[240px] sm:min-w-[280px] max-w-full sm:max-w-[280px]"
      }`}
      onClick={onOpen}
    >
      {/* Thumbnail - taller for vertical promotional formats */}
      <div className={`relative overflow-hidden bg-gradient-to-br from-muted/30 via-muted/20 to-muted/40 backdrop-blur-sm ${
        isLarge ? "h-56 sm:h-64" : "h-48 sm:h-56"
      }`}>
        {thumbnail ? (
          <div className="w-full h-full flex items-center justify-center bg-muted/30">
            <img 
              src={thumbnail} 
              alt={gallery.title}
              loading="lazy"
              decoding="async"
              className="max-w-full max-h-full object-contain transition-transform duration-500 group-hover:scale-105"
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icon className={`${isLarge ? "h-16 w-16" : "h-12 w-12"} text-muted-foreground/50`} />
          </div>
        )}
        
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="h-14 w-14 rounded-full bg-primary/90 flex items-center justify-center">
            <Eye className="h-6 w-6 text-primary-foreground" />
          </div>
        </div>

        {/* File count badge */}
        <div className="absolute top-2 right-2">
          <Badge className="bg-black/70 text-white border-0 font-medium">
            <Layers className="h-3 w-3 mr-1" />
            {gallery.fileCount} {gallery.fileCount === 1 ? 'arquivo' : 'arquivos'}
          </Badge>
        </div>

        {/* Type indicators */}
        <div className="absolute top-2 left-2 flex gap-1">
          {gallery.hasImages && (
            <Badge className="bg-accent text-accent-foreground border-0 px-2">
              <Image className="h-3 w-3" />
            </Badge>
          )}
          {gallery.hasPDFs && (
            <Badge className="bg-destructive/10 text-destructive border-0 px-2">
              <File className="h-3 w-3" />
            </Badge>
          )}
          {gallery.hasVideos && (
            <Badge className="bg-secondary text-secondary-foreground border-0 px-2">
              <Video className="h-3 w-3" />
            </Badge>
          )}
        </div>
      </div>

      {/* Content */}
      <CardContent className={`${isLarge ? "p-4" : "p-3"}`}>
        <h3 className={`font-semibold line-clamp-2 group-hover:text-primary transition-colors ${
          isLarge ? "text-base" : "text-sm"
        }`}>
          {gallery.title}
        </h3>
        
        {gallery.trade_suppliers && (
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {gallery.trade_suppliers.name}
          </p>
        )}
        
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <Badge variant="outline" className="text-xs px-2 py-0">
            {gallery.category}
          </Badge>
          {gallery.destination && (
            <Badge variant="secondary" className="text-xs px-2 py-0">
              {gallery.destination}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
