import { MapPin, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Tag {
  label: string;
  icon: string;
  color: string;
}

interface AdvisorCardProps {
  name: string;
  location: string;
  category?: string | null;
  badges?: { label: string; variant?: "outline" | "secondary" | "default" }[];
  tags?: Tag[];
  details?: { icon: string; label: string }[];
  shortDescription?: string | null;
  priceDisplay?: React.ReactNode;
  googleMapsLink?: string | null;
  expertTip?: string | null;
}

export function AdvisorCard({
  name,
  location,
  category,
  badges = [],
  tags = [],
  details = [],
  shortDescription,
  priceDisplay,
  googleMapsLink,
  expertTip,
}: AdvisorCardProps) {
  return (
    <Card className="border-border/50 hover:border-primary/30 hover:shadow-md transition-all group">
      <CardContent className="p-5">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 min-w-0 space-y-2.5">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-foreground text-base group-hover:text-primary transition-colors truncate">
                    {name}
                  </h3>
                  {googleMapsLink && (
                    <a href={googleMapsLink} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{location}</span>
                </div>
              </div>
            </div>

            {/* Badges */}
            {(category || badges.length > 0) && (
              <div className="flex items-center gap-3 flex-wrap">
                {category && <Badge variant="outline" className="text-xs font-medium">{category}</Badge>}
                {badges.map((b) => (
                  <Badge key={b.label} variant={b.variant || "secondary"} className="text-xs">{b.label}</Badge>
                ))}
              </div>
            )}

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <span key={t.label} className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${t.color}`}>
                    {t.icon} {t.label}
                  </span>
                ))}
              </div>
            )}

            {/* Details */}
            {details.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {details.map((d) => (
                  <span key={d.label} className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                    {d.icon} {d.label}
                  </span>
                ))}
              </div>
            )}

            {/* Short description */}
            {shortDescription && (
              <p className="text-sm text-muted-foreground line-clamp-2">{shortDescription}</p>
            )}

            {/* Expert tip */}
            {expertTip && (
              <p className="text-xs text-primary/80 italic line-clamp-1">💡 {expertTip}</p>
            )}
          </div>

          {/* Price */}
          {priceDisplay && (
            <div className="sm:text-right sm:min-w-[100px] flex sm:flex-col items-center sm:items-end gap-2">
              {priceDisplay}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
