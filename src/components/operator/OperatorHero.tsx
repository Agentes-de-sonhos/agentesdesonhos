import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Globe, Instagram, Bookmark } from "lucide-react";

interface OperatorHeroProps {
  name: string;
  category: string;
  specialties?: string | null;
  website?: string | null;
  instagram?: string | null;
}

const safeOpen = (url: string | null | undefined) => {
  if (!url) return;
  const sanitized =
    url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;
  window.open(sanitized, "_blank", "noopener,noreferrer");
};

const chipColors = [
  "bg-sky-100 text-sky-700 border-sky-200",
  "bg-amber-100 text-amber-700 border-amber-200",
  "bg-emerald-100 text-emerald-700 border-emerald-200",
  "bg-violet-100 text-violet-700 border-violet-200",
  "bg-rose-100 text-rose-700 border-rose-200",
  "bg-cyan-100 text-cyan-700 border-cyan-200",
  "bg-orange-100 text-orange-700 border-orange-200",
  "bg-indigo-100 text-indigo-700 border-indigo-200",
];

export function OperatorHero({ name, category, specialties, website, instagram }: OperatorHeroProps) {
  const tags = specialties?.split(",").map((s) => s.trim()).filter(Boolean) || [];

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-card to-primary/10 border border-border/60 p-8 sm:p-10">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-5">
          {/* Logo placeholder */}
          <div className="h-20 w-20 shrink-0 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/20 border border-primary/20 flex items-center justify-center shadow-sm">
            <span className="text-2xl font-bold text-primary">
              {name.charAt(0)}
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl tracking-tight">
                {name}
              </h1>
              <p className="text-muted-foreground mt-1">{category}</p>
            </div>

            {/* Specialty chips */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, i) => (
                  <span
                    key={i}
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-all duration-200 hover:scale-105 cursor-default ${chipColors[i % chipColors.length]}`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 shrink-0">
          {website && (
            <Button
              variant="outline"
              className="rounded-xl gap-2 border-border/80 hover:border-primary/40 hover:bg-primary/5 transition-all duration-200"
              onClick={() => safeOpen(website)}
            >
              <Globe className="h-4 w-4" />
              Website
            </Button>
          )}
          {instagram && (
            <Button
              variant="outline"
              className="rounded-xl gap-2 border-border/80 hover:border-pink-400/40 hover:bg-pink-50 transition-all duration-200"
              onClick={() => safeOpen(instagram)}
            >
              <Instagram className="h-4 w-4" />
              Instagram
            </Button>
          )}
          <Button
            variant="outline"
            size="icon"
            className="rounded-xl border-border/80 hover:border-amber-400/40 hover:bg-amber-50 transition-all duration-200"
          >
            <Bookmark className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
