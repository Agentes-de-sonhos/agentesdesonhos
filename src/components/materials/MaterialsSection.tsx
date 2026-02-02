import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MaterialCard } from "./MaterialCard";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

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

interface MaterialsSectionProps {
  title: string;
  materials: Material[];
  variant?: "default" | "large";
  icon?: React.ReactNode;
}

export function MaterialsSection({ title, materials, variant = "default", icon }: MaterialsSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!materials || materials.length === 0) return null;

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = direction === "left" ? -400 : 400;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
          {icon}
          {title}
          <span className="text-sm font-normal text-muted-foreground">
            ({materials.length})
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
        {materials.map((material) => (
          <div key={material.id} className="snap-start flex-shrink-0">
            <MaterialCard material={material} variant={variant} />
          </div>
        ))}
      </div>
    </section>
  );
}
