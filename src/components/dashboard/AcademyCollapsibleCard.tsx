import { DashboardSectionHeader } from "./DashboardSectionHeader";
import { useNavigate } from "react-router-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  GraduationCap,
  Loader2,
  MapPin,
  BookOpen,
  Clock,
  Award,
  Play,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { useAcademy } from "@/hooks/useAcademy";
import type { TrailWithProgress } from "@/types/academy";

interface AcademyCollapsibleCardProps {
  /** Maximum number of trails to display. Undefined = all */
  limit?: number;
}

function TrailCard({
  trail,
  onSelect,
}: {
  trail: TrailWithProgress;
  onSelect: (t: TrailWithProgress) => void;
}) {
  const isCertified = trail.hasCertificate;
  const isCompleted = trail.progressPercent === 100;
  const isInProgress = trail.progressPercent > 0 && trail.progressPercent < 100;
  const notStarted = trail.progressPercent === 0;
  const totalMinutes =
    trail.trainings?.reduce(
      (sum, tt) => sum + (tt.training?.duration_minutes || 0),
      0
    ) || 0;

  const ctaLabel = notStarted
    ? "Começar treinamento"
    : isCompleted
    ? "Rever treinamento"
    : "Continuar treinamento";

  const progressLabel = notStarted
    ? "Ainda não iniciado"
    : `${trail.completedCount} de ${trail.totalCount} módulos concluídos`;

  const durationLabel =
    trail.total_hours > 0
      ? `${trail.total_hours}h`
      : totalMinutes > 0
      ? `${totalMinutes} min`
      : null;

  const CtaButton = ({ className = "" }: { className?: string }) => (
    <Button
      size="sm"
      className={
        "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm " + className
      }
    >
      {isInProgress || isCompleted ? (
        <Play className="h-3.5 w-3.5 mr-1.5" />
      ) : null}
      {ctaLabel}
      {notStarted && (
        <ChevronRight className="h-3.5 w-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
      )}
    </Button>
  );

  const StatusBadges = () => (
    <div className="absolute top-2 left-2 flex gap-1.5 flex-wrap">
      {isCertified && (
        <Badge className="bg-yellow-500 text-white shadow-md text-[10px]">
          <Award className="h-3 w-3 mr-1" /> Certificado
        </Badge>
      )}
      {isCompleted && !isCertified && (
        <Badge className="bg-green-500 text-white shadow-md text-[10px]">
          ✔ Concluído
        </Badge>
      )}
      {isInProgress && (
        <Badge className="bg-primary text-primary-foreground shadow-md text-[10px]">
          ▶ Em andamento
        </Badge>
      )}
    </div>
  );

  const MetaRow = () => (
    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
      {trail.destination && (
        <Badge variant="secondary" className="text-[10px] font-medium">
          {trail.destination}
        </Badge>
      )}
      <span className="flex items-center gap-1">
        <BookOpen className="h-3.5 w-3.5" />
        {trail.totalCount} módulos
      </span>
      {durationLabel && (
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {durationLabel}
        </span>
      )}
    </div>
  );

  const ProgressBlock = () => (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px]">
        <span className="text-muted-foreground">{progressLabel}</span>
        <span className="font-semibold text-foreground">
          {trail.progressPercent}%
        </span>
      </div>
      <Progress value={trail.progressPercent} className="h-1.5" />
    </div>
  );

  return (
    <Card
      className="group cursor-pointer overflow-hidden transition-all duration-200 hover:shadow-md hover:border-primary/40 h-full"
      onClick={() => onSelect(trail)}
    >
      {/* Layout sempre vertical: imagem no topo, corpo, rodapé com botão */}
      <div className="flex flex-col h-full min-w-0">
        {/* Image */}
        <div className="relative w-full aspect-video shrink-0 bg-gradient-to-br from-primary/20 to-accent/20 overflow-hidden">
          {trail.image_url ? (
            <img
              src={trail.image_url}
              alt={trail.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <MapPin className="h-10 w-10 text-primary/40" />
            </div>
          )}
          <StatusBadges />
        </div>

        {/* Content */}
        <CardContent className="flex-1 p-4 flex flex-col gap-3 min-w-0">
          <div className="space-y-1.5 min-w-0">
            <h3 className="font-semibold text-base group-hover:text-primary transition-colors leading-tight line-clamp-2">
              {trail.name}
            </h3>
            <MetaRow />
          </div>

          {/* Rodapé: progresso + botão */}
          <div className="mt-auto space-y-3">
            <ProgressBlock />
            <CtaButton className="w-full" />
          </div>
        </CardContent>
      </div>
    </Card>
  );
}

export function AcademyCollapsibleCard({ limit }: AcademyCollapsibleCardProps) {
  const navigate = useNavigate();
  const { trailsWithProgress, isLoading } = useAcademy();

  const visibleTrails = limit ? trailsWithProgress.slice(0, limit) : trailsWithProgress;

  const openTrail = (trail: TrailWithProgress) => {
    navigate("/educa-academy", { state: { trailId: trail.id } });
  };

  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateArrows = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateArrows();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateArrows) : null;
    ro?.observe(el);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
      ro?.disconnect();
    };
  }, [updateArrows, visibleTrails.length]);

  const scrollByCards = (dir: "left" | "right") => {
    const el = scrollerRef.current;
    if (!el) return;
    const first = el.querySelector<HTMLElement>("[data-trail-card]");
    const cardWidth = first ? first.offsetWidth + 12 : 280;
    const perView = Math.max(1, Math.floor(el.clientWidth / cardWidth));
    const amount = cardWidth * perView;
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <>
      <Card className="border-0 shadow-card overflow-hidden">
        <CardContent className="pt-5 pb-5 space-y-4 flex flex-col @container min-w-0">
          <DashboardSectionHeader
            icon={GraduationCap}
            title="EducaTravel Academy"
            description="Aprenda sobre destinos e produtos para vender com mais segurança."
            iconClassName="text-emerald-600"
            accentClassName="bg-emerald-600"
            cta={{
              to: "/educa-academy",
              label: "Ver todos os treinamentos",
              shortLabel: "Ver todos",
              tabTitle: "EducaTravel Academy",
              className: "text-emerald-700 hover:text-emerald-800",
            }}
          />

          <div className="flex flex-col">
            {isLoading ? (
              <div className="flex items-center justify-center py-8 flex-1">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : visibleTrails.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm flex-1 flex items-center justify-center">
                Nenhuma trilha disponível no momento.
              </div>
            ) : (
              <div className="relative">
                {canScrollLeft && (
                  <button
                    type="button"
                    aria-label="Ver treinamentos anteriores"
                    onClick={() => scrollByCards("left")}
                    className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 items-center justify-center rounded-full bg-background/95 shadow-md border border-border hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                )}
                {canScrollRight && (
                  <button
                    type="button"
                    aria-label="Ver mais treinamentos"
                    onClick={() => scrollByCards("right")}
                    className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 items-center justify-center rounded-full bg-background/95 shadow-md border border-border hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                )}

                <div
                  ref={scrollerRef}
                  role="group"
                  aria-label="Galeria de treinamentos"
                  tabIndex={0}
                  className="flex gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-1 sm:px-10 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
                >
                  {visibleTrails.map((trail) => (
                    <div
                      key={trail.id}
                      data-trail-card
                      className="snap-start shrink-0 basis-[86%] @[30rem]:basis-[46%] @[52rem]:basis-[31%] @[72rem]:basis-[23%] @[92rem]:basis-[19%]"
                    >
                      <TrailCard trail={trail} onSelect={openTrail} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </CardContent>
      </Card>
    </>
  );
}
