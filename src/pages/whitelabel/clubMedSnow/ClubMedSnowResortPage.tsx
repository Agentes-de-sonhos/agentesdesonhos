import { useCallback, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { CalendarDays, CableCar, Check, Mountain, Plus, Snowflake, Star } from "lucide-react";
import { HotelDetailsView } from "@/components/hotel-page/HotelDetailsView";
import type { HotelPageData, HotelQuoteRequest } from "@/components/hotel-page/types";
import { useAgencySiteRequest } from "@/hooks/useAgencySiteRequest";
import { useClubMedSnowPlaces } from "@/hooks/useClubMedSnowPlaces";
import { CLUB_MED_SNOW_BASE, getClubMedSnow, type ClubMedSnowResort } from "@/lib/clubMedSnow";
import { getClubMedSnowPhotos } from "@/lib/clubMedSnow/photos";
import { snowHighlightIcon, snowDescription } from "@/lib/clubMedSnow/presentation";
import { agencySiteHref } from "@/lib/agencyContextLink";
import type { AgencyDomainInfo } from "@/lib/agencyDomains";

const fmt = (iso: string) => iso.split("-").reverse().join("/");

export const SNOW_QUOTE_EXTRAS = [
  { key: "nivel_esqui", label: "Nível no esqui/snowboard", options: ["Nunca esquiei", "Iniciante", "Intermediário", "Avançado", "Grupo com níveis diferentes"] },
  { key: "interesse_neve", label: "Interesse principal", options: ["Esqui", "Snowboard", "Neve sem esquiar", "Família com crianças"] },
];

function ResortSections({ r }: { r: ClubMedSnowResort }) {
  const facts = [
    ["Altitude", r.altitude],
    ["Área de esqui", r.skiArea ? [r.skiArea.name, r.skiArea.km ? `${r.skiArea.km} km de pistas` : null].filter(Boolean).join(" · ") : null],
    ["Temporada", r.season],
    ["Acesso às pistas", r.skiInSkiOut === true ? "Ski-in/ski-out (informado pelo Club Med)" : null],
    ["Categoria", r.category],
  ].filter(([, v]) => v) as [string, string][];
  const factIcons = { Altitude: Mountain, "Área de esqui": Snowflake, Temporada: CalendarDays, "Acesso às pistas": CableCar, Categoria: Star };
  return (
    <>
      {facts.length > 0 && (
        <dl className="grid gap-3 rounded-2xl bg-primary/5 p-5 sm:grid-cols-2">
          {facts.map(([k, v]) => {
            const Icon = factIcons[k as keyof typeof factIcons];
            return <div key={k}><dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary"><Icon className="h-3.5 w-3.5" aria-hidden />{k}</dt><dd className="mt-1 text-sm">{v}</dd></div>;
          })}
        </dl>
      )}

      {r.snowBenefits && (
        <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
          <h2 className="text-xl font-bold md:text-2xl">Benefícios Club Med na neve</h2>
          <div className="mt-4 grid gap-6 md:grid-cols-2">
            {!!r.snowBenefits.included?.length && (
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">Incluído na estadia</h3>
                <ul className="mt-3 space-y-2 text-sm">{r.snowBenefits.included.map((x) => <li key={x} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />{x}</li>)}</ul>
              </div>
            )}
            {!!r.snowBenefits.extra?.length && (
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Contratado à parte</h3>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">{r.snowBenefits.extra.map((x) => <li key={x} className="flex gap-2"><Plus className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />{x}</li>)}</ul>
              </div>
            )}
          </div>
          {r.snowBenefits.notes && <p className="mt-4 text-sm text-muted-foreground">{r.snowBenefits.notes}</p>}
          <p className="mt-3 text-xs text-muted-foreground">Condições conforme a ficha oficial do Club Med na data da consulta; a agência confirma tudo no orçamento. Neve depende do clima e não é garantida.</p>
        </section>
      )}
    </>
  );
}

export default function ClubMedSnowResortPage({ info, slugOverride }: { info: AgencyDomainInfo; slugOverride?: string }) {
  const params = useParams();
  const slug = slugOverride ?? params.slug ?? "";
  const r = useMemo(() => getClubMedSnow(slug), [slug]);
  const { data: g } = useClubMedSnowPlaces(r?.slug);
  const { submit } = useAgencySiteRequest(info.hostname);

  useEffect(() => { if (r) document.title = `${r.name} · ${info.agency_name ?? "Club Med na neve"}`; window.scrollTo(0, 0); }, [r, info.agency_name]);

  const hotel: HotelPageData | null = useMemo(() => r && ({
    slug: r.slug,
    name: r.name,
    address: g?.address ?? [r.village, r.region].filter(Boolean).join(", "),
    city: "", state: g?.address ? "" : r.country,
    photos: getClubMedSnowPhotos(r.slug),
    descriptionTitle: `Por que escolher o ${r.name}?`,
    description: snowDescription(r),
    amenities: r.highlights.map((h) => ({ icon: snowHighlightIcon(h), label: h })),
    google: g?.rating ? { rating: g.rating, totalReviews: g.total ?? 0, reviewsUrl: g.mapsUrl ?? "", reviews: (g.reviews ?? []).map((x) => ({ author: x.author, text: x.text, rating: x.rating ?? undefined, relativeTime: x.relativeTime ?? undefined })) } : undefined,
    location: g?.lat != null && g?.lng != null ? { lat: g.lat, lng: g.lng, mapsUrl: g.mapsUrl ?? "" } : undefined,
  }), [r, g]);

  const onSubmitQuote = useCallback(async (req: HotelQuoteRequest) => {
    if (!r) return;
    const kids = req.childrenAges.length;
    const pax = `${req.adults} adulto(s)` + (kids ? ` e ${kids} criança(s) (${req.childrenAges.join(", ")} anos)` : "");
    const period = `${fmt(req.checkIn)} a ${fmt(req.checkOut)}`;
    const nivel = req.extras?.nivel_esqui || "não informado";
    const interesse = req.extras?.interesse_neve || "não informado";
    const destination = [r.name, r.village, r.country].filter(Boolean).join(" · ");
    const res = await submit({
      service_key: "hospedagem", service_label: "Hospedagem", destination,
      summary: `Serviços solicitados: Hospedagem | Club Med na neve: ${r.name} | Período: ${period} | Viajantes: ${pax} | Nível: ${nivel} | Interesse: ${interesse}`,
      notes: `Solicitação pela página Club Med na neve — ${r.name}.`,
      lead_name: req.contact.name, lead_phone: req.contact.whatsapp, lead_email: req.contact.email,
      preferred_channel: "WhatsApp", best_time: "Qualquer horário", consent: true, consent_version: "v1",
      details: {
        hotel: r.name, hotel_slug: r.slug, destino: destination, check_in: req.checkIn, check_out: req.checkOut,
        adultos: String(req.adults), criancas: String(kids), idades_criancas: req.childrenAges.join(", "),
        tipo_hospedagem: "Club Med na neve", nivel_esqui: nivel, interesse_neve: interesse,
        servicos: "Hospedagem", servicos_keys: "hospedagem",
      },
    });
    if ("error" in res) throw new Error("Não foi possível enviar agora. Tente novamente.");
  }, [r, submit]);

  return (
    <div className="bg-background px-4 py-8 md:py-12">
      <div className="mx-auto max-w-6xl">
        <a href={agencySiteHref(CLUB_MED_SNOW_BASE)} className="text-sm font-medium text-primary hover:underline">← Club Med na neve</a>
        {hotel && r ? (
          <div className="mt-4">
            {r.status !== "confirmado" && <p className="mb-4 rounded-xl bg-muted p-3 text-sm">Disponibilidade a confirmar com a agência{r.statusNote ? `: ${r.statusNote}` : "."}</p>}
            <HotelDetailsView hotel={hotel} onSubmitQuote={onSubmitQuote} quoteExtras={SNOW_QUOTE_EXTRAS}>
              <ResortSections r={r} />
            </HotelDetailsView>
          </div>
        ) : (
          <p className="py-20 text-center text-muted-foreground">Hotel não encontrado. <a href={agencySiteHref(CLUB_MED_SNOW_BASE)} className="text-primary underline">Ver todos</a></p>
        )}
      </div>
    </div>
  );
}
