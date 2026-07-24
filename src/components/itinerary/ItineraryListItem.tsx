import type { ReactNode } from "react";
import { MapPin, Calendar, Route, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ClientAvatar, getPersonInitials } from "@/components/shared/ClientAvatar";
import { cn } from "@/lib/utils";
import type { Itinerary } from "@/types/itinerary";

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "—";
  try {
    return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return "—";
  }
}

function StatusBadge({ status }: { status: Itinerary["status"] }) {
  const isPublished = status === "published" || status === "approved";
  if (isPublished) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200/70">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Publicado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground ring-1 ring-inset ring-border/60">
      Rascunho
    </span>
  );
}

interface ItineraryListItemProps {
  itinerary: Itinerary;
  onTitleClick?: (itinerary: Itinerary) => void;
  actions?: ReactNode;
}

export function ItineraryListItem({
  itinerary,
  onTitleClick,
  actions,
}: ItineraryListItemProps) {
  const clientName = itinerary.clientName?.trim() || null;
  const title =
    itinerary.headline?.trim() ||
    itinerary.destination?.trim() ||
    "Roteiro sem título";

  return (
    <div className="group grid grid-cols-1 md:grid-cols-[1fr_140px_180px] gap-3 md:gap-6 items-start md:items-center px-4 md:px-5 py-3.5 transition-colors hover:bg-muted/40">
      <div className="flex items-start gap-3 min-w-0">
        {clientName ? (
          <ClientAvatar
            name={clientName}
            variant="person"
            className="h-10 w-10"
          />
        ) : (
          <div
            className="shrink-0 h-10 w-10 rounded-full flex items-center justify-center bg-muted text-muted-foreground"
            aria-hidden
          >
            <Route className="h-4 w-4" />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => onTitleClick?.(itinerary)}
              className="font-medium text-foreground truncate text-[14px] leading-5 text-left hover:text-primary transition-colors"
            >
              {title}
            </button>
            <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              <Route className="h-3 w-3" />
              Roteiro
            </span>
          </div>

          <div
            className={cn(
              "mt-0.5 flex items-center gap-1 text-xs",
              clientName ? "text-foreground/80" : "text-muted-foreground/70 italic",
            )}
          >
            <User className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {clientName ?? "Cliente não informado"}
            </span>
          </div>

          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              <span className="truncate max-w-[220px]">
                {itinerary.destination || "—"}
              </span>
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(itinerary.createdAt)}
            </span>
          </div>
        </div>
      </div>

      <div className="md:justify-self-start">
        <StatusBadge status={itinerary.status} />
      </div>

      {actions ? (
        <div className="flex items-center gap-0.5 md:justify-self-end opacity-100 md:opacity-70 md:group-hover:opacity-100 transition-opacity">
          {actions}
        </div>
      ) : (
        <div />
      )}
    </div>
  );
}

/** Accent- and case-insensitive substring match. */
export function itineraryMatchesSearch(
  itinerary: Itinerary,
  rawQuery: string,
): boolean {
  const query = normalize(rawQuery);
  if (!query) return true;
  const haystack = [
    itinerary.headline,
    itinerary.destination,
    itinerary.clientName,
  ]
    .filter(Boolean)
    .map((v) => normalize(String(v)))
    .join(" \u0001 ");
  return haystack.includes(query);
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}