import { generateQuotePDF } from "@/components/quote/QuotePDF";
const out: Record<string, string> = {};
function stub() {
  let html = "";
  const doc: any = { readyState: "complete", images: [], open: () => (html = ""), write: (c: string) => (html += c), close: () => {} };
  (globalThis as any).window = {
    open: () => ({ document: doc, closed: false, focus: () => {}, print: () => {}, addEventListener: () => {} }),
    setTimeout, setInterval, clearTimeout, clearInterval,
  };
  return () => html;
}
const quote: any = {
  id: "q1", client_name: "Cliente Fixture", destination: "Lisboa, Portugal", trip_title: "Semana em Lisboa",
  start_date: "2026-10-01", end_date: "2026-10-08", adults_count: 2, children_count: 1,
  payment_display_mode: "installments", installments_count: 10, valid_until: "2026-09-20",
  payment_terms: "Entrada em cartão e saldo em até 10x sem juros.",
  destination_intro: "Lisboa combina história, gastronomia e luz única.",
  services: [
    { id: "s1", service_type: "flight", amount: 6400, service_data: { airline: "Cia Fixture", origin: "São Paulo", destination: "Lisboa", departure_date: "2026-10-01", return_date: "2026-10-08", baggage_included: true, description: "Voo direto com bagagem despachada." } },
    { id: "s2", service_type: "hotel", amount: 9800, service_data: { hotel_name: "Hotel Fixture", city: "Lisboa", check_in: "2026-10-01", check_out: "2026-10-08", meal_plan: "Breakfast", description: "Hotel central, café da manhã incluído.", rooms: [{ room_type: "Duplo Superior", quantity: 1, adults: 2, children: 1, children_ages: [7], total_price: 9800 }] } },
    { id: "s3", service_type: "transfer", amount: 600, service_data: { transfer_type: "Ida e Volta", location: "Aeroporto de Lisboa", date: "2026-10-01", return_date: "2026-10-08" } },
  ],
};
const base = { name: "Consultor Fixture", phone: "11999999999", avatar_url: null, agency_name: "Agência Fixture", agency_logo_url: null, city: "São Paulo", state: "SP" } as any;
for (const [k, prof] of Object.entries({
  rosa: { ...base, agency_primary_color: "#D6336C", agency_secondary_color: "#F783AC", agency_secondary_auto: false, agency_tertiary_color: "#FFF0F6", agency_tertiary_auto: false },
  escuro: { ...base, agency_primary_color: "#1D4ED8", agency_secondary_color: "#38BDF8", agency_secondary_auto: false, agency_tertiary_color: "#111827", agency_tertiary_auto: false },
})) {
  const get = stub();
  await generateQuotePDF(quote, prof as any);
  out[k] = get();
}
await Bun.write("/tmp/browser/qpdf/rosa.html", out.rosa);
await Bun.write("/tmp/browser/qpdf/escuro.html", out.escuro);
console.log("sizes", out.rosa.length, out.escuro.length);
