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

/** Clientes demonstrativos (superfície de Clientes). */
export const DEMO_CLIENTS = [
  { id: "c1", name: "Camila Duarte", email: "camila.demo@exemplo.com", phone: "(11) 90000-0000", trips: 3 },
  { id: "c2", name: "Rodrigo Menezes", email: "rodrigo.demo@exemplo.com", phone: "(21) 90000-0000", trips: 1 },
  { id: "c3", name: "Fernanda Lopes", email: "fernanda.demo@exemplo.com", phone: "(31) 90000-0000", trips: 2 },
];

/** Colunas e cartões demonstrativos dos funis (Oportunidades/Operações). */
export const DEMO_KANBAN: { stage: string; cards: { id: string; title: string; client: string; value: string }[] }[] = [
  {
    stage: "Novo contato",
    cards: [{ id: "k1", title: "Portugal essencial", client: "Camila Duarte", value: "R$ 24.800" }],
  },
  {
    stage: "Em cotação",
    cards: [
      { id: "k2", title: "Patagônia em família", client: "Rodrigo Menezes", value: "R$ 38.200" },
      { id: "k3", title: "Fim de semana em Buenos Aires", client: "Fernanda Lopes", value: "R$ 6.400" },
    ],
  },
  { stage: "Proposta enviada", cards: [{ id: "k4", title: "Mediterrâneo", client: "Camila Duarte", value: "R$ 31.900" }] },
  { stage: "Venda confirmada", cards: [{ id: "k5", title: "Lisboa executiva", client: "Rodrigo Menezes", value: "R$ 12.100" }] },
];

/** Reservas demonstrativas (superfície de Reservas). */
export const DEMO_BOOKINGS = [
  { id: "b1", code: "RSV-1042", client: "Camila Duarte", service: "Hospedagem — Lisboa", date: "2026-10-12", status: "Confirmada" },
  { id: "b2", code: "RSV-1043", client: "Camila Duarte", service: "Aéreo GRU–LIS", date: "2026-10-11", status: "Emitida" },
  { id: "b3", code: "RSV-1044", client: "Rodrigo Menezes", service: "Transfer aeroporto", date: "2026-12-05", status: "Pendente" },
];

/** Lançamentos demonstrativos (superfície Financeiro). */
export const DEMO_FINANCIAL_ROWS = [
  { id: "f1", description: "Comissão pacote Portugal", date: "2026-10-20", amount: "R$ 3.720", kind: "Entrada" },
  { id: "f2", description: "Comissão vendedor", date: "2026-10-22", amount: "R$ 620", kind: "Despesa" },
  { id: "f3", description: "Comissão cruzeiro Mediterrâneo", date: "2026-05-30", amount: "R$ 2.480", kind: "Entrada" },
];

/** Compromissos demonstrativos (superfície Agenda). */
export const DEMO_AGENDA = [
  { id: "a1", title: "Reunião com Camila Duarte", date: "2026-09-04", time: "10:00" },
  { id: "a2", title: "Envio de proposta — Patagônia", date: "2026-09-05", time: "14:30" },
  { id: "a3", title: "Check-in Portugal essencial", date: "2026-10-12", time: "07:00" },
];

/** Projetos demonstrativos por aba do grupo "Meus projetos". */
export const DEMO_PROJECTS: Record<string, { id: string; title: string; client: string; updated: string }[]> = {
  orcamentos: [
    { id: "p1", title: "Portugal essencial", client: "Camila Duarte", updated: "2026-09-01" },
    { id: "p2", title: "Patagônia em família", client: "Rodrigo Menezes", updated: "2026-08-30" },
  ],
  roteiros: [{ id: "p3", title: "Roteiro Lisboa · Porto", client: "Camila Duarte", updated: "2026-09-02" }],
  carteiras: [{ id: "p4", title: "Carteira Portugal essencial", client: "Camila Duarte", updated: "2026-09-02" }],
  modelos: [{ id: "p5", title: "Modelo padrão de orçamento", client: "—", updated: "2026-07-14" }],
};

export function formatDemoDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1).toLocaleDateString("pt-BR");
}
