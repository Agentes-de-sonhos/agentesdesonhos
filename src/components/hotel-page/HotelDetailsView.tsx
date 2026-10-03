import { useRef, useState } from "react";
import {
  BedDouble, Clock, Dumbbell, ExternalLink, MapPin, PawPrint, ParkingCircle, Baby, Waves,
  Sparkles, Star, UtensilsCrossed, ConciergeBell, Wifi, Wine, Umbrella, ChevronRight, ChevronLeft, type LucideIcon,
} from "lucide-react";
import { HotelGallery } from "./HotelGallery";
import { HotelQuoteBox } from "./HotelQuoteBox";
import type { HotelAmenityIcon, HotelPageData, HotelQuoteRequest } from "./types";

const AMENITY_ICONS: Record<HotelAmenityIcon, LucideIcon> = {
  restaurant: UtensilsCrossed, "room-service": ConciergeBell, spa: Sparkles, gym: Dumbbell,
  pets: PawPrint, pool: Waves, wifi: Wifi, parking: ParkingCircle, kids: Baby,
  beach: Umbrella, bar: Wine, "all-inclusive": BedDouble, leisure: BedDouble,
};

function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={`flex items-center gap-0.5 ${className ?? ""}`} aria-label={`${value} estrelas`}>
      {Array.from({ length: 5 }, (_, i) => {
        const fill = Math.max(0, Math.min(1, value - i));
        if (fill <= 0 && i >= Math.ceil(value)) return null;
        return (
          <span key={i} className="relative inline-block h-5 w-5">
            <Star className="absolute inset-0 h-5 w-5 text-muted-foreground/30" />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
            </span>
          </span>
        );
      })}
    </span>
  );
}

export function HotelDetailsView({
  hotel, onSubmitQuote, previewMode,
}: {
  hotel: HotelPageData;
  onSubmitQuote?: (req: HotelQuoteRequest) => Promise<void>;
  previewMode?: boolean;
}) {
  const g = hotel.google;
  const loc = hotel.location;

  return (
    <article className="space-y-8 text-foreground">
      <header>
        {hotel.stars ? <Stars value={hotel.stars} /> : null}
        <h1 className="mt-2 text-2xl font-bold leading-tight tracking-tight md:text-4xl">{hotel.name}</h1>
        <p className="mt-2 flex items-start gap-1.5 text-sm text-muted-foreground md:text-base">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          {[hotel.address, hotel.city, hotel.state].filter(Boolean).join(" · ")}
        </p>
      </header>

      <HotelGallery photos={hotel.photos} hotelName={hotel.name} />

      <HotelQuoteBox hotelSlug={hotel.slug} hotelName={hotel.name} onSubmit={onSubmitQuote} previewMode={previewMode} />

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          {hotel.description.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">{hotel.descriptionTitle || "Por que escolher este hotel?"}</h2>
              <div className="mt-4 space-y-4 leading-relaxed text-muted-foreground">
                {hotel.description.map((p, i) => <p key={i}>{p}</p>)}
              </div>
            </section>
          )}

          {hotel.amenities.length > 0 && (
            <section className="border-t border-border pt-8">
              <h2 className="text-xl font-bold">Destaques do hotel</h2>
              <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {hotel.amenities.map((a) => {
                  const Icon = AMENITY_ICONS[a.icon] ?? Sparkles;
                  return (
                    <li key={a.label} className={`flex gap-3 rounded-xl border border-border bg-card px-4 py-4 text-sm ${a.description ? "items-start" : "items-center"}`}>
                      <Icon className="h-6 w-6 shrink-0 text-primary" aria-hidden />
                      <div>
                        <span className={a.description ? "font-semibold" : undefined}>{a.label}</span>
                        {a.description && <p className="mt-1 leading-relaxed text-muted-foreground">{a.description}</p>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {(hotel.checkIn || hotel.checkOut) && (
            <section className="rounded-2xl bg-primary/5 p-5 md:p-6">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <Clock className="h-5 w-5 text-primary" aria-hidden /> Horários da estadia
              </h2>
              <div className="mt-4 grid grid-cols-2 divide-x divide-border">
                {[["Check-in", hotel.checkIn], ["Check-out", hotel.checkOut]].map(([label, val]) => (
                  <div key={label} className="flex items-center gap-3 px-2 first:pl-0 sm:px-6">
                    <Clock className="h-6 w-6 shrink-0 text-muted-foreground" aria-hidden />
                    <div>
                      <p className="font-semibold">{label}</p>
                      <p className="text-sm text-muted-foreground">{val || "A confirmar"}</p>
                    </div>
                  </div>
                ))}
              </div>
              {hotel.scheduleNote && <p className="mt-4 text-center text-xs text-muted-foreground">{hotel.scheduleNote}</p>}
            </section>
          )}
        </div>

        <aside className="space-y-6">
          {g && (
            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="flex items-center gap-2 font-bold">
                <span className="grid h-7 w-7 place-items-center rounded-full border border-border text-sm font-bold text-primary">G</span>
                Avaliações do Google
              </h2>
              <div className="mt-4 flex items-center gap-3">
                <span className="text-4xl font-bold tabular-nums">{g.rating.toFixed(1).replace(".", ",")}</span>
                <div className="flex-1">
                  <Stars value={g.rating} />
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {g.totalReviews.toLocaleString("pt-BR")} avaliações{g.illustrative ? " · exemplo ilustrativo" : ""}
                  </p>
                </div>
              </div>
              <a href={g.reviewsUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                Ver avaliações <ChevronRight className="h-4 w-4" />
              </a>
              {g.featuredReview && (
                <div className="mt-4 border-t border-border pt-4">
                  <p className="text-sm text-foreground">“{g.featuredReview.text}”</p>
                  <div className="mt-3 flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground font-semibold">
                      {g.featuredReview.author.charAt(0)}
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{g.featuredReview.author}</p>
                      {g.featuredReview.relativeTime && <p className="text-xs text-muted-foreground">{g.featuredReview.relativeTime}</p>}
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {loc && (
            <section className="overflow-hidden rounded-2xl border border-border bg-card">
              <h2 className="flex items-center gap-2 p-5 pb-3 font-bold">
                <MapPin className="h-5 w-5 text-primary" aria-hidden /> Localização
              </h2>
              <div className="relative">
                <iframe
                  title={`Mapa de ${hotel.name}`}
                  src={`https://maps.google.com/maps?q=${loc.lat},${loc.lng}&z=13&output=embed`}
                  loading="lazy"
                  className="h-56 w-full border-0"
                  referrerPolicy="no-referrer-when-downgrade"
                />
                <a href={loc.mapsUrl} target="_blank" rel="noopener noreferrer" className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-lg bg-background px-3 py-2 text-sm font-medium text-primary shadow-md">
                  <ExternalLink className="h-4 w-4" /> Abrir no Google Maps
                </a>
              </div>
            </section>
          )}
        </aside>
      </div>
    </article>
  );
}
