import { lazy, Suspense, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AgencyDomainInfo } from "@/lib/agencyDomains";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AgencyBrandSpinner } from "@/components/whitelabel/AgencyBrandSpinner";
import { Plane, Hotel, Car, Bus, Ticket, ShieldCheck, Ship, Train, Route, Package, type LucideIcon } from "lucide-react";
import {
  filterPublicOffers,
  formatOfferPeriod,
  isProvenPromotion,
  monthLabel,
  offerFilterOptions,
  offerPricing,
  type OfferIncludedService,
  type PublicOffer,
} from "@/lib/offers";

// Aceita tanto os rótulos em português gerados pelo orçamento ("Aéreo", "Hospedagem", ...)
// quanto chaves em inglês usadas em ofertas manuais/IA.
const SERVICE_ICON: Record<string, LucideIcon> = {
  aereo: Plane,
  flight: Plane,
  hospedagem: Hotel,
  hotel: Hotel,
  carro: Car,
  locacao: Car,
  car_rental: Car,
  transfer: Bus,
  translado: Bus,
  ingressos: Ticket,
  ingresso: Ticket,
  attraction: Ticket,
  passeio: Ticket,
  passeios: Ticket,
  seguro: ShieldCheck,
  insurance: ShieldCheck,
  cruzeiro: Ship,
  cruise: Ship,
  trem: Train,
  train: Train,
  rail_transport: Train,
  circuito: Route,
  circuit: Route,
};

const SERVICE_LABEL: Record<string, string> = {
  aereo: "Aéreo",
  flight: "Aéreo",
  hospedagem: "Hospedagem",
  hotel: "Hospedagem",
  carro: "Locação de carro",
  locacao: "Locação de carro",
  car_rental: "Locação de carro",
  transfer: "Transfer",
  translado: "Transfer",
  ingressos: "Ingressos e passeios",
  ingresso: "Ingressos e passeios",
  attraction: "Ingressos e passeios",
  passeio: "Ingressos e passeios",
  passeios: "Ingressos e passeios",
  seguro: "Seguro viagem",
  insurance: "Seguro viagem",
  cruzeiro: "Cruzeiro",
  cruise: "Cruzeiro",
  trem: "Trem",
  train: "Trem",
  rail_transport: "Trem",
  circuito: "Circuito",
  circuit: "Circuito",
  other: "Serviço incluso",
  outros: "Serviço incluso",
};

function serviceKey(type: string | null | undefined): string {
  return (type ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

export function serviceIcon(type: string): LucideIcon {
  return SERVICE_ICON[serviceKey(type)] ?? Package;
}

export function serviceLabel(type: string): string {
  return SERVICE_LABEL[serviceKey(type)] ?? (type?.trim() || "Serviço incluso");
}

function serviceTooltip(svc: OfferIncludedService): string {
  const label = serviceLabel(svc.type);
  const extra = svc.detail || svc.name;
  return extra ? `${label}: ${extra}` : label;
}


const VitrinePublica = lazy(() => import("@/pages/VitrinePublica"));

const ALL = "__all";

export function usePublicOffers(hostname: string) {
  return useQuery({
    queryKey: ["public-offers", hostname],
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_public_offers", { p_hostname: hostname });
      if (error) return [] as PublicOffer[];
      return (Array.isArray(data) ? data : []) as PublicOffer[];
    },
  });
}

export function OfferCard({ offer, href }: { offer: PublicOffer; href: string }) {
  const period = formatOfferPeriod(offer.travel_start, offer.travel_end);
  const pricing = offerPricing(offer);
  return (
    <Link
      to={href}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card transition-shadow hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {offer.cover_url && (
          <img src={offer.cover_url} alt={offer.title ?? ""} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        )}
        {offer.category && <Badge className="absolute left-3 top-3">{offer.category}</Badge>}
        {isProvenPromotion(offer) && <Badge variant="secondary" className="absolute right-3 top-3">Promoção</Badge>}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{offer.destination}</p>
        <h3 className="text-base font-semibold leading-snug text-foreground">{offer.title}</h3>
        {period && <p className="text-sm text-muted-foreground">{period}{offer.nights ? ` · ${offer.nights} noites` : ""}</p>}
        {(offer.included_services?.length ?? 0) > 0 && (
          <TooltipProvider delayDuration={150}>
            <div className="flex flex-wrap items-center gap-1.5 pt-1" aria-label="Serviços inclusos">
              {offer.included_services!.map((svc, i) => {
                const Icon = serviceIcon(svc.type);
                return (
                  <Tooltip key={`${svc.type}-${i}`}>
                    <TooltipTrigger asChild>
                      <span
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-border/60 bg-muted/60 text-muted-foreground transition-colors group-hover:border-primary/30 group-hover:text-primary"
                        onClick={(e) => e.preventDefault()}
                      >
                        <Icon className="h-3.5 w-3.5" aria-hidden />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[220px] text-xs">
                      {serviceTooltip(svc)}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </TooltipProvider>
        )}
        <div className="mt-auto pt-3">
          {pricing.total == null ? (
            <p className="text-sm font-semibold text-foreground">Solicite uma cotação</p>
          ) : (
            <>
              <p className="text-[11px] text-muted-foreground">A partir de</p>
              <p className="flex flex-wrap items-baseline gap-1.5">
                <span className="text-xl font-bold leading-tight text-foreground">{pricing.perPersonLabel ?? pricing.totalLabel}</span>
                {pricing.perPersonLabel && <span className="text-xs text-muted-foreground">/ pessoa</span>}
              </p>
              {pricing.installmentsLabel && (
                <p className="mt-0.5 text-xs font-medium text-primary">{pricing.installmentsLabel}</p>
              )}
              {pricing.totalNote && <p className="mt-0.5 text-[11px] text-muted-foreground">{pricing.totalNote}</p>}
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

/**
 * /ofertas: ofertas estruturadas em primeiro plano; a Vitrine atual segue
 * disponível de forma secundária. Sem ofertas ativas, a página fica idêntica
 * à anterior (agências fora do piloto não mudam nada).
 */
export default function AgencyOffersPage({ info, basePath = "" }: { info: AgencyDomainInfo; basePath?: string }) {
  const { data: offers = [], isLoading } = usePublicOffers(info.hostname);
  const [category, setCategory] = useState(ALL);
  const [destination, setDestination] = useState(ALL);
  const [month, setMonth] = useState(ALL);
  const options = useMemo(() => offerFilterOptions(offers), [offers]);
  const visible = useMemo(
    () =>
      filterPublicOffers(offers, {
        category: category === ALL ? null : category,
        destination: destination === ALL ? null : destination,
        month: month === ALL ? null : month,
      }),
    [offers, category, destination, month],
  );

  const legacy = (
    <Suspense fallback={null}>
      <VitrinePublica
        slugOverride={info.public_slug || info.agency_slug}
        tenantFallback={{ agencyName: info.agency_name, logoUrl: info.logo_url, phone: info.phone }}
      />
    </Suspense>
  );

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center"><AgencyBrandSpinner size="lg" /></div>
    );
  }
  if (offers.length === 0) return legacy;

  const agencyName = info.agency_name || "nossa equipe";

  return (
    <>
      {/* Canonical próprio do domínio da agência (sem basePath interno). */}
      {basePath === "" && (
        <SEO
          exactTitle
          title={`Ofertas de viagem | ${info.agency_name || "Ofertas"}`}
          description={`Oportunidades de viagem selecionadas por ${agencyName}, com destinos, períodos e condições atualizados.`}
          canonical={`https://${info.hostname}/ofertas`}
        />
      )}
      <section className="mx-auto max-w-6xl px-4 py-12 md:py-16">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">Ofertas</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">Oportunidades de viagem selecionadas pela nossa equipe.</p>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <FilterSelect label="Categoria" value={category} onChange={setCategory} items={options.categories.map((c) => [c, c])} />
          <FilterSelect label="Destino" value={destination} onChange={setDestination} items={options.destinations.map((d) => [d, d])} />
          <FilterSelect label="Mês da viagem" value={month} onChange={setMonth} items={options.months.map((m) => [m, monthLabel(m)])} />
        </div>

        {visible.length === 0 ? (
          <p className="mt-10 text-center text-sm text-muted-foreground">Nenhuma oferta com esses filtros.</p>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((o) => <OfferCard key={o.slug} offer={o} href={`${basePath}/ofertas/${o.slug}`} />)}
          </div>
        )}
      </section>
      <div className="border-t border-border/60">{legacy}</div>
    </>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  items,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  items: [string, string][];
}) {
  return (
    <div className="space-y-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label={label}><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos</SelectItem>
          {items.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
