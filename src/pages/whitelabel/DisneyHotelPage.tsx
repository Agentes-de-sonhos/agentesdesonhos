import { useCallback, useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Bus, ChevronRight, ExternalLink, MapPin, Sparkles, Star } from "lucide-react";
import { HotelGallery } from "@/components/hotel-page/HotelGallery";
import { ReviewsCarousel, Stars } from "@/components/hotel-page/HotelDetailsView";
import googleData from "@/components/landing/disney/disneyHotelsGoogleData.json";
import { HotelQuoteBox } from "@/components/hotel-page/HotelQuoteBox";
import type { HotelQuoteRequest } from "@/components/hotel-page/types";
import { getDisneyHotel, KIND_LABEL, OFFICIAL_CATEGORY_LABEL } from "@/components/landing/disney/disneyHotelsCatalog";
import { DISNEY_HOTEL_BENEFITS } from "@/components/landing/disney/content";
import { useDisneyPreviewRequest } from "@/hooks/useDisneyPreviewRequest";
import { useNoindex } from "@/hooks/useNoindex";
import { agencyContextHref } from "@/lib/agencyContextLink";
import type { AgencyDomainInfo } from "@/lib/agencyDomains";

const fmt = (iso: string) => iso.split("-").reverse().join("/");

interface GSnap { address: string; rating?: number | null; total?: number | null; mapsUrl: string; lat: number; lng: number; photos: { url: string; credit: string }[]; reviews: { author: string; rating?: number; text: string; relativeTime?: string }[] }
const GDATA = googleData as unknown as Record<string, GSnap | null>;

/** Página própria de cada hospedagem Disney. Sem fotos/avaliações até haver material licenciado e verificável. */
export default function DisneyHotelPage({ info }: { info: AgencyDomainInfo }) {
  const { slug = "" } = useParams();
  const hotel = useMemo(() => getDisneyHotel(slug), [slug]);
  const { submit, simulated } = useDisneyPreviewRequest(info.hostname);
  useNoindex();
  useEffect(() => { if (hotel) document.title = `${hotel.name} · ${info.agency_name ?? "Disney"}`; window.scrollTo(0, 0); }, [hotel, info.agency_name]);

  const onSubmitQuote = useCallback(async (req: HotelQuoteRequest) => {
    if (!hotel) return;
    const kids = req.childrenAges.length;
    const pax = `${req.adults} ${req.adults === 1 ? "adulto" : "adultos"}${kids ? ` e ${kids} ${kids === 1 ? "criança" : "crianças"} (${req.childrenAges.join(", ")} anos)` : ""}`;
    const period = `${fmt(req.checkIn)} a ${fmt(req.checkOut)}`;
    const res = await submit({
      service_key: "hospedagem", service_label: "Hospedagem", destination: `${hotel.name} · Walt Disney World Resort`,
      summary: `Serviços solicitados: Hospedagem | Disney (${hotel.category}): ${hotel.name} | Período: ${period} | Viajantes: ${pax}`,
      notes: `Solicitação pela página /disney/hoteis/${hotel.slug}.`,
      lead_name: req.contact.name, lead_phone: req.contact.whatsapp, lead_email: req.contact.email,
      preferred_channel: "WhatsApp", best_time: "Qualquer horário", consent: true, consent_version: "v1",
      details: {
        origem: "disney_hotel_page", hotel: hotel.name, hotel_slug: hotel.slug, categoria_disney: hotel.category, tipo: hotel.kind,
        check_in: req.checkIn, check_out: req.checkOut, adultos: String(req.adults), criancas: String(kids), idades_criancas: req.childrenAges.join(", "),
        servicos: "Hospedagem", servicos_keys: "hospedagem",
      },
    });
    if ("error" in res) throw new Error("Não foi possível enviar agora. Tente novamente.");
  }, [hotel, submit]);

  if (!hotel) {
    return (
      <p className="px-4 py-20 text-center text-muted-foreground">
        Hospedagem não encontrada. <Link to={agencyContextHref("/disney#hoteis")} className="text-primary underline">Ver todos os hotéis Disney</Link>
      </p>
    );
  }
  const g = GDATA[hotel.slug] ?? null;
  const mapQ = g ? `${g.lat},${g.lng}` : encodeURIComponent(`${hotel.name}, ${hotel.address}`);
  const placeName = (g as (GSnap & { placeName?: string }) | null)?.placeName;
  const norm = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, "");
  const sharedWith = placeName && norm(placeName) !== norm(hotel.name) && Object.entries(GDATA).some(([k, v]) => k !== hotel.slug && v && (v as { placeName?: string }).placeName === placeName && norm(getDisneyHotel(k)?.name ?? "") === norm(placeName)) ? placeName : null;
  const reviews = g ? [...g.reviews].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 5) : [];
  return (
    <div className="bg-background px-4 py-8 md:py-12">
      <article className="mx-auto max-w-6xl space-y-8 text-foreground">
        <Link to={agencyContextHref("/disney#hoteis")} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"><ArrowLeft className="h-4 w-4" />Hotéis Disney</Link>
        <header>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">{OFFICIAL_CATEGORY_LABEL[hotel.category]} · {KIND_LABEL[hotel.kind]}</p>
          <h1 className="mt-2 text-2xl font-bold leading-tight tracking-tight md:text-4xl">{hotel.name}</h1>
          {hotel.parent && <p className="mt-1 text-sm text-muted-foreground">Parte do complexo {hotel.parent}</p>}
          <p className="mt-2 flex items-start gap-1.5 text-sm text-muted-foreground"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />{hotel.address}</p>
        </header>
        {hotel.status === "future" && <p className="rounded-md border border-primary/40 bg-primary/5 p-4 text-sm"><strong>Hotel futuro.</strong> Inauguração anunciada para {hotel.opening}. Ainda não faz parte do catálogo atual.</p>}

        {g && g.photos.length > 0 && <HotelGallery photos={g.photos.map((p, i) => ({ url: p.url, alt: `${hotel.name} — foto ${i + 1}`, credit: p.credit || undefined }))} hotelName={hotel.name} />}
        {sharedWith && <p className="text-xs text-muted-foreground" data-testid="disney-shared-listing">As fotos e avaliações abaixo são da ficha do Google de <strong>{sharedWith}</strong>, compartilhada com {hotel.name}. Não são avaliações exclusivas desta hospedagem.</p>}

        {hotel.status === "open" && <HotelQuoteBox hotelSlug={hotel.slug} hotelName={hotel.name} onSubmit={onSubmitQuote} previewMode={simulated} />}
        {simulated && <p className="text-center text-xs text-muted-foreground">Prévia: os pedidos desta página são simulados e não chegam ao CRM.</p>}

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-8">
            <section>
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Por que escolher {hotel.name}?</h2>
              <div className="mt-4 space-y-4 leading-relaxed text-muted-foreground">{hotel.paragraphs.map((p) => <p key={p}>{p}</p>)}</div>
            </section>
            <section className="border-t border-border pt-8">
              <h2 className="text-xl font-bold">Destaques</h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">{hotel.highlights.map((h) => <li key={h} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm"><Sparkles className="h-5 w-5 shrink-0 text-primary" aria-hidden />{h}</li>)}</ul>
            </section>
            <section className="rounded-2xl bg-primary/5 p-5">
              <h2 className="flex items-center gap-2 text-lg font-bold"><Bus className="h-5 w-5 text-primary" aria-hidden />Transporte</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{hotel.transport} A rede Disney pode exigir conexões e muda conforme horário e clima; não inclui transfer do aeroporto.</p>
            </section>
            {hotel.status === "open" && (
              <section>
                <h2 className="text-lg font-bold">Benefícios de hóspede Disney</h2>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">{DISNEY_HOTEL_BENEFITS.map((b) => <li key={b}>• {b}</li>)}</ul>
              </section>
            )}
            {hotel.notice && <p className="flex gap-2 rounded-md border border-border bg-muted/50 p-4 text-sm text-muted-foreground"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />{hotel.notice}</p>}
          </div>
          <aside className="space-y-6">
            <section className="overflow-hidden rounded-2xl border border-border bg-card">
              <h2 className="flex items-center gap-2 p-5 pb-3 font-bold"><MapPin className="h-5 w-5 text-primary" aria-hidden />Localização</h2>
              <iframe title={`Mapa de ${hotel.name}`} src={`https://maps.google.com/maps?q=${mapQ}&z=14&output=embed`} loading="lazy" className="h-56 w-full border-0" referrerPolicy="no-referrer-when-downgrade" />
              <a href={g?.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${mapQ}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 p-4 text-sm font-medium text-primary"><ExternalLink className="h-4 w-4" />Abrir no Google Maps</a>
            </section>
            {g?.rating && (
              <section className="rounded-2xl border border-border bg-card p-5">
                <h2 className="flex items-center gap-2 font-bold"><Star className="h-5 w-5 text-primary" aria-hidden />{sharedWith ? `Avaliações no Google de ${sharedWith}` : "Avaliações no Google"}</h2>
                <div className="mt-4 flex items-center gap-3">
                  <span className="text-4xl font-bold tabular-nums">{g.rating.toFixed(1).replace(".", ",")}</span>
                  <div className="flex-1"><Stars value={g.rating} /><p className="mt-0.5 text-xs text-muted-foreground">{(g.total ?? 0).toLocaleString("pt-BR")} avaliações</p></div>
                </div>
                <a href={g.mapsUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">Ver avaliações <ChevronRight className="h-4 w-4" /></a>
                <ReviewsCarousel reviews={reviews} />
                <p className="mt-3 text-[11px] text-muted-foreground">Avaliações de usuários do Google, com o nome do autor exibido em cada uma.</p>
              </section>
            )}
          </aside>
        </div>
      </article>
    </div>
  );
}
