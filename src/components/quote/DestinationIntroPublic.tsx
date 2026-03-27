import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface DestinationIntroPublicProps {
  text: string | null;
  images: string[];
  destination: string;
}

export function DestinationIntroPublic({ text, images, destination }: DestinationIntroPublicProps) {
  const [currentImage, setCurrentImage] = useState(0);
  const hasImages = images.length > 0;
  const hasText = !!text?.trim();

  if (!hasImages && !hasText) return null;

  return (
    <section className="space-y-4">
      {/* Images carousel */}
      {hasImages && (
        <div className="relative rounded-2xl overflow-hidden shadow-sm border border-border/30">
          <div className="flex overflow-hidden">
            <img
              src={images[currentImage]}
              alt={`${destination} - ${currentImage + 1}`}
              className="w-full h-48 sm:h-64 object-cover transition-all duration-500"
            />
          </div>

          {/* Navigation dots */}
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => setCurrentImage((p) => (p === 0 ? images.length - 1 : p - 1))}
                className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentImage((p) => (p === images.length - 1 ? 0 : p + 1))}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {images.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCurrentImage(i)}
                    className={`h-2 rounded-full transition-all ${
                      i === currentImage ? "w-6 bg-white" : "w-2 bg-white/50"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Description text */}
      {hasText && (
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed text-center px-2 sm:px-6">
          {text}
        </p>
      )}
    </section>
  );
}
