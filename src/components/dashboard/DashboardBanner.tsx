import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import bannerWelcome from "@/assets/banner-welcome.jpg";
import bannerAcademy from "@/assets/banner-academy.jpg";
import bannerCommunity from "@/assets/banner-community.jpg";

const fallbackImages = [bannerWelcome, bannerAcademy, bannerCommunity];

interface Banner {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  button_text: string | null;
  button_link: string | null;
  order_index: number;
}

export function DashboardBanner() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const { data: banners } = useQuery({
    queryKey: ["dashboard-banners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dashboard_banners")
        .select("*")
        .eq("is_active", true)
        .order("order_index");
      if (error) throw error;
      return data as Banner[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const items = banners ?? [];

  const goTo = useCallback(
    (index: number) => {
      if (isTransitioning || items.length === 0) return;
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrent(((index % items.length) + items.length) % items.length);
        setIsTransitioning(false);
      }, 300);
    },
    [isTransitioning, items.length]
  );

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(() => goTo(current + 1), 6000);
    return () => clearInterval(timer);
  }, [current, items.length, goTo]);

  if (items.length === 0) return null;

  const slide = items[current];
  const bgImage = slide.image_url || fallbackImages[current % fallbackImages.length];

  const handleCTA = () => {
    if (!slide.button_link) return;
    if (slide.button_link.startsWith("http")) {
      window.open(slide.button_link, "_blank");
    } else {
      navigate(slide.button_link);
    }
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden group" style={{ minHeight: 220 }}>
      {/* Background image */}
      <div
        className={cn(
          "absolute inset-0 bg-cover bg-center transition-opacity duration-500",
          isTransitioning ? "opacity-0" : "opacity-100"
        )}
        style={{ backgroundImage: `url(${bgImage})` }}
      />

      {/* Dark overlay for legibility */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" />

      {/* Content */}
      <div
        className={cn(
          "relative z-10 flex flex-col justify-center h-full px-6 sm:px-10 lg:px-14 py-10 sm:py-14 transition-opacity duration-300",
          isTransitioning ? "opacity-0" : "opacity-100"
        )}
        style={{ minHeight: 220, maxHeight: 320 }}
      >
        <h2 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold text-white max-w-2xl leading-tight">
          {slide.title}
        </h2>
        {slide.description && (
          <p className="mt-2 text-sm sm:text-base text-white/80 max-w-xl leading-relaxed">
            {slide.description}
          </p>
        )}
        {slide.button_text && (
          <div className="mt-4">
            <Button
              onClick={handleCTA}
              className="bg-white text-foreground hover:bg-white/90 font-semibold shadow-lg"
            >
              {slide.button_text}
            </Button>
          </div>
        )}
      </div>

      {/* Arrows */}
      {items.length > 1 && (
        <>
          <button
            onClick={() => goTo(current - 1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 h-9 w-9 rounded-full bg-black/30 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/50"
            aria-label="Anterior"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => goTo(current + 1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 h-9 w-9 rounded-full bg-black/30 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/50"
            aria-label="Próximo"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Dots */}
      {items.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                i === current ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/70"
              )}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
