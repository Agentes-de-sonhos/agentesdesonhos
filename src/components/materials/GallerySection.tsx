import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GalleryCard } from "./GalleryCard";
import type { MaterialGallery } from "@/types/materials";

interface GallerySectionProps {
  title: string;
  galleries: MaterialGallery[];
  variant?: "default" | "large";
  icon?: React.ReactNode;
  onOpen?: (gallery: MaterialGallery) => void;
}

export function GallerySection({ title, galleries, variant = "default", icon, onOpen }: GallerySectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!galleries || galleries.length === 0) return null;

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = direction === "left" ? -400 : 400;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  // Count total files across all galleries
  const totalFiles = galleries.reduce((sum, g) => sum + g.fileCount, 0);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
          {icon}
          {title}
          <span className="text-sm font-normal text-muted-foreground">
            ({galleries.length} {galleries.length === 1 ? 'galeria' : 'galerias'} • {totalFiles} arquivos)
          </span>
        </h2>
        <div className="hidden sm:flex gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={() => scroll("left")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={() => scroll("right")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent snap-x snap-mandatory"
        style={{ scrollbarWidth: "thin" }}
      >
        {galleries.map((gallery) => (
          <div key={gallery.id} className="snap-start flex-shrink-0">
            <GalleryCard 
              gallery={gallery} 
              variant={variant} 
              onOpen={() => onOpen?.(gallery)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
