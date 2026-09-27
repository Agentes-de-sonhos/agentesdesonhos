import { lazy, Suspense, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AgencyDomainInfo } from "@/lib/agencyDomains";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AgencyBrandSpinner } from "@/components/whitelabel/AgencyBrandSpinner";
import {
  filterPublicOffers,
  formatOfferPeriod,
  formatOfferPrice,
  isProvenPromotion,
  monthLabel,
  offerFilterOptions,
  type PublicOffer,
} from "@/lib/offers";

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
        <div className="mt-auto pt-3">
          {offer.price_mode === "on_request" || !offer.price_from ? (
            <p className="text-sm font-semibold text-foreground">Solicite uma cotação</p>
          ) : (
            <>
              <p className="text-[11px] text-muted-foreground">Valor a partir de</p>
              <p className="text-lg font-bold text-foreground">{formatOfferPrice(offer.price_from, offer.currency, offer.price_mode)}</p>
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

  return (
    <>
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
