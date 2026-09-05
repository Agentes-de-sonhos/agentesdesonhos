import { mock } from "bun:test";
mock.module("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ order: async () => ({ data: [], error: null }) }) }) }) }),
    storage: { from: () => ({ createSignedUrl: async () => ({ data: null }) }) },
  },
}));
const { generateQuotePDF } = await import("@/components/quote/QuotePDF");

const quote: any = {
  id: "q1", client_name: "Cliente Fixture", trip_title: "Semana em Lisboa", destination: "Lisboa, Portugal",
  start_date: "2026-10-01", end_date: "2026-10-08", adults_count: 2, children_count: 1,
  payment_display_mode: "installments", installments_count: 10, payment_terms: "Entrada em cartão e saldo em até 10x sem juros.",
  valid_until: "2026-09-20", destination_intro_text: "Lisboa combina história, gastronomia e luz única.\nBairros, miradouros e bons cafés.",
  services: [
    { id:"s1", service_type:"flight", amount:6400, description:"Voo direto com bagagem despachada.", service_data:{ airline:"Cia Fixture", origin_city:"São Paulo", destination_city:"Lisboa", departure_date:"2026-10-01", return_date:"2026-10-08", includes_baggage:true, outbound_legs:[{leg_date:"2026-10-01",flight_number:"FX100",airport_origin:"GRU",airport_destination:"LIS",departure_time:"22:10",arrival_time:"11:30"}], return_legs:[{leg_date:"2026-10-08",flight_number:"FX101",airport_origin:"LIS",airport_destination:"GRU",departure_time:"13:00",arrival_time:"20:40"}] } },
    { id:"s2", service_type:"hotel", amount:9800, description:"Hotel central, café da manhã incluído.", service_data:{ hotel_name:"Hotel Fixture", city:"Lisboa", check_in:"2026-10-01", check_out:"2026-10-08", meal_plan:"breakfast", rooms:[{quantity:1,room_type:"Duplo Superior",adults:2,children:1,children_ages:[7],unit_price:9800,total_price:9800}] } },
    { id:"s3", service_type:"transfer", amount:600, service_data:{ transfer_type:"round_trip", location:"Aeroporto de Lisboa", arrival_date:"2026-10-01", departure_date:"2026-10-08" } },
  ],
};
const base = { name:"Consultor Fixture", phone:"11999999999", avatar_url:null, agency_name:"Agência Fixture", agency_logo_url:null, city:"São Paulo", state:"SP" } as any;

async function capture(profile: any, out: string) {
  let html = "";
  const doc: any = { readyState:"complete", images:[], open(){ html=""; }, write(c:string){ html+=c; }, close(){} };
  const win: any = { document:doc, closed:false, focus(){}, print(){}, addEventListener(){}, setTimeout:(f:any)=>setTimeout(f,0) };
  (globalThis as any).window = { open: () => win };
  await generateQuotePDF(quote, profile);
  await Bun.write(out, html);
}
await capture({ ...base, agency_primary_color: null }, "/tmp/browser/qpdf/azul.html");
await capture({ ...base, agency_primary_color:"#D6336C", agency_secondary_color:"#F783AC", agency_secondary_auto:false, agency_tertiary_color:"#FFF0F6", agency_tertiary_auto:false }, "/tmp/browser/qpdf/rosa.html");
console.log("ok");
