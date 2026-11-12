import { useCallback, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Check, ExternalLink, Mountain, Plus } from "lucide-react";
import { HotelDetailsView } from "@/components/hotel-page/HotelDetailsView";
import type { HotelPageData, HotelQuoteRequest } from "@/components/hotel-page/types";
import { useAgencySiteRequest } from "@/hooks/useAgencySiteRequest";
import { useClubMedSnowPlaces } from "@/hooks/useClubMedSnowPlaces";
import { CLUB_MED_SNOW, CLUB_MED_SNOW_BASE, getClubMedSnow, type ClubMedSnowResort } from "@/lib/clubMedSnow";
import { agencySiteHref } from "@/lib/agencyContextLink";
import type { AgencyDomainInfo } from "@/lib/agencyDomains";

const fmt = (iso: string) => iso.split("-").reverse().join("/");

export const SNOW_QUOTE_EXTRAS = [
  { key: "nivel_esqui", label: "Nível no esqui/snowboard", options: ["Nunca esquiei", "Iniciante", "Intermediário", "Avançado", "Grupo com níveis diferentes"] },
  { key: "interesse_neve", label: "Interesse principal", options: ["Esqui", "Snowboard", "Neve sem esquiar", "Família com crianças"] },
];

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border pt-8">
      <h2 className="text-xl font-bold md:text-2xl">{title}</h2>
      <div className="mt-4 leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

function ResortSections({ r }: { r: ClubMedSnowResort }) {
  const facts = [
    ["Altitude", r.altitude],
    ["Domínio esquiável", r.skiArea ? [r.skiArea.name, r.skiArea.km ? `${r.skiArea.km} km de pistas` : null].filter(Boolean).join(" · ") : null],
    ["Temporada", r.season],
    ["Acesso às pistas", r.skiInSkiOut === true ? "Ski-in/ski-out (informado pelo Club Med)" : null],
    ["Categoria", r.category],
  ].filter(([, v]) => v) as [string, string][];
  const related = CLUB_MED_SNOW.filter((x) => x.relatedTo === r.slug || x.slug === r.relatedTo);
  return (
    <>
      {r.whyChoose.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Por que escolher o {r.name}?</h2>
          <ol className="mt-5 grid gap-4 md:grid-cols-2">
            {r.whyChoose.map((w, i) => (
              <li key={w.title} className="rounded-2xl border border-border bg-card p-5">
                <span className="text-xs font-semibold text-primary">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-1 font-semibold">{w.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{w.text}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {facts.length > 0 && (
        <dl className="grid gap-3 rounded-2xl bg-primary/5 p-5 sm:grid-cols-2">
          {facts.map(([k, v]) => (
            <div key={k}><dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary"><Mountain className="h-3.5 w-3.5" aria-hidden />{k}</dt><dd className="mt-1 text-sm">{v}</dd></div>
          ))}
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

      {r.location && <Block title="Localização">{r.location}</Block>}
      {r.accommodation && <Block title="Acomodações">{r.accommodation}</Block>}
      {r.dining && <Block title="Gastronomia">{r.dining}</Block>}
      {r.wellness && <Block title="Lazer e bem-estar">{r.wellness}</Block>}
      {r.families && <Block title="Famílias e idades">{r.families}</Block>}
      {!!r.idealFor?.length && <Block title="Indicado para"><ul className="flex flex-wrap gap-2">{r.idealFor.map((x) => <li key={x} className="rounded-full bg-muted px-3 py-1 text-sm text-foreground">{x}</li>)}</ul></Block>}
      {!!r.differentiators?.length && <Block title="Diferenciais"><ul className="list-disc space-y-1.5 pl-5">{r.differentiators.map((x) => <li key={x}>{x}</li>)}</ul></Block>}
      {related.length > 0 && (
        <Block title={r.kind === "chalet" ? "Resort relacionado" : "Chalés relacionados"}>
          <ul className="space-y-2">{related.map((x) => <li key={x.slug}><a className="font-medium text-primary hover:underline" href={agencySiteHref(`${CLUB_MED_SNOW_BASE}/${x.slug}`)}>{x.name}</a></li>)}</ul>
        </Block>
      )}
      {r.sources.length > 0 && (
        <section className="text-xs text-muted-foreground">
          <p className="font-semibold">Fontes oficiais consultadas</p>
          <ul className="mt-1 space-y-0.5">{r.sources.map((s) => <li key={s.url}>{s.label} ({fmt(s.accessed)}) <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 underline"><ExternalLink className="h-3 w-3" aria-hidden />link</a></li>)}</ul>
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
    photos: (g?.photos ?? []).map((p) => ({ url: p.url, alt: r.name, credit: `${p.credit} · Google` })),
    description: [],
    amenities: r.highlights.map((h) => ({ icon: "leisure" as const, label: h })),
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
            {!g?.photos?.length && <p className="mt-6 text-xs text-muted-foreground">Fotos do Google ainda não disponíveis para este hotel.</p>}
          </div>
        ) : (
          <p className="py-20 text-center text-muted-foreground">Hotel não encontrado. <a href={agencySiteHref(CLUB_MED_SNOW_BASE)} className="text-primary underline">Ver todos</a></p>
        )}
      </div>
    </div>
  );
}
