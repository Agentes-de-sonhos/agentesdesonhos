import { useCallback, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { HotelDetailsView } from "@/components/hotel-page/HotelDetailsView";
import { getResortPage } from "@/components/hotel-page/resortsCatalog";
import type { HotelQuoteRequest } from "@/components/hotel-page/types";
import { useAgencySiteRequest } from "@/hooks/useAgencySiteRequest";
import { agencySiteHref } from "@/lib/agencyContextLink";
import type { AgencyDomainInfo } from "@/lib/agencyDomains";

const fmt = (iso: string) => iso.split("-").reverse().join("/");

function describe(req: HotelQuoteRequest) {
  const kids = req.childrenAges.length;
  const pax = `${req.adults} ${req.adults === 1 ? "adulto" : "adultos"}` +
    (kids ? ` e ${kids} ${kids === 1 ? "criança" : "crianças"} (${req.childrenAges.join(", ")} anos)` : "");
  return { pax, period: `${fmt(req.checkIn)} a ${fmt(req.checkOut)}` };
}

/**
 * Página de resort dentro do site da agência: mesmo modelo visual, porém o
 * pedido de orçamento entra no CRM da agência dona do domínio (o servidor
 * resolve a agência pelo hostname) e dispara as notificações da fila.
 */
export default function AgencyResortPage({ info, slug: slugProp }: { info: AgencyDomainInfo; slug?: string }) {
  const params = useParams();
  const slug = slugProp ?? params.slug ?? "";
  const hotel = useMemo(() => getResortPage(slug), [slug]);
  const { submit } = useAgencySiteRequest(info.hostname);

  useEffect(() => {
    if (hotel) document.title = `${hotel.name} · ${info.agency_name ?? "Resorts"}`;
    window.scrollTo(0, 0);
  }, [hotel, info.agency_name]);

  const onSubmitQuote = useCallback(async (req: HotelQuoteRequest) => {
    if (!hotel) return;
    const { pax, period } = describe(req);
    const destination = [hotel.name, hotel.city, hotel.state].filter(Boolean).join(" · ");
    const res = await submit({
      service_key: "hospedagem",
      service_label: "Hospedagem",
      destination,
      summary: `Serviços solicitados: Hospedagem | Resort: ${hotel.name} | Período: ${period} | Viajantes: ${pax}`,
      notes: `Solicitação pela página do resort ${hotel.name}.`,
      lead_name: req.contact.name,
      lead_phone: req.contact.whatsapp,
      lead_email: req.contact.email,
      preferred_channel: "WhatsApp",
      best_time: "Qualquer horário",
      consent: true,
      consent_version: "v1",
      details: {
        hotel: hotel.name,
        hotel_slug: hotel.slug,
        destino: destination,
        check_in: req.checkIn,
        check_out: req.checkOut,
        adultos: String(req.adults),
        criancas: String(req.childrenAges.length),
        idades_criancas: req.childrenAges.join(", "),
        tipo_hospedagem: "Resort",
        servicos: "Hospedagem",
        servicos_keys: "hospedagem",
      },
    });
    if ("error" in res) throw new Error("Não foi possível enviar agora. Tente novamente.");
  }, [hotel, submit]);

  const whatsappUrl = useCallback((req: HotelQuoteRequest) => {
    const digits = (info.phone ?? "").replace(/\D/g, "");
    if (digits.length < 10 || !hotel) return null;
    const phone = digits.startsWith("55") ? digits : `55${digits}`;
    const { pax, period } = describe(req);
    const text = `Olá! Acabei de solicitar um orçamento para o ${hotel.name}, de ${period}, para ${pax}.`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  }, [hotel, info.phone]);

  return (
    <div className="bg-background px-4 py-8 md:py-12">
      <div className="mx-auto max-w-6xl">
        {hotel ? (
          <HotelDetailsView hotel={hotel} onSubmitQuote={onSubmitQuote} quoteWhatsappUrl={whatsappUrl} />
        ) : (
          <p className="py-20 text-center text-muted-foreground">
            Resort não encontrado. <a href={agencySiteHref("/resorts-brasil")} className="text-primary underline">Ver todos os resorts</a>
          </p>
        )}
      </div>
    </div>
  );
}
