import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap, ArrowRight, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { useAcademy } from "@/hooks/useAcademy";
import { TrailCard } from "@/components/academy/TrailCard";
import { TrailDetail } from "@/components/academy/TrailDetail";
import type { TrailWithProgress } from "@/types/academy";
import { cn } from "@/lib/utils";

interface AcademyCollapsibleCardProps {
  /** Maximum number of trails to display. Undefined = all */
  limit?: number;
  /** Default collapsed state */
  defaultOpen?: boolean;
}

export function AcademyCollapsibleCard({ limit, defaultOpen = false }: AcademyCollapsibleCardProps) {
  const navigate = useNavigate();
  const { trailsWithProgress, isLoading } = useAcademy();
  const [open, setOpen] = useState(defaultOpen);
  const [selectedTrail, setSelectedTrail] = useState<TrailWithProgress | null>(null);

  const visibleTrails = limit ? trailsWithProgress.slice(0, limit) : trailsWithProgress;

  return (
    <>
      <Card className="border-0 shadow-card">
        <CardContent className="pt-5 pb-5 space-y-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="w-fit text-left"
              aria-expanded={open}
            >
              <h2 className="font-display text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-emerald-600" />
                EducaTravel Academy
                {open ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </h2>
              <div className="mt-2 h-1 w-full rounded-full bg-emerald-600" />
            </button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/educa-academy")}
              className="text-emerald-700 hover:text-emerald-800"
            >
              Ver Academy
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>

          <div className={cn("transition-all", open ? "block" : "hidden")}>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : visibleTrails.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Nenhuma trilha disponível no momento.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {visibleTrails.map((trail) => (
                  <TrailCard key={trail.id} trail={trail} onSelect={setSelectedTrail} />
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedTrail && (
        <TrailDetail trail={selectedTrail} onBack={() => setSelectedTrail(null)} />
      )}
    </>
  );
}