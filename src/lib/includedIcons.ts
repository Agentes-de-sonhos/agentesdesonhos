/**
 * Registro único (allowlist) de ícones disponíveis para os itens de
 * "O que está incluso" do orçamento.
 *
 * Regras:
 * - Só o `id` é persistido no banco (nunca componentes React ou SVG bruto).
 * - Ids desconhecidos/removidos caem no fallback seguro `sparkles`.
 * - Usado por: editor da etapa "Incluso", orçamento público e PDF.
 */
import {
  Plane,
  PlaneTakeoff,
  Car,
  Bus,
  Train,
  ArrowRightLeft,
  Ship,
  Anchor,
  Hotel,
  BedDouble,
  Home,
  Building2,
  Utensils,
  Coffee,
  Wine,
  UtensilsCrossed,
  Ticket,
  Camera,
  MapPin,
  Map,
  Mountain,
  Waves,
  Sun,
  Shield,
  ShieldCheck,
  HeartPulse,
  FileText,
  Stamp,
  BadgeCheck,
  Luggage,
  Wifi,
  ShoppingBag,
  Sparkles,
  Users,
  Headphones,
  Gift,
  Baby,
  Accessibility,
  type LucideIcon,
} from "lucide-react";

export const INCLUDED_ICON_CATEGORIES = [
  { key: "transporte", label: "Transporte" },
  { key: "hospedagem", label: "Hospedagem" },
  { key: "alimentacao", label: "Alimentação" },
  { key: "passeios", label: "Passeios e ingressos" },
  { key: "cruzeiros", label: "Cruzeiros" },
  { key: "protecao", label: "Proteção e seguros" },
  { key: "documentos", label: "Documentos" },
  { key: "servicos", label: "Serviços gerais" },
] as const;

export type IncludedIconCategory = (typeof INCLUDED_ICON_CATEGORIES)[number]["key"];

export interface IncludedIconDef {
  id: string;
  label: string;
  category: IncludedIconCategory;
  aliases: string[];
  Icon: LucideIcon;
}

export const INCLUDED_ICONS: IncludedIconDef[] = [
  // Transporte
  { id: "plane", label: "Avião", category: "transporte", aliases: ["aviao", "voo", "voos", "aereo", "passagem", "flight"], Icon: Plane },
  { id: "plane-takeoff", label: "Decolagem", category: "transporte", aliases: ["decolagem", "embarque", "voo", "ida"], Icon: PlaneTakeoff },
  { id: "car", label: "Carro", category: "transporte", aliases: ["carro", "locacao", "aluguel", "veiculo", "rent a car"], Icon: Car },
  { id: "transfer", label: "Transfer", category: "transporte", aliases: ["transfer", "traslado", "transporte", "translado"], Icon: ArrowRightLeft },
  { id: "bus", label: "Ônibus / van", category: "transporte", aliases: ["onibus", "van", "micro-onibus", "transporte", "transfer"], Icon: Bus },
  { id: "train", label: "Trem", category: "transporte", aliases: ["trem", "metro", "ferroviario"], Icon: Train },
  // Hospedagem
  { id: "hotel", label: "Hotel", category: "hospedagem", aliases: ["hotel", "hospedagem", "resort", "pousada"], Icon: Hotel },
  { id: "bed", label: "Quarto / diárias", category: "hospedagem", aliases: ["quarto", "diaria", "diarias", "noites", "cama", "apartamento"], Icon: BedDouble },
  { id: "home", label: "Casa / apartamento", category: "hospedagem", aliases: ["casa", "apartamento", "flat", "airbnb"], Icon: Home },
  { id: "building", label: "Prédio / rede", category: "hospedagem", aliases: ["predio", "rede", "hotelaria", "edificio"], Icon: Building2 },
  // Alimentação
  { id: "meal", label: "Alimentação", category: "alimentacao", aliases: ["alimentacao", "refeicao", "restaurante", "comida", "jantar", "almoco", "pensao"], Icon: Utensils },
  { id: "breakfast", label: "Café da manhã", category: "alimentacao", aliases: ["cafe", "cafe da manha", "breakfast"], Icon: Coffee },
  { id: "drinks", label: "Bebidas", category: "alimentacao", aliases: ["bebida", "bebidas", "vinho", "bar", "open bar", "all inclusive"], Icon: Wine },
  { id: "all-inclusive", label: "All inclusive", category: "alimentacao", aliases: ["all inclusive", "tudo incluido", "pensao completa", "refeicoes"], Icon: UtensilsCrossed },
  // Passeios e ingressos
  { id: "ticket", label: "Ingresso", category: "passeios", aliases: ["ingresso", "ticket", "parque", "entrada", "atracao", "passeio"], Icon: Ticket },
  { id: "camera", label: "Câmera / tour", category: "passeios", aliases: ["camera", "foto", "tour", "city tour", "passeio"], Icon: Camera },
  { id: "map", label: "Mapa", category: "passeios", aliases: ["mapa", "roteiro", "itinerario"], Icon: Map },
  { id: "pin", label: "Destino", category: "passeios", aliases: ["destino", "local", "ponto", "cidade"], Icon: MapPin },
  { id: "mountain", label: "Montanha", category: "passeios", aliases: ["montanha", "trilha", "natureza", "serra"], Icon: Mountain },
  { id: "beach", label: "Praia", category: "passeios", aliases: ["praia", "mar", "litoral", "ondas"], Icon: Waves },
  { id: "sun", label: "Sol / lazer", category: "passeios", aliases: ["sol", "lazer", "verao", "dia livre"], Icon: Sun },
  { id: "shopping", label: "Compras", category: "passeios", aliases: ["compras", "shopping", "outlet", "loja"], Icon: ShoppingBag },
  // Cruzeiros
  { id: "ship", label: "Navio", category: "cruzeiros", aliases: ["navio", "cruzeiro", "cruise", "embarcacao"], Icon: Ship },
  { id: "anchor", label: "Âncora / porto", category: "cruzeiros", aliases: ["ancora", "porto", "embarque", "maritimo"], Icon: Anchor },
  // Proteção e seguros
  { id: "shield", label: "Seguro", category: "protecao", aliases: ["seguro", "protecao", "cobertura"], Icon: Shield },
  { id: "shield-check", label: "Proteção garantida", category: "protecao", aliases: ["protecao", "garantia", "seguro viagem", "assistencia"], Icon: ShieldCheck },
  { id: "health", label: "Assistência médica", category: "protecao", aliases: ["saude", "medico", "assistencia", "emergencia"], Icon: HeartPulse },
  // Documentos
  { id: "document", label: "Documento", category: "documentos", aliases: ["documento", "voucher", "contrato", "arquivo"], Icon: FileText },
  { id: "visa", label: "Visto / passaporte", category: "documentos", aliases: ["visto", "passaporte", "visa", "imigracao"], Icon: Stamp },
  { id: "certificate", label: "Comprovante", category: "documentos", aliases: ["comprovante", "certificado", "validado"], Icon: BadgeCheck },
  // Serviços gerais
  { id: "luggage", label: "Bagagem", category: "servicos", aliases: ["bagagem", "mala", "despachada", "luggage"], Icon: Luggage },
  { id: "guide", label: "Guia / acompanhamento", category: "servicos", aliases: ["guia", "acompanhamento", "grupo", "equipe"], Icon: Users },
  { id: "support", label: "Suporte 24h", category: "servicos", aliases: ["suporte", "atendimento", "24h", "plantao"], Icon: Headphones },
  { id: "wifi", label: "Wi-Fi / chip", category: "servicos", aliases: ["wifi", "internet", "chip", "dados"], Icon: Wifi },
  { id: "gift", label: "Brinde / extra", category: "servicos", aliases: ["brinde", "extra", "cortesia", "presente"], Icon: Gift },
  { id: "kids", label: "Criança", category: "servicos", aliases: ["crianca", "kids", "familia", "bebe"], Icon: Baby },
  { id: "accessibility", label: "Acessibilidade", category: "servicos", aliases: ["acessibilidade", "mobilidade", "cadeirante"], Icon: Accessibility },
  { id: "sparkles", label: "Personalizado", category: "servicos", aliases: ["personalizado", "exclusivo", "especial", "geral", "outro"], Icon: Sparkles },
];

export type IncludedIconId = string;

export const FALLBACK_INCLUDED_ICON_ID = "sparkles";

const BY_ID = new Map(INCLUDED_ICONS.map((def) => [def.id, def]));

/** Chaves legadas de `iconKeyForIncludedItem` → ids do registro. */
const LEGACY_KEY_MAP: Record<string, IncludedIconId> = {
  hotel: "hotel",
  flight: "plane",
  car: "car",
  transfer: "transfer",
  attraction: "ticket",
  insurance: "shield",
  cruise: "ship",
  sparkles: "sparkles",
};

export function isIncludedIconId(value: unknown): boolean {
  return typeof value === "string" && BY_ID.has(value);
}

/** Valida/sanitiza um identificador recebido do banco. `null` se inválido. */
export function sanitizeIncludedIconId(value: unknown): IncludedIconId | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw) return null;
  if (BY_ID.has(raw)) return raw;
  const legacy = LEGACY_KEY_MAP[raw];
  return legacy ?? null;
}

export function includedIconDef(id: unknown): IncludedIconDef {
  const safe = sanitizeIncludedIconId(id) ?? FALLBACK_INCLUDED_ICON_ID;
  return BY_ID.get(safe) ?? BY_ID.get(FALLBACK_INCLUDED_ICON_ID)!;
}

export function includedIconComponent(id: unknown): LucideIcon {
  return includedIconDef(id).Icon;
}

export function includedIconLabel(id: unknown): string {
  return includedIconDef(id).label;
}

function normalizeSearch(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/** Busca por rótulo e aliases em português (sem acento / caixa). */
export function searchIncludedIcons(term: string, category?: IncludedIconCategory | "todos"): IncludedIconDef[] {
  const q = normalizeSearch(term);
  return INCLUDED_ICONS.filter((def) => {
    if (category && category !== "todos" && def.category !== category) return false;
    if (!q) return true;
    if (normalizeSearch(def.label).includes(q)) return true;
    if (def.id.includes(q)) return true;
    return def.aliases.some((alias) => normalizeSearch(alias).includes(q));
  });
}

/** Mapeia chave legada (hotel/flight/...) para id do registro. */
export function iconIdFromLegacyKey(key: string): IncludedIconId {
  return LEGACY_KEY_MAP[key] ?? FALLBACK_INCLUDED_ICON_ID;
}
