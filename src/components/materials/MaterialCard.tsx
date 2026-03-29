import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Image, 
  Video, 
  File, 
  Play,
  Eye
} from "lucide-react";

interface MaterialCardProps {
  material: {
    id: string;
    title: string;
    material_type: string;
    category: string;
    destination?: string | null;
    file_url?: string | null;
    video_url?: string | null;
    thumbnail_url?: string | null;
    published_at: string;
    tour_operators?: {
      id: string;
      name: string;
    } | null;
  };
  variant?: "default" | "large";
  onPreview?: () => void;
}

const typeIcons: Record<string, React.ElementType> = {
  "Lâmina": FileText,
  "PDF": File,
  "Imagem": Image,
  "Vídeo": Video,
};

const typeColors: Record<string, string> = {
  "Lâmina": "bg-primary/10 text-primary",
  "PDF": "bg-destructive/10 text-destructive",
  "Imagem": "bg-accent text-accent-foreground",
  "Vídeo": "bg-secondary text-secondary-foreground",
};

export function MaterialCard({ material, variant = "default", onPreview }: MaterialCardProps) {
  const Icon = typeIcons[material.material_type] || File;
  const typeColor = typeColors[material.material_type] || "bg-muted text-muted-foreground";
  const isVideo = material.material_type === "Vídeo";

  // Generate thumbnail - use uploaded thumbnail, video thumbnail, or file preview
  const getThumbnail = () => {
    if (material.thumbnail_url) return material.thumbnail_url;
    if (material.material_type === "Imagem" && material.file_url) return material.file_url;
    // YouTube thumbnail extraction
    if (material.video_url) {
      const youtubeMatch = material.video_url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
      if (youtubeMatch) {
        return `https://img.youtube.com/vi/${youtubeMatch[1]}/maxresdefault.jpg`;
      }
    }
    return null;
  };

  const thumbnail = getThumbnail();
  const isLarge = variant === "large";

  const handleClick = () => {
    if (onPreview) {
      onPreview();
    }
  };

  return (
    <Card 
      className={`group border-0 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden bg-card hover:scale-[1.02] ${
        isLarge ? "min-w-[280px] sm:min-w-[320px]" : "min-w-[240px] sm:min-w-[280px]"
      }`}
      onClick={handleClick}
    >
      {/* Thumbnail */}
      <div className={`relative overflow-hidden bg-gradient-to-br from-muted to-muted/50 ${
        isLarge ? "h-40 sm:h-48" : "h-32 sm:h-40"
      }`}>
        {thumbnail ? (
          <img 
            src={thumbnail} 
            alt={material.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icon className={`${isLarge ? "h-16 w-16" : "h-12 w-12"} text-muted-foreground/50`} />
          </div>
        )}
        
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          {isVideo ? (
            <div className="h-14 w-14 rounded-full bg-primary flex items-center justify-center">
              <Play className="h-6 w-6 text-primary-foreground ml-1" />
            </div>
          ) : (
            <div className="h-14 w-14 rounded-full bg-primary/90 flex items-center justify-center">
              <Eye className="h-6 w-6 text-primary-foreground" />
            </div>
          )}
        </div>

        {/* Type badge */}
        <div className="absolute top-2 left-2">
          <Badge className={`${typeColor} border-0 font-medium`}>
            <Icon className="h-3 w-3 mr-1" />
            {material.material_type}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <CardContent className={`${isLarge ? "p-4" : "p-3"}`}>
        <h3 className={`font-semibold line-clamp-2 group-hover:text-primary transition-colors ${
          isLarge ? "text-base" : "text-sm"
        }`}>
          {material.title}
        </h3>
        
        {material.tour_operators && (
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {material.tour_operators.name}
          </p>
        )}
        
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <Badge variant="outline" className="text-xs px-2 py-0">
            {material.category}
          </Badge>
          {material.destination && (
            <Badge variant="secondary" className="text-xs px-2 py-0">
              {material.destination}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
