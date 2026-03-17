import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface LightboxCarouselProps {
  images: string[];
  actionButton: React.ReactNode;
}

export function LightboxCarousel({ images, actionButton }: LightboxCarouselProps) {
  const [current, setCurrent] = useState(0);

  return (
    <div className="relative">
      <img src={images[current]} alt="" className="w-full max-h-[80vh] object-contain" />
      {images.length > 1 && (
        <>
          <span className="absolute top-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full z-10">
            {current + 1}/{images.length}
          </span>
          {current > 0 && (
            <button onClick={() => setCurrent(c => c - 1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 z-10">
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
          {current < images.length - 1 && (
            <button onClick={() => setCurrent(c => c + 1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 z-10">
              <ChevronRight className="h-6 w-6" />
            </button>
          )}
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {images.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)}
                className={`h-2.5 w-2.5 rounded-full transition-all ${i === current ? "bg-white scale-110" : "bg-white/50"}`} />
            ))}
          </div>
        </>
      )}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
        {actionButton}
      </div>
    </div>
  );
}
