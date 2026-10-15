import { describe, it, expect } from "vitest";
import { writeFileSync, mkdirSync } from "fs";
import { buildTripPdfHtml, pdfSignatureOptions } from "@/components/trip/TripPDF";

const img = (id: number) => `https://picsum.photos/id/${id}/1200/700`;
const longNote = Array.from({ length: 6 }, (_, i) => `Parágrafo ${i + 1} de observação longa com regras de embarque, documentos e horários que nunca podem ser cortados nem resumidos no PDF.`).join("\n");

const trip: any = {
  id: "t1", trip_title: "Viagem para Montevidéu (exemplo)", destination: "Montevidéu, Uruguai", client_name: "Cliente Exemplo da Silva",
  start_date: "2026-10-21", end_date: "2026-10-29", share_token: "a".repeat(32),
  services: [
    { id: "f", service_type: "flight", order_index: 0, image_urls: [img(1015)], attachments: [{ url: "user/x/passagem-exemplo.pdf", name: "passagem-exemplo.pdf" }],
      service_data: { origin_city: "GRU", destination_city: "GRU", trip_type: "ida_volta", flight_status: "emitido", locator_code: "XYZ123", main_airline: "Companhia Exemplo",
        segments: [
          { segment_type: "ida", origin_airport: "GRU", origin_city: "Sao Paulo", destination_airport: "MVD", destination_city: "Montevideo", flight_date: "2026-10-21", departure_time: "08:15", arrival_time: "11:05", flight_number: "XX 1234" },
          { segment_type: "volta", origin_airport: "MVD", origin_city: "Montevideo", destination_airport: "GRU", destination_city: "Sao Paulo", flight_date: "2026-10-29", departure_time: "19:40", arrival_time: "22:30", flight_number: "XX 1235" },
        ],
        passengers: [{ name: "Passageiro Um", seat: "12A", document: "000.0000.000001" }, { name: "Passageira Dois com Nome Bem Comprido Para Testar Quebra", seat: "12B", document: "000.0000.000002" }],
        carry_on: "1 peça de 10 kg", checked_baggage: "1 peça de 23 kg", recommended_arrival: "3 horas antes", boarding_notes: longNote, checkin_url: "https://example.com/checkin" } },
    { id: "h", service_type: "hotel", order_index: 1, image_urls: [img(164), img(1040), img(1029), img(1048), img(1067)], attachments: [{ url: "user/x/voucher-hotel.pdf", name: "voucher-hotel.pdf" }, { url: "user/x/regras.pdf", name: "regras.pdf" }],
      service_data: { hotel_name: "Hotel Exemplo Resort & Spa Montevideo Carrasco", hotel_category: "5", city: "Montevideo", country: "Uruguai", check_in: "2026-10-21", check_out: "2026-10-29", checkin_time: "15:00", checkout_time: "12:00",
        reservation_status: "emitida", reservation_code: "RES-998877", locator_code: "LOC55", room_type: "deluxe", meal_plan: "cafe_manha", guest_count: "2", bed_type: "king",
        address: "Rambla Exemplo, 1000 - Carrasco, Montevideo", hotel_phone: "+598 0000 0000", hotel_website: "https://example.com/hotel?" + "utm=x&".repeat(30),
        cancellation_policy: longNote, children_policy: "Crianças até 12 anos não pagam.", notes: longNote + "\nNota final da agência." } },
    { id: "c", service_type: "car_rental", order_index: 2, image_urls: [], attachments: [{ url: "user/x/voucher-carro.pdf", name: "voucher-carro.pdf" }],
      service_data: { car_model: "Compacto Exemplo", rental_company: "Locadora Exemplo", reservation_status: "confirmada", reservation_code: "CAR-4455", transmission: "automatico", passenger_capacity: "5",
        pickup_date: "2026-10-22", pickup_time: "10:00", pickup_location: "Aeroporto de Carrasco", pickup_address: "Ruta 101 km 19", dropoff_date: "2026-10-28", dropoff_time: "18:00", dropoff_location: "Aeroporto de Carrasco",
        deductible: "USD 1.000", basic_insurance: "Incluso", drivers: [{ name: "Condutor Um" }, { name: "Condutor Dois" }], pickup_instructions: longNote } },
    { id: "tr", service_type: "transfer", order_index: 3, image_urls: [], service_data: { transfer_type: "privativo", origin: "Aeroporto", destination: "Hotel", date: "2026-10-21", time: "12:00" } },
  ],
};

function build(modules = { show_signature: true, show_whatsapp: true }) {
  const opts = pdfSignatureOptions(modules, { name: "Consultora Exemplo", whatsapp: "11999999999", photo_url: null }, { name: "x", agency_name: "Agência Exemplo", agency_logo_url: "https://picsum.photos/id/180/1600/400" } as any);
  return buildTripPdfHtml({
    trip, profile: { name: "Consultora Exemplo", agency_name: "Agência Exemplo", agency_logo_url: "https://picsum.photos/id/180/1600/400" } as any,
    locale: "pt-BR", resolveImg: (r) => r, documentUrl: (p) => `https://backend.example/functions/v1/serve-voucher?token=t&file=${encodeURIComponent(p)}`,
    modules: opts.modules, signature: opts.signature, generatedAt: new Date(2026, 9, 15, 10, 0),
  });
}

describe("PDF da Carteira Digital", () => {
  const html = build();
  it("rota usa cidades dos trechos (nunca GRU→GRU) e status à direita", () => {
    expect(html).toContain("Sao Paulo");
    expect(html).toContain("Montevideo");
    expect(html).not.toMatch(/GRU <span class="accent">[^<]+<\/span> GRU/);
    expect(html).toContain('class="chip chip-ok"');
  });
  it("documentos com nomes amigáveis e links seguros, sem controles de tela", () => {
    expect(html).toContain("Abrir passagem em PDF");
    expect(html).toContain("Abrir voucher da hospedagem (1)");
    expect(html).toContain("Abrir voucher da locação");
    expect(html).toContain("serve-voucher?token=");
    expect(html).not.toMatch(/Copiar|aria-expanded|<button/);
  });
  it("texto livre completo e sem emojis decorativos nos novos blocos", () => {
    expect(html.split("Parágrafo 6 de observação longa").length - 1).toBeGreaterThanOrEqual(4);
    expect(html).toContain("Nota final da agência.");
    expect(html).not.toMatch(/✈️|🏨|🚗|📎|📅/u);
  });
  it("condutores neutros e assinatura/WhatsApp independentes", () => {
    expect(html).not.toMatch(/Principal|Adicional/);
    expect(build({ show_signature: false, show_whatsapp: true })).not.toContain(`class="sig-name"`);
    expect(build({ show_signature: false, show_whatsapp: true })).toContain("wa.me/5511999999999");
    expect(build({ show_signature: true, show_whatsapp: false })).not.toContain("wa.me/");
  });
  it("gera HTML de QA", () => {
    mkdirSync("/tmp/pdfqa", { recursive: true });
    writeFileSync("/tmp/pdfqa/trip.html", html);
  });
});
