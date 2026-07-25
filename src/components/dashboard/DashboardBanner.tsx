import { useState, useEffect, useCallback } from "react";
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

  const link = slide.button_link?.trim() || "";
  const hasLink = link.length > 0;

  const openLink = () => {
    if (!hasLink) return;
    window.open(link, "_blank", "noopener,noreferrer");
  };

  const title = slide.title?.trim() || "";
  const description = slide.description?.trim() || "";
  const buttonText = slide.button_text?.trim() || "";
  const hasContent = Boolean(title || description || buttonText);

  return (
    <div
      className={cn(
        "relative w-full rounded-2xl overflow-hidden group bg-muted",
        hasLink && "cursor-pointer"
      )}
      onClick={hasLink ? openLink : undefined}
      role={hasLink ? "link" : undefined}
      tabIndex={hasLink ? 0 : undefined}
      onKeyDown={
        hasLink
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openLink();
              }
            }
          : undefined
      }
    >
      {/* Image respects natural aspect ratio */}
      <img
        key={slide.id}
        src={bgImage}
        alt={title || "Banner"}
        className={cn(
          "block w-full h-auto transition-opacity duration-500",
          isTransitioning ? "opacity-0" : "opacity-100"
        )}
      />

      {hasContent && (
        <>
          {/* Dark overlay for legibility */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30 pointer-events-none" />

          {/* Content */}
          <div
            className={cn(
              "absolute inset-0 z-10 flex flex-col justify-center px-6 sm:px-10 lg:px-14 py-6 sm:py-10 transition-opacity duration-300",
              isTransitioning ? "opacity-0" : "opacity-100"
            )}
          >
            {title && (
              <h2 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold text-white max-w-2xl leading-tight">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-2 text-sm sm:text-base text-white/80 max-w-xl leading-relaxed">
                {description}
              </p>
            )}
            {buttonText && (
              <div className="mt-4">
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    openLink();
                  }}
                  className="bg-white text-foreground hover:bg-white/90 font-semibold shadow-lg"
                >
                  {buttonText}
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Arrows */}
      {items.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); goTo(current - 1); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 h-9 w-9 rounded-full bg-black/30 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/50"
            aria-label="Anterior"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); goTo(current + 1); }}
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
              onClick={(e) => { e.stopPropagation(); goTo(i); }}
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
