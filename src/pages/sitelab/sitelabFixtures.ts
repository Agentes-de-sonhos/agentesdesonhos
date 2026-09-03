/**
 * Fixtures ISOLADAS do SiteLab.
 *
 * Nenhum dado aqui vem do banco nem de uma conta real: as áreas internas
 * demonstrativas usam exclusivamente estes registros fictícios.
 */

export interface DemoTrip {
  id: string;
  title: string;
  destination: string;
  start: string;
  end: string;
  status: "Confirmada" | "Em planejamento" | "Concluída";
  travelers: number;
}

export const DEMO_TRIPS: DemoTrip[] = [
  { id: "d1", title: "Lua de mel na Toscana", destination: "Itália", start: "2026-10-12", end: "2026-10-22", status: "Confirmada", travelers: 2 },
  { id: "d2", title: "Família na Patagônia", destination: "Argentina · Chile", start: "2026-12-05", end: "2026-12-16", status: "Em planejamento", travelers: 4 },
  { id: "d3", title: "Cruzeiro pelo Mediterrâneo", destination: "Espanha · França · Itália", start: "2026-05-18", end: "2026-05-27", status: "Concluída", travelers: 2 },
];

export const DEMO_DOCUMENTS = [
  { id: "doc1", name: "Voucher de hospedagem", trip: "Lua de mel na Toscana", kind: "PDF" },
  { id: "doc2", name: "Bilhete aéreo (e-ticket)", trip: "Lua de mel na Toscana", kind: "PDF" },
  { id: "doc3", name: "Seguro viagem", trip: "Família na Patagônia", kind: "PDF" },
];

export const DEMO_REQUESTS = [
  { id: "r1", client: "Camila Duarte", service: "Pacote completo", created: "2026-09-01", stage: "Novo" },
  { id: "r2", client: "Rodrigo Menezes", service: "Passagem aérea", created: "2026-08-30", stage: "Em cotação" },
  { id: "r3", client: "Fernanda Lopes", service: "Hospedagem", created: "2026-08-28", stage: "Proposta enviada" },
];

export const DEMO_KPIS = [
  { label: "Solicitações no mês", value: "18" },
  { label: "Orçamentos enviados", value: "11" },
  { label: "Vendas confirmadas", value: "6" },
  { label: "Comissão prevista", value: "R$ 12.400" },
];

export const DEMO_CLIENT = {
  name: "Camila Duarte",
  email: "camila.demo@exemplo.com",
  phone: "(11) 90000-0000",
};

export function formatDemoDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1).toLocaleDateString("pt-BR");
}
