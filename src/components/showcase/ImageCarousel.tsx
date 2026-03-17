import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ImageCarouselProps {
  images: string[];
  onImageClick?: () => void;
}

export function ImageCarousel({ images, onImageClick }: ImageCarouselProps) {
  const [current, setCurrent] = useState(0);

  if (images.length <= 1) {
    return (
      <div className="relative w-full overflow-hidden">
        <img src={images[0]} alt="" className="w-full block" loading="lazy" onClick={onImageClick} />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/70 via-black/30 to-transparent pointer-events-none" />
      </div>
    );
  }

  return (
    <div className="relative" onClick={onImageClick}>
      <img src={images[current]} alt="" className="w-full block cursor-pointer" loading="lazy" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/70 via-black/30 to-transparent pointer-events-none" />
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
        {images.map((_, i) => (
          <button key={i} onClick={(e) => { e.stopPropagation(); setCurrent(i); }}
            className={`h-1.5 rounded-full transition-all duration-300 ${i === current ? "bg-white w-5" : "bg-white/40 w-1.5"}`} />
        ))}
      </div>
      {current > 0 && (
        <button onClick={(e) => { e.stopPropagation(); setCurrent(c => c - 1); }}
          className="absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/20 backdrop-blur-sm text-white flex items-center justify-center hover:bg-white/30 transition-colors z-10">
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      {current < images.length - 1 && (
        <button onClick={(e) => { e.stopPropagation(); setCurrent(c => c + 1); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/20 backdrop-blur-sm text-white flex items-center justify-center hover:bg-white/30 transition-colors z-10">
          <ChevronRight className="h-5 w-5" />
        </button>
      )}
      <span className="absolute top-3 right-3 bg-black/40 backdrop-blur-sm text-white text-[11px] px-2.5 py-1 rounded-full z-10 font-medium">
        {current + 1}/{images.length}
      </span>
    </div>
  );
}
