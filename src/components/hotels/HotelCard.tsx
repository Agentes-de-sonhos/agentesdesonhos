import { useState } from "react";
import { MapPin, Star, ExternalLink, ThumbsUp, ThumbsDown, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Hotel, AMENITY_KEYS } from "@/hooks/useHotels";
import { useHotelRecommendationCount, useMyRecommendation } from "@/hooks/useHotelRecommendations";
import { RecommendHotelDialog } from "./RecommendHotelDialog";
import { ViewRecommendationsDialog } from "./ViewRecommendationsDialog";

interface HotelCardProps {
  hotel: Hotel;
}

function StarDisplay({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} className="h-3.5 w-3.5 fill-warning text-warning" />
      ))}
    </div>
  );
}

function ReviewBadge({ score }: { score: number }) {
  const color =
    score >= 4.5
      ? "bg-success text-success-foreground"
      : score >= 4
      ? "bg-primary text-primary-foreground"
      : score >= 3.5
      ? "bg-warning text-warning-foreground"
      : "bg-muted text-muted-foreground";

  return (
    <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-bold ${color}`}>
      {score.toFixed(1)}
    </span>
  );
}

export function HotelCard({ hotel }: HotelCardProps) {
  const [recDialogOpen, setRecDialogOpen] = useState(false);
  const [recDialogType, setRecDialogType] = useState<"recommend" | "remove">("recommend");
  const [viewRecsOpen, setViewRecsOpen] = useState(false);

  const { data: recCount } = useHotelRecommendationCount(hotel.id);
  const { data: myRec } = useMyRecommendation(hotel.id);

  const activeAmenities = AMENITY_KEYS.filter((a) => hotel[a.key as keyof Hotel] === true);
  const tags = [
    hotel.favorite_brazilians && { label: "Mais Procurado por Brasileiros", icon: "⭐", color: "bg-warning/10 text-warning border-warning/20" },
    hotel.iconic_hotel && { label: "Hotel Icônico", icon: "🏆", color: "bg-primary/10 text-primary border-primary/20" },
  ].filter(Boolean) as { label: string; icon: string; color: string }[];

  const alreadyRecommended = !!myRec;

  return (
    <>
      <Card className="border-border/50 hover:border-primary/30 hover:shadow-md transition-all group">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Main Info */}
            <div className="flex-1 min-w-0 space-y-2.5">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground text-base group-hover:text-primary transition-colors truncate">
                      {hotel.name}
                    </h3>
                    {hotel.google_maps_link && (
                      <a
                        href={hotel.google_maps_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">
                      {[hotel.neighborhood, hotel.region].filter(Boolean).join(" – ") || hotel.destination}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stars + Review + Category */}
              <div className="flex items-center gap-3 flex-wrap">
                {hotel.star_rating && <StarDisplay count={hotel.star_rating} />}
                {hotel.review_score && <ReviewBadge score={hotel.review_score} />}
                {hotel.category && (
                  <Badge variant="outline" className="text-xs font-medium">
                    {hotel.category}
                  </Badge>
                )}
                {hotel.property_type && hotel.property_type !== "Hotel" && (
                  <Badge variant="secondary" className="text-xs">
                    {hotel.property_type}
                  </Badge>
                )}
                {hotel.brand && (
                  <span className="text-xs text-muted-foreground">{hotel.brand}</span>
                )}
              </div>

              {/* Tags */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((t) => (
                    <span
                      key={t.label}
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${t.color}`}
                    >
                      {t.icon} {t.label}
                    </span>
                  ))}
                </div>
              )}

              {/* Amenities */}
              {activeAmenities.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {activeAmenities.map((a) => (
                    <span
                      key={a.key}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md"
                      title={a.label}
                    >
                      {a.icon} {a.label}
                    </span>
                  ))}
                </div>
              )}

              {/* Conditions */}
              <div className="flex items-center gap-3 flex-wrap">
                {hotel.free_cancellation && (
                  <span className="text-xs text-success font-medium">✓ Cancelamento gratuito</span>
                )}
                {hotel.special_offers && (
                  <span className="text-xs text-accent font-medium">🏷️ Ofertas especiais</span>
                )}
              </div>

            </div>

            {/* Price + Actions */}
            <div className="sm:text-right sm:min-w-[120px] flex sm:flex-col items-center sm:items-end gap-2">
              {hotel.price_from != null && (
                <>
                  <span className="text-xs text-muted-foreground">a partir de</span>
                  <span className="text-2xl font-bold text-foreground">
                    ${hotel.price_from.toLocaleString("en-US")}
                  </span>
                </>
              )}
              <div className="flex items-center gap-1.5 mt-1">
                {(recCount ?? 0) > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-primary"
                    onClick={() => setViewRecsOpen(true)}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-7 w-7 ${alreadyRecommended ? 'text-success/50' : 'text-success hover:text-success hover:bg-success/10'}`}
                      disabled={alreadyRecommended}
                      onClick={() => { setRecDialogType("recommend"); setRecDialogOpen(true); }}
                    >
                      <ThumbsUp className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {alreadyRecommended ? "Você já recomendou" : "Recomendar"}
                    {(recCount ?? 0) > 0 && ` (${recCount})`}
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                      onClick={() => { setRecDialogType("remove"); setRecDialogOpen(true); }}
                    >
                      <ThumbsDown className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Sugerir remoção</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <RecommendHotelDialog
        open={recDialogOpen}
        onOpenChange={setRecDialogOpen}
        hotelId={hotel.id}
        hotelName={hotel.name}
        type={recDialogType}
      />

      <ViewRecommendationsDialog
        open={viewRecsOpen}
        onOpenChange={setViewRecsOpen}
        hotelId={hotel.id}
        hotelName={hotel.name}
      />
    </>
  );
}
