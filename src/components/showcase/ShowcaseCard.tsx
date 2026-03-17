import { type ShowcaseItem } from "@/hooks/useShowcase";
import { MessageCircle } from "lucide-react";
import { FeaturedBadge } from "./FeaturedBadge";
import { ImageCarousel } from "./ImageCarousel";

interface ShowcaseCardProps {
  item: ShowcaseItem;
  isFeatured: boolean;
  images: string[];
  onImageClick: () => void;
  onAction: () => void;
}

export function ShowcaseCard({ item, isFeatured, images, onImageClick, onAction }: ShowcaseCardProps) {
  if (images.length === 0) return null;

  return (
    <div
      className={`relative rounded-3xl overflow-hidden bg-card shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer group ${
        isFeatured ? "ring-1 ring-amber-400/40" : ""
      }`}
    >
      {isFeatured && <FeaturedBadge label={item.featured_label} />}

      {/* WhatsApp floating button — centered on card */}
      <button
        onClick={(e) => { e.stopPropagation(); onAction(); }}
        className="absolute inset-0 m-auto z-20 h-10 w-10 rounded-full bg-[hsl(142,70%,45%)] text-white shadow-lg flex items-center justify-center hover:bg-[hsl(142,70%,38%)] hover:scale-110 transition-all duration-200 opacity-80 hover:opacity-100"
        title="Faça um orçamento!"
      >
        <MessageCircle className="h-5 w-5" />
      </button>

      {/* Image area */}
      <ImageCarousel images={images} onImageClick={onImageClick} />

      {/* Card info overlay */}
      <div className="absolute bottom-0 left-0 right-0 z-[5] pointer-events-none">
        <div className="px-5 pb-4 pt-10">
          {item.subcategory && (
            <p className="text-white/70 text-[11px] font-medium uppercase tracking-widest mb-1">{item.subcategory}</p>
          )}
          {item.materials?.title && (
            <h3 className="text-white font-bold text-base leading-snug line-clamp-2 drop-shadow-md">{item.materials.title}</h3>
          )}
        </div>
      </div>
    </div>
  );
}
