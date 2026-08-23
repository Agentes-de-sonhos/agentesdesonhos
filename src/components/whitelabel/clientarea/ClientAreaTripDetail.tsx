import { useMemo, useState } from "react";
import {
  ArrowLeft, BedDouble, Bus, CalendarDays, CarFront, Check, Clock, Layers,
  Loader2, MapPin, Plane, Ship, ShieldCheck, Ticket, TrainFront, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AgencyDomainInfo } from "@/lib/agencyDomains";
import { DATE_TBD, tripPeriodLabel, tripStatusLabel, tripTitle } from "@/lib/clientAreaTrips";
import {
  type ClientAreaTripDetailData,
  type ClientAreaTripService,
  DETAIL_EMPTY,
  DETAIL_READONLY_NOTE,
  DETAIL_TABS,
  type DetailTab,
  buildTimeline,
  serviceDetailRows,
  servicePeriodLabel,
  serviceStatusLabel,
  serviceTitle,
  serviceTypeLabel,
  servicesWithoutDate,
  sortServices,
  travelerName,
} from "@/lib/clientAreaTripDetail";
import { ClientAreaSupportCard } from "./ClientAreaSupportCard";

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-3xl border border-border/60 bg-card p-6 shadow-sm md:p-8", className)}>
      {children}
    </section>
  );
}

const SERVICE_ICONS: Record<string, typeof Plane> = {
  flight: Plane,
  hotel: BedDouble,
  car_rental: CarFront,
  transfer: Bus,
  attraction: Ticket,
  insurance: ShieldCheck,
  cruise: Ship,
  train: TrainFront,
};

function ServiceIcon({ type, className }: { type?: string | null; className?: string }) {
  const Icon = (type && SERVICE_ICONS[type]) || Layers;
  return <Icon className={cn("h-5 w-5", className)} aria-hidden="true" />;
}

/** Card somente leitura de um serviço contratado. */
function ServiceCard({ service }: { service: ClientAreaTripService }) {
  const rows = useMemo(() => serviceDetailRows(service), [service]);
  const period = servicePeriodLabel(service);

  return (
    <article className="rounded-2xl border border-border/60 bg-background/60 p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <ServiceIcon type={service.service_type} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {serviceTypeLabel(service.service_type)}
          </p>
          <h3 className="mt-0.5 break-words text-base font-semibold text-foreground">
            {serviceTitle(service)}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {period ? (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" aria-hidden="true" /> {period}
              </span>
            ) : null}
            {service.destination ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4" aria-hidden="true" /> {service.destination}
              </span>
            ) : null}
          </div>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-3 py-1 text-xs font-medium",
            service.confirmed
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground",
          )}
        >
          {serviceStatusLabel(service)}
        </span>
      </div>

      {rows.length > 0 ? (
        <dl className="mt-4 grid gap-x-6 gap-y-2 border-t border-border/60 pt-4 sm:grid-cols-2">
          {rows.map((row) => (
            <div key={row.key} className="min-w-0">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">{row.label}</dt>
              <dd className="break-words text-sm text-foreground">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </article>
  );
}

/**
 * Detalhe da viagem (`/area-do-cliente/viagens/:id`) — Etapa 4.
 * Somente leitura: informações gerais, serviços contratados, programação
 * cronológica, viajantes vinculados e contato da agência.
 */
export function ClientAreaTripDetail({
  info,
  status,
  trip,
  onBack,
}: {
  info: AgencyDomainInfo;
  status: "loading" | "ready" | "error" | "expired" | "notfound";
  trip: ClientAreaTripDetailData | null;
  onBack: () => void;
}) {
  const [tab, setTab] = useState<DetailTab>("geral");

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
  const services = sortServices(trip.services ?? []);
  const travelers = trip.travelers ?? [];
  const timeline = buildTimeline(services);
  const undated = servicesWithoutDate(services);

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

        <div
          role="tablist"
          aria-label="Seções da viagem"
          className="mt-5 flex flex-wrap gap-2"
        >
          {DETAIL_TABS.map(({ key, label }) => {
            const selected = key === tab;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setTab(key)}
                className={cn(
                  "min-h-10 rounded-full border px-4 text-sm transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  selected
                    ? "border-primary bg-primary/10 font-semibold text-primary"
                    : "border-border/60 text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </Panel>

      {tab === "geral" && (
        <Panel>
          <h2 className="text-lg font-semibold text-foreground">Informações gerais</h2>
          <dl className="mt-5 grid gap-5 sm:grid-cols-2">
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
            {trip.destination ? (
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Destino</dt>
                <dd className="mt-1 flex items-center gap-2 text-sm text-foreground">
                  <MapPin className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  {trip.destination}
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Serviços</dt>
              <dd className="mt-1 flex items-center gap-2 text-sm text-foreground">
                <Layers className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                {services.length === 1 ? "1 serviço" : `${services.length} serviços`}
              </dd>
            </div>
            {travelers.length > 0 ? (
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Viajantes</dt>
                <dd className="mt-1 flex items-center gap-2 text-sm text-foreground">
                  <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  {travelers.length === 1 ? "1 viajante" : `${travelers.length} viajantes`}
                </dd>
              </div>
            ) : null}
          </dl>
          <p className="mt-6 border-t border-border/60 pt-5 text-xs text-muted-foreground">
            {DETAIL_READONLY_NOTE}
          </p>
        </Panel>
      )}

      {tab === "servicos" && (
        <Panel>
          <h2 className="text-lg font-semibold text-foreground">Serviços contratados</h2>
          {services.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">{DETAIL_EMPTY.services}</p>
          ) : (
            <div className="mt-5 space-y-4">
              {services.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          )}
        </Panel>
      )}

      {tab === "programacao" && (
        <Panel>
          <h2 className="text-lg font-semibold text-foreground">Programação da viagem</h2>
          {timeline.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">{DETAIL_EMPTY.timeline}</p>
          ) : (
            <ol className="mt-5 space-y-6">
              {timeline.map((day) => (
                <li key={day.date} className="relative border-l border-border/60 pl-5">
                  <span
                    className="absolute -left-[7px] top-1.5 grid h-3.5 w-3.5 place-items-center rounded-full bg-primary"
                    aria-hidden="true"
                  />
                  <p className="text-sm font-semibold capitalize text-foreground">{day.label}</p>
                  <div className="mt-3 space-y-3">
                    {day.services.map((service) => (
                      <div
                        key={service.id}
                        className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background/60 p-4"
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                          <ServiceIcon type={service.service_type} className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="break-words text-sm font-medium text-foreground">
                            {serviceTitle(service)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {serviceTypeLabel(service.service_type)}
                            {service.confirmed ? (
                              <span className="ml-2 inline-flex items-center gap-1 text-primary">
                                <Check className="h-3 w-3" aria-hidden="true" /> Confirmado
                              </span>
                            ) : null}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </li>
              ))}
            </ol>
          )}

          {undated.length > 0 ? (
            <div className="mt-6 border-t border-border/60 pt-5">
              <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                Sem data definida
              </p>
              <ul className="mt-3 space-y-2">
                {undated.map((service) => (
                  <li key={service.id} className="text-sm text-muted-foreground">
                    {serviceTitle(service)} — {serviceTypeLabel(service.service_type)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Panel>
      )}

      {tab === "viajantes" && (
        <Panel>
          <h2 className="text-lg font-semibold text-foreground">Viajantes</h2>
          {travelers.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">{DETAIL_EMPTY.travelers}</p>
          ) : (
            <ul className="mt-5 space-y-3">
              {travelers.map((traveler) => (
                <li
                  key={traveler.id}
                  className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/60 p-4"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Users className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="break-words text-sm font-medium text-foreground">
                      {travelerName(traveler)}
                    </p>
                    {traveler.is_responsible ? (
                      <p className="text-xs text-muted-foreground">Responsável pela viagem</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-6 border-t border-border/60 pt-5 text-xs text-muted-foreground">
            Para incluir ou corrigir dados de viajantes, fale com a agência.
          </p>
        </Panel>
      )}

      <ClientAreaSupportCard info={info} compact />

      <div>{back}</div>
    </div>
  );
}
