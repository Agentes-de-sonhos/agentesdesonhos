/**
 * Fixtures ISOLADAS do SiteLab.
 *
 * Nenhum dado aqui vem do banco nem de uma conta real: as áreas internas
 * demonstrativas usam exclusivamente estes registros fictícios. Nenhuma ação
 * do laboratório grava, envia ou consulta qualquer tabela real.
 */
import type { ClientAreaTrip } from "@/lib/clientAreaTrips";
import type { ClientAreaDocument } from "@/lib/clientAreaDocuments";
import type { ClientAreaProfileData } from "@/hooks/useClientAreaDocuments";

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
  { id: "d1", title: "Portugal essencial", destination: "Portugal", start: "2026-10-12", end: "2026-10-22", status: "Confirmada", travelers: 2 },
  { id: "d2", title: "Família na Patagônia", destination: "Argentina · Chile", start: "2026-12-05", end: "2026-12-16", status: "Em planejamento", travelers: 4 },
  { id: "d3", title: "Cruzeiro pelo Mediterrâneo", destination: "Espanha · França · Itália", start: "2026-05-18", end: "2026-05-27", status: "Concluída", travelers: 2 },
];

export const DEMO_DOCUMENTS = [
  { id: "doc1", name: "Voucher de hospedagem", trip: "Portugal essencial", kind: "PDF" },
  { id: "doc2", name: "Bilhete aéreo (e-ticket)", trip: "Portugal essencial", kind: "PDF" },
  { id: "doc3", name: "Seguro viagem", trip: "Portugal essencial", kind: "PDF" },
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

/** Viagem demonstrativa a Portugal no MESMO contrato da Área do Cliente real. */
export const DEMO_CLIENT_AREA_TRIP: ClientAreaTrip = {
  id: "demo-portugal",
  title: "Portugal essencial",
  destination: "Lisboa · Porto · Douro",
  start_date: "2026-10-12",
  end_date: "2026-10-22",
  stage: "venda_confirmada",
  stage_label: null,
  travelers_count: 2,
  services_count: 7,
  cover_url: null,
};

export const DEMO_CLIENT_AREA_TRIPS: ClientAreaTrip[] = [DEMO_CLIENT_AREA_TRIP];

export const DEMO_CLIENT_AREA_DOCUMENTS: ClientAreaDocument[] = [
  {
    id: "demo-doc-1",
    source: "attachment",
    name: "Voucher de hospedagem — Lisboa",
    category: "hospedagem",
    trip_id: DEMO_CLIENT_AREA_TRIP.id,
    trip_title: DEMO_CLIENT_AREA_TRIP.title,
    available_at: "2026-09-01",
    file_type: "application/pdf",
  } as ClientAreaDocument,
  {
    id: "demo-doc-2",
    source: "attachment",
    name: "Bilhete aéreo (e-ticket)",
    category: "passagem",
    trip_id: DEMO_CLIENT_AREA_TRIP.id,
    trip_title: DEMO_CLIENT_AREA_TRIP.title,
    available_at: "2026-09-02",
    file_type: "application/pdf",
  } as ClientAreaDocument,
  {
    id: "demo-doc-3",
    source: "contract",
    name: "Contrato de prestação de serviços",
    category: "contrato",
    trip_id: DEMO_CLIENT_AREA_TRIP.id,
    trip_title: DEMO_CLIENT_AREA_TRIP.title,
    available_at: "2026-08-28",
    file_type: "application/pdf",
  } as ClientAreaDocument,
];

export const DEMO_CLIENT_AREA_PROFILE: ClientAreaProfileData = {
  name: DEMO_CLIENT.name,
  email: DEMO_CLIENT.email,
  phone: DEMO_CLIENT.phone,
  city: "São Paulo",
  state: "SP",
  country: "Brasil",
  birth_date: null,
};

export function formatDemoDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1).toLocaleDateString("pt-BR");
}
