import { useMemo, useState } from "react";
import { AlertCircle, ArrowLeft, CalendarDays, Loader2, MapPinned, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AgencyDomainInfo } from "@/lib/agencyDomains";
import {
  DATE_TBD,
  type ClientAreaTrip,
  type GroupedTrips,
  TRIPS_EMPTY,
  TRIPS_INTRO,
  TRIP_GROUPS,
  type TripGroup,
  defaultTripGroup,
  tripPeriodLabel,
  tripStatusLabel,
  tripTitle,
  visibleTripGroups,
} from "@/lib/clientAreaTrips";
import { ClientAreaSupportCard } from "./ClientAreaSupportCard";
import { ClientAreaTripCard } from "./ClientAreaTripCard";

const EMPTY_BY_GROUP: Record<TripGroup, string> = {
  andamento: "Nenhuma viagem em andamento neste momento.",
  proximas: "Você não tem próximas viagens registradas nesta área.",
  anteriores: "Ainda não há viagens anteriores para consultar.",
  canceladas: "Nenhuma viagem cancelada.",
};

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-3xl border border-border/60 bg-card p-6 shadow-sm md:p-8", className)}>
      {children}
    </section>
  );
}

function TripsSkeleton() {
  return (
    <div className="grid gap-5 lg:grid-cols-2" role="status" aria-live="polite">
      <span className="sr-only">Carregando suas viagens…</span>
      {[0, 1].map((i) => (
        <div key={i} className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm">
          <div className="h-36 w-full bg-muted motion-safe:animate-pulse sm:h-40" />
          <div className="space-y-3 p-5">
            <div className="h-5 w-2/3 rounded bg-muted motion-safe:animate-pulse" />
            <div className="h-4 w-1/2 rounded bg-muted motion-safe:animate-pulse" />
            <div className="h-11 w-32 rounded-xl bg-muted motion-safe:animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Lista de viagens reais com abas de classificação. */
export function ClientAreaTripsView({
  info,
  status,
  grouped,
  onRetry,
  onOpenTrip,
}: {
  info: AgencyDomainInfo;
  status: "loading" | "ready" | "error" | "expired";
  grouped: GroupedTrips;
  onRetry: () => void;
  onOpenTrip: (id: string) => void;
}) {
  const groups = useMemo(() => visibleTripGroups(grouped), [grouped]);
  const initial = useMemo(() => defaultTripGroup(grouped), [grouped]);
  const [group, setGroup] = useState<TripGroup | null>(null);
  const active = group && groups.includes(group) ? group : initial;
  const total =
    grouped.andamento.length + grouped.proximas.length +
    grouped.anteriores.length + grouped.canceladas.length;

  return (
    <div className="space-y-6">
      <Panel>
        <h1 className="text-xl font-semibold text-foreground md:text-2xl">Minhas viagens</h1>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">{TRIPS_INTRO}</p>

        {status === "ready" && total > 0 ? (
          <div
            role="tablist"
            aria-label="Categorias de viagens"
            className="mt-5 flex flex-wrap gap-2"
          >
            {groups.map((key) => {
              const label = TRIP_GROUPS.find((g) => g.key === key)!.label;
              const selected = key === active;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setGroup(key)}
                  className={cn(
                    "min-h-10 rounded-full border px-4 text-sm transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    selected
                      ? "border-primary bg-primary/10 font-semibold text-primary"
                      : "border-border/60 text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  {label}
                  <span className="ml-1.5 text-xs opacity-70">{grouped[key].length}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </Panel>

      {status === "loading" && <TripsSkeleton />}

      {status === "expired" && (
        <Panel>
          <p role="alert" className="text-sm text-foreground">
            Sua sessão expirou. Entre novamente para ver suas viagens.
          </p>
        </Panel>
      )}

      {status === "error" && (
        <Panel>
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-destructive/10 text-destructive">
            <AlertCircle className="h-6 w-6" aria-hidden="true" />
          </span>
          <p role="alert" className="mt-4 text-sm text-foreground">
            Não foi possível carregar suas viagens agora.
          </p>
          <Button variant="outline" className="mt-4 min-h-11" onClick={onRetry}>
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" /> Tentar novamente
          </Button>
        </Panel>
      )}

      {status === "ready" && total === 0 && (
        <>
          <Panel>
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <MapPinned className="h-6 w-6" aria-hidden="true" />
            </span>
            <p className="mt-4 text-sm text-foreground">{TRIPS_EMPTY}</p>
          </Panel>
          <ClientAreaSupportCard info={info} compact />
        </>
      )}

      {status === "ready" && total > 0 && (
        <div role="tabpanel" aria-label={TRIP_GROUPS.find((g) => g.key === active)!.label}>
          {grouped[active].length === 0 ? (
            <Panel>
              <p className="text-sm text-muted-foreground">{EMPTY_BY_GROUP[active]}</p>
            </Panel>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {grouped[active].map((trip) => (
                <ClientAreaTripCard key={trip.id} trip={trip} info={info} onOpen={onOpenTrip} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Detalhe da viagem (`/area-do-cliente/viagens/:id`). Nesta etapa mostra apenas
 * identificação, período e status — serviços, passageiros, documentos, roteiro e
 * carteira digital chegam na Etapa 4.
 */
export function ClientAreaTripDetail({
  status,
  trip,
  onBack,
}: {
  status: "loading" | "ready" | "error" | "expired" | "notfound";
  trip: ClientAreaTrip | null;
  onBack: () => void;
}) {
  const back = (
    <Button variant="outline" className="min-h-11" onClick={onBack}>
      <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" /> Voltar para minhas viagens
    </Button>
  );

  if (status === "loading") {
    return (
      <Panel>
        <div className="flex items-center gap-3 text-muted-foreground" role="status" aria-live="polite">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          <span>Carregando sua viagem…</span>
        </div>
      </Panel>
    );
  }

  if (status !== "ready" || !trip) {
    const message =
      status === "expired"
        ? "Sua sessão expirou. Entre novamente para continuar."
        : status === "error"
          ? "Não foi possível carregar esta viagem agora. Tente novamente em instantes."
          : "Viagem não encontrada.";
    return (
      <Panel>
        <h1 className="text-xl font-semibold text-foreground md:text-2xl">Viagem</h1>
        <p role="alert" className="mt-2 text-sm text-muted-foreground">{message}</p>
        <div className="mt-5">{back}</div>
      </Panel>
    );
  }

  const period = tripPeriodLabel(trip);

  return (
    <div className="space-y-6">
      <Panel>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          {tripStatusLabel(trip)}
        </span>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          {tripTitle(trip)}
        </h1>
        {trip.destination && trip.destination !== tripTitle(trip) ? (
          <p className="mt-1 text-muted-foreground">{trip.destination}</p>
        ) : null}

        <dl className="mt-6 grid gap-5 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Período</dt>
            <dd className="mt-1 flex items-center gap-2 text-sm text-foreground">
              <CalendarDays className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              {period}
              {period === DATE_TBD ? (
                <span className="sr-only">As datas ainda serão confirmadas pela agência.</span>
              ) : null}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Status</dt>
            <dd className="mt-1 text-sm text-foreground">{tripStatusLabel(trip)}</dd>
          </div>
        </dl>

        <p className="mt-6 border-t border-border/60 pt-5 text-xs text-muted-foreground">
          Os detalhes completos desta viagem estão sendo preparados.
        </p>

        <div className="mt-5">{back}</div>
      </Panel>
    </div>
  );
}
